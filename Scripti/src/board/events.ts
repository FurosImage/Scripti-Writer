// Pointer, wheel and flyout handling for the brainstorm board.
import { addC, bsnap, refreshSel, tmpDraw, toCanvas, zoomAt } from './actions';
import { anc, drawLinks, rectOf } from './links';
import { props } from './props';
import { board, findO, rerender, tf, updHandles } from './render';
import { SHP } from '../constants';
import { App, persist, save } from '../state';
import { $, $$, colv, IS_MAC, toast, uid } from '../utils';

document.addEventListener(
  'toggle',
  (e?: any) => {
    const d = e.target;
    if (!d.classList?.contains('fly') || !d.open) return;
    $$('details.fly[open]').forEach((x?: any) => {
      if (x != d) x.open = false;
    });
    const r = d.getBoundingClientRect(),
      f = d.querySelector('.flyd');
    // The tools sit at the bottom, so the menu opens above its button.
    f.style.left = Math.max(8, Math.min(r.left, innerWidth - f.offsetWidth - 8)) + 'px';
    f.style.top = Math.max(8, r.top - f.offsetHeight - 8) + 'px';
  },
  true,
);

document.addEventListener('pointerdown', (e?: any) => {
  if (!App.P || App.tab != 'Brainstorming') return;
  const bd = e.target.closest('#bd');
  if (!bd || e.target.closest('[contenteditable=true],input,button,select,.lbl')) return;
  const B = App.P.board;
  if (App.tool == 'pan' || App.space || e.button == 1) {
    e.preventDefault();
    App.drag = { pan: 1, sx: e.clientX, sy: e.clientY, ox: B.x, oy: B.y };
    return;
  }
  if (e.button != 0) return;
  if (App.tool == 'pencil') {
    e.preventDefault();
    App.drag = { pen: [toCanvas(e)] };
    return;
  }
  if (SHP.includes(App.tool)) {
    e.preventDefault();
    const p = toCanvas(e);
    App.drag = { shape: App.tool, p0: p, p1: p };
    return;
  }
  const hd = e.target.closest('[data-h]');
  if (hd) {
    e.preventDefault();
    const o = findO(hd.closest('.it').dataset.id);
    if (!o) return;
    bsnap();
    App.drag = { rs: hd.dataset.h, o, orig: JSON.parse(JSON.stringify(o)), sx: e.clientX, sy: e.clientY };
    return;
  }
  const dot = e.target.closest('[data-dot]');
  if (dot) {
    e.preventDefault();
    App.drag = { link: dot.closest('.it').dataset.id };
    bd.classList.add('linking');
    return;
  }
  const g = e.target.closest('g[data-lid]');
  if (g) {
    App.selL = g.dataset.lid;
    App.sel.clear();
    refreshSel();
    return;
  }
  const it = e.target.closest('.it');
  if (it) {
    const id = it.dataset.id;
    App.selL = null;
    if (e.shiftKey) {
      App.sel.has(id) ? App.sel.delete(id) : App.sel.add(id);
    } else if (!App.sel.has(id)) App.sel = new Set([id]);
    refreshSel();
    if (it.classList.contains('cd') && !e.target.closest('.h')) return;
    App.drag = {
      move: 1,
      sx: e.clientX,
      sy: e.clientY,
      st: [...App.sel]
        .map((i?: any) => {
          const o = findO(i),
            el = $(`#cv .it[data-id="${i}"]`);
          return o && el && [o, o.x, o.y, el, el.offsetLeft, el.offsetTop];
        })
        .filter(Boolean),
      s: false,
    };
    return;
  }
  if (!e.shiftKey) App.sel.clear();
  App.selL = null;
  refreshSel();
  // On touch screens one finger on empty space moves the board; on desktop it draws a selection box.
  if (e.pointerType == 'touch') App.drag = { pan: 1, sx: e.clientX, sy: e.clientY, ox: B.x, oy: B.y };
  else App.drag = { mq: 1, sx: e.clientX, sy: e.clientY, base: new Set(App.sel) };
});

