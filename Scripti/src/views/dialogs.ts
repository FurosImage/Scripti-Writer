// Dialogs: new story, export, keyboard shortcuts, about, backups, install, and the small context menus.
import { exportFormats } from '../io/files';
import { isIOS, isMacSafari } from '../io/pwa';
import { autoBackupOn, canAutoBackup } from '../backup';
import { APP_NAME, BUG_URL, BUILD_YEAR, FEEDBACK_URL, REPO_URL, VERSION_LABEL } from '../constants';
import { App } from '../state';
import { esc, MOD } from '../utils';

const shell = (title: string, body: string, cls = '') =>
  `<div class="modal" data-a="x"><div role="dialog" aria-modal="true" aria-label="${esc(title)}" class="${cls}"><div class="mh"><b>${esc(title)}</b><button class="ib" data-a="mclose" aria-label="Close">×</button></div>${body}</div></div>`;

export function newDialog() {
  return shell(
    'Create a new story',
    `<div class="opts">
<button class="opt" data-a="make" data-t="ms"><b>Manuscript</b><small>Screenplay format with scenes, characters and dialogue</small></button>
<button class="opt" data-a="make" data-t="novel"><b>Novel</b><small>Flowing prose with chapters</small></button>
<button class="opt" data-a="make" data-t="ideas"><b>Plain story ideas</b><small>A scratchpad for raw notes</small></button>
<button class="opt" data-a="imp"><b>Import a file…</b><small>A Fountain or Final Draft screenplay, or a Scripti Writer backup</small></button></div>`,
  );
}

export function exportDialog() {
  const P = App.P,
    F = exportFormats(P.type),
    o = App.exp;
  if (!F.some((f) => f[0] == o.fmt)) o.fmt = F[0][0];
  const paper = o.fmt == 'pdf' || o.fmt == 'docx' || o.fmt == 'zip';
  return shell(
    'Export',
    `${P.type != 'ideas' && P.drafts.length > 1 ? `<p class="hint">Exports the draft “${esc(P.drafts[App.dr].name)}”.</p>` : ''}
<div class="opts" role="radiogroup" aria-label="Format">${F.map(([v, l, s]) => `<button class="opt ${o.fmt == v ? 'on' : ''}" role="radio" aria-checked="${o.fmt == v}" data-a="expfmt" data-t="${v}"><b>${l}</b><small>${s}</small></button>`).join('')}</div>
${
  paper
    ? `<div class="eopts"><label>Paper <select data-c="exppaper"><option value="letter" ${o.paper == 'letter' ? 'selected' : ''}>US Letter</option><option value="a4" ${o.paper == 'a4' ? 'selected' : ''}>A4</option></select></label>
<label><input type="checkbox" data-c="exptp" ${o.tpage ? 'checked' : ''}> Title page</label>
${P.type == 'ms' ? `<label><input type="checkbox" data-c="expscn" ${o.scn ? 'checked' : ''}> Scene numbers</label>` : ''}</div>`
    : ''
}
<div class="mfoot"><button data-a="mclose">Cancel</button><button class="pri" data-a="expgo">Export</button></div>`,
    'wide',
  );
}

const K = (k: string) =>
  k
    .split('+')
    .map((x) => `<kbd>${x}</kbd>`)
    .join('+');
const mod = MOD;

export function helpDialog() {
  const rows = (list: [string, string][]) =>
    list.map(([k, d]) => `<tr><td>${K(k)}</td><td>${d}</td></tr>`).join('');
  return shell(
    'Keyboard shortcuts',
    `<div class="keys"><h3>Writing</h3><table>${rows([
      ['Enter', 'New line of the next type (splits at the cursor)'],
      ['Shift+Enter', 'Line break inside the same block'],
      ['Tab', 'Change block type (Shift+Tab goes back)'],
      ['Tab', 'Accept an autocomplete suggestion'],
      [`${mod}+Z`, 'Undo'],
      [`${mod}+Shift+Z`, 'Redo'],
      [`${mod}+S`, 'Save now'],
      [`${mod}+F`, 'Find and replace'],
      [`${mod}+E`, 'Export'],
      [`${mod}+Shift+F`, 'Focus mode (Esc to leave)'],
      ['?', 'This list'],
    ])}</table>
<h3>Brainstorm board</h3><table>${rows([
      ['V', 'Select and move'],
      ['H', 'Pan (or hold Space)'],
      ['P', 'Pencil'],
      ['R', 'Rectangle'],
      ['O', 'Circle'],
      ['L', 'Line'],
      ['A', 'Arrow'],
      ['N', 'Sticky note'],
      ['T', 'Timeline'],
      ['Delete', 'Remove selection'],
      [`${mod}+A`, 'Select everything'],
    ])}</table><p class="hint">On a touch screen, drag with one finger to move around the board and pinch to zoom.</p></div>`,
    'wide',
  );
}

const ext = (url: string, label: string, cls = '') =>
  `<a class="abtn ${cls}" href="${url}" target="_blank" rel="noopener">${label}</a>`;

