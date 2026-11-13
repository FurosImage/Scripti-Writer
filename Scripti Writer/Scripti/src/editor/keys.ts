// Keyboard handling inside script blocks (Enter, Tab, Backspace, undo).
import { NEXT, TYPES } from '../constants';
import { acAccept, acDraw, acHide } from './autocomplete';
import { caretOff, focusB } from './caret';
import { hcommit, hpush, hstep } from './history';
import { leaveBlock } from '../project';
import { App } from '../state';
import { esc, hasMk } from '../utils';
import { render } from '../views/workspace';

export function blockKeys(e?: any, b?: any) {
  const d = +b.dataset.d,
    i = +b.dataset.i,
    bl = App.P.drafts[d].blocks,
    k = bl[i],
    mod = e.ctrlKey || e.metaKey;
  if (App.AC && App.AC.el == b) {
    if (e.key == 'ArrowDown' || e.key == 'ArrowUp') {
      e.preventDefault();
      App.AC.idx = (App.AC.idx + (e.key == 'ArrowDown' ? 1 : -1) + App.AC.items.length) % App.AC.items.length;
      acDraw();
      return;
    }
    if (e.key == 'Tab' || (e.key == 'Enter' && !e.shiftKey)) {
      e.preventDefault();
      acAccept(App.AC.idx);
      return;
    }
    if (e.key == 'Escape') {
      e.preventDefault();
      acHide();
      return;
    }
  }
  if (e.key == 'Enter' && e.shiftKey && !mod) {
    e.preventDefault();
    const sel = getSelection();
    if (!sel?.rangeCount) return;
    const r = sel.getRangeAt(0);
    r.deleteContents();
    const tn = document.createTextNode('\n');
    r.insertNode(tn);
    r.setStartAfter(tn);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    b.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  if (mod && e.key.toLowerCase() == 'z') {
    e.preventDefault();
    e.shiftKey ? hstep(App.HR, App.HU) : hstep(App.HU, App.HR);
    return;
  }
  if (mod && e.key.toLowerCase() == 'y') {
    e.preventDefault();
    hstep(App.HR, App.HU);
    return;
  }
  if (mod && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
    e.preventDefault();
    return;
  }
  if (e.key == 'Tab') {
    e.preventDefault();
    const off = caretOff(b);
    hpush();
    const j = TYPES.findIndex((t?: any) => t[0] == k.t);
    k.t = TYPES[(j + (e.shiftKey ? TYPES.length - 1 : 1)) % TYPES.length][0];
    hcommit();
    render();
    focusB(d, i, off);
    return;
  }
  if (e.key == 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const s = getSelection();
    if (!s.rangeCount) return;
    const r = s.getRangeAt(0);
    if (r.collapsed && caretOff(b) == 0 && b.textContent.length) {
      // At the start of a line: open an empty line above and keep this line (and its id) intact.
      hpush();
      bl.splice(i, 0, { t: k.t == 'scene' ? 'action' : k.t, x: '' });
      hcommit();
      render();
      focusB(d, i + 1, 0);
      return;
    }
    hpush();
    if (!r.collapsed) r.deleteContents();
    const tail = document.createRange();
    tail.selectNodeContents(b);
    tail.setStart(r.endContainer, r.endOffset);
    const tmp = document.createElement('div');
    tmp.append(tail.extractContents());
    k.x = b.textContent;
    k.h = hasMk(b.innerHTML) ? b.innerHTML : undefined;
    const rest = tmp.textContent;
    let nt = rest ? k.t : NEXT[k.t];
    if (!k.x.trim() && !rest && k.t != 'action') {
      k.t = 'action';
      nt = null;
    }
    if (nt) bl.splice(i + 1, 0, { t: nt, x: rest, h: hasMk(tmp.innerHTML) ? tmp.innerHTML : undefined });
    leaveBlock(k);
    hcommit();
    render();
    nt ? focusB(d, i + 1, 0) : focusB(d, i);
    return;
  }
  if (e.key == 'Backspace' && i > 0) {
    const s = getSelection();
    if (s.isCollapsed && caretOff(b) == 0) {
      e.preventDefault();
      hpush();
      const p = bl[i - 1],
        off = p.x.length,
        ph = (p.h || esc(p.x)) + (k.h || esc(k.x));
      p.x += k.x;
      p.h = hasMk(ph) ? ph : undefined;
      bl.splice(i, 1);
      hcommit();
      render();
      focusB(d, i - 1, off);
    }
    return;
  }
  if (e.key == 'ArrowUp' && i > 0 && caretOff(b) == 0) {
    e.preventDefault();
    focusB(d, i - 1);
    return;
  }
  if (e.key == 'ArrowDown' && i < bl.length - 1 && caretOff(b) == b.textContent.length) {
    e.preventDefault();
    focusB(d, i + 1, 0);
  }
}
