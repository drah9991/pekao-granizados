import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'pekao-offline-db';
const DB_VERSION = 1;

export interface OfflineOrder {
  id: string;
  payload: Record<string, unknown>;
  timestamp: string;
  synced: boolean;
}

class OfflineService {
  private db: Promise<IDBPDatabase>;

  constructor() {
    this.db = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Store for products to allow browsing while offline
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id' });
        }
        // Store for orders created while offline
        if (!db.objectStoreNames.contains('orders')) {
          db.createObjectStore('orders', { keyPath: 'id' });
        }
      },
    });
  }

  async saveProducts(products: Record<string, unknown>[]) {
    const db = await this.db;
    const tx = db.transaction('products', 'readwrite');
    const store = tx.objectStore('products');
    await store.clear();
    await Promise.all(products.map(product => store.put(product)));
    await tx.done;
  }

  async getProducts() {
    const db = await this.db;
    return db.getAll('products');
  }

  async saveOfflineOrder(order: Record<string, unknown>) {
    const db = await this.db;
    const offlineOrder: OfflineOrder = {
      id: (order.id as string) || crypto.randomUUID(),
      payload: order,
      timestamp: new Date().toISOString(),
      synced: false
    };
    await db.put('orders', offlineOrder);
    return offlineOrder;
  }

  async getPendingOrders() {
    const db = await this.db;
    const all = await db.getAll('orders');
    return (all as OfflineOrder[]).filter(o => !o.synced);
  }

  async markOrderSynced(id: string) {
    const db = await this.db;
    // Eliminar la orden sincronizada para evitar crecimiento infinito de IndexedDB
    await db.delete('orders', id);
  }

  /**
   * Cleanup periódico: elimina órdenes con más de 30 días de antigüedad
   */
  async cleanOldOrders(maxAgeDays = 30) {
    const db = await this.db;
    const all = await db.getAll('orders');
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    const tx = db.transaction('orders', 'readwrite');
    for (const order of all) {
      if (new Date(order.timestamp).getTime() < cutoff) {
        await tx.objectStore('orders').delete(order.id);
      }
    }
    await tx.done;
  }
}

export const offlineService = new OfflineService();
