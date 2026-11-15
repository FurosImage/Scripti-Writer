// Page numbers on the writing pages, and the two-page book view for novels and notes.
//
// Scripts: page breaks come from the same layout the PDF export uses (55 lines of Courier per
// page), so the numbers match the printed script. Novels: the sheet is split into pages of a
// letter-sized shape. Both are drawn as a faint line with a small number, in a layer that can't be
// typed into.
//
// Book view: the text is laid out on book-sized pages, two side by side with a thin line between
// them like an open book, numbered at the bottom. It's for reading and checking; writing happens
// in the normal view.
import { linesPerPage, pageStarts } from './io/screenplay';
import { notesHtml } from './io/novel';
import { App } from './state';
import { $, $$ } from './utils';

let timer: any = null;

/* ---------- page numbers while writing ---------- */

function marker(top: number, n: number, first = false) {
  const m = document.createElement('div');
  m.className = 'pgm' + (first ? ' first' : '');
  m.style.top = top + 'px';
  m.setAttribute('aria-hidden', 'true');
  m.contentEditable = 'false';
  m.innerHTML = `<span>${n}</span>`;
  return m;
}

function scriptNumbers() {
  const paper = App.exp?.paper == 'a4' ? 'a4' : 'letter';
  for (const page of $$('.pane .page') as HTMLElement[]) {
    page.querySelector('.pgl')?.remove();
    const first = page.querySelector<HTMLElement>('.b[data-d]');
    if (!first) continue;
    const d = App.P.drafts[+first.dataset.d!];
    if (!d) continue;
    const starts = pageStarts(d.blocks, linesPerPage(paper));
    const layer = document.createElement('div');
    layer.className = 'pgl';
    layer.setAttribute('aria-hidden', 'true');
    layer.append(marker(14, 1, true));
    starts.forEach((bi, k) => {
      if (k == 0 || bi < 0) return;
      const el = page.querySelector<HTMLElement>(`.b[data-i="${bi}"]`);
      if (el) layer.append(marker(el.offsetTop - 7, k + 1));
    });
    page.append(layer);
  }
}

function novelNumbers() {
  const nv = $('#nv') as HTMLElement | null;
  const pane = nv?.parentElement;
  if (!nv || !pane) return;
  pane.querySelector('.pgl')?.remove();
  const pageH = (nv.clientWidth * 11) / 8.5;
  if (pageH < 100) return;
  const n = Math.max(1, Math.ceil(nv.scrollHeight / pageH));
  const layer = document.createElement('div');
  layer.className = 'pgl';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.top = nv.offsetTop + 'px';
  layer.append(marker(14, 1, true));
  for (let k = 1; k < n; k++) layer.append(marker(Math.round(k * pageH), k + 1));
  pane.append(layer);
}

/** Draw the page numbers (after a render, and a moment after typing stops). */
export function paintPages() {
  if (!App.P) return;
  if (App.book && $('#book')) return paintBook();
  if (App.tab != 'Script') return;
  if (App.P.type == 'ms') scriptNumbers();
  else if (App.P.type == 'novel') novelNumbers();
}

document.addEventListener('input', (e) => {
  const t = e.target as HTMLElement;
  if (!t?.closest?.('.page, #nv')) return;
  clearTimeout(timer);
  timer = setTimeout(paintPages, 400);
});
addEventListener('resize', () => {
  clearTimeout(timer);
  timer = setTimeout(paintPages, 200);
});

/* ---------- book view ---------- */

/** The text to show as a book: the novel draft, or notes turned into paragraphs. */
const bookHtml = () => (App.P.type == 'ideas' ? notesHtml(App.P.ideas) : App.P.drafts[App.dr].novel);

/** Length of an element's text. */
const textLen = (n: Node) => (n.textContent || '').length;

