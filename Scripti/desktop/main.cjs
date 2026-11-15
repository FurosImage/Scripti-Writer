// Scripti Writer desktop app (Electron): one window showing the built web app, plus a native menu
// bar. Run with `npm run desktop`; package a Mac app with `npm run mac` (see README).
const { app, BrowserWindow, Menu, shell, session, ipcMain, dialog } = require('electron');
const { pathToFileURL } = require('url');
const path = require('path');
const fs = require('fs');

const isMac = process.platform === 'darwin';
const NAME = 'Scripti Writer';
let win = null;

// Stories live in the app's data folder. The app was called "Scripti" before, so keep using that
// folder: renaming the app must never leave a writer's stories behind. Set before anything else.
app.setPath('userData', path.join(app.getPath('appData'), 'Scripti'));

/** Websites the app may open in the normal browser (the project's own pages). */
const OPEN_OK = /^https:\/\/(github\.com\/FurosImage\/Scripti-Writer([\/?#]|$)|furosimage\.github\.io\/Scripti-Writer([\/?#]|$))/i;
/** Where update installers come from. */
const UPDATE_OK = /^https:\/\/github\.com\/FurosImage\/Scripti-Writer\/releases\/download\/[^/]+\/[\w.-]+\.(dmg|exe)$/i;

/**
 * Automatic backups go in the folder the writer picked, or Documents/Scripti Writer Backups (or,
 * if neither can be used, in the app's own data folder). One file per day; the newest KEEP files
 * are kept.
 */
const BACKUP_NAME = /^Scripti Writer backup \d{4}-\d{2}-\d{2}\.json$/;
const KEEP = 14;

/** Small settings kept by the desktop app itself (the folder for backups). */
const settingsFile = () => path.join(app.getPath('userData'), 'desktop-settings.json');
function readSettings() {
  try {
    const s = JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
    return s && typeof s === 'object' ? s : {};
  } catch (e) {
    return {};
  }
}
function writeSettings(s) {
  try {
    fs.writeFileSync(settingsFile(), JSON.stringify(s), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

function usable(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch (e) {
    return false;
  }
}

function backupDir() {
  const own = readSettings().backupDir;
  if (typeof own === 'string' && own && path.isAbsolute(own) && usable(own)) return own;
  for (const base of [app.getPath('documents'), app.getPath('userData')]) {
    const dir = path.join(base, 'Scripti Writer Backups');
    if (usable(dir)) return dir;
  }
  return null;
}

/** Ask for a folder and remember it. Returns the folder, or '' when cancelled or unusable. */
async function chooseBackupDir() {
  const w = BrowserWindow.getFocusedWindow() || win;
  const opts = {
    title: 'Folder for your Scripti Writer backups',
    buttonLabel: 'Use this folder',
    defaultPath: backupDir() || app.getPath('documents'),
    properties: ['openDirectory', 'createDirectory'],
  };
  const r = w ? await dialog.showOpenDialog(w, opts) : await dialog.showOpenDialog(opts);
  const dir = !r.canceled && r.filePaths[0];
  if (!dir || !usable(dir)) return '';
  return writeSettings({ ...readSettings(), backupDir: dir }) ? dir : '';
}

function saveBackup(name, json) {
  if (typeof name !== 'string' || typeof json !== 'string' || !BACKUP_NAME.test(name)) return { ok: false };
  const dir = backupDir();
  if (!dir) return { ok: false };
  try {
    // Write beside the file, then swap it in, so a crash can't leave half a backup.
    const file = path.join(dir, name);
    fs.writeFileSync(file + '.part', json, 'utf8');
    fs.renameSync(file + '.part', file);
    const old = fs
      .readdirSync(dir)
      .filter((f) => BACKUP_NAME.test(f))
      .sort()
      .reverse()
      .slice(KEEP);
    for (const f of old) fs.unlinkSync(path.join(dir, f));
    return { ok: true, dir };
  } catch (e) {
    return { ok: false };
  }
}

function openOutside(url) {
  if (OPEN_OK.test(url)) shell.openExternal(url);
}

/** Send a menu command to the page (handled by desktopMenu() in src/actions.ts). */
function send(action) {
  const w = BrowserWindow.getFocusedWindow() || win;
  if (w) w.webContents.send('menu', action);
}

/**
 * A menu item that runs a Scripti command. `pageKeys` means the page already handles the shortcut
 * itself (for example ⌘Z for Scripti's own undo), so the menu only shows it and doesn't take it.
 */
const cmd = (label, accelerator, action, pageKeys = false) => ({
  label,
  accelerator,
  registerAccelerator: !pageKeys,
  click: () => send(action),
});

function buildMenu() {
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              cmd('About Scripti Writer', undefined, 'about'),
              cmd('Check for Updates…', undefined, 'update'),
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        cmd('New Story…', 'CmdOrCtrl+N', 'new'),
        cmd('Import…', 'CmdOrCtrl+O', 'import'),
        { type: 'separator' },
        cmd('Export…', 'CmdOrCtrl+E', 'export', true),
        cmd('Back Up All Stories…', 'CmdOrCtrl+Shift+B', 'backup'),
        cmd('Automatic Backups…', undefined, 'backups'),
        { type: 'separator' },
        cmd('Library', 'CmdOrCtrl+Shift+L', 'library'),
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        cmd('Undo', 'CmdOrCtrl+Z', 'undo', true),
        cmd('Redo', 'Shift+CmdOrCtrl+Z', 'redo', true),
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'selectAll' },
        { type: 'separator' },
        cmd('Find and Replace…', 'CmdOrCtrl+F', 'find', true),
        ...(isMac
          ? [
              { type: 'separator' },
              { label: 'Speech', submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }] },
            ]
          : []),
      ],
    },
    {
      label: 'View',
      submenu: [
        cmd('Focus Mode', 'CmdOrCtrl+Shift+F', 'focus', true),
        { type: 'separator' },
        cmd('Dark', undefined, 'theme:dark'),
        cmd('Light', undefined, 'theme:light'),
        cmd('Paper / Warm', undefined, 'theme:paper'),
        cmd('Night Warm', undefined, 'theme:night'),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        cmd('Keyboard Shortcuts', undefined, 'help'),
        cmd('Check for Updates…', undefined, 'update'),
        ...(isMac ? [] : [cmd('About Scripti Writer', undefined, 'about')]),
        { type: 'separator' },
        { label: 'Source Code', click: () => openOutside('https://github.com/FurosImage/Scripti-Writer') },
        {
          label: 'Send Feedback or Report a Bug',
          click: () => openOutside('https://github.com/FurosImage/Scripti-Writer/issues/new/choose'),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 380,
    minHeight: 480,
    title: NAME,
    backgroundColor: '#0f1522',
    show: false,
    // Window and taskbar icon on Windows and Linux (the Mac app uses its bundle icon).
    ...(isMac ? {} : { icon: path.join(__dirname, '..', 'dist', 'icons', 'icon-512.png') }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  // Links never open inside the app. The project's own pages open in the normal browser; other
  // sites are refused, so nothing in a story can send writing off to a website.
  win.webContents.setWindowOpenHandler(({ url }) => {
    openOutside(url);
    return { action: 'deny' };
  });
  // The window only ever shows the app itself. Anything else (a link, a file dropped on the
  // window) is stopped; the project's own pages open in the normal browser.
  const home = pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).href;
  win.webContents.on('will-navigate', (e, url) => {
    const same = (a, b) => {
      try {
        return decodeURI(a).toLowerCase() === decodeURI(b).toLowerCase();
      } catch (err) {
        return a === b;
      }
    };
    if (same(url.split('#')[0].split('?')[0], home)) return;
    e.preventDefault();
    if (!url.startsWith('file:')) openOutside(url);
  });
  // Closing waits a moment for the page to finish saving the last words typed. If the page
  // doesn't answer (it is busy or has stopped), the window closes anyway after two seconds.
  const w = win;
  let closing = false;
  w.on('close', (e) => {
    if (closing || w.webContents.isDestroyed() || w.webContents.isCrashed()) return;
    e.preventDefault();
    closing = true;
    w.webContents.send('app:closing');
    setTimeout(() => finishClose(w), 2000);
  });
  w.on('closed', () => {
    if (win === w) win = null;
  });
}

/** Close a window whose page has finished saving (or didn't answer), and carry on quitting. */
let quitting = false;
function finishClose(w) {
  if (!w || w.isDestroyed()) return;
  w.destroy();
  if (quitting) app.quit();
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('before-quit', () => (quitting = true));
  app.setName(NAME);
  app.on('second-instance', () => {
    if (!win) return createWindow();
    if (win.isMinimized()) win.restore();
    win.focus();
  });
  app.whenReady().then(() => {
    // Exports and backups ask where to save, starting in Downloads. An update the writer asked
    // for goes straight to Downloads and opens when it's done.
    let updateUrl = '';
    session.defaultSession.on('will-download', (_e, item, wc) => {
      const first = item.getURLChain()[0] || item.getURL();
      if (updateUrl && first === updateUrl) {
        updateUrl = '';
        const file = path.join(app.getPath('downloads'), item.getFilename());
        item.setSavePath(file);
        const tell = (info) => !wc.isDestroyed() && wc.send('update', info);
        item.on('updated', () => {
          const total = item.getTotalBytes();
          if (total) tell({ state: 'progress', pct: (item.getReceivedBytes() / total) * 100 });
        });
        item.once('done', (_ev, state) => {
          if (state === 'completed') {
            shell.openPath(file);
            tell({ state: 'done', file });
          } else tell({ state: 'failed' });
        });
        return;
      }
      item.setSaveDialogOptions({ defaultPath: path.join(app.getPath('downloads'), item.getFilename()) });
    });
    ipcMain.handle('backup:save', (_e, name, json) => saveBackup(name, json));
    ipcMain.handle('backup:choose', () => chooseBackupDir());
    ipcMain.handle('backup:dir', () => backupDir() || '');
    ipcMain.on('app:close-now', (e) => finishClose(BrowserWindow.fromWebContents(e.sender)));
    ipcMain.handle('backup:open', () => {
      const dir = backupDir();
      if (dir) shell.openPath(dir);
      return dir || '';
    });
    ipcMain.on('update:download', (e, url) => {
      if (typeof url !== 'string' || !UPDATE_OK.test(url)) return;
      updateUrl = url;
      e.sender.downloadURL(url);
    });
    buildMenu();
    createWindow();
    app.on('activate', () => {
      if (!BrowserWindow.getAllWindows().length) createWindow();
    });
  });
  app.on('window-all-closed', () => {
    if (!isMac) app.quit();
  });
}
