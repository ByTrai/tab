import { createStarterData, workspaceDataSchema, type WorkspaceData } from "./workspace";

const DB_NAME = "tabby-workspace";
const STORE_NAME = "state";
const STATE_KEY = "primary";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local storage"));
  });
}

export async function loadWorkspace(): Promise<WorkspaceData> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(STATE_KEY);
    request.onsuccess = () => {
      if (!request.result) return resolve(createStarterData());
      const result = workspaceDataSchema.safeParse(request.result);
      result.success ? resolve(result.data) : reject(new Error("Local data could not be validated"));
    };
    request.onerror = () => reject(request.error ?? new Error("Could not read local storage"));
    transaction.oncomplete = () => database.close();
  });
}

export async function saveWorkspace(data: WorkspaceData): Promise<void> {
  const valid = workspaceDataSchema.parse(data);
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(valid, STATE_KEY);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Could not save changes")); };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error("Storage transaction was cancelled")); };
  });
}
