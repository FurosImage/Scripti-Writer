// Highlights and inline comments in the script.
import { hcommit, hpush } from './history';
import { blk } from '../project';
import { $, esc, hasMk, toast } from '../utils';
import { render } from '../views/workspace';

export function saveBlock(b?: any) {
  const k = blk(b);
  k.x = b.textContent;
  k.h = hasMk(b.innerHTML) ? b.innerHTML : undefined;
  hcommit();
}

export function highlight() {
  const s = getSelection();
  if (!s.rangeCount || s.isCollapsed) {
    toast('Select some text in the script first');
    return;
  }
  const r = s.getRangeAt(0),
    n = r.commonAncestorContainer,
    b = (n.nodeType == 1 ? n : n.parentElement).closest('.b');
  if (!b) {
    toast('Highlight within a single block');
    return;
  }
  hpush();
  const m = document.createElement('mark');
  m.dataset.cm = '';
  m.append(r.extractContents());
  r.insertNode(m);
  s.removeAllRanges();
  saveBlock(b);
  cpop(m);
}

export function cpop(m?: any) {
  $('#cpop')?.remove();
  const b = m.closest('.b');
  const p = document.createElement('div');
  p.id = 'cpop';
  p.className = 'pop';
  const r = m.getBoundingClientRect();
  p.style.left = Math.min(r.left, innerWidth - 280) + 'px';
  p.style.top = r.bottom + 8 + 'px';
  p.innerHTML = `<textarea placeholder="Add a comment…" aria-label="Comment">${esc(m.dataset.cm)}</textarea><div><button data-k="rm" class="danger">Remove highlight</button><button data-k="ok" class="pri">Save</button></div>`;
  document.body.append(p);
  const ta = p.querySelector('textarea');
  ta.focus();
  const done = () => {
    p.remove();
    render();
  };
  p.querySelector('[data-k=ok]').onclick = () => {
    hpush();
    m.dataset.cm = ta.value.trim();
    saveBlock(b);
    done();
  };
  p.querySelector('[data-k=rm]').onclick = () => {
    hpush();
    m.replaceWith(...m.childNodes);
    b.normalize();
    saveBlock(b);
    done();
  };
  ta.onkeydown = (e?: any) => {
    if (e.key == 'Enter' && !e.shiftKey) {
      e.preventDefault();
      p.querySelector('[data-k=ok]').click();
    }
    if (e.key == 'Escape') done();
  };
}
