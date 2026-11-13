// Global DOM event handlers (clicks, typing, keyboard, menus).
import { addC, bsnap, bstep, delSel, editTx, goScene, nextPos, refreshSel, zoomAt } from './board/actions';
import { drawLinks, editLabel } from './board/links';
import { minable, props, selObjs, selTl } from './board/props';
import { board, findO, tf, updRail } from './board/render';
import { COLS, COV, NSEQ, TK } from './constants';
import { acAccept, acHide, acUpdate } from './editor/autocomplete';
import { focusB } from './editor/caret';
import { cpop, highlight } from './editor/comments';
import { hcommit, hpush, hstep } from './editor/history';
import { csnap, cstep } from './editor/charHistory';
import { hcHide, hcShow } from './editor/hoverCard';
import { blockKeys } from './editor/keys';
import { coverImg } from './io/export';
import { cycleType, extraAction, toggleFocus } from './actions';
import { synthDbl } from './board/touch';
import {
  blk,
  deleteP,
  duplicateP,
  ensureIds,
  leaveBlock,
  mk,
  nextCharCol,
  openP,
  sceneRef,
  sync,
} from './project';
import { App, flush, persist, save } from './state';
import { $, $$, hasMk, MOD, toast, uid } from './utils';
import { cards } from './views/library';
import { renumberScenes } from './views/script';
import { refreshNav, render, stats, wc } from './views/workspace';

document.addEventListener('mousedown', (e?: any) => {
  if (e.target.closest('[data-keep],[data-ac]')) e.preventDefault();
  const a = e.target.closest('[data-ac]');
  if (a) acAccept(+a.dataset.ac);
});

