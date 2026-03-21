import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'pekao-offline-db';
const DB_VERSION = 1;

export interface OfflineOrder {
  id: string;
  payload: any;
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

  async saveProducts(products: any[]) {
    const db = await this.db;
    const tx = db.transaction('products', 'readwrite');
    await tx.objectStore('products').clear();
    for (const product of products) {
      await tx.objectStore('products').put(product);
    }
    await tx.done;
  }

  async getProducts() {
    const db = await this.db;
    return db.getAll('products');
  }

  async saveOfflineOrder(order: any) {
    const db = await this.db;
    const offlineOrder: OfflineOrder = {
      id: order.id || crypto.randomUUID(),
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
    const order = await db.get('orders', id);
    if (order) {
      order.synced = true;
      await db.put('orders', order);
      // Optional: Delete after sync to keep DB small
      // await db.delete('orders', id);
    }
  }
}

export const offlineService = new OfflineService();
