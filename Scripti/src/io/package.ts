// "Everything" export: one .zip folder with the story in every useful format, plus the Scripti
// project file, so it can be read, edited and reopened on Windows, Mac and phones.
import { manuscriptPdf, novelDocx, novelMarkdown, novelText, parseNovel, Para } from './novel';
import { screenplayPdf, toFDX, toFountain, tpLines } from './screenplay';
import { zip } from './zip';

type Opts = { paper: 'letter' | 'a4'; tpage: boolean; scn: boolean };
type File = { name: string; data: string | Uint8Array };

const slug = (s: string) => (s || 'Untitled').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'Untitled';
const escX = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const crlf = (s: string) => s.replace(/\r?\n/g, '\r\n');

/* ---------- Word documents ---------- */

function run(text: string, font: string, size: number, bold = false, italic = false) {
  return String(text)
    .split('\n')
    .map(
      (part, i) =>
        (i ? '<w:r><w:br/></w:r>' : '') +
        (part
          ? `<w:r><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>${bold ? '<w:b/>' : ''}${italic ? '<w:i/>' : ''}<w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${escX(part)}</w:t></w:r>`
          : ''),
    )
    .join('');
}

/** Wrap Word body XML into a .docx file. Margins in inches. */
export function docx(body: string, paper: 'letter' | 'a4', margins = { l: 1, r: 1 }) {
  const pg = paper == 'a4' ? '<w:pgSz w:w="11906" w:h="16838"/>' : '<w:pgSz w:w="12240" w:h="15840"/>';
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr>${pg}<w:pgMar w:top="1440" w:right="${Math.round(margins.r * 1440)}" w:bottom="1440" w:left="${Math.round(margins.l * 1440)}" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
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

const COURIER = 'Courier New';

/** A screenplay as an editable Word file, laid out like the PDF (Courier 12, industry indents). */
export function screenplayDocx(title: string, tpHtml: string, blocks: any[], o: Opts) {
  const tw = (inch: number) => Math.round(inch * 1440);
  // Indents from the 1.5in left margin; text area is 6in wide.
  const F: Record<
    string,
    { l: number; r: number; before: number; bold?: boolean; up?: boolean; keep?: boolean; jc?: string }
  > = {
    scene: { l: 0, r: 0, before: 12, bold: true, up: true, keep: true },
    action: { l: 0, r: 0, before: 12 },
    character: { l: 2.2, r: 0, before: 12, up: true, keep: true },
    parenthetical: { l: 1.6, r: 2.0, before: 0, keep: true },
    dialogue: { l: 1.0, r: 1.5, before: 0 },
    transition: { l: 0, r: 0, before: 12, up: true, jc: 'right' },
  };
  const P: string[] = [];
  if (o.tpage) {
    const L = tpLines(tpHtml);
    if (!L.length) L.push(title.toUpperCase());
    L.forEach((l, i) =>
      P.push(
        `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="${i == 0 ? 4320 : 0}" w:after="${i == 0 ? 480 : 0}"/></w:pPr>${run(i == 0 ? l.toUpperCase() : l, COURIER, 24, i == 0)}</w:p>`,
      ),
    );
    P.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
  }
  let n = 0;
  for (const b of blocks) {
    let t = (b.x || '').trim();
    if (!t) continue;
    const f = F[b.t] || F.action;
    if (b.t == 'parenthetical' && !/^\(.*\)$/s.test(t)) t = `(${t})`;
    if (f.up) t = t.toUpperCase();
    const first = n++ == 0;
    P.push(
      `<w:p><w:pPr>${f.keep ? '<w:keepNext/>' : ''}<w:spacing w:before="${first ? 0 : f.before * 20}" w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="${tw(f.l)}" w:right="${tw(f.r)}"/>${f.jc ? `<w:jc w:val="${f.jc}"/>` : ''}</w:pPr>${run(t, COURIER, 24, !!f.bold)}</w:p>`,
    );
  }
  return docx(P.join(''), o.paper, { l: 1.5, r: 1 });
}

/** Characters, locations and notes as a Word file. */
export function storyBibleDocx(p: any, paper: 'letter' | 'a4') {
  const F = 'Times New Roman',
    P: string[] = [];
  const h = (t: string, size: number, before = 240) =>
    P.push(
      `<w:p><w:pPr><w:keepNext/><w:spacing w:before="${before}" w:after="120"/></w:pPr>${run(t, F, size, true)}</w:p>`,
    );
  const para = (label: string, t: string) => {
    if (!t.trim()) return;
    P.push(
      `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr>${label ? run(label + ': ', F, 22, true) : ''}${run(t, F, 22)}</w:p>`,
    );
  };
  h(`${p.title}: story bible`, 36, 0);
  if (p.chars.length) {
    h('Characters', 28);
    for (const c of p.chars) {
      h(c.n || 'Unnamed character', 24, 200);
      para('Role', c.r);
      para('Gender', c.ge);
      para('Colours', (c.pal || []).join(', '));
      para('Played by', c.ac);
      para('Personality', c.p);
      para('Motivation', c.m);
      para('Goal', c.g);
      para('Look and style', c.d);
    }
  }
  if (p.locs.length) {
    h('Locations', 28);
    for (const l of p.locs) {
      h(l.n || 'Unnamed location', 24, 200);
      para('', l.d);
    }
  }
  if ((p.notes || '').trim()) {
    h('Notes', 28);
    para('', p.notes);
  }
  if (p.type == 'ideas' && p.ideas.trim()) {
    h('Ideas', 28);
    para('', p.ideas);
  }
  return docx(P.join(''), paper);
}

/* ---------- the package ---------- */

function screenplayText(title: string, blocks: any[]) {
  const ind: Record<string, string> = {
    character: ' '.repeat(22),
    dialogue: ' '.repeat(10),
    parenthetical: ' '.repeat(16),
  };
  const body = blocks
    .filter((b: any) => (b.x || '').trim())
    .map((b: any) => {
      const x = ['scene', 'character', 'transition'].includes(b.t) ? b.x.toUpperCase() : b.x;
      if (b.t == 'transition') return '\n' + x.padStart(60, ' ');
      const pre = ind[b.t] || '';
      const gap = b.t == 'dialogue' || b.t == 'parenthetical' ? '' : '\n';
      return (
        gap +
        x
          .split('\n')
          .map((l: string) => pre + l)
          .join('\n')
      );
    })
    .join('\n');
  return title.toUpperCase() + '\n\n' + body.trim() + '\n';
}

function draftFiles(p: any, d: any, base: string, o: Opts, full: boolean): File[] {
  if (p.type == 'ms') {
    const f: File[] = [
      { name: base + '.pdf', data: screenplayPdf(p.title, p.tp.html, d.blocks, o) },
      { name: base + '.docx', data: screenplayDocx(p.title, p.tp.html, d.blocks, o) },
    ];
    if (full)
      f.push(
        { name: base + '.fdx', data: toFDX(p.title, p.tp.html, d.blocks) },
        { name: base + '.fountain', data: toFountain(p.title, p.tp.html, d.blocks) },
        { name: base + '.txt', data: crlf(screenplayText(p.title, d.blocks)) },
      );
    return f;
  }
  if (p.type == 'novel') {
    const paras: Para[] = parseNovel(d.novel);
    const f: File[] = [
      { name: base + '.pdf', data: manuscriptPdf(p.title, p.tp.html, paras, o) },
      { name: base + '.docx', data: novelDocx(p.title, p.tp.html, paras, o) },
    ];
    if (full)
      f.push(
        { name: base + '.md', data: novelMarkdown(p.title, paras) },
        { name: base + '.txt', data: crlf(novelText(p.title, paras)) },
      );
    return f;
  }
  return [
    { name: base + '.txt', data: crlf(`${p.title}\n\n${p.ideas}\n`) },
    { name: base + '.md', data: `# ${p.title}\n\n${p.ideas}\n` },
  ];
}

function readme(p: any, title: string, main: any, others: any[]) {
  const t = slug(title);
  const lines = [`${title}`, `Exported from Scripti Writer on ${new Date().toLocaleString()}`, ''];
  if (p.type != 'ideas') lines.push(`Draft in this folder: ${main.name}`, '');
  lines.push('WHAT TO OPEN', '');
  if (p.type == 'ms')
    lines.push(
      `${t}.pdf        Read or print on any computer or phone.`,
      `${t}.docx       Edit in Word, Pages (Mac), Google Docs or LibreOffice.`,
      `${t}.fdx        Final Draft, Fade In, WriterDuet, Highland 2.`,
      `${t}.fountain   Highland, Slugline, Beat, Fade In, or any text editor.`,
      `${t}.txt        Plain text. Opens anywhere (Notepad, TextEdit).`,
    );
  else if (p.type == 'novel')
    lines.push(
      `${t}.pdf        Standard manuscript format, ready to read, print or send.`,
      `${t}.docx       Edit in Word, Pages (Mac), Google Docs or LibreOffice.`,
      `${t}.md         Markdown for writing apps such as Obsidian, Ulysses or iA Writer.`,
      `${t}.txt        Plain text. Opens anywhere (Notepad, TextEdit).`,
    );
  else lines.push(`${t}.txt        Plain text. Opens anywhere.`, `${t}.md         Markdown for note apps.`);
  lines.push(`Story bible.docx    Characters, locations and notes.`);
  if (others.length)
    lines.push(`Other drafts\\       PDF and Word files for: ${others.map((d) => d.name).join(', ')}.`);
  lines.push(
    `Scripti project\\    ${t}.scripti.json: the whole story (every draft, the board, comments).`,
    '                    To reopen it in Scripti Writer: Library > Import...',
    '',
  );
  return crlf(lines.join('\n'));
}

/** Build the "Everything" zip for a story. `dr` is the draft that goes at the top of the folder. */
export function storyPackage(p: any, dr: number, o: Opts) {
  const title = p.title || 'Untitled',
    root = slug(title) + '/',
    main = p.drafts[dr] || p.drafts[0],
    others = p.type == 'ideas' ? [] : p.drafts.filter((d: any) => d !== main);
  const files: File[] = [{ name: root + 'Open me first.txt', data: readme(p, title, main, others) }];
  for (const f of draftFiles(p, main, slug(title), o, true))
    files.push({ name: root + f.name, data: f.data });
  for (const d of others)
    for (const f of draftFiles(p, d, `${slug(title)} - ${slug(d.name)}`, o, false))
      files.push({ name: root + 'Other drafts/' + f.name, data: f.data });
  files.push({ name: root + 'Story bible.docx', data: storyBibleDocx(p, o.paper) });
  files.push({
    name: root + `Scripti project/${slug(title)}.scripti.json`,
    data: JSON.stringify(
      { app: 'scripti', version: 1, exported: new Date().toISOString(), ps: [p] },
      null,
      1,
    ),
  });
  return zip(files);
}