document.addEventListener('click', (e?: any) => {
  const arming = e.target.closest?.('[data-cf]:not([data-armed])'); // first click of a click-twice confirm
  $$('details[open]').forEach((d?: any) => {
    if (!d.contains(e.target) || (e.target.closest('.dd button') && !arming)) d.open = false;
  });
  const cp = $('#cpop');
  if (cp && !cp.contains(e.target) && !e.target.closest('mark,[data-a=hl]')) {
    cp.remove();
  }
  const mk_ = e.target.closest('.b mark');
  if (mk_ && !e.target.closest('[data-a]')) {
    cpop(mk_);
    return;
  }
  const t = e.target.closest('[data-a]');
  if (App.ctx && !e.target.closest('.ctxm')) {
    App.ctx = null;
    if (!t) {
      render();
      return;
    }
  }
  if (!t) return;
  if (t.hasAttribute('data-cf') && !t.dataset.armed) {
    t.dataset.armed = 1;
    const o = t.textContent;
    t.textContent = 'Click again to confirm';
    setTimeout(() => {
      if (t.isConnected) {
        delete t.dataset.armed;
        t.textContent = o;
      }
    }, 3500);
    e.stopImmediatePropagation();
    return;
  }
  const a = t.dataset.a,
    id = t.dataset.id;
  switch (a) {
    case 'new':
      App.modal = 'new';
      render();
      break;
    case 'x':
      if (e.target == t) {
        App.modal = null;
        render();
      }
      break;
    case 'lib':
      App.D.lib = !App.D.lib;
      save();
      render();
      break;
    case 'make':
      App.modal = null;
      App.D.lib = true;
      openP(mk(t.dataset.t));
      save();
      break;
    case 'open':
      App.ctx = null;
      openP(App.D.ps.find((p?: any) => p.id == id));
      break;
    case 'home':
      App.P = null;
      render();
      break;
    case 'delp':
      deleteP(App.P);
      break;
    case 'cover':
      App.P.img = null;
      App.P.cv = COV[(COV.indexOf(App.P.cv) + 1) % COV.length];
      save();
      toast('Cover colour changed. See it in the library.');
      break;
    case 'noimg':
      App.P.img = null;
      save();
      render();
      break;
    case 'th':
      App.D.th = t.dataset.t;
      save();
      render();
      break;
    case 'tab':
      App.tab = t.dataset.t;
      App.sel.clear();
      render();
      break;
    case 'dr':
      App.dr = +t.dataset.i;
      render();
      break;
    case 'drnew':
      hpush();
      App.P.drafts.push({
        id: uid(),
        name: 'Draft ' + (App.P.drafts.length + 1),
        blocks: [
          { t: 'scene', x: '' },
          { t: 'action', x: '' },
        ],
        novel: '<h1>Chapter 1</h1><p><br></p>',
      });
      App.dr = App.P.drafts.length - 1;
      hcommit();
      render();
      break;
    case 'dup': {
      hpush();
      const c = JSON.parse(JSON.stringify(App.P.drafts[App.ctx.i]));
      c.id = uid();
      c.name += ' copy';
      App.P.drafts.splice(App.ctx.i + 1, 0, c);
      App.dr = App.ctx.i + 1;
      App.ctx = null;
      hcommit();
      render();
      break;
    }
    case 'rename':
      App.ren = App.ctx.i;
      App.ctx = null;
      render();
      $('#rn')?.select();
      break;
    case 'del':
      hpush();
      App.P.drafts.splice(App.ctx.i, 1);
      App.dr = Math.min(App.dr, App.P.drafts.length - 1);
      App.d2 = -1;
      App.ctx = null;
      hcommit();
      render();
      toast(`Draft deleted. ${MOD}+Z in the script restores it.`);
      break;
    case 'split':
      App.split = !App.split;
      App.tab = 'Script';
      if (App.split && App.P.drafts.length < 2) toast('Add a second draft with + to compare side by side');
      render();
      break;
    case 'addscene': {
      hpush();
      const b = App.P.drafts[App.dr].blocks;
      b.push({ t: 'scene', x: '' }, { t: 'action', x: '' });
      hcommit();
      render();
      focusB(App.dr, b.length - 2, 0);
      break;
    }
    case 'hl':
      highlight();
      break;
    case 'u':
      hstep(App.HU, App.HR);
      break;
    case 'r':
      hstep(App.HR, App.HU);
      break;
    case 'gocm':
      focusB(App.dr, +t.dataset.i, 0);
      $(`.b[data-d="${App.dr}"][data-i="${t.dataset.i}"]`)?.scrollIntoView({ block: 'center' });
      break;
    case 'addch': {
      csnap();
      const c = { id: uid(), n: '', r: '', p: '', m: '', g: '', d: '', col: nextCharCol() };
      App.P.chars.push(c);
      save();
      render();
      const i = $(`[data-ch="${c.id}"]`);
      i?.focus();
      i?.scrollIntoView({ block: 'center' });
      break;
    }
    case 'chcol': {
      const c = App.P.chars.find((c?: any) => c.id == id);
      if (!c) break;
      csnap();
      c.col = t.dataset.v;
      save();
      const el = t.closest('.chc');
      el.style.setProperty('--cc', c.col);
      $$('.sw', el).forEach((b?: any) => b.classList.toggle('on', b == t));
      $('[data-a=chundo]')?.removeAttribute('disabled');
      break;
    }
    case 'delch': {
      csnap();
      const B = App.P.board,
        gone = new Set(B.c.filter((c?: any) => c.k == 'c' && c.ref == id).map((c?: any) => c.id));
      App.P.chars = App.P.chars.filter((c?: any) => c.id != id);
      B.c = B.c.filter((c?: any) => !gone.has(c.id));
      B.l = B.l.filter((l?: any) => !gone.has(l.a) && !gone.has(l.b));
      save();
      render();
      break;
    }
    case 'chundo':
    case 'chredo':
      if (cstep(a == 'chundo')) render();
      break;
    case 'chdelall': {
      if (!App.P.chars.length) break;
      csnap();
      const B = App.P.board,
        gone = new Set(B.c.filter((c?: any) => c.k == 'c').map((c?: any) => c.id)),
        n = App.P.chars.length;
      App.P.chars = [];
      B.c = B.c.filter((c?: any) => !gone.has(c.id));
      B.l = B.l.filter((l?: any) => !gone.has(l.a) && !gone.has(l.b));
      save();
      render();
      toast(`${n} ${n == 1 ? 'character' : 'characters'} deleted`, {
        label: 'Undo',
        fn: () => {
          if (cstep(true)) render();
        },
      });
      break;
    }
    case 'addloc':
      App.P.locs.push({ n: '', d: '' });
      save();
      render();
      $$('[data-lc][data-f=n]').pop()?.focus();
      break;
    case 'delloc':
      App.P.locs.splice(+t.dataset.i, 1);
      save();
      render();
      break;
    case 'goto':
      App.side = false;
      goScene(App.dr, +t.dataset.i);
      break;
    case 'bold':
      document.execCommand('bold');
      break;
    case 'ital':
      document.execCommand('italic');
      break;
    case 'sb':
      $('#nv')?.focus();
      if (App.NR) {
        const s = getSelection();
        s.removeAllRanges();
        s.addRange(App.NR);
      }
      document.execCommand('insertHTML', false, '<p class="sb">***</p><p><br></p>');
      break;
    case 'bu':
      bstep(App.BU, App.BR);
      break;
    case 'br':
      bstep(App.BR, App.BU);
      break;
    case 'tool':
      App.tool = t.dataset.t;
      if (App.tool != 'select') {
        App.sel.clear();
        App.selL = null;
      }
      refreshSel();
      updRail();
      break;
    case 'note': {
      bsnap();
      const B = App.P.board,
        [x, y] = nextPos(170, 130),
        n = { id: uid(), x, y, c: NSEQ[B.cc++ % NSEQ.length], t: '' };
      B.n.push(n);
      App.sel = new Set([n.id]);
      App.tool = 'select';
      save();
      board();
      editTx($(`[data-nid="${n.id}"]`));
      break;
    }
    case 'bsc': {
      const B = App.P.board,
        [x, y] = nextPos(230, 120);
      ensureIds(App.P);
      const dd = App.P.drafts[App.dr],
        sb = dd.blocks[+t.dataset.i];
      if (!sb) break;
      addC({
        id: uid(),
        k: 's',
        did: dd.id,
        sid: sb.id,
        x,
        y,
        w: 230,
        h: 120,
        col: COLS[B.c.filter((c?: any) => c.k == 's').length % COLS.length],
      });
      break;
    }
    case 'bch': {
      const [x, y] = nextPos(220, 110);
      addC({ id: uid(), k: 'c', ref: id, x, y, w: 220, h: 110 });
      break;
    }
    case 'beat': {
      const B = App.P.board,
        [x, y] = nextPos(140, 28),
        cst = t.dataset.t == 'Custom Beat',
        c = addC({
          id: uid(),
          k: 'b',
          t: cst ? '' : t.dataset.t,
          x,
          y,
          col: COLS[B.c.filter((c?: any) => c.k == 'b').length % COLS.length],
        });
      if (cst) editTx($(`[data-bid="${c.id}"]`));
      break;
    }
    case 'tl': {
      const [x, y] = nextPos(600, 80);
      addC({ id: uid(), k: 'tl', x, y, w: 600, h: 80, or: 'h', acts: ['Act 1', 'Act 2', 'Act 3'] });
      break;
    }
    case 'tlact': {
      const o = selTl();
      if (!o) break;
      bsnap();
      o.acts.push('Act ' + (o.acts.length + 1));
      save();
      board();
      break;
    }
    case 'tlrm': {
      const o = selTl();
      if (!o || o.acts.length < 2) break;
      bsnap();
      o.acts.pop();
      save();
      board();
      break;
    }
    case 'tlor': {
      const o = selTl();
      if (!o) break;
      bsnap();
      if (o.or == 'v') {
        o.or = 'h';
        const L = o.h;
        o.w = Math.max(200, L);
        o.h = 80;
      } else {
        o.or = 'v';
        const L = o.w;
        o.h = Math.max(200, L);
        o.w = 160;
      }
      save();
      board();
      break;
    }
    case 'pcol': {
      const v = t.dataset.v,
        O = selObjs();
      if (!O.length) {
        App.penCol = v;
        props();
        break;
      }
      bsnap();
      O.forEach((o?: any) => {
        if (!o.k) o.c = v;
        else o.col = v == 'ink' ? undefined : v;
      });
      save();
      board();
      break;
    }
    case 'pw': {
      const v = +t.dataset.v,
        O = selObjs().filter((o?: any) => ['stroke', 'shape', 'line'].includes(o.k));
      if (!O.length) {
        App.penW = v;
        props();
        break;
      }
      bsnap();
      O.forEach((o?: any) => (o.sw = v));
      save();
      board();
      break;
    }
    case 'pmin': {
      const M = selObjs().filter(minable);
      if (!M.length) break;
      bsnap();
      const to = !M.every((o?: any) => o.min);
      M.forEach((o?: any) => (o.min = to));
      save();
      board();
      break;
    }
    case 'pdel':
      delSel();
      break;
    case 'bdel':
      App.sel = new Set([id]);
      App.selL = null;
      delSel();
      break;
    case 'bmin': {
      const c = App.P.board.c.find((c?: any) => c.id == id);
      if (c) {
        bsnap();
        c.min = !c.min;
        save();
        board();
      }
      break;
    }
    case 'nmin': {
      const n = App.P.board.n.find((n?: any) => n.id == id);
      if (n) {
        bsnap();
        n.min = !n.min;
        save();
        board();
      }
      break;
    }
    case 'zi':
      zoomAt(1.2);
      drawLinks();
      break;
    case 'zo':
      zoomAt(1 / 1.2);
      drawLinks();
      break;
    case 'z1': {
      const B = App.P.board;
      B.z = 1;
      tf();
      drawLinks();
      save();
      break;
    }
    default:
      extraAction(a, t);
  }
});