document.addEventListener('pointermove', (e?: any) => {
  if (!App.drag || !App.P) return;
  const B = App.P.board,
    dx = e.clientX - App.drag.sx,
    dy = e.clientY - App.drag.sy;
  if (App.drag.pan) {
    B.x = App.drag.ox + dx;
    B.y = App.drag.oy + dy;
    tf();
  } else if (App.drag.pen) {
    const p = toCanvas(e),
      l = App.drag.pen[App.drag.pen.length - 1];
    if (Math.hypot(p[0] - l[0], p[1] - l[1]) > 1.5 / B.z) App.drag.pen.push(p);
    tmpDraw(
      `<path d="M${App.drag.pen.map((q?: any) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L')}" style="fill:none;stroke:${colv(App.penCol)};stroke-width:${App.penW};stroke-linecap:round;stroke-linejoin:round"/>`,
    );
  } else if (App.drag.shape) {
    const p = toCanvas(e);
    App.drag.p1 = p;
    const [a, b] = [App.drag.p0, p],
      x = Math.min(a[0], b[0]),
      y = Math.min(a[1], b[1]),
      w = Math.abs(b[0] - a[0]),
      h = Math.abs(b[1] - a[1]),
      st = `fill:none;stroke:${colv(App.penCol)};stroke-width:2;stroke-dasharray:6 4`;
    tmpDraw(
      App.drag.shape == 'rect'
        ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" style="${st}"/>`
        : App.drag.shape == 'ellipse'
          ? `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" style="${st}"/>`
          : App.drag.shape == 'tri'
            ? `<path d="M${x + w / 2} ${y}L${x + w} ${y + h}H${x}z" style="${st}"/>`
            : `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" style="${st}"/>`,
    );
  } else if (App.drag.rs) {
    const o = App.drag.o,
      O = App.drag.orig,
      h = App.drag.rs,
      ddx = dx / B.z,
      ddy = dy / B.z;
    if (h == 'rot') {
      const cx = O.x + O.w / 2,
        cy = O.y + O.h / 2,
        p = toCanvas(e);
      let a = (Math.atan2(p[1] - cy, p[0] - cx) * 180) / Math.PI + 90;
      if (e.shiftKey) a = Math.round(a / 15) * 15;
      o.rot = Math.round((a + 360) % 360);
    } else if (h == 'p1') {
      o.x = Math.round(O.x + ddx);
      o.y = Math.round(O.y + ddy);
      o.dx = Math.round(O.dx - ddx);
      o.dy = Math.round(O.dy - ddy);
    } else if (h == 'p2') {
      o.dx = Math.round(O.dx + ddx);
      o.dy = Math.round(O.dy + ddy);
    } else {
      const r = ((O.rot || 0) * Math.PI) / 180,
        lx = ddx * Math.cos(r) + ddy * Math.sin(r),
        ly = -ddx * Math.sin(r) + ddy * Math.cos(r),
        M = o.k == 'tl' ? 60 : 16;
      let x = O.x,
        y = O.y,
        w = O.w,
        hh = O.h;
      if (h.includes('e')) w = Math.max(M, O.w + lx);
      if (h.includes('w')) {
        w = Math.max(M, O.w - lx);
        x = O.x + O.w - w;
      }
      if (h.includes('s')) hh = Math.max(M, O.h + ly);
      if (h.includes('n')) {
        hh = Math.max(M, O.h - ly);
        y = O.y + O.h - hh;
      }
      if (e.shiftKey && h.length == 2) {
        const k = Math.max(w / O.w, hh / O.h);
        w = O.w * k;
        hh = O.h * k;
        if (h.includes('w')) x = O.x + O.w - w;
        if (h.includes('n')) y = O.y + O.h - hh;
      }
      Object.assign(o, { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(hh) });
    }
    rerender(o);
    App.drag.moved = true;
  } else if (App.drag.move) {
    if (!App.drag.s && Math.abs(dx) + Math.abs(dy) > 3) {
      bsnap();
      App.drag.s = true;
    }
    if (App.drag.s) {
      for (const [o, ox, oy, el, ex, ey] of App.drag.st) {
        o.x = Math.round(ox + dx / B.z);
        o.y = Math.round(oy + dy / B.z);
        if (el.isConnected) {
          el.style.left = ex + o.x - ox + 'px';
          el.style.top = ey + o.y - oy + 'px';
        }
      }
      drawLinks();
    }
  } else if (App.drag.link) {
    const r = rectOf(App.drag.link),
      p = toCanvas(e),
      l = $('#tmpl');
    if (!r || !l) return;
    let m = 1e9,
      a;
    for (const u of anc(r)) {
      const d = Math.hypot(u[0] - p[0], u[1] - p[1]);
      if (d < m) {
        m = d;
        a = u;
      }
    }
    l.setAttribute('x1', a[0]);
    l.setAttribute('y1', a[1]);
    l.setAttribute('x2', p[0]);
    l.setAttribute('y2', p[1]);
    l.style.display = '';
  } else if (App.drag.mq) {
    if (Math.abs(dx) + Math.abs(dy) < 4) return;
    const R = $('#bd').getBoundingClientRect(),
      q = $('#mq'),
      x1 = Math.min(App.drag.sx, e.clientX) - R.left,
      y1 = Math.min(App.drag.sy, e.clientY) - R.top,
      w = Math.abs(dx),
      h = Math.abs(dy);
    Object.assign(q.style, {
      display: 'block',
      left: x1 + 'px',
      top: y1 + 'px',
      width: w + 'px',
      height: h + 'px',
    });
    const cx = (x1 - B.x) / B.z,
      cy = (y1 - B.y) / B.z,
      cw = w / B.z,
      chh = h / B.z;
    App.sel = new Set(App.drag.base);
    $$('#cv .it').forEach((el?: any) => {
      const r = rectOf(el.dataset.id);
      if (r.x < cx + cw && r.x + r.w > cx && r.y < cy + chh && r.y + r.h > cy) App.sel.add(el.dataset.id);
    });
    $$('#cv .it').forEach((el?: any) => el.classList.toggle('sel', App.sel.has(el.dataset.id)));
  }
});

