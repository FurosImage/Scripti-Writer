// Creating, opening and cleaning up projects, plus syncing locations and characters from the script.
import { COLS, COV, TYPES } from './constants';
import { cleanBoardList, cleanHTML, safeCss, safeFont, safeId, safeImage } from './io/clean';
import { App, changeHooks, persist, save } from './state';
import { charMatch, cue, locOf, titleCase, toast, uid } from './utils';
import { render } from './views/workspace';

const BTYPES = TYPES.map((t: any) => t[0]);

export function nextCharCol() {
  const u = App.P.chars.map((c?: any) => c.col);
  return COLS.find((x?: any) => !u.includes(x)) || COLS[App.P.chars.length % COLS.length];
}

export function cstyle(x?: any) {
  if (!App.P) return '';
  const c = App.P.chars.find((c?: any) => charMatch(c, cue(x)));
  return c && c.col ? ` style="--cc:${c.col}"` : '';
}

export const blk = (b?: any) => App.P.drafts[+b.dataset.d]?.blocks[+b.dataset.i];

export const emptyBoard = () => ({ n: [], c: [], l: [], z: 1, x: 0, y: 0, cc: 0 });

export const newDraft = (name: string) => ({
  id: uid(),
  name,
  blocks: [
    { id: uid(), t: 'scene', x: '' },
    { id: uid(), t: 'action', x: '' },
  ],
  novel: '<h1>Chapter 1</h1><p><br></p>',
});

export function mk(type?: any) {
  const p = normalize({
    id: uid(),
    title: 'Untitled story',
    type,
    cv: COV[App.D.ps.length % COV.length],
    drafts: [newDraft('Draft 1')],
    tp: {
      html: '<h1>UNTITLED</h1><p>Written by</p>',
      font: type == 'novel' ? 'Newsreader' : 'Courier Prime',
      size: 20,
    },
    up: Date.now(),
  });
  App.D.ps.unshift(p);
  return p;
}

const str = (v: any) => (typeof v == 'string' ? v : v == null ? '' : String(v));
const num = (v: any, d: number) => (typeof v == 'number' && isFinite(v) ? v : d);

/** Give every script block an id (board scene cards point at blocks by id). */
export function ensureIds(p: any) {
  for (const d of p.drafts) for (const b of d.blocks) if (!b.id) b.id = uid();
}

/**
 * Repair and upgrade a project so every field the app relies on exists. Used for saved data,
 * imports and stories arriving from other devices, so a damaged or older story still opens.
 */
export function normalize(p: any) {
  p = p && typeof p == 'object' ? p : {};
  p.id = safeId(p.id) ? p.id : uid();
  p.title = str(p.title) || 'Untitled story';
  if (!['ms', 'novel', 'ideas'].includes(p.type)) p.type = 'ms';
  p.cv = safeCss(p.cv, COV[0]);
  p.img = safeImage(p.img);
  if (!p.img) delete p.img;
  if (p.nf !== undefined) p.nf = safeFont(p.nf, 'Newsreader');
  if (p.ns !== undefined) p.ns = Math.max(10, Math.min(60, num(p.ns, 18)));
  p.up = num(p.up, 0);
  if (!Array.isArray(p.drafts) || !p.drafts.length) p.drafts = [newDraft('Draft 1')];
  p.drafts = p.drafts.map((d: any, i: number) => {
    d = d && typeof d == 'object' ? d : {};
    d.id = safeId(d.id) ? d.id : uid();
    d.name = str(d.name) || 'Draft ' + (i + 1);
    d.blocks = (Array.isArray(d.blocks) ? d.blocks : [])
      .filter((b: any) => b && typeof b == 'object')
      .map((b: any) => {
        const o: any = { id: safeId(b.id) ? b.id : uid(), t: BTYPES.includes(b.t) ? b.t : 'action', x: str(b.x) };
        if (typeof b.h == 'string' && /<mark/i.test(b.h)) o.h = cleanHTML(b.h);
        return o;
      });
    if (!d.blocks.length) d.blocks = [{ id: uid(), t: p.type == 'ms' ? 'scene' : 'action', x: '' }];
    d.novel = cleanHTML(d.novel) || '<p><br></p>';
    return d;
  });
  const tp = p.tp && typeof p.tp == 'object' ? p.tp : {};
  p.tp = {
    html: cleanHTML(tp.html),
    font: safeFont(tp.font, 'Courier Prime'),
    size: Math.max(10, Math.min(60, num(tp.size, 20))),
  };
  p.chars = (Array.isArray(p.chars) ? p.chars : [])
    .filter((c: any) => c && typeof c == 'object')
    .map((c: any, i: number) => ({
      id: safeId(c.id) ? c.id : uid(),
      n: str(c.n),
      r: str(c.r),
      p: str(c.p),
      m: str(c.m),
      g: str(c.g),
      d: str(c.d),
      col: safeCss(c.col, COLS[i % COLS.length]),
    }));
  p.locs = (Array.isArray(p.locs) ? p.locs : [])
    .filter((l: any) => l && typeof l == 'object')
    .map((l: any) => (l.auto ? { n: str(l.n), d: str(l.d), auto: 1 } : { n: str(l.n), d: str(l.d) }));
  p.notes = str(p.notes);
  p.ideas = str(p.ideas);
  const B = p.board && typeof p.board == 'object' ? p.board : {};
  p.board = {
    n: cleanBoardList(B.n),
    c: cleanBoardList(B.c),
    l: cleanBoardList(B.l),
    z: Math.max(0.25, Math.min(3, num(B.z, 1))),
    x: num(B.x, 0),
    y: num(B.y, 0),
    cc: num(B.cc, 0),
  };
  // Scene cards used to point at a draft index and block index, which broke when scenes were
  // added above them. They now point at the draft id and block id.
  for (const c of p.board.c) {
    if (c.k != 's' || c.sid) continue;
    const d = p.drafts[c.d || 0] || p.drafts[0],
      b = d.blocks[c.i];
    c.did = d.id;
    c.sid = b ? b.id : '';
    delete c.d;
    delete c.i;
  }
  return p;
}

