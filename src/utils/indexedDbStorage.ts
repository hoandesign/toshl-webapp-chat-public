/**
 * Minimal IndexedDB-backed key/value storage for the app.
 *
 * We store string values (JSON is stringified by helpers).
 * This replaces localStorage so persistence works with larger payloads
 * (e.g., chat history) and supports future growth.
 */
const DB_NAME = 'AppStorageDB';
const DB_VERSION = 1;
const STORE_NAME = 'kv';

type KvRecord = { key: string; value: string };

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
  return dbPromise;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, mode);
  const store = tx.objectStore(STORE_NAME);
  const result = await requestToPromise(fn(store));

  // Ensure the transaction completes before resolving (best-effort).
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });

  return result;
}

export const idbStorage = {
  async getItem(key: string): Promise<string | null> {
    const record = await withStore<KvRecord | undefined>('readonly', (store) => store.get(key));
    return record?.value ?? null;
  },

  async setItem(key: string, value: string): Promise<void> {
    await withStore<IDBValidKey>('readwrite', (store) => store.put({ key, value } satisfies KvRecord));
  },

  async removeItem(key: string): Promise<void> {
    await withStore<undefined>('readwrite', (store) => store.delete(key));
  },

  async clear(): Promise<void> {
    await withStore<undefined>('readwrite', (store) => store.clear());
  },

  async getJSON<T>(key: string, defaultValue: T): Promise<T> {
    const raw = await this.getItem(key);
    if (raw == null) return defaultValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  },

  async setJSON<T>(key: string, value: T): Promise<void> {
    await this.setItem(key, JSON.stringify(value));
  },

  /**
   * One-time migration helper: copies selected localStorage keys into IndexedDB.
   * If the IndexedDB key already exists, we leave it as-is.
   */
  async migrateFromLocalStorage(keys: string[], opts?: { removeOriginal?: boolean }): Promise<void> {
    const removeOriginal = opts?.removeOriginal ?? true;
    // localStorage access may throw in private mode; treat migration as best-effort.
    for (const key of keys) {
      try {
        const existing = await this.getItem(key);
        if (existing != null) continue;
        const fromLocal = window?.localStorage?.getItem?.(key) ?? null;
        if (fromLocal == null) continue;
        await this.setItem(key, fromLocal);
        if (removeOriginal) window.localStorage.removeItem(key);
      } catch {
        // Ignore migration errors; app will continue with whatever is available.
      }
    }
  },
};

