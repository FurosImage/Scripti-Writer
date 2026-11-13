// Caret helpers for the block-based script editor.
import { $ } from '../utils';

export function caretOff(el?: any) {
  const s = getSelection();
  if (!s.rangeCount) return 0;
  const r = s.getRangeAt(0),
    pre = document.createRange();
  pre.selectNodeContents(el);
  try {
    pre.setEnd(r.startContainer, r.startOffset);
  } catch (e) {
    return 0;
  }
  return pre.toString().length;
}

export function setCaret(el?: any, off?: any) {
  const s = getSelection(),
    r = document.createRange(),
    w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n,
    left = off,
    ok = false;
  while ((n = w.nextNode())) {
    if (left <= n.length) {
      r.setStart(n, left);
      r.collapse(true);
      ok = true;
      break;
    }
    left -= n.length;
  }
  if (!ok) {
    r.selectNodeContents(el);
    r.collapse(off === 0);
  }
  s.removeAllRanges();
  s.addRange(r);
}

export function focusB(d?: any, i?: any, off?: any) {
  const e = $(`.b[data-d="${d}"][data-i="${i}"]`);
  if (!e) return;
  e.focus();
  setCaret(e, off == null ? e.textContent.length : off);
  e.scrollIntoView({ block: 'nearest' });
}