document.addEventListener('contextmenu', (e?: any) => {
  const t = e.target.closest('.dt button[data-i]');
  if (!t) return;
  e.preventDefault();
  App.ctx = { kind: 'draft', i: +t.dataset.i, x: Math.min(e.clientX, innerWidth - 220), y: e.clientY };
  render();
});

document.addEventListener('change', (e?: any) => {
  const t = e.target,
    c = t.dataset.c;
  if (!c) return;
  if (c == 'th') {
    App.D.th = t.value;
    save();
    render();
  } else if (c == 'fmt') {
    const b = App.P.drafts[App.F.d]?.blocks[App.F.i];
    if (b) {
      hpush();
      b.t = t.value;
      hcommit();
      render();
      focusB(App.F.d, App.F.i);
    }
  } else if (c == 'd2') {
    App.d2 = +t.value;
    render();
  } else if (c == 'tpf') {
    App.P.tp.font = t.value;
    save();
    render();
  } else if (c == 'tps') {
    App.P.tp.size = Math.max(10, Math.min(60, +t.value || 20));
    save();
    render();
  } else if (c == 'nf') {
    App.P.nf = t.value;
    $('#nv').style.fontFamily = `'${t.value}'`;
    save();
  } else if (c == 'ns') {
    App.P.ns = +t.value;
    $('#nv').style.fontSize = t.value + 'px';
    save();
  } else if (c == 'np') {
    const n = $('#nv');
    n.focus();
    if (App.NR) {
      const s = getSelection();
      s.removeAllRanges();
      s.addRange(App.NR);
    }
    document.execCommand('formatBlock', false, '<' + t.value + '>');
    t.value = 'p';
  } else if (c == 'img') coverImg(t.files[0]);
  else if (c == 'sort') {
    App.D.sort = t.value;
    persist();
    const g = $('#grid');
    if (g) g.innerHTML = cards();
  } else if (c == 'exppaper') App.exp.paper = t.value;
  else if (c == 'exptp') App.exp.tpage = t.checked;
  else if (c == 'expscn') App.exp.scn = t.checked;
});

