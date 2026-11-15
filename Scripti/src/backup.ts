// Automatic backups (desktop app). A copy of every story is written to a "Scripti Writer Backups"
// folder (in Documents, or a folder the writer picks): one file per day, refreshed while you write
// (every 10 minutes unless the writer picks another time), with the last two weeks kept. To restore, use Import… in the library
// and pick one of the files.
import { App, flush, persist } from './state';

/** How often the day's backup file can be refreshed while you write, in minutes. */
export const BACKUP_TIMES = [1, 5, 10, 30, 60];
export const backupEvery = () => (BACKUP_TIMES.includes(App.D.abm) ? App.D.abm : 10);
const CHECK_EVERY = 30e3;

interface Desktop {
  saveBackup?: (name: string, json: string) => Promise<{ ok: boolean; dir?: string }>;
  openBackups?: () => Promise<string>;
  chooseBackupDir?: () => Promise<string>;
  backupDir?: () => Promise<string>;
}
const desktop = (): Desktop | undefined => (window as any).scriptiDesktop;

/** True in the desktop app, where backups can be written without asking each time. */
export const canAutoBackup = () => !!desktop()?.saveBackup;
export const autoBackupOn = () => App.D.ab !== false;

const newestEdit = () => App.D.ps.reduce((m: number, p: any) => Math.max(m, p.up || 0), 0);

/**
 * Write a backup now. Without `force` it only happens when automatic backups are on, something
 * changed since the last one, and the chosen time has passed since the last one.
 */
export async function autoBackup(force = false): Promise<boolean> {
  const d = desktop();
  if (!d?.saveBackup || !App.D.ps.length) return false;
  const edited = newestEdit();
  if (!force) {
    if (!autoBackupOn()) return false;
    if (edited <= (App.D.abup || 0)) return false;
    if (Date.now() - (App.D.abt || 0) < backupEvery() * 60e3) return false;
  }
  try {
    await flush();
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const data = { app: 'scripti', version: 1, exported: now.toISOString(), ps: App.D.ps };
    const r = await d.saveBackup(`Scripti Writer backup ${day}.json`, JSON.stringify(data));
    if (!r?.ok) return false;
    App.D.abt = Date.now();
    App.D.abup = edited;
    if (r.dir) App.D.abdir = r.dir;
    persist();
    return true;
  } catch (e) {
    return false;
  }
}

export const openBackupFolder = () => desktop()?.openBackups?.();

/** True when this version of the desktop app can save backups in a folder the writer picks. */
export const canChooseFolder = () => !!desktop()?.chooseBackupDir;

/**
 * Let the writer pick the folder for the backup files, then save a backup there straight away.
 * Returns the folder, or '' when they cancelled.
 */
export async function chooseBackupFolder(): Promise<string> {
  const dir = (await desktop()?.chooseBackupDir?.()) || '';
  if (!dir) return '';
  App.D.abdir = dir;
  persist();
  await autoBackup(true);
  return dir;
}

/** Ask the desktop app which folder is in use, so the dialog shows it before the first backup. */
export async function loadBackupFolder() {
  const dir = (await desktop()?.backupDir?.()) || '';
  if (dir && dir != App.D.abdir) {
    App.D.abdir = dir;
    persist();
    return true;
  }
  return false;
}

export function setupBackups() {
  if (!canAutoBackup()) return;
  setTimeout(() => autoBackup(), 15e3);
  setInterval(() => autoBackup(), CHECK_EVERY);
}
