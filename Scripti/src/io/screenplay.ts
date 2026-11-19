// Screenplay layout (industry page format), Fountain and Final Draft (.fdx) conversion.
import { makePdf, PAPER, PdfPage, watermarkOf } from './pdf';

export type Block = { id?: string; t: string; x: string; h?: string };

/* ---------- title page text ---------- */

/** The title page as plain lines of text (blank lines kept). */
export function tpLines(html: string): string[] {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  const out: string[] = [];
  const walk = (n: Node) => {
    n.childNodes.forEach((c: any) => {
      if (c.nodeType == 3) {
        const t = c.textContent.trim();
        if (t) out.push(t);
      } else if (c.nodeType == 1) {
        if (c.tagName == 'BR') return;
        if (/^(DIV|P|H1|H2|H3|LI)$/.test(c.tagName)) {
          if (c.querySelector('p,div,h1,h2,h3')) walk(c);
          else out.push(c.textContent.trim());
        } else {
          const t = c.textContent.trim();
          if (t) out.push(t);
        }
      }
    });
  };
  walk(d);
  while (out.length && !out[out.length - 1]) out.pop();
  return out;
}

/** The details at the bottom of a title page, as lines (empty ones left out). */
export function tpFoot(tp: any): string[] {
  if (!tp) return [];
  const s = (v: any) => String(v || '').trim();
  const copy = s(tp.copy);
  return [
    s(tp.prod) && 'Produced by ' + s(tp.prod),
    copy && (/^(©|\(c\)|copyright)/i.test(copy) ? copy : '© ' + copy),
    s(tp.date),
    s(tp.mail),
  ].filter(Boolean) as string[];
}

export const linesToTpHtml = (lines: string[]) =>
  lines.map((l, i) => (i == 0 ? `<h1>${escH(l)}</h1>` : `<p>${l ? escH(l) : '<br>'}</p>`)).join('');

const escH = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Plain text of a block, with highlight comments written as [[notes]] when asked. */
function blockText(b: Block, notes: boolean) {
  if (!b.h || !notes) return b.x;
  const d = document.createElement('div');
  d.innerHTML = b.h;
  d.querySelectorAll('mark').forEach((m: any) => {
    const c = (m.dataset.cm || '').trim();
    m.replaceWith(m.textContent + (c ? ` [[${c}]]` : ''));
  });
  return d.textContent || '';
}

/* ---------- page layout ---------- */

const CW = 7.2, // Courier 12pt: 10 characters per inch
  LH = 12, // 6 lines per inch
  X0 = 108, // 1.5in left margin
  TOP = 72;

const EL: Record<string, { col: number; w: number; gap: number; up?: boolean }> = {
  scene: { col: 0, w: 60, gap: 1, up: true },
  action: { col: 0, w: 60, gap: 1 },
  character: { col: 22, w: 38, gap: 1, up: true },
  parenthetical: { col: 16, w: 24, gap: 0 },
  dialogue: { col: 10, w: 35, gap: 0 },
  transition: { col: 0, w: 60, gap: 1, up: true },
};

