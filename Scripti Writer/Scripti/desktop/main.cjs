// Scripti Writer desktop app (Electron): one window showing the built web app, plus a native menu
// bar. Run with `npm run desktop`; package a Mac app with `npm run mac` (see README).
const { app, BrowserWindow, Menu, shell, session, ipcMain } = require('electron');
const path = require('path');

const isMac = process.platform === 'darwin';
const NAME = 'Scripti Writer';
let win = null;

// Stories live in the app's data folder. The app was called "Scripti" before, so keep using that
// folder: renaming the app must never leave a writer's stories behind. Set before anything else.
app.setPath('userData', path.join(app.getPath('appData'), 'Scripti'));

/** Websites the app may open in the normal browser (the project's own pages). */
const OPEN_OK = /^https:\/\/(github\.com\/FurosImage\/Scripti([\/?#]|$)|furosimage\.github\.io\/Scripti([\/?#]|$))/i;
/** Where update installers come from. */
const UPDATE_OK = /^https:\/\/github\.com\/FurosImage\/Scripti\/releases\/download\/[^/]+\/[\w.-]+\.(dmg|exe)$/i;

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
              { role: 'about' },
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
        { type: 'separator' },
        { label: 'Scripti Writer Website', click: () => openOutside('https://furosimage.github.io/Scripti/') },
        {
          label: 'Send Feedback or Report a Bug',
          click: () => openOutside('https://github.com/FurosImage/Scripti/issues/new/choose'),
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
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:')) {
      e.preventDefault();
      openOutside(url);
    }
  });
  win.on('closed', () => (win = null));
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
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
