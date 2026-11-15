// Gives the page a small, safe bridge to the desktop app: which platform it runs on, the menu
// bar's commands, downloading an update the writer asked for, and saving automatic backups.
// Nothing else from Node or Electron is exposed.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('scriptiDesktop', {
  platform: process.platform,
  onMenu: (cb) => ipcRenderer.on('menu', (_e, action) => cb(action)),
  downloadUpdate: (url) => ipcRenderer.send('update:download', String(url)),
  onUpdate: (cb) => ipcRenderer.on('update', (_e, info) => cb(info)),
  saveBackup: (name, json) => ipcRenderer.invoke('backup:save', String(name), String(json)),
  openBackups: () => ipcRenderer.invoke('backup:open'),
  chooseBackupDir: () => ipcRenderer.invoke('backup:choose'),
  backupDir: () => ipcRenderer.invoke('backup:dir'),
  // Closing: the app asks the page to finish saving, and the page answers when it has.
  onClosing: (cb) => ipcRenderer.on('app:closing', () => cb()),
  closeNow: () => ipcRenderer.send('app:close-now'),
});
