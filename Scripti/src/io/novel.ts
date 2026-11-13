// Novel export: standard manuscript PDF, Word (.docx), Markdown and plain text.
import { makePdf, PAPER } from './pdf';
import { tpLines } from './screenplay';
import { zip } from './zip';

type Run = { t: string; b?: boolean; i?: boolean };
export type Para = { k: 'h1' | 'h2' | 'p' | 'sb'; runs: Run[] };

/** Turn the novel editor's HTML into headings, paragraphs and scene breaks with bold/italic runs. */
export function parseNovel(html: string): Para[] {
  const root = document.createElement('div');
  root.innerHTML = html || '';
  const out: Para[] = [];
  const runsOf = (n: Node, st: { b?: boolean; i?: boolean }, acc: Run[]) => {
    n.childNodes.forEach((c: any) => {
      if (c.nodeType == 3) {
        const t = c.textContent.replace(/\s+/g, ' ');
        if (t) acc.push({ t, ...st });
      } else if (c.nodeType == 1) {
        if (c.tagName == 'BR') return acc.push({ t: '\n', ...st });
        const fw = c.style?.fontWeight;
        const b = st.b || /^(B|STRONG)$/.test(c.tagName) || fw == 'bold' || +fw >= 600;
        const i = st.i || /^(I|EM)$/.test(c.tagName) || c.style?.fontStyle == 'italic';
        runsOf(c, { b, i }, acc);
      }
    });
    return acc;
  };
  const block = (el: any) => {
    const tag = el.tagName;
    const text = el.textContent.trim();
    if (tag == 'H1' || tag == 'H2') {
      if (text) out.push({ k: tag == 'H1' ? 'h1' : 'h2', runs: [{ t: text }] });
    } else if (el.classList?.contains('sb') || /^(\*\s*){3}$|^#$/.test(text)) out.push({ k: 'sb', runs: [] });
    else if (text) {
      const runs = runsOf(el, {}, []);
      if (runs.length) runs[0].t = runs[0].t.replace(/^\s+/, '');
      out.push({ k: 'p', runs });
    }
  };
  let loose: Node[] = [];
  const flushLoose = () => {
    if (!loose.length) return;
    const p = document.createElement('p');
    loose.forEach((n) => p.append(n.cloneNode(true)));
    block(p);
    loose = [];
  };
  root.childNodes.forEach((c: any) => {
    if (c.nodeType == 1 && /^(P|DIV|H1|H2|H3|BLOCKQUOTE|LI)$/.test(c.tagName)) {
      flushLoose();
      if (c.tagName == 'DIV' && c.querySelector('p,div,h1,h2'))
        c.childNodes.forEach((x: any) => (x.nodeType == 1 ? block(x) : null));
      else block(c);
    } else loose.push(c);
  });
  flushLoose();
  return out;
}

const plain = (p: Para) =>
  p.runs
    .map((r) => r.t)
    .join('')
    .trim();

export function novelWords(paras: Para[]) {
  return paras.reduce((n, p) => n + (plain(p).match(/\S+/g) || []).length, 0);
}

/* ---------- standard manuscript PDF ---------- */

const CW = 7.2,
  LH = 24; // double-spaced Courier 12

type Seg = { col: number; text: string; font: 'R' | 'B' | 'I' | 'BI' };

function layoutPara(p: Para, cols: number, indent: number): Seg[][] {
  const toks: { w: string; font: Seg['font'] }[] = [];
  for (const r of p.runs) {
    const font = (r.b && r.i ? 'BI' : r.b ? 'B' : r.i ? 'I' : 'R') as Seg['font'];
    r.t.split(/(\n| +)/).forEach((w) => {
      if (w === '\n') toks.push({ w: '\n', font });
      else if (w.trim()) toks.push({ w, font });
      else if (w) toks.push({ w: ' ', font });
    });
  }
  const lines: Seg[][] = [];
  let line: Seg[] = [],
    col = indent,
    pendingSpace = false;
  const end = () => {
    lines.push(line);
    line = [];
    col = 0;
    pendingSpace = false;
  };
  const addWord = (w: string, font: Seg['font'], sp: number) => {
    const last = line[line.length - 1];
    if (last && last.font == font) last.text += (sp ? ' ' : '') + w;
    else line.push({ col: col + sp, text: w, font });
    col += sp + w.length;
  };
  for (const t of toks) {
    if (t.w == '\n') {
      end();
      continue;
    }
    if (t.w == ' ') {
      pendingSpace = true;
      continue;
    }
    let w = t.w,
      sp = pendingSpace && line.length ? 1 : 0;
    pendingSpace = false;
    if (line.length && col + sp + w.length > cols) {
      end();
      sp = 0;
    }
    while (w.length > cols - col - sp) {
      const k = cols - col - sp;
      addWord(w.slice(0, k), t.font, sp);
      w = w.slice(k);
      end();
      sp = 0;
    }
    if (w) addWord(w, t.font, sp);
  }
  if (line.length) lines.push(line);
  return lines;
}

export function manuscriptPdf(
  title: string,
  tpHtml: string,
  paras: Para[],
  o: { paper: 'letter' | 'a4'; tpage: boolean },
) {
  const { w, h } = PAPER[o.paper];
  const cols = Math.floor((w - 144) / CW),
    lpp = Math.floor((h - 144) / LH),
    X = 72,
    TOP = 72;
  const pages: { items: any[] }[] = [];
  const short = title.toUpperCase().slice(0, 30);
  if (o.tpage) {
    const L = tpLines(tpHtml).filter(Boolean);
    const bi = L.findIndex((l) => /^(written\s+)?by$/i.test(l));
    const author = bi >= 0 ? L[bi + 1] || '' : '';
    const wc = novelWords(paras);
    const about = `about ${Math.max(100, Math.round(wc / 100) * 100).toLocaleString('en-US')} words`;
    const items: any[] = [];
    if (author) items.push({ x: X, y: TOP, text: author });
    items.push({ x: w - X - about.length * CW, y: TOP, text: about });
    const center = [title.toUpperCase(), '', author ? 'by' : '', author].filter((x, i) => i < 2 || x);
    center.forEach((t, i) => items.push({ x: (w - t.length * CW) / 2, y: h / 2 - LH * 2 + i * LH, text: t }));
    pages.push({ items });
  }
  let items: any[] = [],
    line = 0,
    n = 0;
  const newPage = () => {
    if (items.length || n == 0) {
      n++;
      pages.push({ items: (items = []) });
      if (n > 1) {
        const hd = `${short} / ${n}`;
        items.push({ x: w - X - hd.length * CW, y: 36, text: hd });
      }
    }
    line = 0;
  };
  newPage();
  const emit = (segs: Seg[]) => {
    if (line >= lpp) newPage();
    for (const s of segs) items.push({ x: X + s.col * CW, y: TOP + line * LH, text: s.text, font: s.font });
    line++;
  };
  const centered = (t: string, font: Seg['font'] = 'R') =>
    emit([{ col: Math.max(0, Math.floor((cols - t.length) / 2)), text: t, font }]);
  let first = true;
  for (const p of paras) {
    if (p.k == 'h1') {
      if (!first || line > 0) {
        if (line > 0 || items.length > 1) newPage();
      }
      line = Math.floor(lpp / 3);
      centered(plain(p).toUpperCase());
      line++;
    } else if (p.k == 'h2') {
      if (line > 0) line++;
      centered(plain(p));
      line++;
    } else if (p.k == 'sb') centered('#');
    else layoutPara(p, cols, 5).forEach(emit);
    first = false;
  }
  return makePdf(pages, w, h, title);
}

/* ---------- Word, Markdown, text ---------- */

const escX = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function wRuns(runs: Run[], extra = '') {
  return runs
    .map((r) =>
      r.t
        .split('\n')
        .map(
          (part, i) =>
            (i ? '<w:r><w:br/></w:r>' : '') +
            (part
              ? `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>${r.b ? '<w:b/>' : ''}${r.i ? '<w:i/>' : ''}${extra}</w:rPr><w:t xml:space="preserve">${escX(part)}</w:t></w:r>`
              : ''),
        )
        .join(''),
    )
    .join('');
}

export function novelDocx(
  title: string,
  tpHtml: string,
  paras: Para[],
  o: { paper: 'letter' | 'a4'; tpage: boolean },
) {
  const P: string[] = [];
  const center = (t: string, size: number, bold: boolean, before = 0, after = 240, pageBreak = false) =>
    `<w:p><w:pPr>${pageBreak ? '<w:pageBreakBefore/>' : ''}<w:jc w:val="center"/><w:spacing w:before="${before}" w:after="${after}"/></w:pPr>${wRuns([{ t, b: bold }], `<w:sz w:val="${size}"/>`)}</w:p>`;
  let hadContent = false;
  if (o.tpage) {
    const L = tpLines(tpHtml);
    if (!L.length) L.push(title);
    L.forEach((l, i) => P.push(center(l, i == 0 ? 40 : 24, i == 0, i == 0 ? 3600 : 0)));
    hadContent = true;
  }
  for (const p of paras) {
    if (p.k == 'h1') P.push(center(plain(p), 32, true, 2400, 480, hadContent));
    else if (p.k == 'h2') P.push(center(plain(p), 26, true, 240, 240));
    else if (p.k == 'sb') P.push(center('#', 24, false));
    else
      P.push(
        `<w:p><w:pPr><w:spacing w:line="480" w:lineRule="auto" w:after="0"/><w:ind w:firstLine="720"/></w:pPr>${wRuns(p.runs, '<w:sz w:val="24"/>')}</w:p>`,
      );
    hadContent = true;
  }
  const pg = o.paper == 'a4' ? '<w:pgSz w:w="11906" w:h="16838"/>' : '<w:pgSz w:w="12240" w:h="15840"/>';
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${P.join('')}<w:sectPr>${pg}<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  return zip([
    {
      name: '[Content_Types].xml',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    },
    {
      name: '_rels/.rels',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    },
    { name: 'word/document.xml', data: doc },
  ]);
}

export function novelMarkdown(title: string, paras: Para[]) {
  const md = (r: Run) => {
    const t = r.t.replace(/([*_`\\])/g, '\\$1').replace(/\n/g, '  \n');
    if (!t.trim()) return t;
    const m = t.match(/^(\s*)(.*?)(\s*)$/s)!;
    const w = r.b && r.i ? '***' : r.b ? '**' : r.i ? '*' : '';
    return m[1] + w + m[2] + w + m[3];
  };
  const out = [`# ${title}`];
  for (const p of paras) {
    if (p.k == 'h1') out.push(`## ${plain(p)}`);
    else if (p.k == 'h2') out.push(`### ${plain(p)}`);
    else if (p.k == 'sb') out.push('* * *');
    else out.push(p.runs.map(md).join('').trim());
  }
  return out.join('\n\n') + '\n';
}

export function novelText(title: string, paras: Para[]) {
  const out = [title.toUpperCase(), ''];
  for (const p of paras) {
    if (p.k == 'h1') out.push('', '', plain(p).toUpperCase(), '');
    else if (p.k == 'h2') out.push('', plain(p), '');
    else if (p.k == 'sb') out.push('', '#', '');
    else out.push(plain(p), '');
  }
  return (
    out
      .join('\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim() + '\n'
  );
}
