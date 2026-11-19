// Selecting across script lines. Each line is its own editable block, so the browser can only
// select inside one line. When a mouse drag (or Shift+click, or Ctrl/⌘+A) reaches past the line,
// the whole page briefly becomes one editable area so the selection can cover many lines.
// While it is active, every change goes through the story data (with undo), never the page itself.
import { focusB } from './caret';
import { hcommit, hpush, hstep } from './history';
import { App } from '../state';
import { render } from '../views/workspace';

type Pos = { node: Node; off: number };
type At = { b: HTMLElement; o: number };

let multi: HTMLElement | null = null;
let start: { b: HTMLElement; at: Pos } | null = null;

function caretAt(x: number, y: number): Pos | null {
  const d: any = document;
  if (d.caretPositionFromPoint) {
    const p = d.caretPositionFromPoint(x, y);
    return p ? { node: p.offsetNode, off: p.offset } : null;
  }
  const r = d.caretRangeFromPoint?.(x, y);
  return r ? { node: r.startContainer, off: r.startOffset } : null;
}

const blockOf = (n: Node | null): HTMLElement | null =>
  ((n && (n.nodeType == 1 ? n : n.parentElement)) as HTMLElement)?.closest?.('.page .b') || null;

function active() {
  if (multi && !multi.isConnected) multi = null;
  return multi;
}

function enter(page: HTMLElement) {
  multi = page;
  page.contentEditable = 'true';
  page.classList.add('msel');
}

/** Leave the page-wide selection. With `keep`, a selection inside one line stays selected. */
function leave(keep = false) {
  const p = active();
  if (!p) return;
  const s = getSelection(),
    r = s?.rangeCount ? s.getRangeAt(0).cloneRange() : null;
  p.removeAttribute('contenteditable');
  p.classList.remove('msel');
  multi = null;
  const b = r && blockOf(r.startContainer);
  if (keep && b && b == blockOf(r.endContainer)) {
    b.focus({ preventScroll: true });
    s.removeAllRanges();
    s.addRange(r);
  }
}

/** A point in the page as a line and a character offset in it. */
function at(node: Node, off: number, end: boolean): At | null {
  let b = blockOf(node);
  if (!b) {
    // Between lines: use the nearest line.
    const page = active();
    if (!page) return null;
    const kids = [...page.querySelectorAll<HTMLElement>('.b')];
    const r = document.createRange();
    r.setStart(node, off);
    const after = kids.find((k) => r.comparePoint(k, 0) >= 0);
    if (end) {
      const i = after ? kids.indexOf(after) - 1 : kids.length - 1;
      b = kids[Math.max(0, i)];
      return b && { b, o: b.textContent.length };
    }
    b = after || kids[kids.length - 1];
    return b && { b, o: 0 };
  }
  const pre = document.createRange();
  pre.selectNodeContents(b);
  try {
    pre.setEnd(node, off);
  } catch (e) {
    return { b, o: 0 };
  }
  return { b, o: pre.toString().length };
}

function span() {
  const s = getSelection();
  if (!s?.rangeCount) return null;
  const r = s.getRangeAt(0),
    a = at(r.startContainer, r.startOffset, false),
    z = at(r.endContainer, r.endOffset, true);
  if (!a || !z) return null;
  const d = +a.b.dataset.d;
  let si = +a.b.dataset.i,
    so = a.o,
    ei = +z.b.dataset.i,
    eo = z.o;
  if (ei < si || (ei == si && eo < so)) [si, so, ei, eo] = [ei, eo, si, so];
  return { d, si, so, ei, eo };
}

function selText() {
  const p = span();
  if (!p) return '';
  const bl = App.P.drafts[p.d].blocks;
  if (p.si == p.ei) return bl[p.si].x.slice(p.so, p.eo);
  const o = [bl[p.si].x.slice(p.so)];
  for (let i = p.si + 1; i < p.ei; i++) o.push(bl[i].x);
  o.push(bl[p.ei].x.slice(0, p.eo));
  return o.join('\n');
}

/** Replace the selected text with `text`; with `split`, start a new line after it (Enter). */
function replace(text: string, split = false) {
  const p = span();
  if (!p) return leave();
  const bl = App.P.drafts[p.d].blocks,
    f = bl[p.si],
    l = bl[p.ei],
    head = f.x.slice(0, p.so) + text,
    tail = l.x.slice(p.eo);
  hpush();
  if (f.h || l.h) delete f.h;
  bl.splice(p.si + 1, p.ei - p.si);
  if (split) {
    f.x = head;
    bl.splice(p.si + 1, 0, { t: l.t, x: tail });
  } else f.x = head + tail;
  hcommit();
  leave();
  render();
  split ? focusB(p.d, p.si + 1, 0) : focusB(p.d, p.si, head.length);
}

