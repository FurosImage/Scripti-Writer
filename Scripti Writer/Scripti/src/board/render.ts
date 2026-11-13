// Rendering board items (notes, cards, shapes, lines, strokes, timelines).
import { drawLinks } from './links';
import { props } from './props';
import { PAD } from '../constants';
import { sceneRef } from '../project';
import { App } from '../state';
import { $, $$, colv, esc } from '../utils';

export const findO = (id?: any) =>
  App.P.board.n.find((o?: any) => o.id == id) || App.P.board.c.find((o?: any) => o.id == id);

export const DOTS = ['t', 'b', 'l', 'r']
  .map((p?: any) => `<i class="dot an-${p}" data-dot="${p}"></i>`)
  .join('');

export const noteBg = (c?: any) =>
  c == 'white' || !c ? '#fdfdfb' : c == 'black' ? '#121926' : `color-mix(in srgb,${c} 42%,#fff)`;

export const noteFg = (c?: any) => (c == 'black' ? '#e6ecf5' : '#16181d');

export function accOf(o?: any) {
  if (o.col) return o.col;
  if (o.k == 'c') {
    const ch = App.P.chars.find((x?: any) => x.id == o.ref);
    if (ch && ch.col) return ch.col;
  }
  return 'var(--ac)';
}

export const isSel = (o?: any) => (App.sel.has(o.id) ? 'sel' : '');

/** The scene card this item is connected to, if any. */
export function linkedScene(id: string) {
  for (const l of App.P.board.l) {
    const o = l.a == id ? l.b : l.b == id ? l.a : null;
    const c = o && App.P.board.c.find((x: any) => x.id == o && x.k == 's');
    if (c && sceneRef(c).i >= 0) return c;
  }
  return null;
}

export function noteHTML(n?: any) {
  return `<div class="it nt ${n.min ? 'min' : ''} ${isSel(n)}" data-id="${n.id}" style="left:${n.x}px;top:${n.y}px;background:${noteBg(n.c)};color:${noteFg(n.c)}${n.c == 'black' ? ';border:1px solid #3a4660' : ''}"><div class="nh">${linkedScene(n.id) ? `<button class="ib" data-a="nscene" data-id="${n.id}" title="Open the linked scene in the script" aria-label="Open linked scene">↗</button>` : ''}<button class="ib" data-a="nmin" data-id="${n.id}" title="${n.min ? 'Expand' : 'Minimise'}">${n.min ? '▢' : '–'}</button><button class="ib" data-a="bdel" data-id="${n.id}" title="Delete">×</button></div><div class="tx" data-nid="${n.id}">${esc(n.t)}</div>${DOTS}</div>`;
}

export function cardHTML(c?: any) {
  const a = accOf(c);
  if (c.k == 'b')
    return `<div class="it beat ${isSel(c)}" data-id="${c.id}" style="left:${c.x}px;top:${c.y}px;border-color:${a}"><span class="tx" data-bid="${c.id}">${esc(c.t)}</span></div>`;
  let t = '',
    body = '',
    tag = '';
  if (c.k == 's') {
    const r = sceneRef(c),
      dd = App.P.drafts[r.d],
      s = dd.blocks[r.i];
    t = s ? s.x || 'Untitled scene' : 'Scene removed';
    let syn = '';
    if (s)
      for (let j = r.i + 1; j < dd.blocks.length && dd.blocks[j].t != 'scene'; j++)
        if (dd.blocks[j].t == 'action') {
          syn = dd.blocks[j].x;
          break;
        }
    body = esc(syn);
    tag = 'Scene';
  } else {
    const ch = App.P.chars.find((x?: any) => x.id == c.ref);
    t = ch ? ch.n || 'Unnamed' : 'Character removed';
    body = ch ? `${ch.r ? `<b>${esc(ch.r)}</b><br>` : ''}${esc(ch.p || ch.d)}` : '';
    tag = 'Character';
  }
  return `<div class="it cd ${c.min ? 'min' : ''} ${isSel(c)}" data-id="${c.id}" style="left:${c.x}px;top:${c.y}px"><div class="box" style="width:${c.w || 220}px;height:${c.h || 110}px;border-color:${a}"><div class="h" style="background:color-mix(in srgb,${a} 16%,transparent)"><i style="color:${a}">${tag}</i>${c.k == 's' ? `<b class="tx sct" data-sct="${c.id}" title="${esc(t)}">${esc(t)}</b><button class="ib" data-a="scedit" data-id="${c.id}" title="Rename scene" aria-label="Rename scene">✎</button>` : `<b title="${esc(t)}">${esc(t)}</b>`}<button class="ib" data-a="bmin" data-id="${c.id}" title="${c.min ? 'Expand' : 'Minimise'}">${c.min ? '▢' : '–'}</button><button class="ib" data-a="bdel" data-id="${c.id}" title="Remove from board">×</button></div><div class="bd">${body}</div></div>${DOTS}</div>`;
}

