import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'pekao-offline-db';
const DB_VERSION = 2;

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
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('orders')) {
          db.createObjectStore('orders', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sync_store')) {
          db.createObjectStore('sync_store');
        }
      },
    });
  }

  async saveProducts(products: Record<string, unknown>[]) {
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

  async saveOfflineOrder(order: Record<string, unknown>) {
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
    // Eliminar la orden sincronizada para evitar crecimiento infinito de IndexedDB
    await db.delete('orders', id);
  }

  /**
   * Métodos helpers para la persistencia de Zustand y sesión compartida con el Service Worker
   */
  async getSyncStoreVal(key: string): Promise<string | null> {
    const db = await this.db;
    return (await db.get('sync_store', key)) || null;
  }

  async setSyncStoreVal(key: string, value: string): Promise<void> {
    const db = await this.db;
    await db.put('sync_store', value, key);
  }

  async removeSyncStoreVal(key: string): Promise<void> {
    const db = await this.db;
    await db.delete('sync_store', key);
  }

  async saveAuthSession(session: any) {
    const db = await this.db;
    if (session) {
      await db.put('sync_store', {
        accessToken: session.access_token,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        updatedAt: new Date().toISOString()
      }, 'auth-session');
    } else {
      await db.delete('sync_store', 'auth-session');
    }
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

