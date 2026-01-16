/**
 * Storage adapter that works in both browser and Zotero environments
 */
export class StorageAdapter {
  storage;
  constructor(customStorage = null) {
    if (customStorage) {
      this.storage = customStorage; // Use injected storage
    } else if (typeof localStorage !== "undefined") {
      this.storage = localStorage; // Default browser
    } else {
      this.storage = this.createInMemoryStorage(); // Fallback
    }
  }

  createInMemoryStorage() {
    const memoryStore: Record<string, any> = {};
    return {
      getItem: (key: string) => memoryStore[key] || null,
      setItem: (key: string, value: any) => {
        memoryStore[key] = value;
      },
      removeItem: (key: string) => {
        delete memoryStore[key];
      },
    };
  }

  getItem(key: string) {
    return this.storage.getItem(key);
  }

  setItem(key: string, value: any) {
    this.storage.setItem(key, value);
  }

  removeItem(key: string) {
    this.storage.removeItem(key);
  }
}

// Export singleton instance
export const storage = new StorageAdapter();

type ProfileStorage = {
  orcid: string;
  name: string;
  privateKey: string;
  publicKey: string;
};