export function shapeHTML(o?: any) {
  const c = colv(o.col),
    st = `fill:color-mix(in srgb,${c} 9%,transparent);stroke:${c};stroke-width:${o.sw || 3}`,
    ve = 'vector-effect="non-scaling-stroke"';
  const el =
    o.st == 'ellipse'
      ? `<ellipse cx="50" cy="50" rx="50" ry="50" style="${st}" ${ve}/>`
      : o.st == 'tri'
        ? `<path d="M50 0L100 100H0z" style="${st};stroke-linejoin:round" ${ve}/>`
        : `<rect x="0" y="0" width="100" height="100" style="${st}" ${ve}/>`;
  return `<div class="it shape ${isSel(o)}" data-id="${o.id}" style="left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h}px;transform:rotate(${o.rot || 0}deg)"><svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style="overflow:visible;display:block">${el}</svg></div>`;
}

export function lineHTML(o?: any) {
  const bx = Math.min(0, o.dx),
    by = Math.min(0, o.dy),
    w = Math.abs(o.dx) + 2 * PAD,
    h = Math.abs(o.dy) + 2 * PAD,
    x1 = -bx + PAD,
    y1 = -by + PAD,
    x2 = x1 + o.dx,
    y2 = y1 + o.dy,
    c = colv(o.col),
    sw = o.sw || 3,
    m = 'm' + o.id;
  return `<div class="it lnit ${isSel(o)}" data-id="${o.id}" style="left:${o.x + bx - PAD}px;top:${o.y + by - PAD}px;width:${w}px;height:${h}px"><svg width="${w}" height="${h}" style="overflow:visible;display:block"><defs><marker id="${m}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" style="fill:${c}"/></marker></defs><line class="hitp" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:${c};stroke-width:${sw};stroke-linecap:round" ${o.st != 'line' ? `marker-end="url(#${m})"` : ''} ${o.st == 'darrow' ? `marker-start="url(#${m})"` : ''}/></svg></div>`;
}

export function strokeHTML(o?: any) {
  const c = colv(o.col),
    ve = 'vector-effect="non-scaling-stroke"';
  return `<div class="it stroke ${isSel(o)}" data-id="${o.id}" style="left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h}px"><svg viewBox="0 0 ${o.ow} ${o.oh}" preserveAspectRatio="none" width="100%" height="100%" style="overflow:visible;display:block"><path class="hitp" d="${o.pts}" ${ve}/><path d="${o.pts}" style="fill:none;stroke:${c};stroke-width:${o.sw || 3};stroke-linecap:round;stroke-linejoin:round" ${ve}/></svg></div>`;
}

export function tlHTML(o?: any) {
  const n = o.acts.length,
    c = colv(o.col),
    H = o.or != 'v',
    ls = `stroke:${c};stroke-width:4;stroke-linecap:round`,
    ts = `stroke:${c};stroke-width:3;stroke-linecap:round`;
  let g = '',
    lab = '';
  if (H) {
    const y = o.h - 14;
    g = `<line class="hitp" x1="0" y1="${y}" x2="${o.w}" y2="${y}"/><line x1="0" y1="${y}" x2="${o.w}" y2="${y}" style="${ls}"/>`;
    for (let i = 0; i <= n; i++) {
      const x = (i * o.w) / n;
      g += `<line x1="${x}" y1="${y - 9}" x2="${x}" y2="${y + 9}" style="${ts}"/>`;
    }
    lab = o.acts
      .map(
        (a?: any, i?: any) =>
          `<span class="tx act" data-act="${i}" data-tid="${o.id}" style="left:${((i + 0.5) * 100) / n}%;bottom:30px;transform:translateX(-50%);color:${c}">${esc(a)}</span>`,
      )
      .join('');
  } else {
    const x = 14;
    g = `<line class="hitp" x1="${x}" y1="0" x2="${x}" y2="${o.h}"/><line x1="${x}" y1="0" x2="${x}" y2="${o.h}" style="${ls}"/>`;
    for (let i = 0; i <= n; i++) {
      const y = (i * o.h) / n;
      g += `<line x1="${x - 9}" y1="${y}" x2="${x + 9}" y2="${y}" style="${ts}"/>`;
    }
    lab = o.acts
      .map(
        (a?: any, i?: any) =>
          `<span class="tx act" data-act="${i}" data-tid="${o.id}" style="left:34px;top:${((i + 0.5) * 100) / n}%;transform:translateY(-50%);color:${c}">${esc(a)}</span>`,
      )
      .join('');
  }
  return `<div class="it tl ${isSel(o)}" data-id="${o.id}" style="left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h}px"><svg width="${o.w}" height="${o.h}" style="overflow:visible;display:block">${g}</svg>${lab}</div>`;
}

