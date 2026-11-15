// Saving files (exports and backups) and importing scripts and backups.
import { normalize, openP, sync } from '../project';
import { App, persist, changeHooks } from '../state';
import { cue, slug, titleCase, toast, uid } from '../utils';
import { render } from '../views/workspace';
import { COLS, COV } from '../constants';
import { manuscriptPdf, notesHtml, novelDocx, novelMarkdown, novelText, parseNovel } from './novel';
import { linesToTpHtml, parseFDX, parseFountain, screenplayPdf, toFDX, toFountain, tpFoot } from './screenplay';
import { zip } from './zip';
import { screenplayDocx, storyPackage } from './package';

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  json: 'application/json',
  txt: 'text/plain;charset=utf-8',
  md: 'text/markdown;charset=utf-8',
  fountain: 'text/plain;charset=utf-8',
  fdx: 'application/xml',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  zip: 'application/zip',
};

export async function saveFile(name: string, data: string | Uint8Array): Promise<boolean> {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const blob = new Blob([data as any], { type: MIME[ext] || 'application/octet-stream' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Saved ' + name);
  return true;
}

/* ---------- backups ---------- */

export function backupAll() {
  const d = new Date().toISOString().slice(0, 10);
  const data = { app: 'scripti', version: 1, exported: new Date().toISOString(), ps: App.D.ps };
  return saveFile(`Scripti Writer backup ${d}.json`, JSON.stringify(data));
}

export function backupOne(p: any) {
  const data = { app: 'scripti', version: 1, exported: new Date().toISOString(), ps: [p] };
  return saveFile(`${slug(p.title)}.scripti.json`, JSON.stringify(data));
}

/* ---------- exports ---------- */

const EVERYTHING: [string, string, string] = [
  'zip',
  'Everything (.zip)',
  'One folder with PDF, Word and the other formats below, a story bible and the Scripti Writer project file. Opens on Windows and Mac.',
];

export function exportFormats(type: string): [string, string, string][] {
  return [EVERYTHING, ...singleFormats(type)];
}

function singleFormats(type: string): [string, string, string][] {
  if (type == 'ms')
    return [
      ['pdf', 'PDF', 'Industry page format, ready to print or send'],
      ['docx', 'Word (.docx)', 'Editable in Word, Pages, Google Docs and LibreOffice'],
      ['fdx', 'Final Draft (.fdx)', 'Opens in Final Draft, Fade In, WriterDuet and others'],
      ['fountain', 'Fountain (.fountain)', 'Plain-text screenplay format for Highland, Slugline, Beat'],
      ['txt', 'Plain text (.txt)', 'Formatted with spaces, readable anywhere'],
    ];
  if (type == 'novel')
    return [
      ['pdf', 'PDF', 'Standard manuscript format for agents and editors'],
      ['docx', 'Word (.docx)', 'Opens in Word, Pages and Google Docs'],
      ['md', 'Markdown (.md)', 'Plain text with headings and emphasis'],
      ['txt', 'Plain text (.txt)', 'Just the words'],
    ];
  return [
    ['pdf', 'PDF', 'Your notes on clean pages, ready to print or share'],
    ['txt', 'Plain text (.txt)', 'Your notes as they are'],
    ['md', 'Markdown (.md)', 'For note apps like Obsidian or Bear'],
  ];
}

function screenplayTxt(blocks: any[]) {
  const ind: Record<string, string> = {
    character: ' '.repeat(22),
    dialogue: ' '.repeat(10),
    parenthetical: ' '.repeat(16),
  };
  return blocks
    .map((b: any) => {
      const x = ['scene', 'character', 'transition'].includes(b.t) ? b.x.toUpperCase() : b.x;
      if (b.t == 'transition') return x.padStart(60, ' ') + '\n';
      const pre = ind[b.t] || '';
      return (
        (b.t == 'scene' ? '\n' : '') +
        x
          .split('\n')
          .map((l: string) => pre + l)
          .join('\n') +
        (['character', 'parenthetical'].includes(b.t) ? '' : '\n')
      );
    })
    .join('\n');
}

/** Export a story in the chosen format: the open story by default, or any story in the library. */
export async function runExport(P: any = App.P, dr: number = App.dr, fmt?: string) {
  const d = P.drafts[Math.min(dr, P.drafts.length - 1)],
    o = { ...App.exp, fmt: fmt || App.exp.fmt, foot: tpFoot(P.tp) },
    base = P.drafts.length > 1 ? `${slug(P.title)} - ${slug(d.name)}` : slug(P.title);
  try {
    if (o.fmt == 'zip') return saveFile(slug(P.title) + '.zip', storyPackage(P, dr, o));
    if (P.type == 'ms') {
      if (o.fmt == 'docx') return saveFile(base + '.docx', screenplayDocx(P.title, P.tp.html, d.blocks, o));
      if (o.fmt == 'pdf') return saveFile(base + '.pdf', screenplayPdf(P.title, P.tp.html, d.blocks, o));
      if (o.fmt == 'fdx') return saveFile(base + '.fdx', toFDX(P.title, P.tp.html, d.blocks));
      if (o.fmt == 'fountain') return saveFile(base + '.fountain', toFountain(P.title, P.tp.html, d.blocks, P.tp));
      return saveFile(base + '.txt', P.title.toUpperCase() + '\n\n' + screenplayTxt(d.blocks));
    }
    if (P.type == 'novel') {
      const paras = parseNovel(d.novel);
      if (o.fmt == 'pdf') return saveFile(base + '.pdf', manuscriptPdf(P.title, P.tp.html, paras, o));
      if (o.fmt == 'docx') return saveFile(base + '.docx', novelDocx(P.title, P.tp.html, paras, o));
      if (o.fmt == 'md') return saveFile(base + '.md', novelMarkdown(P.title, paras));
      return saveFile(base + '.txt', novelText(P.title, paras));
    }
    if (o.fmt == 'pdf')
      return saveFile(base + '.pdf', manuscriptPdf(P.title, '', parseNovel(notesHtml(P.ideas)), { ...o, tpage: false }));
    if (o.fmt == 'md') return saveFile(base + '.md', `# ${P.title}\n\n${P.ideas}\n`);
    return saveFile(base + '.txt', `${P.title}\n\n${P.ideas}\n`);
  } catch (e) {
    console.error(e);
    toast('Export failed. Please try another format.');
  }
}

/* ---------- import ---------- */

function addCharsFrom(p: any, blocks: any[]) {
  for (const b of blocks) {
    if (b.t != 'character') continue;
    const c = cue(b.x);
    if (c.length < 2 || /^(V\.?O\.?|O\.?S\.?)$/.test(c)) continue;
    if (p.chars.some((ch: any) => ch.n.toUpperCase() == c)) continue;
    p.chars.push({
      id: uid(),
      n: titleCase(c),
      r: '',
      p: '',
      m: '',
      g: '',
      d: '',
      col: COLS[p.chars.length % COLS.length],
    });
  }
}

function parseScript(name: string, text: string) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext == 'fdx' || (ext == 'xml' && /<FinalDraft/i.test(text))) return parseFDX(text);
  return parseFountain(text);
}

