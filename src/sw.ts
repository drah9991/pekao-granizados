/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { openDB } from 'idb';

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

    let successCount = 0;
    const remainingQueue = [...queue];

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
          const index = remainingQueue.findIndex((o) => o.id === order.id);
          if (index > -1) {
            remainingQueue.splice(index, 1);
          }
          successCount++;
        } else {
          const errText = await response.text();
          console.error(`[SW] Order sync failed for order ${order.id}:`, errText);
          
          let pgCode = '';
          try {
            const parsedErr = JSON.parse(errText);
            pgCode = String(parsedErr.code || '');
          } catch (_) {
            // ignore JSON parse errors
          }

          const status = response.status;
          const isValidation = (
            status === 400 ||
            status === 409 ||
            pgCode === 'P0001' ||
            pgCode.startsWith('23')
          );

          if (isValidation) {
            const index = remainingQueue.findIndex((o) => o.id === order.id);
            if (index > -1) {
              remainingQueue.splice(index, 1);
            }
            successCount++; // Increment to trigger writing queue updates back to IDB
          } else if (status === 401 || status === 403) {
            // Keep in queue and stop processing so it can be retried once user logs back in
            break;
          } else {
            // Stop processing for other transient errors
            break;
          }
        }
      } catch (err) {
        console.error(`[SW] Network request failed for order ${order.id}:`, err);
        break; // Stop processing queue if a network failure is encountered
      }
    }

    if (successCount > 0) {
      // Save updated queue back to IndexedDB
      parsed.state.syncQueue = remainingQueue;
      await db.put('sync_store', JSON.stringify(parsed), 'oasis-eon-sync-queue');

      // Notify active clients to reload state
      await notifyClients({
        type: 'SYNC_COMPLETED',
        successCount,
        remainingCount: remainingQueue.length,
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
