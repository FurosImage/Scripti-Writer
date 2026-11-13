// Connection lines between board items.
import { bsnap } from './actions';
import { App, save } from '../state';
import { $, esc } from '../utils';

export function rectOf(id?: any) {
  const e = $(`#cv .it[data-id="${id}"]`);
  return e && { x: e.offsetLeft, y: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight };
}

export const anc = (r?: any) => [
  [r.x + r.w / 2, r.y],
  [r.x + r.w / 2, r.y + r.h],
  [r.x, r.y + r.h / 2],
  [r.x + r.w, r.y + r.h / 2],
];

export function best(a?: any, b?: any) {
  let m = 1e9,
    p;
  for (const u of anc(a))
    for (const v of anc(b)) {
      const d = Math.hypot(u[0] - v[0], u[1] - v[1]);
      if (d < m) {
        m = d;
        p = [u, v];
      }
    }
  return p;
}

export function drawLinks() {
  const svg = $('#lk'),
    lb = $('#lb');
  if (!svg || !App.P) return;
  let s = '',
    h = '';
  for (const l of App.P.board.l) {
    const A = rectOf(l.a),
      Bb = rectOf(l.b);
    if (!A || !Bb) continue;
    const [u, v] = best(A, Bb),
      d = Math.hypot(u[0] - v[0], u[1] - v[1]);
    s += `<g data-lid="${l.id}" class="${App.selL == l.id ? 'on' : ''}"><line class="hit" x1="${u[0]}" y1="${u[1]}" x2="${v[0]}" y2="${v[1]}"/><line class="ln" x1="${u[0]}" y1="${u[1]}" x2="${v[0]}" y2="${v[1]}"/><circle cx="${u[0]}" cy="${u[1]}" r="3.5" style="fill:var(--ac)"/><circle cx="${v[0]}" cy="${v[1]}" r="3.5" style="fill:var(--ac)"/></g>`;
    const w = d - 34,
      fs = Math.max(9, Math.min(12, d / 14));
    if (l.t && w > 26)
      h += `<div class="lbl" data-lid="${l.id}" style="left:${(u[0] + v[0]) / 2}px;top:${(u[1] + v[1]) / 2}px;max-width:${w}px;font-size:${fs}px" title="${esc(l.t)}">${esc(l.t)}</div>`;
  }
  svg.innerHTML = s + '<line id="tmpl" class="ln" style="display:none"/><g id="tmpg"></g>';
  lb.innerHTML = h;
}

export function editLabel(id?: any) {
  const l = App.P.board.l.find((l?: any) => l.id == id);
  if (!l) return;
  const A = rectOf(l.a),
    Bb = rectOf(l.b);
  if (!A || !Bb) return;
  const [u, v] = best(A, Bb);
  const d = document.createElement('div');
  d.className = 'lbl';
  d.style.left = (u[0] + v[0]) / 2 + 'px';
  d.style.top = (u[1] + v[1]) / 2 + 'px';
  d.innerHTML = `<input value="${esc(l.t || '')}" placeholder="Label" aria-label="Connection label">`;
  $('#lb').append(d);
  const i = d.firstChild;
  i.focus();
  i.select();
  let fin = false;
  const done = (ok?: any) => {
    if (fin) return;
    fin = true;
    if (ok && i.value !== (l.t || '')) {
      bsnap();
      l.t = i.value.trim();
      save();
    }
    drawLinks();
  };
  i.onkeydown = (e?: any) => {
    e.stopPropagation();
    if (e.key == 'Enter') done(true);
    if (e.key == 'Escape') done(false);
  };
  i.onblur = () => done(true);
}