/** Import into the library: a Scripti backup, or a screenplay (.fountain, .fdx, .txt) as a new story. */
export async function importToLibrary(file: File) {
  const text = await file.text();
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (ext == 'json') {
    let data: any;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return toast('That file is not a Scripti Writer backup.');
    }
    const list = Array.isArray(data?.ps) ? data.ps : data?.drafts ? [data] : null;
    if (!list) return toast('That file is not a Scripti Writer backup.');
    let added = 0,
      same = 0;
    for (const raw of list) {
      const p = normalize(JSON.parse(JSON.stringify(raw)));
      const have = App.D.ps.find((x: any) => x.id == p.id);
      if (have && have.up == p.up) {
        same++;
        continue;
      }
      if (have) {
        p.id = uid();
        p.title += ' (restored)';
      }
      delete p.sample;
      p.up = Math.max(p.up, 1);
      App.D.ps.unshift(p);
      added++;
    }
    persist();
    changeHooks.forEach((f) => f());
    App.D.lib = true;
    render();
    toast(
      added
        ? `Imported ${added} ${added == 1 ? 'story' : 'stories'}${same ? `, ${same} already here` : ''}`
        : 'Those stories are already in your library',
    );
    return;
  }
  const r = parseScript(file.name, text);
  if (!r.blocks.length) return toast('No screenplay found in that file.');
  const title = r.title || titleCase(file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
  const p = normalize({
    id: uid(),
    title,
    type: 'ms',
    cv: COV[App.D.ps.length % COV.length],
    drafts: [{ id: uid(), name: 'Draft 1', blocks: r.blocks }],
    tp: { html: linesToTpHtml(r.tp.length ? r.tp : [title.toUpperCase()]), font: 'Courier Prime', size: 20 },
    up: Date.now(),
  });
  addCharsFrom(p, r.blocks);
  App.D.ps.unshift(p);
  openP(p);
  sync();
  persist();
  changeHooks.forEach((f) => f());
  render();
  toast(`Imported “${title}”: ${r.blocks.filter((b) => b.t == 'scene').length} scenes`);
}

/** Import a screenplay file as a new draft of the open story. */
export async function importAsDraft(file: File) {
  const r = parseScript(file.name, await file.text());
  if (!r.blocks.length) return toast('No screenplay found in that file.');
  const { hpush, hcommit } = await import('../editor/history');
  hpush();
  App.P.drafts.push({
    id: uid(),
    name: file.name.replace(/\.[^.]+$/, '').slice(0, 40),
    blocks: r.blocks.map((b) => ({ ...b, id: uid() })),
    novel: '<p><br></p>',
  });
  App.dr = App.P.drafts.length - 1;
  addCharsFrom(App.P, r.blocks);
  sync();
  hcommit();
  render();
  toast('Imported as a new draft');
}

/** Export a story from the library in every format at once. */
export function exportEverything(p: any) {
  try {
    return saveFile(slug(p.title) + '.zip', storyPackage(p, 0, App.exp));
  } catch (e) {
    console.error(e);
    toast('Export failed.');
  }
}
