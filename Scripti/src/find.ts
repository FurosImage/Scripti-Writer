// Find and replace for the script and novel pages.
//
// The bar lives outside #app so it survives re-renders. It searches the lines of the open draft
// (script blocks, or the novel's paragraphs and headings), marks every match with the CSS Custom
// Highlight API where the browser has it, and replaces one match or all of them. Script changes
// go through the app's own undo; novel changes use the editor's built-in undo.
import { hcommit, hpush } from './editor/history';
import { App, save } from './state';
import { $, $$, hasMk, MOD, toast } from './utils';
import { refreshNav, render, stats, wc } from './views/workspace';

interface Match {
  el: HTMLElement;
  start: number;
  end: number;
}

let matches: Match[] = [];
let cur = -1;
let matchCase = false;
let timer: any = null;

const bar = () => document.getElementById('find') as HTMLElement | null;
const field = (name: string) => bar()?.querySelector<HTMLInputElement>(`[data-f="${name}"]`) || null;
export const findOpen = () => !!bar();

/** The novel editor, if that's the page being shown. */
const novelEl = () => $('#nv') as HTMLElement | null;

/** The pieces of text that are searched one by one, in reading order. */
function units(): HTMLElement[] {
  if (!App.P) return [];
  const nv = novelEl();
  if (nv) {
    const kids = Array.from(nv.children) as HTMLElement[];
    return kids.length ? kids : [nv];
  }
  return $$(`.page .b[data-d="${App.dr}"]`) as HTMLElement[];
}

const canSearch = () => !!App.P && App.tab == 'Script' && App.P.type != 'ideas';

/** A DOM range for characters start…end of an element's text, across any highlights inside it. */
function rangeIn(el: Node, start: number, end: number): Range | null {
  const doc = el.ownerDocument || document;
  const w = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const r = doc.createRange();
  let pos = 0,
    began = false,
    n: Node | null;
  while ((n = w.nextNode())) {
    const len = (n.nodeValue || '').length;
    if (!began && start <= pos + len) {
      r.setStart(n, start - pos);
      began = true;
    }
    if (began && end <= pos + len) {
      r.setEnd(n, end - pos);
      return r;
    }
    pos += len;
  }
  return null;
}

function search() {
  const q = field('q')?.value || '';
  const old = matches[cur];
  matches = [];
  if (q && canSearch()) {
    const needle = matchCase ? q : q.toLowerCase();
    for (const el of units()) {
      const text = matchCase ? el.textContent || '' : (el.textContent || '').toLowerCase();
      for (let i = text.indexOf(needle); i >= 0; i = text.indexOf(needle, i + needle.length))
        matches.push({ el, start: i, end: i + needle.length });
    }
  }
  // Stay on the same match if it's still there, otherwise go to the first one.
  const same = old ? matches.findIndex((m) => m.el == old.el && m.start == old.start) : -1;
  cur = matches.length ? (same >= 0 ? same : Math.min(Math.max(cur, 0), matches.length - 1)) : -1;
  paint();
}

/** Mark the matches and update the counter. */
function paint() {
  const hl = (CSS as any).highlights;
  if (hl && typeof (window as any).Highlight == 'function') {
    const all: Range[] = [],
      one: Range[] = [];
    matches.forEach((m, i) => {
      const r = rangeIn(m.el, m.start, m.end);
      if (r) (i == cur ? one : all).push(r);
    });
    hl.set('find', new (window as any).Highlight(...all));
    hl.set('find-cur', new (window as any).Highlight(...one));
  }
  const b = bar();
  if (!b) return;
  const q = field('q')?.value || '';
  const n = b.querySelector('.n') as HTMLElement;
  n.textContent = !q ? '' : matches.length ? `${cur + 1} of ${matches.length}` : 'No matches';
  n.classList.toggle('none', !!q && !matches.length);
  b.querySelectorAll<HTMLButtonElement>('[data-need]').forEach((x) => (x.disabled = !matches.length));
}