document.addEventListener('pointerup', (e?: any) => {
  if (!App.P || App.tab != 'Brainstorming') {
    App.drag = null;
    return;
  }
  const B = App.P.board,
    d = App.drag;
  App.drag = null;
  if (!d) {
    return;
  }
  if (d.pen) {
    tmpDraw('');
    const P_ = d.pen;
    if (P_.length < 2) return;
    const xs = P_.map((p?: any) => p[0]),
      ys = P_.map((p?: any) => p[1]),
      x = Math.min(...xs),
      y = Math.min(...ys),
      w = Math.max(1, Math.max(...xs) - x),
      h = Math.max(1, Math.max(...ys) - y);
    bsnap();
    B.c.push({
      id: uid(),
      k: 'stroke',
      x: Math.round(x),
      y: Math.round(y),
      w: Math.round(w),
      h: Math.round(h),
      ow: w,
      oh: h,
      pts: 'M' + P_.map((p?: any) => (p[0] - x).toFixed(1) + ' ' + (p[1] - y).toFixed(1)).join('L'),
      col: App.penCol && App.penCol != 'ink' ? App.penCol : undefined,
      sw: App.penW,
    });
    save();
    board();
    return;
  }
  if (d.shape) {
    tmpDraw('');
    const [a, b] = [d.p0, d.p1],
      col = App.penCol && App.penCol != 'ink' ? App.penCol : undefined;
    let o;
    if (['line', 'arrow', 'darrow'].includes(d.shape)) {
      let dx = b[0] - a[0],
        dy = b[1] - a[1];
      if (Math.hypot(dx, dy) < 6) {
        dx = 160;
        dy = 0;
      }
      o = {
        id: uid(),
        k: 'line',
        st: d.shape,
        x: Math.round(a[0]),
        y: Math.round(a[1]),
        dx: Math.round(dx),
        dy: Math.round(dy),
        col,
        sw: App.penW,
      };
    } else {
      let x = Math.min(a[0], b[0]),
        y = Math.min(a[1], b[1]),
        w = Math.abs(b[0] - a[0]),
        h = Math.abs(b[1] - a[1]);
      if (w < 6 && h < 6) {
        w = d.shape == 'rect' ? 160 : 120;
        h = d.shape == 'rect' ? 100 : 120;
        x = a[0];
        y = a[1];
      }
      if (e.shiftKey) w = h = Math.max(w, h);
      o = {
        id: uid(),
        k: 'shape',
        st: d.shape,
        x: Math.round(x),
        y: Math.round(y),
        w: Math.max(16, Math.round(w)),
        h: Math.max(16, Math.round(h)),
        rot: 0,
        col,
        sw: App.penW,
      };
    }
    addC(o);
    return;
  }
  if (d.rs) {
    if (d.moved) save();
    else App.BU.pop();
    board();
    return;
  }
  if (d.link) {
    $('#bd')?.classList.remove('linking');
    const tg = document.elementFromPoint(e.clientX, e.clientY)?.closest('#cv .it');
    if (
      tg &&
      tg.dataset.id != d.link &&
      (tg.classList.contains('nt') || tg.classList.contains('cd')) &&
      !B.l.some(
        (l?: any) => (l.a == d.link && l.b == tg.dataset.id) || (l.b == d.link && l.a == tg.dataset.id),
      )
    ) {
      bsnap();
      B.l.push({ id: uid(), a: d.link, b: tg.dataset.id, t: '' });
      save();
      toast('Connected. Double-click the line to add a label.');
      board();
    } else if (tg && tg.dataset.id != d.link && !tg.classList.contains('nt') && !tg.classList.contains('cd'))
      toast('Connect notes, scene cards and character cards');
    drawLinks();
  }
  if (d.mq) {
    $('#mq').style.display = 'none';
    props();
    updHandles();
  }
  if (d.move) save();
  else if (d.pan) persist();
  let ch = false;
  $$('#cv .cd').forEach((el?: any) => {
    const o = B.c.find((c?: any) => c.id == el.dataset.id);
    if (!o || o.min) return;
    const bx = el.querySelector('.box');
    if (o.w != bx.offsetWidth || o.h != bx.offsetHeight) {
      o.w = bx.offsetWidth;
      o.h = bx.offsetHeight;
      ch = true;
    }
  });
  if (ch) save();
});

document.addEventListener(
  'wheel',
  (e?: any) => {
    if (!App.P || App.tab != 'Brainstorming' || !e.target.closest('#bd')) return;
    if (e.target.closest('.bd') && !e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = $('#bd').getBoundingClientRect();
    // Mac trackpads: two-finger scroll moves the board, pinch (sent as Ctrl+wheel) or ⌘+scroll zooms.
    // Elsewhere the mouse wheel zooms, as before.
    if (IS_MAC && !e.ctrlKey && !e.metaKey) {
      const B = App.P.board,
        k = e.deltaMode == 1 ? 16 : 1;
      B.x -= (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * k;
      B.y -= (e.shiftKey && !e.deltaX ? 0 : e.deltaY) * k;
      tf();
      persist();
      return;
    }
    zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX - r.left, e.clientY - r.top);
    drawLinks();
  },
  { passive: false },
);