export function wrap(text: string, w: number): string[] {
  const out: string[] = [];
  for (const para of String(text).replace(/\t/g, '    ').split('\n')) {
    let line = '';
    for (let word of para.split(/ +/)) {
      while (word.length > w) {
        if (line) {
          out.push(line);
          line = '';
        }
        out.push(word.slice(0, w));
        word = word.slice(w);
      }
      if (!line) line = word;
      else if (line.length + 1 + word.length <= w) line += ' ' + word;
      else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

type Row = { col: number; text: string; bold?: boolean; kind: string; scn?: number; bi?: number };
type Unit = { gap: number; rows: Row[]; kind: string; keep?: boolean; name?: string };

function units(blocks: Block[]): Unit[] {
  const U: Unit[] = [];
  let scn = 0;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const text = (b.x || '').trim();
    if (!text) continue;
    if (b.t == 'character') {
      const name = text.toUpperCase();
      const rows: Row[] = wrap(name, EL.character.w).map((t) => ({ col: 22, text: t, kind: 'character', bi: i }));
      while (blocks[i + 1] && (blocks[i + 1].t == 'dialogue' || blocks[i + 1].t == 'parenthetical')) {
        const n = blocks[++i],
          e = EL[n.t];
        let t = (n.x || '').trim();
        if (!t) continue;
        if (n.t == 'parenthetical' && !/^\(.*\)$/s.test(t)) t = `(${t.replace(/^\(|\)$/g, '')})`;
        for (const l of wrap(t, e.w)) rows.push({ col: e.col, text: l, kind: n.t, bi: i });
      }
      U.push({ gap: 1, rows, kind: 'dialogue', name: name.replace(/\s*\(CONT'?D\)\s*$/, '') });
      continue;
    }
    const e = EL[b.t] || EL.action;
    const t = e.up ? text.toUpperCase() : text;
    const rows: Row[] = wrap(t, e.w).map((l) => ({
      col: b.t == 'transition' ? Math.max(0, 60 - l.length) : e.col,
      text: l,
      bold: b.t == 'scene',
      kind: b.t == 'dialogue' || b.t == 'parenthetical' ? 'action' : b.t,
      bi: i,
    }));
    if (b.t == 'scene') rows[0].scn = ++scn;
    U.push({
      gap: e.gap,
      rows,
      kind: b.t == 'scene' ? 'scene' : b.t == 'transition' ? 'transition' : 'action',
      keep: b.t == 'scene',
    });
  }
  return U;
}

/** Lay out a script into pages of rows. `lpp` is lines per page. */
export function paginate(blocks: Block[], lpp: number): Row[][][] {
  const pages: Row[][][] = [[]];
  let line = 0;
  const page = () => pages[pages.length - 1];
  const newPage = () => {
    pages.push([]);
    line = 0;
  };
  const put = (rows: Row[], gap: number) => {
    if (line) for (let g = 0; g < gap; g++) (page().push([]), line++);
    for (const r of rows) (page().push([r]), line++);
  };
  const U = units(blocks);
  for (let k = 0; k < U.length; k++) {
    const u = U[k];
    let rows = u.rows;
    const gap = () => (line ? u.gap : 0);
    const next = U[k + 1];
    const extra = u.keep && next ? next.gap + Math.min(2, next.rows.length) : 0;
    if (line + gap() + rows.length + extra <= lpp) {
      put(rows, u.gap);
      continue;
    }
    if (u.keep || u.kind == 'transition' || rows.length < 4) {
      if (line) newPage();
      put(rows, 0);
      continue;
    }
    // Split long action and dialogue across pages.
    while (rows.length) {
      const avail = lpp - line - gap();
      if (rows.length <= avail) {
        put(rows, u.gap);
        break;
      }
      if (u.kind == 'action' && avail >= 2 && rows.length - avail >= 2) {
        put(rows.slice(0, avail), u.gap);
        rows = rows.slice(avail);
        newPage();
        continue;
      }
      if (u.kind == 'dialogue') {
        // Leave room for (MORE); never strand the character name alone.
        let cut = avail - 1;
        while (cut > 0 && rows[cut - 1].kind == 'character') cut--;
        if (cut >= 2 && rows.length - cut >= 1 && rows.slice(0, cut).some((r) => r.kind == 'dialogue')) {
          put([...rows.slice(0, cut), { col: 22, text: '(MORE)', kind: 'more' }], u.gap);
          newPage();
          rows = [{ col: 22, text: `${u.name} (CONT'D)`, kind: 'character' }, ...rows.slice(cut)];
          continue;
        }
      }
      if (!line) {
        // Even a fresh page cannot hold it: hard split.
        put(rows.slice(0, lpp), 0);
        rows = rows.slice(lpp);
        newPage();
        continue;
      }
      newPage();
    }
  }
  if (!page().length && pages.length > 1) pages.pop();
  return pages;
}

/** For each printed page, the index of the script line it starts with. */
export function pageStarts(blocks: Block[], lpp: number): number[] {
  return paginate(blocks, lpp).map((pg) => {
    for (const cell of pg) if (cell[0] && cell[0].bi != null) return cell[0].bi;
    return -1;
  });
}

export const linesPerPage = (paper: 'letter' | 'a4') => Math.floor((PAPER[paper].h - TOP * 2) / LH);

export function scriptStats(blocks: Block[]) {
  const pages = paginate(blocks, linesPerPage('letter'));
  let words = 0,
    scenes = 0;
  for (const b of blocks) {
    words += (b.x.match(/\S+/g) || []).length;
    if (b.t == 'scene' && b.x.trim()) scenes++;
  }
  const empty = pages.length == 1 && !pages[0].length;
  return { pages: empty ? 0 : pages.length, scenes, words };
}

export function screenplayPdf(
  title: string,
  tpHtml: string,
  blocks: Block[],
  o: { paper: 'letter' | 'a4'; tpage: boolean; scn: boolean; foot?: string[] },
) {
  const { w, h } = PAPER[o.paper];
  const lpp = linesPerPage(o.paper);
  const out: PdfPage[] = [];
  if (o.tpage) {
    const L = tpLines(tpHtml);
    if (!L.length) L.push(title.toUpperCase());
    const items = L.map((t, i) => ({
      x: Math.max(36, (w - t.length * CW) / 2),
      y: h / 3 + i * LH * (i == 0 ? 1 : 1) + (i > 0 ? LH * 2 : 0),
      text: i == 0 ? t.toUpperCase() : t,
      font: (i == 0 ? 'B' : 'R') as any,
    }));
    // Date, contact and rights go at the bottom left, as on a printed title page.
    const F = o.foot || [];
    F.forEach((t, i) => items.push({ x: X0, y: h - 72 - (F.length - 1 - i) * LH, text: t, font: 'R' as any }));
    out.push({ items });
  }
  paginate(blocks, lpp).forEach((pg, n) => {
    const items: any[] = [];
    if (n > 0) {
      const t = `${n + 1}.`;
      items.push({ x: X0 + (60 - t.length) * CW, y: 36, text: t });
    }
    pg.forEach((cell, li) => {
      const r = cell[0];
      if (!r) return;
      const y = TOP + li * LH;
      items.push({ x: X0 + r.col * CW, y, text: r.text, font: r.bold ? 'B' : 'R' });
      if (o.scn && r.scn) {
        const s = String(r.scn);
        items.push({ x: X0 - 54 - (s.length - 1) * CW, y, text: s, font: 'B' });
        items.push({ x: X0 + 61 * CW, y, text: s, font: 'B' });
      }
    });
    out.push({ items });
  });
  return makePdf(out, w, h, title, watermarkOf(o));
}

/* ---------- Fountain ---------- */

const SCENE_RE = /^(INT|EXT|EST|INT\.?\/EXT|EXT\.?\/INT|I\/E)[.\s]/i;

function tpFields(title: string, tpHtml: string) {
  const L = tpLines(tpHtml).filter(Boolean);
  const f: [string, string][] = [['Title', title]];
  const bi = L.findIndex(
    (l) => /^(written\s+)?by$/i.test(l) || /^(screenplay|story|teleplay)\s+by$/i.test(l),
  );
  if (bi >= 0) {
    f.push(['Credit', L[bi]]);
    if (L[bi + 1]) f.push(['Author', L[bi + 1]]);
  }
  const dd = L.find((l) => /draft|\b(19|20)\d\d\b/i.test(l) && l !== L[bi + 1]);
  if (dd) f.push(['Draft date', dd]);
  return f;
}

export function toFountain(title: string, tpHtml: string, blocks: Block[], tp?: any) {
  const f = tpFields(title, tpHtml);
  const s = (v: any) => String(v || '').trim();
  if (tp) {
    if (s(tp.date)) {
      const i = f.findIndex(([k]) => k == 'Draft date');
      if (i >= 0) f[i][1] = s(tp.date);
      else f.push(['Draft date', s(tp.date)]);
    }
    if (s(tp.mail)) f.push(['Contact', s(tp.mail)]);
    if (s(tp.copy)) f.push(['Copyright', s(tp.copy)]);
    if (s(tp.prod)) f.push(['Notes', 'Produced by ' + s(tp.prod)]);
  }
  const out: string[] = [f.map(([k, v]) => `${k}: ${v}`).join('\n')];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    let t = blockText(b, true).trim();
    if (!t) continue;
    if (b.t == 'scene') {
      t = t.toUpperCase();
      out.push(SCENE_RE.test(t) ? t : '.' + t);
    } else if (b.t == 'transition') {
      t = t.toUpperCase();
      out.push(/TO:$/.test(t) ? t : '> ' + t);
    } else if (b.t == 'character') {
      const g = [t.toUpperCase()];
      while (blocks[i + 1] && (blocks[i + 1].t == 'dialogue' || blocks[i + 1].t == 'parenthetical')) {
        const n = blocks[++i];
        let x = blockText(n, true).trim();
        if (!x) continue;
        if (n.t == 'parenthetical' && !/^\(.*\)$/s.test(x)) x = `(${x})`;
        g.push(x);
      }
      out.push(g.join('\n'));
    } else {
      // Action that would read as another element gets a forced-action "!".
      const first = t.split('\n')[0];
      const looksCaps = first === first.toUpperCase() && /[A-Z]/.test(first);
      out.push(SCENE_RE.test(first) || looksCaps || /^[.>@#=~!]/.test(t) ? '!' + t : t);
    }
  }
  return out.join('\n\n') + '\n';
}

const isCaps = (s: string) => {
  const c = s
    .replace(/\(.*?\)/g, '')
    .replace(/\^$/, '')
    .trim();
  return !!c && /[A-Z]/.test(c) && c === c.toUpperCase() && !/[a-z]/.test(c);
};

const clean = (s: string) =>
  s
    .replace(/\[\[[\s\S]*?\]\]/g, '')
    .replace(/\*{1,3}|_/g, '')
    .replace(/\s+$/g, '');

export function parseFountain(src: string): { title: string; tp: string[]; blocks: Block[] } {
  let text = src.replace(/\r\n?/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');
  let title = '';
  const tp: string[] = [];
  // Title page: key: value pairs before the first blank line.
  const m = text.match(/^\s*((?:[A-Za-z][A-Za-z ]*:.*(?:\n(?:[ \t]+.*|[A-Za-z][A-Za-z ]*:.*))*))\n\s*\n/);
  if (
    m &&
    /^\s*(title|credit|author|authors|source|draft date|date|contact|copyright|notes)\s*:/i.test(m[1])
  ) {
    const fields: Record<string, string[]> = {};
    let key = '';
    for (const l of m[1].split('\n')) {
      const kv = l.match(/^([A-Za-z][A-Za-z ]*):\s*(.*)$/);
      if (kv && !/^\s/.test(l)) {
        key = kv[1].toLowerCase();
        fields[key] = kv[2] ? [kv[2].trim()] : [];
      } else if (key) fields[key].push(l.trim());
    }
    title = clean((fields.title || []).join(' ')).trim();
    if (title) tp.push(title.toUpperCase());
    for (const k of ['credit', 'author', 'authors', 'source', 'draft date', 'date', 'contact', 'copyright'])
      if (fields[k]) {
        if (k == 'draft date' || k == 'contact') tp.push('');
        tp.push(...fields[k].map(clean).filter(Boolean));
      }
    text = text.slice(m[0].length);
  }
  const blocks: Block[] = [];
  const paras = text.split(/\n[ \t]*\n/);
  for (const p of paras) {
    const lines = p.split('\n').filter((l) => l.trim() !== '' || false);
    if (!lines.length) continue;
    const first = lines[0].trim();
    if (/^(#|=(?!==))/.test(first) || /^={3,}$/.test(first)) continue;
    if (lines.length == 1 && (/^\.[^.]/.test(first) || SCENE_RE.test(first))) {
      blocks.push({ t: 'scene', x: clean(first.replace(/^\./, '').replace(/\s*#[^#]*#\s*$/, '')) });
      continue;
    }
    if (first.startsWith('!')) {
      blocks.push({
        t: 'action',
        x: clean(
          lines
            .map((l) => l.trim())
            .join('\n')
            .slice(1),
        ),
      });
      continue;
    }
    if (/^>.*<$/.test(first)) {
      blocks.push({ t: 'action', x: clean(first.slice(1, -1).trim()) });
      continue;
    }
    if (lines.length == 1 && (first.startsWith('>') || (isCaps(first) && /TO:$/.test(first)))) {
      blocks.push({ t: 'transition', x: clean(first.replace(/^>\s*/, '')) });
      continue;
    }
    if (lines.length > 1 && (first.startsWith('@') || isCaps(first))) {
      blocks.push({ t: 'character', x: clean(first.replace(/^@/, '').replace(/\s*\^$/, '')) });
      let dl: string[] = [];
      const flush = () => {
        if (dl.length) blocks.push({ t: 'dialogue', x: clean(dl.join('\n')) });
        dl = [];
      };
      for (const l of lines.slice(1)) {
        const t = l.trim();
        if (/^\(.*\)$/.test(t)) {
          flush();
          blocks.push({ t: 'parenthetical', x: t });
        } else dl.push(t);
      }
      flush();
      continue;
    }
    blocks.push({ t: 'action', x: clean(lines.map((l) => l.replace(/^\s+/, '')).join('\n')) });
  }
  return { title, tp, blocks: blocks.filter((b) => b.x.trim()) };
}

/* ---------- Final Draft ---------- */

const FDX_T: Record<string, string> = {
  scene: 'Scene Heading',
  action: 'Action',
  character: 'Character',
  parenthetical: 'Parenthetical',
  dialogue: 'Dialogue',
  transition: 'Transition',
};
const escX = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

export function toFDX(title: string, tpHtml: string, blocks: Block[]) {
  const para = (type: string, text: string, extra = '') =>
    `    <Paragraph${extra} Type="${type}">\n      <Text>${escX(text)}</Text>\n    </Paragraph>`;
  const body: string[] = [];
  for (const b of blocks) {
    const t = (b.x || '').trim();
    if (!t) continue;
    const type = FDX_T[b.t] || 'Action';
    const parts = b.t == 'action' ? t.split(/\n+/) : [t.replace(/\n+/g, ' ')];
    for (const x of parts)
      body.push(
        para(type, b.t == 'scene' || b.t == 'character' || b.t == 'transition' ? x.toUpperCase() : x),
      );
  }
  const L = tpLines(tpHtml);
  if (!L.length) L.push(title.toUpperCase());
  const tp = L.map((l) => para('Title Page', l, ' Alignment="Center"')).join('\n');
  return `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<FinalDraft DocumentType="Script" Template="No" Version="5">
  <Content>
${body.join('\n')}
  </Content>
  <TitlePage>
    <Content>
${tp}
    </Content>
  </TitlePage>
</FinalDraft>
`;
}

export function parseFDX(xml: string): { title: string; tp: string[]; blocks: Block[] } {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('This file is not a valid Final Draft document.');
  const map: Record<string, string> = {
    'Scene Heading': 'scene',
    Action: 'action',
    Character: 'character',
    Parenthetical: 'parenthetical',
    Dialogue: 'dialogue',
    Transition: 'transition',
    Shot: 'scene',
    General: 'action',
  };
  const text = (p: Element) => [...p.getElementsByTagName('Text')].map((t) => t.textContent || '').join('');
  const content = [...doc.documentElement.children].find((c) => c.tagName == 'Content');
  const blocks: Block[] = [];
  if (content)
    for (const p of [...content.children].filter((c) => c.tagName == 'Paragraph')) {
      const x = text(p).trim();
      if (x) blocks.push({ t: map[p.getAttribute('Type') || ''] || 'action', x });
    }
  const tpEl = doc.getElementsByTagName('TitlePage')[0];
  const tp = tpEl ? [...tpEl.getElementsByTagName('Paragraph')].map((p) => text(p).trim()) : [];
  while (tp.length && !tp[0]) tp.shift();
  return { title: tp[0] || '', tp, blocks };
}
