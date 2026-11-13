// Gives the page a small, safe bridge to the desktop app: which platform it runs on, the menu
// bar's commands, and downloading an update the writer asked for. Nothing else from Node or
// Electron is exposed.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('scriptiDesktop', {
  platform: process.platform,
  onMenu: (cb) => ipcRenderer.on('menu', (_e, action) => cb(action)),
  downloadUpdate: (url) => ipcRenderer.send('update:download', String(url)),
  onUpdate: (cb) => ipcRenderer.on('update', (_e, info) => cb(info)),
});
