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
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
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

    const parsed = JSON.parse(rawStore);
    const queue = parsed.state?.syncQueue || [];
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
          const index = remainingQueue.findIndex((o: any) => o.id === order.id);
          if (index > -1) {
            remainingQueue.splice(index, 1);
          }
          successCount++;
        } else {
          const errText = await response.text();
          console.error(`[SW] Order sync failed for order ${order.id}:`, errText);
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

async function notifyClients(message: any) {
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage(message);
  }
}