/** A copy of `el` holding only its characters from `from` to `to`. */
function slice(el: HTMLElement, from: number, to: number): HTMLElement {
  const c = el.cloneNode(true) as HTMLElement;
  const cut = (start: number, end: number) => {
    const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    const r = document.createRange();
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
        r.deleteContents();
        return;
      }
      pos += len;
    }
  };
  const total = textLen(c);
  if (to < total) cut(to, total);
  if (from > 0) cut(0, from);
  return c;
}

function newPage(book: HTMLElement, n: number, size: number, font: string) {
  const pg = document.createElement('div');
  pg.className = 'bpage';
  pg.innerHTML = `<div class="btext prose" style="font-family:'${font}';font-size:${size}px"></div><div class="bnum">${n}</div>`;
  book.append(pg);
  return pg.firstElementChild as HTMLElement;
}

/** Lay the text out on book pages, splitting paragraphs where a page fills up. */
export function paintBook() {
  const book = $('#book') as HTMLElement | null;
  if (!book) return;
  const font = App.P.type == 'ideas' ? 'Newsreader' : App.P.nf || 'Newsreader';
  const size = Math.round((App.P.type == 'ideas' ? 17 : App.P.ns || 18) * 0.85);
  const src = document.createElement('div');
  src.innerHTML = bookHtml();
  const queue = Array.from(src.children) as HTMLElement[];
  if (!queue.length) {
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    queue.push(p);
  }
  book.innerHTML = '';
  let n = 1;
  let box = newPage(book, n, size, font);
  const full = () => box.scrollHeight > box.clientHeight + 1;
  const next = () => (box = newPage(book, ++n, size, font));
  while (queue.length) {
    const el = queue.shift()!;
    // Chapters start on a fresh page.
    if (el.tagName == 'H1' && box.childElementCount) next();
    box.append(el);
    if (!full()) continue;
    el.remove();
    const total = textLen(el);
    const splittable = /^(P|DIV)$/.test(el.tagName) && total > 1;
    if (!splittable) {
      if (box.childElementCount) next();
      box.append(el); // a heading or a very long word gets a page to itself
      continue;
    }
    // The most characters of this paragraph that still fit, ending at a space.
    let lo = 0,
      hi = total;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      const part = slice(el, 0, mid);
      box.append(part);
      const fits = !full();
      part.remove();
      if (fits) lo = mid;
      else hi = mid - 1;
    }
    const text = el.textContent || '';
    let at = lo;
    while (at > 0 && at < total && !/\s/.test(text[at - 1])) at--;
    if (at == 0) at = lo;
    if (at > 0) {
      box.append(slice(el, 0, at));
      const rest = slice(el, at, total);
      rest.classList.add('cont'); // no first-line indent where a paragraph carries on
      queue.unshift(rest);
    } else if (box.childElementCount) queue.unshift(el);
    else {
      box.append(el);
    }
    next();
  }
  // Pair the pages into spreads.
  const pages = Array.from(book.children);
  book.innerHTML = '';
  for (let i = 0; i < pages.length; i += 2) {
    const s = document.createElement('div');
    s.className = 'spread';
    s.append(pages[i]);
    if (pages[i + 1]) s.append(pages[i + 1]);
    else s.classList.add('single');
    book.append(s);
  }
  const info = $('#bookinfo');
  if (info) info.textContent = `${pages.length} ${pages.length == 1 ? 'page' : 'pages'}`;
}

export const bookButton = () =>
  `<button data-a="book" class="${App.book ? 'on' : ''}" title="${App.book ? 'Back to writing' : 'Two-page book view'}" aria-pressed="${!!App.book}"><span aria-hidden="true">📖</span><span class="tlab"> ${App.book ? 'Back to writing' : 'Two pages'}</span></button>`;

/** The book view in place of the editor. */
export const bookView = () =>
  `<div class="main"><div class="bookw"><p class="hint bookhint">Book view, for reading and checking. <span id="bookinfo"></span></p><div class="book" id="book"></div></div></div>`;
