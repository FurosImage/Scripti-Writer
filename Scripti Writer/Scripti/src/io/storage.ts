// Device storage: IndexedDB when available, localStorage as a fallback.

const DB = 'scripti',
  STORE = 'kv',
  KEY = 'data';
let idb: IDBDatabase | null = null;

const timeout = <T>(p: Promise<T>, ms: number, v: T): Promise<T> =>
  Promise.race([p, new Promise<T>((r) => setTimeout(() => r(v), ms))]);

export async function idbOpen() {
  try {
    idb = await timeout(
      new Promise<IDBDatabase | null>((res) => {
        const r = indexedDB.open(DB, 1);
        r.onupgradeneeded = () => r.result.createObjectStore(STORE);
        r.onsuccess = () => res(r.result);
        r.onerror = () => res(null);
        r.onblocked = () => res(null);
      }),
      3000,
      null,
    );
  } catch (e) {
    idb = null;
  }
}

export async function idbRead(): Promise<any> {
  if (!idb) return null;
  try {
    return await timeout(
      new Promise((res) => {
        const r = idb!.transaction(STORE).objectStore(STORE).get(KEY);
        r.onsuccess = () => res(r.result || null);
        r.onerror = () => res(null);
      }),
      3000,
      null,
    );
  } catch (e) {
    return null;
  }
}

function lsWrite(d: any) {
  try {
    localStorage.setItem('scripti', JSON.stringify(d));
    return true;
  } catch (e) {
    return false;
  }
}

/** Write everything. Returns false if nothing could store it. */
export async function idbWrite(d: any): Promise<boolean> {
  if (!idb) return lsWrite(d);
  try {
    const ok = await new Promise<boolean>((res) => {
      const tx = idb!.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(d, KEY);
      tx.oncomplete = () => res(true);
      tx.onerror = () => res(false);
      tx.onabort = () => res(false);
    });
    if (ok) {
      // The old localStorage copy is no longer needed once IndexedDB holds the data.
      try {
        localStorage.removeItem('scripti');
      } catch (e) {}
      return true;
    }
  } catch (e) {}
  return lsWrite(d);
}
