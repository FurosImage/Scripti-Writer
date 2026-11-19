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

/* Novel pages, like Word: separate A4 sheets with a gap between them. The text is one editable
   area laid over the sheets; a paragraph that would run past the bottom margin of a sheet is
   moved down to the top of the next one (with padding set from a style sheet, so the saved
   text never changes). Only a paragraph longer than a whole page runs across the gap. */
const GAP = 28;

function novelSheets() {
  const nv = $('#nv:not(.sp2)') as HTMLElement | null;
  const pane = nv?.parentElement;
  if (!nv || !pane) return;
  let st = document.getElementById('nvpg') as HTMLStyleElement | null;
  if (!st) {
    st = document.createElement('style');
    st.id = 'nvpg';
    document.head.append(st);
  }
  const W = nv.clientWidth;
  if (W < 100) return;
  const H = Math.round((W * 297) / 210),
    cs = getComputedStyle(nv),
    MT = parseFloat(cs.paddingTop) || 0,
    MB = parseFloat(cs.paddingBottom) || 0,
    room = H - MT - MB,
    step = H + GAP;
  // Measure where everything sits with no pushes, then work out the pushes in one go.
  st.textContent = '';
  const kids = Array.from(nv.children) as HTMLElement[];
  const box = kids.map((k) => [k.offsetTop, k.offsetHeight]);
  let shift = 0,
    css = '',
    end = MT;
  kids.forEach((k, i) => {
    const top = box[i][0] + shift,
      h = box[i][1],
      pg = Math.floor(top / step),
      bottom = top + h,
      limit = pg * step + H - MB,
      inGap = top > pg * step + H - MB;
    if ((bottom > limit || inGap) && h <= room && h > 0) {
      const d = (pg + 1) * step + MT - top;
      shift += d;
      css += `#nv:not(.sp2)>:nth-child(${i + 1}){padding-top:${d}px!important}`;
      end = top + d + h;
    } else end = bottom;
  });
  st.textContent = css;
  const pages = Math.max(1, Math.floor(Math.max(0, end - 1) / step) + 1);
  nv.style.minHeight = pages * step - GAP + 'px';
  nv.style.setProperty('--pgh', H + 'px');
  // The sheets behind the text, numbered at the bottom.
  let layer = pane.querySelector('.nvs') as HTMLElement | null;
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'nvs';
    layer.setAttribute('aria-hidden', 'true');
    pane.prepend(layer);
  }
  layer.style.top = nv.offsetTop + 'px';
  while (layer.children.length > pages) layer.lastElementChild!.remove();
  while (layer.children.length < pages) {
    const n = layer.children.length + 1,
      d = document.createElement('div');
    d.className = 'nvsh';
    d.innerHTML = `<span>${n}</span>`;
    layer.append(d);
  }
  (Array.from(layer.children) as HTMLElement[]).forEach((d, i) => {
    d.style.top = i * step + 'px';
    d.style.height = H + 'px';
  });
}

/** Draw the page numbers (after a render, and a moment after typing stops). */
export function paintPages() {
  if (!App.P) return;
  if (App.book) return $('#book') ? paintBook() : paintSpread();
  if (App.tab != 'Script') return;
  if (App.P.type == 'ms') scriptNumbers();
  else if (App.P.type == 'novel') novelSheets();
}

document.addEventListener('input', (e) => {
  const t = e.target as HTMLElement;
  // Novel sheets follow the text straight away, so nothing is ever written into a gap.
  if (t?.id == 'nv' && !App.book) {
    requestAnimationFrame(novelSheets);
    return;
  }
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
  `<button data-a="book" class="${App.book ? 'on' : ''}" title="${App.book ? 'Back to one page' : 'Two pages side by side'}" aria-pressed="${!!App.book}"><span aria-hidden="true">📖</span><span class="tlab"> ${App.book ? 'One page' : 'Two pages'}</span></button>`;

/** The book view in place of the editor. */
export const bookView = () =>
  `<div class="main"><div class="bookw"><p class="hint bookhint">Book view, for reading and checking. <span id="bookinfo"></span></p><div class="book" id="book"></div></div></div>`;

/* ---------- two-page spread for writing ---------- */

/** Width of one spread (one page on phones): the distance the text moves per page turn. */
const spreadW = (nv: HTMLElement) => nv.clientWidth;

/** The page numbers and "Pages 3–4 of 9" for the spread on screen. */
export function paintSpread() {
  const nv = $('#nv.sp2') as HTMLElement | null;
  if (!nv) return;
  const W = spreadW(nv);
  if (W < 50) return;
  const two = getComputedStyle(nv).columnCount != '1',
    per = two ? 2 : 1;
  // How many pages the text fills: the column the last bit of text sits in.
  let pages = 1;
  const last = nv.lastChild;
  if (last) {
    const r = document.createRange();
    r.selectNodeContents(last);
    const rs = r.getClientRects(),
      box = nv.getBoundingClientRect();
    const x = rs.length ? rs[rs.length - 1].left - box.left + nv.scrollLeft : 0;
    pages = Math.max(1, Math.floor(x / (W / per)) + 1);
  }
  const k = Math.round(nv.scrollLeft / W),
    first = k * per + 1;
  const l = $('.sp2n.l'),
    rt = $('.sp2n.r');
  if (l) l.textContent = String(first);
  if (rt) rt.textContent = two ? String(first + 1) : '';
  const info = $('#sp2info');
  if (info)
    info.textContent =
      per == 2 ? `Pages ${first}–${first + 1} of ${Math.max(pages, first)}` : `Page ${first} of ${Math.max(pages, first)}`;
  const prev = $('[data-a=sp2prev]') as HTMLButtonElement,
    next = $('[data-a=sp2next]') as HTMLButtonElement;
  if (prev) prev.disabled = k == 0;
  if (next) next.disabled = first + per > pages;
}

/** Turn the pages: -1 back, +1 forward. */
export function turnSpread(dir: number) {
  const nv = $('#nv.sp2') as HTMLElement | null;
  if (!nv) return;
  const W = spreadW(nv);
  nv.scrollLeft = (Math.round(nv.scrollLeft / W) + dir) * W;
  paintSpread();
}

// Keep the text lined up on whole spreads (the browser scrolls a little to follow the cursor).
document.addEventListener(
  'scroll',
  (e) => {
    const nv = e.target as HTMLElement;
    if (!(nv instanceof HTMLElement) || !nv.matches('#nv.sp2')) return;
    const W = spreadW(nv),
      want = Math.round(nv.scrollLeft / W) * W;
    if (Math.abs(nv.scrollLeft - want) > 1) nv.scrollLeft = want;
    paintSpread();
  },
  true,
);
// Mouse wheel or trackpad over the sheet turns the pages.
let wheelT = 0;
document.addEventListener(
  'wheel',
  (e) => {
    const nv = (e.target as HTMLElement)?.closest?.('.sheet2')?.querySelector('#nv.sp2');
    if (!nv) return;
    e.preventDefault();
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(d) < 8 || Date.now() - wheelT < 350) return;
    wheelT = Date.now();
    turnSpread(d > 0 ? 1 : -1);
  },
  { passive: false },
);

// Font or size changes move the text, so lay the sheets out again.
document.addEventListener('change', (e) => {
  const c = (e.target as HTMLElement)?.dataset?.c;
  if (c == 'nf' || c == 'ns' || c == 'np') requestAnimationFrame(paintPages);
});