document.addEventListener('focusout', (e?: any) => {
  const t = e.target;
  if (t.id == 'rn') {
    const d = App.P.drafts[+t.dataset.i];
    if (d && t.value.trim() && t.value != d.name) {
      hpush();
      d.name = t.value.trim();
      hcommit();
    }
    App.ren = -1;
    render();
    return;
  }
  if (t.classList?.contains('b') && t.isConnected && blk(t)) {
    setTimeout(() => {
      if (App.AC && App.AC.el == t && document.activeElement != t) acHide();
    }, 150);
    leaveBlock(blk(t));
  }
  if (t.classList?.contains('tx')) {
    t.contentEditable = 'false';
    if (t.dataset.sct && App.P) {
      if (App.P.type == 'ms') sync();
      save();
      import('./board/render').then((m) => m.board());
    }
  }
});

document.addEventListener('focusin', (e?: any) => {
  const b = e.target.closest?.('.b');
  if (b) {
    App.F = { d: +b.dataset.d, i: +b.dataset.i };
    const s = $('[data-c=fmt]'),
      k = blk(b);
    if (s && k) s.value = k.t;
    hcHide();
  }
});

document.addEventListener('selectionchange', () => {
  const s = getSelection(),
    n = $('#nv');
  if (n && s.rangeCount && n.contains(s.anchorNode)) App.NR = s.getRangeAt(0).cloneRange();
});

document.addEventListener('paste', (e?: any) => {
  if (!e.target.closest?.('.b,.tx,#nv,#tpe')) return;
  e.preventDefault();
  document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
});

document.addEventListener('mouseover', (e?: any) => {
  const el = e.target.closest?.('.page mark,.b.character,.b.scene');
  if (!el) {
    hcHide();
    return;
  }
  if (el == document.activeElement || $('#cpop')) return;
  clearTimeout(App.hcT);
  App.hcT = setTimeout(() => hcShow(el), 350);
});

