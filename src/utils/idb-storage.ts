
interface StoredItem<T> {
  id: string;
  data: T;
  timestamp: number;
}

class IDBStorage<T extends { id?: string }> {
  private dbName: string;
  private storeName: string;
  private version: number;
  private useLocalStorage: boolean = false;

  constructor(dbName: string, storeName: string, version: number = 1) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.version = version;
    this.useLocalStorage = !this.isIndexedDBAvailable();
  }

  private isIndexedDBAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  private getStorageKey(): string {
    return `${this.dbName}_${this.storeName}`;
  }

  private async getIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  async put(item: T): Promise<void> {
    const storedItem: StoredItem<T> = {
      id: item.id || crypto.randomUUID(),
      data: item,
      timestamp: Date.now(),
    };

    if (this.useLocalStorage) {
      const key = this.getStorageKey();
      const items = this.getLocalStorageItems();
      const index = items.findIndex(i => i.id === storedItem.id);
      if (index >= 0) {
        items[index] = storedItem;
      } else {
        items.push(storedItem);
      }
      localStorage.setItem(key, JSON.stringify(items));
      return;
    }

    try {
      const db = await this.getIndexedDB();
      return new Promise((resolve, reject) => {
        // Check if store exists before accessing
        if (!db.objectStoreNames.contains(this.storeName)) {
          console.warn(`[IDBStorage] Object store "${this.storeName}" not found, falling back to localStorage`);
          this.useLocalStorage = true;
          this.put(item).then(resolve).catch(reject);
          return;
        }
        
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(storedItem);
        request.onsuccess = () => resolve();
        request.onerror = () => {
          // If store access fails, fallback to localStorage
          console.warn(`[IDBStorage] Transaction error for "${this.storeName}", falling back to localStorage:`, request.error);
          this.useLocalStorage = true;
          this.put(item).then(resolve).catch(reject);
        };
      });
    } catch (error: any) {
      // Fallback to localStorage on IndexedDB error
      if (error?.name === 'NotFoundError' || error?.message?.includes('object store') || error?.message?.includes('not found')) {
        console.warn(`[IDBStorage] Object store "${this.storeName}" not found, falling back to localStorage`);
        this.useLocalStorage = true;
      } else {
        this.useLocalStorage = true;
      }
      await this.put(item);
    }
  }

  async get(id: string): Promise<StoredItem<T> | undefined> {
    if (this.useLocalStorage) {
      const items = this.getLocalStorageItems();
      return items.find(item => item.id === id);
    }

    try {
      const db = await this.getIndexedDB();
      return new Promise((resolve) => {
        // Check if store exists before accessing
        if (!db.objectStoreNames.contains(this.storeName)) {
          console.warn(`[IDBStorage] Object store "${this.storeName}" not found, falling back to localStorage`);
          this.useLocalStorage = true;
          resolve(this.getLocalStorageItems().find(item => item.id === id));
          return;
        }
        
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          // If store access fails, fallback to localStorage
          console.warn(`[IDBStorage] Transaction error for "${this.storeName}", falling back to localStorage:`, request.error);
          this.useLocalStorage = true;
          resolve(this.getLocalStorageItems().find(item => item.id === id));
        };
      });
    } catch (error: any) {
      // If transaction fails (store doesn't exist), fallback to localStorage
      if (error?.name === 'NotFoundError' || error?.message?.includes('object store') || error?.message?.includes('not found')) {
        console.warn(`[IDBStorage] Object store "${this.storeName}" not found, falling back to localStorage`);
        this.useLocalStorage = true;
        return this.getLocalStorageItems().find(item => item.id === id);
      }
      this.useLocalStorage = true;
      return this.get(id);
    }
  }

  async getAll(): Promise<StoredItem<T>[]> {
    if (this.useLocalStorage) {
      return this.getLocalStorageItems();
    }

    try {
      const db = await this.getIndexedDB();
      return new Promise((resolve) => {
        // Check if store exists before accessing
        if (!db.objectStoreNames.contains(this.storeName)) {
          console.warn(`[IDBStorage] Object store "${this.storeName}" not found, falling back to localStorage`);
          this.useLocalStorage = true;
          resolve(this.getLocalStorageItems());
          return;
        }
        
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => {
          // If store access fails, fallback to localStorage
          console.warn(`[IDBStorage] Transaction error for "${this.storeName}", falling back to localStorage:`, request.error);
          this.useLocalStorage = true;
          resolve(this.getLocalStorageItems());
        };
      });
    } catch (error: any) {
      // If transaction fails (store doesn't exist), fallback to localStorage
      if (error?.name === 'NotFoundError' || error?.message?.includes('object store') || error?.message?.includes('not found')) {
        console.warn(`[IDBStorage] Object store "${this.storeName}" not found, falling back to localStorage`);
        this.useLocalStorage = true;
        return this.getLocalStorageItems();
      }
      this.useLocalStorage = true;
      return this.getAll();
    }
  }

  async delete(id: string): Promise<void> {
    if (this.useLocalStorage) {
      const key = this.getStorageKey();
      const items = this.getLocalStorageItems().filter(item => item.id !== id);
      localStorage.setItem(key, JSON.stringify(items));
      return;
    }

    try {
      const db = await this.getIndexedDB();
      return new Promise((resolve, reject) => {
        // Check if store exists before accessing
        if (!db.objectStoreNames.contains(this.storeName)) {
          console.warn(`[IDBStorage] Object store "${this.storeName}" not found, falling back to localStorage`);
          this.useLocalStorage = true;
          this.delete(id).then(resolve).catch(reject);
          return;
        }
        
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => {
          // If store access fails, fallback to localStorage
          console.warn(`[IDBStorage] Transaction error for "${this.storeName}", falling back to localStorage:`, request.error);
          this.useLocalStorage = true;
          this.delete(id).then(resolve).catch(reject);
        };
      });
    } catch (error: any) {
      // If transaction fails (store doesn't exist), fallback to localStorage
      if (error?.name === 'NotFoundError' || error?.message?.includes('object store') || error?.message?.includes('not found')) {
        console.warn(`[IDBStorage] Object store "${this.storeName}" not found, falling back to localStorage`);
        this.useLocalStorage = true;
      } else {
        this.useLocalStorage = true;
      }
      return this.delete(id);
    }
  }

  async clear(): Promise<void> {
    if (this.useLocalStorage) {
      const key = this.getStorageKey();
      localStorage.removeItem(key);
      return;
    }

    try {
      const db = await this.getIndexedDB();
      return new Promise((resolve, reject) => {
        // Check if store exists before accessing
        if (!db.objectStoreNames.contains(this.storeName)) {
          console.warn(`[IDBStorage] Object store "${this.storeName}" not found, falling back to localStorage`);
          this.useLocalStorage = true;
          this.clear().then(resolve).catch(reject);
          return;
        }
        
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => {
          // If store access fails, fallback to localStorage
          console.warn(`[IDBStorage] Transaction error for "${this.storeName}", falling back to localStorage:`, request.error);
          this.useLocalStorage = true;
          this.clear().then(resolve).catch(reject);
        };
      });
    } catch (error: any) {
      // If transaction fails (store doesn't exist), fallback to localStorage
      if (error?.name === 'NotFoundError' || error?.message?.includes('object store') || error?.message?.includes('not found')) {
        console.warn(`[IDBStorage] Object store "${this.storeName}" not found, falling back to localStorage`);
        this.useLocalStorage = true;
      } else {
        this.useLocalStorage = true;
      }
      return this.clear();
    }
  }

  private getLocalStorageItems(): StoredItem<T>[] {
    try {
      const key = this.getStorageKey();
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
}

export default IDBStorage;
