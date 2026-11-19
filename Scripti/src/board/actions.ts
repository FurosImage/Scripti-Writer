// Board actions: selection, undo, zoom, editing.
import { drawLinks } from './links';
import { props } from './props';
import { board, tf, updHandles } from './render';
import { focusB, setCaret } from '../editor/caret';
import { App, persist, save } from '../state';
import { $, $$, toast } from '../utils';
import { render } from '../views/workspace';

export function refreshSel() {
  $$('#cv .it').forEach((e?: any) => e.classList.toggle('sel', App.sel.has(e.dataset.id)));
  drawLinks();
  updHandles();
  props();
}

export function bsnap() {
  const B = App.P.board;
  App.BU.push(JSON.stringify({ n: B.n, c: B.c, l: B.l }));
  if (App.BU.length > 150) App.BU.shift();
  App.BR = [];
}

export function bstep(a?: any, b?: any) {
  if (!a.length) {
    toast(a === App.BU ? 'Nothing to undo' : 'Nothing to redo');
    return;
  }
  const B = App.P.board;
  b.push(JSON.stringify({ n: B.n, c: B.c, l: B.l }));
  Object.assign(B, JSON.parse(a.pop()));
  App.sel.clear();
  App.selL = null;
  save();
  board();
}

export function delSel() {
  const B = App.P.board;
  if (!App.sel.size && !App.selL) return;
  bsnap();
  B.n = B.n.filter((o?: any) => !App.sel.has(o.id));
  B.c = B.c.filter((o?: any) => !App.sel.has(o.id));
  B.l = B.l.filter((l?: any) => l.id != App.selL && !App.sel.has(l.a) && !App.sel.has(l.b));
  App.sel.clear();
  App.selL = null;
  save();
  board();
}

/** Where a tool dragged onto the canvas was dropped (canvas units), while its item is added. */
let dropAt: number[] | null = null;
export function setDrop(p: number[] | null) {
  dropAt = p;
}

export function nextPos(w?: any, h?: any) {
  if (dropAt) return [Math.round(dropAt[0] - w / 2), Math.round(dropAt[1] - h / 2)];
  const r = $('#bd').getBoundingClientRect(),
    B = App.P.board,
    k = ((B.n.length + B.c.length) % 7) * 20;
  return [
    Math.round((r.width / 2 - B.x) / B.z - w / 2 + k),
    Math.round((r.height / 2 - B.y) / B.z - h / 2 + k),
  ];
}

export function toCanvas(e?: any) {
  const r = $('#bd').getBoundingClientRect(),
    B = App.P.board;
  return [(e.clientX - r.left - B.x) / B.z, (e.clientY - r.top - B.y) / B.z];
}

export function zoomAt(f?: any, mx?: any, my?: any) {
  const B = App.P.board,
    z = Math.min(3, Math.max(0.25, B.z * f));
  if (mx == null) {
    const r = $('#bd').getBoundingClientRect();
    mx = r.width / 2;
    my = r.height / 2;
  }
  B.x = mx - ((mx - B.x) * z) / B.z;
  B.y = my - ((my - B.y) * z) / B.z;
  B.z = z;
  tf();
  persist();
}

export function editTx(tx?: any) {
  if (!tx) return;
  tx.contentEditable = 'true';
  tx.focus();
  setCaret(tx, tx.textContent.length);
}

export function goScene(d?: any, i?: any) {
  App.tab = 'Script';
  App.dr = d;
  render();
  focusB(d, i, 0);
  $(`.b[data-d="${d}"][data-i="${i}"]`)?.scrollIntoView({ block: 'center' });
}

export function addC(o?: any) {
  bsnap();
  App.P.board.c.push(o);
  App.sel = new Set([o.id]);
  App.selL = null;
  App.tool = 'select';
  save();
  board();
  return o;
}

export function tmpDraw(html?: any) {
  const g = $('#tmpg');
  if (g) g.innerHTML = html;
}