document.addEventListener('input', (e?: any) => {
  const t = e.target;
  if (t.dataset?.c == 'q') {
    App.q = t.value;
    const g = $('#grid');
    if (g) g.innerHTML = cards();
    return;
  }
  if (!App.P) return;
  const b = t.closest?.('.b');
  if (b) {
    const k = blk(b),
      now = Date.now();
    if (now - App.lastT > 1200) hpush();
    App.lastT = now;
    k.x = b.textContent;
    k.h = hasMk(b.innerHTML) ? b.innerHTML : undefined;
    // Smart type: a line typed as action that starts like a scene heading becomes one.
    if (
      k.t == 'action' &&
      App.P.type == 'ms' &&
      /^(INT|EXT|EST|I\/E|INT\.\/EXT|EXT\.\/INT)\.\s/.test(k.x) &&
      !k.x.includes('\n')
    ) {
      k.t = 'scene';
      b.className = 'b scene';
      b.dataset.ph = 'INT. LOCATION - DAY';
      const f = $('[data-c=fmt]');
      if (f) f.value = 'scene';
      renumberScenes();
      refreshNav();
    }
    hcommit();
    acUpdate(b, k);
    stats(true);
    if (k.t == 'scene') refreshNav();
    return;
  }
  if (t.dataset?.sct) {
    const c = App.P.board.c.find((x?: any) => x.id == t.dataset.sct);
    if (c) {
      const r = sceneRef(c),
        sb = App.P.drafts[r.d].blocks[r.i];
      if (sb) {
        if (t.dataset.fresh) {
          hpush();
          delete t.dataset.fresh;
        }
        sb.x = t.textContent;
        delete sb.h;
        hcommit();
      }
    }
    return;
  }
  if (t.id == 'nv') {
    App.P.drafts[App.dr].novel = t.innerHTML;
    wc();
    refreshNav();
  } else if (t.id == 'tpe') App.P.tp.html = t.innerHTML;
  else if (t.dataset.c == 'title') App.P.title = t.value;
  else if (t.dataset.c == 'notes') App.P.notes = t.value;
  else if (t.dataset.c == 'ideas') {
    App.P.ideas = t.value;
    wc();
  } else if (t.dataset.ch != null) {
    csnap(true);
    const u = $('[data-a=chundo]');
    if (u) u.disabled = false;
    const c = App.P.chars.find((c?: any) => c.id == t.dataset.ch);
    if (c) c[t.dataset.f] = t.value;
    if (t.dataset.f == 'n') {
      const h = t.closest('.chc')?.querySelector('.chn');
      if (h) h.textContent = t.value || 'New character';
    }
  } else if (t.dataset.act != null) {
    const o = findO(t.dataset.tid);
    if (o) o.acts[+t.dataset.act] = t.textContent;
  } else if (t.dataset.lc != null) {
    const l = App.P.locs[+t.dataset.lc];
    if (l) {
      l[t.dataset.f] = t.dataset.f == 'n' ? t.value.toUpperCase() : t.value;
    }
  } else if (t.dataset.nid) {
    const n = App.P.board.n.find((n?: any) => n.id == t.dataset.nid);
    if (n) n.t = t.innerText;
  } else if (t.dataset.bid) {
    const c = App.P.board.c.find((c?: any) => c.id == t.dataset.bid);
    if (c) c.t = t.textContent;
  } else return;
  save();
});

