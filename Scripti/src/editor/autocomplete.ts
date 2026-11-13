// Autocomplete for character cues and scene headings.
import { TIMES } from '../constants';
import { setCaret } from './caret';
import { hcommit, hpush } from './history';
import { blk } from '../project';
import { App } from '../state';
import { $, cue, esc } from '../utils';

export function acUpdate(b?: any, k?: any) {
  const x = b.textContent,
    u = x.toUpperCase();
  let items = [],
    lab = '';
  if (k.t == 'character') {
    const q = u.trim();
    if (q) {
      const names = new Set();
      App.P.chars.forEach((c?: any) => c.n && names.add(c.n.toUpperCase().split(/\s+/)[0]));
      App.P.drafts.forEach((d?: any) =>
        d.blocks.forEach((bb?: any) => {
          if (bb.t == 'character' && bb !== k) {
            const c = cue(bb.x);
            if (c) names.add(c);
          }
        }),
      );
      items = [...names].filter((n?: any) => n.startsWith(q) && n != q).slice(0, 6);
      lab = 'Characters';
    }
  } else if (k.t == 'scene') {
    const m = u.match(/^(INT\.\/EXT\.|EXT\.\/INT\.|INT\.|EXT\.|I\/E\.?)\s(.*)$/);
    if (m) {
      const q = m[2];
      if (!q.includes(' - ')) {
        const t = q.trim();
        items = App.P.locs
          .map((l?: any) => l.n)
          .filter((n?: any) => n && n.startsWith(t) && n != t)
          .slice(0, 6)
          .map((n?: any) => m[1] + ' ' + n + ' - ');
        lab = 'Locations';
      } else {
        const tq = q.split(' - ').pop();
        items = TIMES.filter((t?: any) => t.startsWith(tq) && t != tq)
          .map((t?: any) => u.slice(0, u.length - tq.length) + t)
          .slice(0, 6);
        lab = 'Time of day';
      }
    } else if (u.trim() && u.length < 9)
      items = ['INT. ', 'EXT. ', 'INT./EXT. '].filter((p?: any) => p.startsWith(u) && p != u);
  }
  if (!items.length) {
    acHide();
    return;
  }
  const keep = App.AC && App.AC.el == b ? Math.min(App.AC.idx, items.length - 1) : 0;
  App.AC = { el: b, items, idx: keep, lab };
  acDraw();
}

export function acDraw() {
  let a = $('#ac');
  if (!a) {
    a = document.createElement('div');
    a.id = 'ac';
    a.className = 'ac';
    document.body.append(a);
  }
  const r = App.AC.el.getBoundingClientRect();
  a.style.left = r.left + 'px';
  a.style.top = r.bottom + 4 + 'px';
  a.innerHTML =
    `<small>${App.AC.lab || 'Suggestions'}, Tab to accept</small>` +
    App.AC.items
      .map(
        (t?: any, n?: any) =>
          `<div data-ac="${n}" class="${n == App.AC.idx ? 'on' : ''}">${esc(t.trim())}</div>`,
      )
      .join('');
}

export function acHide() {
  App.AC = null;
  $('#ac')?.remove();
}

export function acAccept(n?: any) {
  if (!App.AC) return;
  const it = App.AC.items[n],
    b = App.AC.el,
    k = blk(b);
  hpush();
  b.textContent = it;
  k.x = it;
  k.h = undefined;
  hcommit();
  setCaret(b, it.length);
  acHide();
  if (k.t == 'scene') acUpdate(b, k);
}