/** Where a board scene card points: draft index and block index (-1 if the scene is gone). */
export function sceneRef(c: any) {
  let d = App.P.drafts.findIndex((x: any) => x.id == c.did);
  if (d < 0) d = 0;
  const i = App.P.drafts[d].blocks.findIndex((b: any) => b.id == c.sid);
  return { d, i };
}

export function openP(p?: any) {
  if (!p) return;
  App.P = p;
  App.dr = 0;
  App.split = false;
  App.d2 = -1;
  App.tab = p.type == 'ideas' ? '' : 'Script';
  App.HU = [];
  App.HR = [];
  App.BU = [];
  App.BR = [];
  App.sel = new Set();
  App.selL = null;
  App.side = false;
  App.tool = 'select';
  if (App.P.type == 'ms') sync();
  App.cur = JSON.stringify(App.P.drafts);
  render();
  scrollTo(0, 0);
}

export function duplicateP(p: any) {
  const c = normalize(JSON.parse(JSON.stringify(p)));
  c.id = uid();
  c.title = p.title + ' (copy)';
  delete c.sample;
  c.up = Date.now();
  App.D.ps.splice(App.D.ps.indexOf(p) + 1, 0, c);
  App.D.known[c.id] = 0;
  persist();
  changed();
  return c;
}

/** Delete a story, offering Undo for a few seconds. */
export function deleteP(p: any) {
  const i = App.D.ps.indexOf(p);
  if (i < 0) return;
  App.D.ps.splice(i, 1);
  App.D.dels[p.id] = Date.now();
  if (App.P === p) App.P = null;
  persist();
  changed();
  render();
  toast(`“${p.title}” deleted`, {
    label: 'Undo',
    fn: () => {
      delete App.D.dels[p.id];
      p.up = Date.now();
      App.D.ps.splice(Math.min(i, App.D.ps.length), 0, p);
      persist();
      changed();
      render();
    },
  });
}

/** Tell listeners that stories changed without marking the open one as edited. */
export function changed() {
  changeHooks.forEach((f) => f());
}

export function sceneList(d?: any) {
  const o = [];
  let s = null;
  (App.P.drafts[d] || App.P.drafts[0]).blocks.forEach((b?: any, i?: any) => {
    if (b.t == 'scene' && b.x.trim()) {
      s = { i, id: b.id, x: b.x, syn: '', cues: new Set() };
      o.push(s);
    } else if (s) {
      if (b.t == 'action' && !s.syn) s.syn = b.x;
      if (b.t == 'character') {
        const c = cue(b.x);
        if (c) s.cues.add(c);
      }
    }
  });
  return o;
}

export function sync() {
  const used = new Set();
  App.P.drafts.forEach((d?: any) =>
    d.blocks.forEach((b?: any) => {
      if (b.t == 'scene') {
        const l = locOf(b.x);
        if (l) used.add(l);
      }
    }),
  );
  App.P.locs = App.P.locs.filter((l?: any) => !l.auto || (l.d || '').trim() || used.has(l.n));
  used.forEach((n?: any) => {
    if (!App.P.locs.some((l?: any) => l.n == n)) App.P.locs.push({ n, d: '', auto: 1 });
  });
}

export function leaveBlock(k?: any) {
  if (!App.P || !k || App.P.type != 'ms') return;
  if (k.t == 'scene') sync();
  if (k.t == 'character') {
    const c = cue(k.x).replace(/\s*\^$/, '');
    if (
      c.length > 1 &&
      !/^(V\.?O\.?|O\.?S\.?|CONT'?D)$/.test(c) &&
      !App.P.chars.some((ch?: any) => charMatch(ch, c))
    ) {
      App.P.chars.push({ id: uid(), n: titleCase(c), r: '', p: '', m: '', g: '', d: '', col: nextCharCol() });
      toast(titleCase(c) + ' added to Characters');
    }
  }
  save();
}