document.addEventListener('keydown', (e?: any) => {
  const t = e.target,
    mod = e.ctrlKey || e.metaKey;
  const k = (e.key || '').toLowerCase();
  if (mod && k == 's') {
    e.preventDefault();
    flush().then(() => toast('Saved'));
    return;
  }
  if (mod && k == 'e' && App.P) {
    e.preventDefault();
    App.modal = 'export';
    render();
    return;
  }
  if (mod && e.shiftKey && k == 'f' && App.P) {
    e.preventDefault();
    toggleFocus();
    return;
  }
  if (e.key == 'Escape' && (App.modal || App.ctx)) {
    App.modal = null;
    App.ctx = null;
    render();
    return;
  }
  if (e.key == 'Escape' && !App.AC && App.side) {
    App.side = false;
    render();
    return;
  }
  if (e.key == 'Escape' && !App.AC && App.focus && !t.closest?.('.tx')) {
    toggleFocus(false);
    return;
  }
  if (
    mod &&
    (k == 'z' || k == 'y') &&
    App.P &&
    App.tab == 'Characters' &&
    !t.closest?.('input,textarea,[contenteditable=true]')
  ) {
    e.preventDefault();
    if (cstep(k == 'z' && !e.shiftKey)) render();
    return;
  }
  if (e.key == '?' && !t.closest?.('input,textarea,select,[contenteditable=true]')) {
    App.modal = 'help';
    render();
    return;
  }
  if (t.id == 'rn') {
    if (e.key == 'Enter') t.blur();
    if (e.key == 'Escape') {
      App.ren = -1;
      render();
    }
    return;
  }
  if (e.key == 'Enter' && t.classList?.contains('card')) {
    openP(App.D.ps.find((p?: any) => p.id == t.dataset.id));
    return;
  }
  if (e.key == 'Enter' && t.classList?.contains('ic')) {
    t.click();
    return;
  }
  const b = t.closest?.('.b');
  if (b) {
    blockKeys(e, b);
    return;
  }
  if (t.matches?.('.beat .tx') && e.key == 'Enter') {
    e.preventDefault();
    t.blur();
    return;
  }
  if (t.matches?.('.tx') && e.key == 'Escape') {
    t.blur();
    return;
  }
  if (e.key == 'Escape') {
    if (App.modal) {
      App.modal = false;
      render();
      return;
    }
    if (App.ctx) {
      App.ctx = null;
      render();
      return;
    }
  }
  const ed = t.closest?.('input,textarea,select,[contenteditable=true]');
  if (App.P && App.tab == 'Brainstorming' && !ed && $('#bd')) {
    if (e.key == ' ') {
      e.preventDefault();
      App.space = true;
      $('#bd').classList.add('pan');
    } else if (e.key == 'Delete' || e.key == 'Backspace') {
      e.preventDefault();
      delSel();
    } else if (mod && e.key.toLowerCase() == 'z') {
      e.preventDefault();
      e.shiftKey ? bstep(App.BR, App.BU) : bstep(App.BU, App.BR);
    } else if (mod && e.key.toLowerCase() == 'y') {
      e.preventDefault();
      bstep(App.BR, App.BU);
    } else if (mod && e.key.toLowerCase() == 'a') {
      e.preventDefault();
      App.sel = new Set([...App.P.board.n, ...App.P.board.c].map((o?: any) => o.id));
      refreshSel();
    } else if (e.key == 'Escape') {
      App.sel.clear();
      App.selL = null;
      App.tool = 'select';
      updRail();
      refreshSel();
    } else if (!mod && !e.altKey && TK[e.key.toLowerCase()]) {
      const k = TK[e.key.toLowerCase()];
      if (k == 'note' || k == 'tl') $(`.rail [data-a=${k}]`)?.click();
      else {
        App.tool = k;
        if (k != 'select') {
          App.sel.clear();
          App.selL = null;
        }
        refreshSel();
        updRail();
      }
    }
  }
});

document.addEventListener('keyup', (e?: any) => {
  if (e.key == ' ') {
    App.space = false;
    if (!App.panT) $('#bd')?.classList.remove('pan');
  }
});

document.addEventListener('dblclick', (e?: any) => {
  if (!App.P) return;
  if (e.isTrusted && Date.now() - synthDbl < 600) return; // already handled as a double-tap
  const dt = e.target.closest('.dt [data-a=dr]');
  if (dt) {
    App.ren = +dt.dataset.i;
    render();
    $('#rn')?.select();
    return;
  }
  if (App.tab != 'Brainstorming' || App.tool != 'select') return;
  const l = e.target.closest('[data-lid]');
  if (l) {
    editLabel(l.dataset.lid);
    return;
  }
  const it = e.target.closest('.it');
  if (!it || e.target.closest('button')) return;
  const tx =
    e.target.closest('.tx:not(.sct)') ||
    (it.classList.contains('nt') || it.classList.contains('beat') ? it.querySelector('.tx') : null);
  if (tx) {
    editTx(tx);
    return;
  }
  const o = App.P.board.c.find((c?: any) => c.id == it.dataset.id);
  if (!o) return;
  if (o.k == 's') {
    const r = sceneRef(o);
    if (r.i < 0) {
      toast('That scene no longer exists');
      return;
    }
    goScene(r.d, r.i);
  } else if (o.k == 'c') {
    App.tab = 'Characters';
    render();
    const el = $(`[data-chid="${o.ref}"]`);
    if (el) {
      el.scrollIntoView({ block: 'center' });
      el.classList.add('flash');
    }
  }
});

// Pop-ups positioned on screen would drift when the page scrolls, so close them.
document.addEventListener(
  'scroll',
  () => {
    if (App.AC) acHide();
    hcHide();
  },
  true,
);