function show(i: number) {
  if (!matches.length) return;
  cur = (i + matches.length) % matches.length;
  paint();
  const m = matches[cur];
  const r = rangeIn(m.el, m.start, m.end);
  const box = r?.getBoundingClientRect();
  const sc = m.el.closest('.main') as HTMLElement | null;
  if (box && sc) {
    const s = sc.getBoundingClientRect();
    if (box.top < s.top + 90 || box.bottom > s.bottom - 60)
      sc.scrollTo({ top: sc.scrollTop + box.top - s.top - s.height / 3, behavior: 'smooth' });
  } else m.el.scrollIntoView({ block: 'center' });
}

/**
 * The replacement for one match. When capitals aren't being matched, a match written in CAPITALS
 * (a character cue, a scene heading) gets the replacement in capitals too, so renaming "Mara" to
 * "Nora" also turns MARA into NORA.
 */
function replacement(m: Match, to: string) {
  if (matchCase) return to;
  const found = (m.el.textContent || '').slice(m.start, m.end);
  return found.length > 1 && found == found.toUpperCase() && found != found.toLowerCase() ? to.toUpperCase() : to;
}

/** Put new text in place of characters start…end of an element. */
function swap(el: Node, start: number, end: number, text: string) {
  const r = rangeIn(el, start, end);
  if (!r) return;
  r.deleteContents();
  if (text) r.insertNode((el.ownerDocument || document).createTextNode(text));
  (el as Element).normalize?.();
}

/** Copy a script line's text from the page back into the story. */
function syncBlock(el: HTMLElement) {
  const k = App.P.drafts[+el.dataset.d!]?.blocks[+el.dataset.i!];
  if (!k) return;
  k.x = el.textContent || '';
  k.h = hasMk(el.innerHTML) ? el.innerHTML : undefined;
}

function syncNovel() {
  const nv = novelEl();
  if (!nv) return;
  App.P.drafts[App.dr].novel = nv.innerHTML;
  wc();
  refreshNav();
}

/** Replace in the novel through the editor, so its own undo (Ctrl/Cmd+Z) can take it back. */
function novelSwap(nv: HTMLElement, m: Match, to: string) {
  const r = rangeIn(m.el, m.start, m.end);
  const sel = getSelection();
  if (!r || !sel) return;
  nv.focus({ preventScroll: true });
  sel.removeAllRanges();
  sel.addRange(r);
  const done = to ? document.execCommand('insertText', false, to) : document.execCommand('delete');
  if (!done) swap(m.el, m.start, m.end, to);
}

function replaceOne() {
  search();
  const m = matches[cur];
  if (!m) return;
  const to = field('r')?.value || '';
  const nv = novelEl();
  if (nv) {
    novelSwap(nv, m, replacement(m, to));
    syncNovel();
    save();
    field('r')?.focus({ preventScroll: true });
  } else {
    hpush();
    swap(m.el, m.start, m.end, replacement(m, to));
    syncBlock(m.el);
    hcommit();
    stats(true);
    refreshNav();
  }
  const at = cur;
  search();
  if (matches.length) show(Math.min(at, matches.length - 1));
}

function replaceAll() {
  search();
  const n = matches.length;
  if (!n) return;
  const to = field('r')?.value || '';
  const nv = novelEl();
  // Last match first, so earlier positions in the same line stay correct.
  if (nv) {
    for (let i = n - 1; i >= 0; i--) novelSwap(nv, matches[i], replacement(matches[i], to));
    syncNovel();
    save();
  } else {
    hpush();
    for (let i = n - 1; i >= 0; i--)
      swap(matches[i].el, matches[i].start, matches[i].end, replacement(matches[i], to));
    new Set(matches.map((m) => m.el)).forEach(syncBlock);
    hcommit();
  }
  matches = [];
  cur = -1;
  render(); // also refreshes the bar through findRefresh()
  toast(`Replaced ${n} ${n == 1 ? 'match' : 'matches'}. ${MOD}+Z undoes it.`);
}

