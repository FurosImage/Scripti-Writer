// The single mutable app state object, plus saving to the device.
//
// Data is kept in IndexedDB (localStorage is only a fallback and the source for migrating older
// installs). Saves are debounced: call `save()` after changing the open story, `persist()` after
// changing anything else in `App.D`. Both flush within half a second and when the page is hidden.
import { idbOpen, idbRead, idbWrite } from './io/storage';

export interface AppState {
  /** All saved data: theme, library flag and every project */
  D: any;
  /** The open project, or null on the main menu */
  P: any;
  /** Active workspace tab */
  tab: string;
  /** Index of the active draft */
  dr: number;
  /** Split-screen on */
  split: boolean;
  /** Novels and notes: show the two-page book view instead of the editor. */
  book: boolean;
  /** Draft shown in the right-hand split pane */
  d2: number;
  /** Last focused script block */
  F: { d: number; i: number };
  /** Open dialog: 'new' | 'export' | 'help' | 'install' | 'import' | null */
  modal: any;
  /** Draft-tab or story-card context menu */
  ctx: any;
  /** Draft tab being renamed (-1 for none) */
  ren: number;
  /** Active board tool */
  tool: string;
  /** Colour for new drawings */
  penCol: string | null;
  /** Line width for new drawings */
  penW: number;
  /** Script undo stack (JSON snapshots of drafts) */
  HU: string[];
  /** Script redo stack */
  HR: string[];
  /** JSON of drafts after the last change */
  cur: string;
  /** Time of the last keystroke, for undo grouping */
  lastT: number;
  /** Board undo stack */
  BU: string[];
  /** Board redo stack */
  BR: string[];
  /** Selected board item ids */
  sel: Set<string>;
  /** Selected connection id */
  selL: string | null;
  /** Legacy pan toggle */
  panT: boolean;
  /** Space bar held (temporary pan) */
  space: boolean;
  /** Current board pointer gesture */
  drag: any;
  /** Autocomplete popup state */
  AC: any;
  /** Last selection inside the novel editor */
  NR: Range | null;
  /** Watches card resizes to redraw connections */
  ro: ResizeObserver | null;
  /** Hover-card delay timer */
  hcT: any;
  /** Focus mode: hides all chrome */
  focus: boolean;
  /** Side panel open on small screens */
  side: boolean;
  /** Library search text */
  q: string;
  /** Export dialog choices */
  exp: { fmt: string; paper: 'letter' | 'a4'; tpage: boolean; scn: boolean };
  /** Local save status: 'saved' | 'saving' | 'error' */
  saved: string;
}

export const App: AppState = {
  D: { th: 'dark', ps: [], lib: true },
  P: null,
  tab: 'Script',
  dr: 0,
  split: false,
  book: false,
  d2: -1,
  F: { d: 0, i: 0 },
  modal: null,
  ctx: null,
  ren: -1,
  tool: 'select',
  penCol: null,
  penW: 3,
  HU: [],
  HR: [],
  cur: '',
  lastT: 0,
  BU: [],
  BR: [],
  sel: new Set(),
  selL: null,
  panT: false,
  space: false,
  drag: null,
  AC: null,
  NR: null,
  ro: null,
  hcT: null,
  focus: false,
  side: false,
  q: '',
  exp: { fmt: '', paper: 'letter', tpage: true, scn: false },
  saved: 'saved',
};

/** Functions run after every change . */
export const changeHooks: (() => void)[] = [];
/** Functions run when the save status changes (the status pill listens here). */
export const statusHooks: (() => void)[] = [];

let timer: any = null;
let writing: Promise<void> | null = null;
let again = false;

/** True when the saved stories couldn't be read: nothing is written, so they stay as they are. */
let locked = false;

/**
 * Load saved data from the device. Call once before the first render. Returns false when the
 * saved stories couldn't be read; the app then must not go on (and saving is switched off), so an
 * empty library is never saved over them.
 */
export async function initData(): Promise<boolean> {
  const opened = await idbOpen();
  const read = opened == 'fail' ? { ok: false, data: null } : await idbRead();
  if (!read.ok) {
    locked = true;
    return false;
  }
  let d = read.data;
  if (!d) {
    try {
      d = JSON.parse(localStorage.getItem('scripti') || 'null');
    } catch (e) {}
  }
  if (d && typeof d == 'object') App.D = d;
  App.D.ps = Array.isArray(App.D.ps) ? App.D.ps : [];
  App.D.th = App.D.th || 'dark';
  if (App.D.lib === undefined) App.D.lib = true;
  App.D.known = App.D.known || {};
  App.D.dels = App.D.dels || {};
  try {
    (navigator as any).storage?.persist?.();
  } catch (e) {}
  return true;
}

function setSaved(s: string) {
  if (App.saved == s) return;
  App.saved = s;
  statusHooks.forEach((f) => f());
}

/** Mark the open story as edited and schedule a save. */
export const save = () => {
  if (App.P) App.P.up = Date.now();
  persist();
  changeHooks.forEach((f) => f());
};

/** Schedule writing `App.D` to the device without marking any story as edited. */
export function persist() {
  if (locked) return;
  setSaved('saving');
  clearTimeout(timer);
  timer = setTimeout(flush, 400);
}

/** Write now. Resolves once the data is on the device. */
export async function flush() {
  clearTimeout(timer);
  timer = null;
  if (locked) return;
  if (writing) {
    again = true;
    return writing;
  }
  writing = (async () => {
    do {
      again = false;
      const ok = await idbWrite(App.D);
      setSaved(ok ? 'saved' : 'error');
      if (!ok) {
        const { toast } = await import('./utils');
        toast('Could not save on this device. Back up your stories from the library.');
      }
    } while (again);
  })();
  try {
    await writing;
  } finally {
    writing = null;
  }
}

const flushIfPending = () => {
  if (timer) flush();
};
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState == 'hidden') flushIfPending();
});
addEventListener('pagehide', flushIfPending);

// Desktop app: before the window closes, finish saving, then tell the app it may close.
const desk = (window as any).scriptiDesktop;
desk?.onClosing?.(async () => {
  try {
    await flush();
  } finally {
    desk.closeNow?.();
  }
});