function selectAll(page: HTMLElement) {
  const k = page.querySelectorAll<HTMLElement>('.b');
  if (!k.length) return;
  if (!active()) enter(page);
  const z = k[k.length - 1];
  getSelection().setBaseAndExtent(k[0], 0, z, z.childNodes.length);
}

document.addEventListener(
  'pointerdown',
  (e: PointerEvent) => {
    const wasMulti = !!active();
    if (wasMulti) leave();
    start = null;
    if (e.button != 0 || e.pointerType == 'touch') return;
    const b = blockOf(e.target as Node);
    if (!b) return;
    const s = getSelection();
    // Shift+click in another line selects from the cursor to here.
    if (e.shiftKey && !wasMulti && s?.rangeCount) {
      const a = blockOf(s.anchorNode);
      if (a && a != b && a.parentElement == b.parentElement) {
        const c = caretAt(e.clientX, e.clientY);
        if (c) {
          e.preventDefault();
          const an = { node: s.anchorNode, off: s.anchorOffset };
          enter(b.parentElement);
          getSelection().setBaseAndExtent(an.node, an.off, c.node, c.off);
          start = { b: a, at: an };
          return;
        }
      }
    }
    const c = caretAt(e.clientX, e.clientY);
    if (c) start = { b, at: c };
  },
  true,
);

document.addEventListener('pointermove', (e: PointerEvent) => {
  if (!start || !(e.buttons & 1)) return;
  const page = start.b.parentElement;
  if (!page?.isConnected) return (start = null);
  if (!active()) {
    const o = blockOf(document.elementFromPoint(e.clientX, e.clientY));
    if (!o || o == start.b || o.parentElement != page) return;
    enter(page);
  }
  const c = caretAt(e.clientX, e.clientY);
  if (!c || !page.contains(c.node)) return;
  e.preventDefault();
  getSelection().setBaseAndExtent(start.at.node, start.at.off, c.node, c.off);
});

document.addEventListener('pointerup', () => {
  if (!start) return;
  start = null;
  const s = getSelection();
  if (active() && (!s?.rangeCount || s.isCollapsed || blockOf(s.anchorNode) == blockOf(s.focusNode))) leave(true);
});

document.addEventListener(
  'keydown',
  (e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey,
      k = e.key.toLowerCase();
    if (!active()) {
      // Ctrl/⌘+A in a script line selects the whole script.
      const b = blockOf(e.target as Node);
      if (mod && k == 'a' && !e.shiftKey && b) {
        e.preventDefault();
        e.stopImmediatePropagation();
        selectAll(b.parentElement);
      }
      return;
    }
    const stop = () => {
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    if (mod && ['c', 'x', 'v'].includes(k)) return; // handled by the copy, cut and paste events
    if (mod && (k == 'z' || k == 'y')) {
      stop();
      leave();
      k == 'y' || e.shiftKey ? hstep(App.HR, App.HU) : hstep(App.HU, App.HR);
      return;
    }
    if (mod && k == 'a') {
      stop();
      selectAll(multi);
      return;
    }
    if (mod || e.altKey && e.key.length != 1) return;
    if (e.key == 'Backspace' || e.key == 'Delete') return stop(), replace('');
    if (e.key == 'Enter') return stop(), replace('', true);
    if (e.key == 'Tab') return stop();
    if (e.key.length == 1) return stop(), replace(e.key);
    if (/^(Arrow|Home|End|Page)/.test(e.key) && e.shiftKey) return; // extend the selection
    if (/^(Arrow|Home|End|Page)/.test(e.key) || e.key == 'Escape') {
      stop();
      const p = span();
      leave();
      if (p) {
        const back = e.key == 'ArrowLeft' || e.key == 'ArrowUp' || e.key == 'Home' || e.key == 'PageUp';
        back ? focusB(p.d, p.si, p.so) : focusB(p.d, p.ei, p.eo);
      }
    }
  },
  true,
);

document.addEventListener(
  'copy',
  (e: ClipboardEvent) => {
    if (!active()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    e.clipboardData.setData('text/plain', selText());
  },
  true,
);

document.addEventListener(
  'cut',
  (e: ClipboardEvent) => {
    if (!active()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    e.clipboardData.setData('text/plain', selText());
    replace('');
  },
  true,
);

document.addEventListener(
  'paste',
  (e: ClipboardEvent) => {
    if (!active()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    replace(e.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n'));
  },
  true,
);

// Anything else that would change the page directly (spelling fixes, text input methods,
// dragging text) is blocked while many lines are selected.
for (const ev of ['beforeinput', 'dragstart', 'drop']) {
  document.addEventListener(
    ev,
    (e: Event) => {
      if (active()) e.preventDefault();
    },
    true,
  );
}
