const DB_NAME = "tabby-extension";
const DB_VERSION = 1;
const STATE_STORE = "capture-state";
const STATE_KEY = "primary";
const EMPTY_STATE = { schemaVersion: 1, items: [], operations: [] };

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STATE_STORE)) request.result.createObjectStore(STATE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open Tabby's local database."));
  });
}

export class IndexedDbRepository {
  async read() {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STATE_STORE, "readonly");
      const request = transaction.objectStore(STATE_STORE).get(STATE_KEY);
      request.onsuccess = () => resolve(request.result?.schemaVersion === 1 ? request.result : structuredClone(EMPTY_STATE));
      request.onerror = () => reject(request.error ?? new Error("Could not read Tabby's local database."));
      transaction.oncomplete = () => database.close();
    });
  }

  async mutate(change) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STATE_STORE, "readwrite");
      const store = transaction.objectStore(STATE_STORE);
      const request = store.get(STATE_KEY);
      request.onsuccess = () => {
        const state = request.result?.schemaVersion === 1 ? request.result : structuredClone(EMPTY_STATE);
        store.put(change(state), STATE_KEY);
      };
      request.onerror = () => transaction.abort();
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Could not persist the capture.")); };
      transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error("The capture transaction was cancelled.")); };
    });
  }

  async savedItems() { return (await this.read()).items; }
  async operations() { return (await this.read()).operations; }
  async operation(id) { return (await this.read()).operations.find((operation) => operation.id === id); }

  async commitCapture(operation, items) {
    await this.mutate((state) => state.operations.some(({ id }) => id === operation.id) ? state : {
      ...state,
      items: [...state.items, ...items],
      operations: [...state.operations.slice(-49), operation],
    });
  }

  async updateOperation(operation) {
    await this.mutate((state) => ({ ...state, operations: state.operations.map((entry) => entry.id === operation.id ? operation : entry) }));
  }

  async removeItems(ids) {
    const removed = new Set(ids);
    await this.mutate((state) => ({ ...state, items: state.items.filter((item) => !removed.has(item.id)) }));
  }
}