/** About: what the app is, which version this is, its license, and where to send feedback. */
export function aboutDialog() {
  const desktop = !!(window as any).scriptiDesktop;
  return shell(
    `About ${APP_NAME}`,
    `<div class="about"><img src="./icons/icon-192.png" alt="" width="72" height="72">
<h2>${APP_NAME}</h2><p class="aver">${VERSION_LABEL}</p>
<p>A quiet place to write screenplays and novels. Free and open source.</p>
${desktop ? '<p><button data-a="updcheck">Check for updates</button></p>' : ''}
<h3>Feedback</h3>
<p class="hint">${APP_NAME} is in beta, so you may run into bugs. Ideas and reports make it better. Both open a short form on GitHub (needs a free account).</p>
<p class="arow">${ext(FEEDBACK_URL, 'Send feedback or an idea', 'pri')}${ext(BUG_URL, 'Report a bug')}</p>
<h3>License</h3>
<p class="hint">© ${BUILD_YEAR} ${APP_NAME}. Free software under the <a href="${REPO_URL}/blob/main/LICENSE" target="_blank" rel="noopener">GNU General Public License v3.0</a>: you may use, change and share it, and every copy stays free and open. It comes with no warranty.</p>
<p class="arow">${ext(REPO_URL, 'Source code')}</p></div>`,
  );
}

/** Automatic backups (desktop app): on or off, where they are, and a button to make one now. */
export function backupsDialog() {
  const D = App.D;
  return shell(
    'Automatic backups',
    `<div class="about left"><p>${APP_NAME} keeps a copy of all your stories in a <b>Scripti Writer Backups</b> folder: one file per day, updated while you write, for the last two weeks.</p>
<p><label class="chk"><input type="checkbox" data-c="ab" ${autoBackupOn() ? 'checked' : ''}> Back up automatically</label></p>
<p class="hint">${D.abt ? `Last backup: ${esc(new Date(D.abt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }))}.` : 'No backup made yet.'}${D.abdir ? `<br>Folder: ${esc(D.abdir)}` : ''}</p>
<p class="hint">To bring a backup back, use <b>Import…</b> in the library and choose one of the files.</p>
<div class="mfoot"><button data-a="abopen">Open backup folder</button><button class="pri" data-a="abnow" ${D.ps.length ? '' : 'disabled'}>Back up now</button></div></div>`,
  );
}

export function installDialog() {
  return shell(
    'Install Scripti Writer',
    isMacSafari()
      ? `<ol class="steps"><li>In Safari's menu bar, choose <b>File → Add to Dock…</b></li><li>Click <b>Add</b>.</li><li>Open Scripti Writer from the Dock or Launchpad. It runs in its own window and works offline.</li></ol>`
      : isIOS()
        ? `<ol class="steps"><li>Tap the <b>Share</b> button <span aria-hidden="true">⬆︎</span> in Safari.</li><li>Choose <b>Add to Home Screen</b>.</li><li>Open Scripti Writer from your Home Screen. It works offline and keeps your stories on this device.</li></ol>`
        : `<p>Use your browser's menu and choose <b>Install Scripti Writer</b> or <b>Add to Home screen</b>. Scripti Writer then opens in its own window and works offline.</p>`,
  );
}

export function dialog() {
  if (App.modal == 'new') return newDialog();
  if (App.modal == 'export' && App.P) return exportDialog();
  if (App.modal == 'help') return helpDialog();
  if (App.modal == 'install') return installDialog();
  if (App.modal == 'about') return aboutDialog();
  if (App.modal == 'backups' && canAutoBackup()) return backupsDialog();
  return '';
}

/** The small pop-up menus for draft tabs and story cards. */
export function ctxMenu() {
  const c = App.ctx;
  if (!c) return '';
  const pos = `left:${c.x}px;top:${c.y}px`;
  if (c.kind == 'card')
    return `<div class="pop ctxm" style="${pos}" role="menu"><button data-a="open" data-id="${c.id}">Open</button><button data-a="cdup" data-id="${c.id}">Duplicate</button><button data-a="cpdf" data-id="${c.id}">Export PDF</button><button data-a="cexp" data-id="${c.id}">Export everything (.zip)</button><hr><label class="mi" tabindex="0" role="menuitem">Change cover image…<input type="file" accept="image/*" data-c="cimg" data-id="${c.id}" hidden></label><button data-a="ccol" data-id="${c.id}">Change cover colour</button>${App.D.ps.find((p: any) => p.id == c.id)?.img ? `<button data-a="cnoimg" data-id="${c.id}">Remove cover image</button>` : ''}<hr><button data-a="cbk" data-id="${c.id}">Back up (.json)</button><button data-a="cdel" data-id="${c.id}" class="danger">Delete</button></div>`;
  if (!App.P) return '';
  return `<div class="pop ctxm" style="${pos}" role="menu"><button data-a="dup">Duplicate</button><button data-a="rename">Rename</button>${App.P.drafts.length > 1 ? '<button data-a="del" class="danger">Delete</button>' : ''}</div>`;
}
