// Device storage: IndexedDB when available, localStorage as a fallback.
//
// Reading tells "nothing saved yet" apart from "couldn't read". When the saved stories can't be
// read, the app must not start with an empty library and save that over them.

const DB = 'scripti',
  STORE = 'kv',
  KEY = 'data';
let idb: IDBDatabase | null = null;

/** 'ok' = open; 'none' = this browser has no IndexedDB (localStorage is used); 'fail' = it didn't open. */
export type OpenResult = 'ok' | 'none' | 'fail';

export async function idbOpen(): Promise<OpenResult> {
  if (typeof indexedDB == 'undefined') return 'none';
  try {
    return await new Promise<OpenResult>((res) => {
      // A slow disk gets plenty of time; giving up early would look like an empty library.
      const late = setTimeout(() => res('fail'), 20000);
      const done = (r: OpenResult) => (clearTimeout(late), res(r));
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => {
        idb = r.result;
        done('ok');
      };
      r.onerror = () => done('fail');
      r.onblocked = () => done('fail');
    });
  } catch (e) {
    return 'fail';
  }
}

/** The saved data (null when nothing is saved yet). `ok` is false when it couldn't be read. */
export async function idbRead(): Promise<{ ok: boolean; data: any }> {
  if (!idb) return { ok: true, data: null };
  try {
    return await new Promise((res) => {
      const tx = idb!.transaction(STORE);
      const r = tx.objectStore(STORE).get(KEY);
      r.onsuccess = () => res({ ok: true, data: r.result || null });
      r.onerror = () => res({ ok: false, data: null });
      tx.onabort = () => res({ ok: false, data: null });
    });
  } catch (e) {
    return { ok: false, data: null };
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
