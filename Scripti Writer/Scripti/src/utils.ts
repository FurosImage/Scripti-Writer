// Small DOM and text helpers with no app state.
import { LRE } from './constants';

export const $ = (s?: any, e: any = document) => e.querySelector(s),
  $$ = (s?: any, e: any = document) => [...e.querySelectorAll(s)],
  uid = () => Math.random().toString(36).slice(2, 9);

export const esc = (s?: any) =>
  String(s ?? '').replace(
    /[&<>"]/g,
    (c?: any) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );

export const hasMk = (h?: any) => /<mark/i.test(h || '');

export const colv = (c?: any) => (!c || c == 'ink' ? 'var(--tx)' : c);

export const cue = (x?: any) =>
  String(x || '')
    .toUpperCase()
    .replace(/\(.*?\)/g, '')
    .trim();

export const locOf = (h?: any) => {
  const m = String(h || '')
    .trim()
    .toUpperCase()
    .match(LRE);
  return m ? m[2].replace(/\s+-\s*$/, '').trim() : '';
};

export const charMatch = (c?: any, q?: any) => {
  const n = (c.n || '').toUpperCase().trim();
  return !!q && !!n && (n == q || n.split(/\s+/)[0] == q);
};

export const titleCase = (s?: any) => s.toLowerCase().replace(/\b\w/g, (c?: any) => c.toUpperCase());

export function toast(m?: any, act?: { label: string; fn: () => void }) {
  let t = $('#toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    t.setAttribute('role', 'status');
    document.body.append(t);
  }
  t.textContent = m;
  if (act) {
    const b = document.createElement('button');
    b.textContent = act.label;
    b.onclick = () => {
      t.style.opacity = 0;
      t.classList.remove('act');
      act.fn();
    };
    t.append(b);
  }
  t.classList.toggle('act', !!act);
  t.style.opacity = 1;
  clearTimeout(t._h);
  t._h = setTimeout(
    () => {
      t.style.opacity = 0;
      t.classList.remove('act');
    },
    act ? 7000 : 2600,
  );
}

/** Ask the browser for a file. Resolves null if the person cancels. */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise((res) => {
    const i = document.createElement('input');
    i.type = 'file';
    i.accept = accept;
    i.style.display = 'none';
    i.onchange = () => {
      res(i.files?.[0] || null);
      i.remove();
    };
    document.body.append(i);
    i.click();
  });
}

export const slug = (s: string) => (s || 'Untitled').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'Untitled';

export const words = (s: string) => (String(s || '').match(/\S+/g) || []).length;

export function ago(ts?: any) {
  if (!ts || ts < 1e12) return '';
  const m = (Date.now() - ts) / 6e4;
  return m < 1
    ? 'edited just now'
    : m < 60
      ? `edited ${Math.floor(m)} min ago`
      : m < 1440
        ? `edited ${Math.floor(m / 60)} h ago`
        : `edited ${Math.floor(m / 1440)} d ago`;
}

/** True on Mac, iPhone and iPad (they use ⌘ for shortcuts). */
export const IS_MAC =
  /Mac|iPhone|iPad|iPod/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent);
/** The modifier key name to show in tooltips: ⌘ on Apple devices, Ctrl elsewhere. */
export const MOD = IS_MAC ? '⌘' : 'Ctrl';