export function closeFind() {
  bar()?.remove();
  matches = [];
  cur = -1;
  const hl = (CSS as any).highlights;
  hl?.delete('find');
  hl?.delete('find-cur');
}

/** Open the bar (or focus it), starting with the selected text if there is some. */
export function openFind() {
  if (!canSearch()) return toast('Find and replace works on the script and novel pages.');
  if (App.book) {
    // The two-page view is for reading; searching happens in the writing view.
    App.book = false;
    render();
  }
  let b = bar();
  if (!b) {
    b = document.createElement('div');
    b.id = 'find';
    b.className = 'find';
    b.setAttribute('role', 'search');
    b.innerHTML = `<div class="row"><input data-f="q" type="text" placeholder="Find" aria-label="Find" autocomplete="off" spellcheck="false"><span class="n" aria-live="polite"></span><button data-f="prev" data-need title="Previous (Shift+Enter)" aria-label="Previous match">↑</button><button data-f="next" data-need title="Next (Enter)" aria-label="Next match">↓</button><button data-f="case" title="Match capital letters" aria-label="Match capital letters" aria-pressed="false">Aa</button><button data-f="close" title="Close (Esc)" aria-label="Close find and replace">×</button></div>
<div class="row"><input data-f="r" type="text" placeholder="Replace with" aria-label="Replace with" autocomplete="off" spellcheck="false"><button data-f="one" data-need>Replace</button><button data-f="all" data-need>All</button></div>`;
    document.body.append(b);
    b.addEventListener('input', (e) => {
      if ((e.target as HTMLElement).dataset.f == 'q') {
        cur = 0;
        search();
        show(0);
      }
    });
    b.addEventListener('click', (e) => {
      const f = (e.target as HTMLElement).closest<HTMLElement>('[data-f]')?.dataset.f;
      if (f == 'prev') show(cur - 1);
      else if (f == 'next') show(cur + 1);
      else if (f == 'one') replaceOne();
      else if (f == 'all') replaceAll();
      else if (f == 'close') closeFind();
      else if (f == 'case') {
        matchCase = !matchCase;
        (e.target as HTMLElement).setAttribute('aria-pressed', String(matchCase));
        search();
      }
    });
    b.addEventListener('keydown', (e) => {
      e.stopPropagation(); // the page's own shortcuts shouldn't fire while typing here
      const f = (e.target as HTMLElement).dataset.f;
      if (e.key == 'Escape') closeFind();
      else if (e.key == 'Enter' && f == 'q') show(cur + (e.shiftKey ? -1 : 1));
      else if (e.key == 'Enter' && f == 'r') replaceOne();
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() == 'f') {
        e.preventDefault();
        field('q')?.select();
      }
    });
  }
  place();
  const picked = String(getSelection() || '').trim();
  const q = field('q')!;
  if (picked && !picked.includes('\n') && picked.length < 80) q.value = picked;
  q.focus();
  q.select();
  cur = 0;
  search();
  if (q.value) show(0);
}

/** Sit just under the toolbars, at the right. */
function place() {
  const b = bar(),
    m = $('.main') as HTMLElement | null;
  if (b) b.style.top = Math.max(8, (m?.getBoundingClientRect().top || 0) + 8) + 'px';
}

/** Called after every full render: the page was rebuilt, so look the matches up again. */
export function findRefresh() {
  if (!bar()) return;
  if (!canSearch()) return closeFind();
  place();
  search();
}

// Typing in the story while the bar is open changes what matches.
document.addEventListener('input', (e) => {
  if (!bar() || bar()!.contains(e.target as Node)) return;
  clearTimeout(timer);
  timer = setTimeout(search, 250);
});
addEventListener('resize', place);

export const findButton = () =>
  `<button data-a="find" title="Find and replace (${MOD}+F)" aria-label="Find and replace"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg></button>`;
