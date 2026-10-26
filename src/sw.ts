/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { openDB } from 'idb';
import { classifySyncError } from './lib/syncErrorPolicy';

declare const self: ServiceWorkerGlobalScope;

// Precache resources
precacheAndRoute(self.__WB_MANIFEST);

// Cache Supabase storage images
registerRoute(
  /^https:\/\/.*\.supabase\.co\/storage\/v1\/render\/image\/.*/i,
  new CacheFirst({
    cacheName: 'supabase-images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Background Sync event listener
self.addEventListener('sync', (event: unknown) => {
  const syncEvent = event as { tag: string; waitUntil: (promise: Promise<void>) => void };
  if (syncEvent.tag === 'sync-orders') {
    syncEvent.waitUntil(syncOrders());
  }
});

// Message event listener for manual check trigger
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_SYNC') {
    event.waitUntil(syncOrders());
  }
});

async function syncOrders() {
  try {
    const db = await openDB('pekao-offline-db', 2);
    
    // Read the active sync queue state from Zustand persisted state
    const rawStore = await db.get('sync_store', 'oasis-eon-sync-queue');
    if (!rawStore) return;

    interface SyncOrder {
      id: string;
      payload: unknown;
      timestamp?: string;
    }

    interface FailedSyncOrder extends SyncOrder {
      error: { code: string; message: string };
      failedAt: string;
    }

    const parsed = JSON.parse(rawStore);
    const queue = (parsed.state?.syncQueue || []) as SyncOrder[];
    if (queue.length === 0) return;

    // Read the active auth session
    const authSession = await db.get('sync_store', 'auth-session');
    if (!authSession) {
      console.warn("[SW] Cannot sync: auth session not found in IndexedDB.");
      await notifyClients({ type: 'SYNC_ERROR', message: 'Sesión no encontrada en IndexedDB.' });
      return;
    }

    const { accessToken, supabaseUrl, supabaseKey } = authSession;
    if (!accessToken || !supabaseUrl || !supabaseKey) {
      console.warn("[SW] Missing auth session details.");
      return;
    }

    // Ids enviados con éxito y ventas rechazadas. Se aplican sobre una lectura fresca de IndexedDB
    // al final, porque la página puede encolar o mover ventas mientras el SW sincroniza.
    const syncedIds = new Set<string>();
    const newlyFailed: FailedSyncOrder[] = [];

    /* 
     * INTENTIONAL N+1 PATTERN: Orders must be synchronized sequentially (FIFO) 
     * to preserve transaction chronology and allow atomicity/stop-on-failure 
     * behavior if an order fails validation (e.g. stock, pricing) or network drops.
     */
    for (const order of queue) {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/process_sale`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            sale_data: order.payload,
          }),
        });

        if (response.ok) {
          syncedIds.add(order.id);
        } else {
          const errText = await response.text();
          console.error(`[SW] Order sync failed for order ${order.id}:`, errText);

          let pgCode = '';
          let pgMessage = errText;
          try {
            const parsedErr = JSON.parse(errText);
            pgCode = String(parsedErr.code || '');
            pgMessage = String(parsedErr.message || errText);
          } catch (_) {
            // ignore JSON parse errors
          }

          const outcome = classifySyncError({ code: pgCode, status: response.status, message: pgMessage });

          if (outcome === 'synced') {
            syncedIds.add(order.id);
          } else if (outcome === 'failed') {
            // La venta ya se cobró: pasa a la cola de fallidas, nunca se borra.
            newlyFailed.push({
              ...order,
              error: { code: pgCode, message: pgMessage },
              failedAt: new Date().toISOString(),
            });
          } else {
            // Red, sesión vencida o error transitorio: se conserva y se reintenta después
            break;
          }
        }
      } catch (err) {
        console.error(`[SW] Network request failed for order ${order.id}:`, err);
        break; // Stop processing queue if a network failure is encountered
      }
    }

    if (syncedIds.size > 0 || newlyFailed.length > 0) {
      const freshRaw = await db.get('sync_store', 'oasis-eon-sync-queue');
      const fresh = freshRaw ? JSON.parse(freshRaw) : parsed;
      const freshQueue = (fresh.state?.syncQueue || []) as SyncOrder[];
      const freshFailed = (fresh.state?.failedQueue || []) as FailedSyncOrder[];

      const failedIds = new Set(newlyFailed.map((o) => o.id));
      const knownFailedIds = new Set(freshFailed.map((o) => o.id));
      fresh.state = {
        ...fresh.state,
        syncQueue: freshQueue.filter((o) => !syncedIds.has(o.id) && !failedIds.has(o.id)),
        failedQueue: [...freshFailed, ...newlyFailed.filter((o) => !knownFailedIds.has(o.id))],
      };
      await db.put('sync_store', JSON.stringify(fresh), 'oasis-eon-sync-queue');

      // Notify active clients to reload state
      await notifyClients({
        type: 'SYNC_COMPLETED',
        successCount: syncedIds.size,
        failedCount: newlyFailed.length,
        remainingCount: fresh.state.syncQueue.length,
      });
    }
  } catch (err) {
    console.error("[SW] Error during background synchronization:", err);
  }
}

async function notifyClients(message: unknown) {
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage(message);
  }
}