export function itemHTML(o?: any) {
  if (!o.k) return noteHTML(o);
  return o.k == 'shape'
    ? shapeHTML(o)
    : o.k == 'line'
      ? lineHTML(o)
      : o.k == 'stroke'
        ? strokeHTML(o)
        : o.k == 'tl'
          ? tlHTML(o)
          : cardHTML(o);
}

export function board() {
  const B = App.P.board,
    cv = $('#cv');
  if (!cv) return;
  B.l = B.l || [];
  const C = B.c,
    of = (k?: any) => C.filter((o?: any) => o.k == k);
  cv.innerHTML =
    of('tl').map(tlHTML).join('') +
    of('shape').map(shapeHTML).join('') +
    `<svg id="lk" width="1" height="1"></svg><div id="lb"></div>` +
    B.n.map(noteHTML).join('') +
    C.filter((o?: any) => ['s', 'c', 'b'].includes(o.k))
      .map(cardHTML)
      .join('') +
    of('line').map(lineHTML).join('') +
    of('stroke').map(strokeHTML).join('');
  tf();
  drawLinks();
  updHandles();
  props();
  updRail();
  App.ro?.disconnect();
  if (window.ResizeObserver) {
    App.ro = new ResizeObserver(() => drawLinks());
    $$('#cv .box').forEach((b?: any) => App.ro.observe(b));
  }
}

export function rerender(o?: any) {
  const el = $(`#cv .it[data-id="${o.id}"]`);
  if (!el) return;
  const t = document.createElement('div');
  t.innerHTML = itemHTML(o);
  el.replaceWith(t.firstElementChild);
  updHandles();
  drawLinks();
}

export function updRail() {
  $$('.rb[data-a=tool]').forEach((b?: any) => b.classList.toggle('on', b.dataset.t == App.tool));
  const bd = $('#bd');
  if (bd) bd.className = 'tool-' + App.tool + (App.space ? ' pan' : '');
  props();
}

export function updHandles() {
  $$('#cv .hdl').forEach((h?: any) => h.remove());
  if (App.sel.size != 1 || !App.P) return;
  const id = [...App.sel][0],
    o = findO(id),
    el = $(`#cv .it[data-id="${id}"]`);
  if (!o || !el) return;
  if (['shape', 'stroke', 'tl'].includes(o.k))
    el.insertAdjacentHTML(
      'beforeend',
      ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
        .map((h?: any) => `<i class="hdl h-${h}" data-h="${h}"></i>`)
        .join('') +
        (o.k == 'shape' ? '<i class="hdl rot" data-h="rot" title="Rotate (Shift snaps to 15°)"></i>' : ''),
    );
  else if (o.k == 'line') {
    const bx = Math.min(0, o.dx),
      by = Math.min(0, o.dy);
    el.insertAdjacentHTML(
      'beforeend',
      `<i class="hdl" data-h="p1" style="left:${-bx + PAD - 6}px;top:${-by + PAD - 6}px;cursor:move"></i><i class="hdl" data-h="p2" style="left:${-bx + PAD + o.dx - 6}px;top:${-by + PAD + o.dy - 6}px;cursor:move"></i>`,
    );
  }
}

export const noteBgSw = (c?: any) => (c == 'white' ? '#fff' : c == 'black' ? '#121926' : c);

export function tf() {
  const B = App.P.board,
    bd = $('#bd'),
    cv = $('#cv');
  if (!bd) return;
  bd.style.backgroundSize = `${24 * B.z}px ${24 * B.z}px`;
  bd.style.backgroundPosition = `${B.x}px ${B.y}px`;
  cv.style.transform = `translate(${B.x}px,${B.y}px) scale(${B.z})`;
  const z = $('[data-a=z1] .zv');
  if (z) z.textContent = Math.round(B.z * 100) + '%';
}
