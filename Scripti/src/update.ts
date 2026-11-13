// Update notice for the desktop app. Scripti Writer asks GitHub for the newest release (only the
// version number and file names; nothing about the writer is sent). If it's newer, a banner offers
// to download it. Nothing installs by itself: the writer clicks Download, the installer is saved
// to Downloads and opened, and they finish the install as usual. Stories are kept separately and
// are never touched by an update.
import { APP_NAME, versionLabel } from './constants';
import { esc, toast } from './utils';

const RELEASES = 'https://api.github.com/repos/FurosImage/Scripti-Writer/releases/latest';

interface Desktop {
  platform: string;
  downloadUpdate?: (url: string) => void;
  onUpdate?: (cb: (e: { state: string; pct?: number; file?: string }) => void) => void;
}
interface Release {
  version: string;
  label: string;
  page: string;
  url: string;
}

const desktop = (): Desktop | undefined => (window as any).scriptiDesktop;
let shown = '';

/** Compare versions like 0.0.1 and 0.0.2: negative if a is older than b. */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => {
    const [main, pre = ''] = v.replace(/^v/i, '').split('-');
    const n = main.split('.').map((x) => parseInt(x, 10) || 0);
    const p = pre ? parseInt((pre.match(/\d+/) || ['0'])[0], 10) : Infinity; // a release beats its betas
    return [n[0] || 0, n[1] || 0, n[2] || 0, p];
  };
  const x = parse(a),
    y = parse(b);
  for (let i = 0; i < 4; i++) if (x[i] != y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}

const labelOf = versionLabel;

async function latest(): Promise<Release | null> {
  const d = desktop();
  if (!d) return null;
  const r = await fetch(RELEASES, { headers: { Accept: 'application/vnd.github+json' } });
  if (!r.ok) throw new Error('GitHub answered ' + r.status);
  const rel = await r.json();
  const version = String(rel.tag_name || '').replace(/^v/i, '');
  const ext = d.platform == 'darwin' ? /\.dmg$/i : /\.exe$/i;
  const asset = (rel.assets || []).find((a: any) => ext.test(a.name));
  if (!version || !asset) return null;
  return { version, label: labelOf(version), page: String(rel.html_url || ''), url: String(asset.browser_download_url) };
}

function banner(): HTMLElement {
  let b = document.getElementById('upd');
  if (!b) {
    b = document.createElement('div');
    b.id = 'upd';
    b.className = 'upd';
    b.setAttribute('role', 'status');
    document.body.append(b);
  }
  return b;
}

function close() {
  document.getElementById('upd')?.remove();
}

function offer(rel: Release) {
  const b = banner();
  const notes = /^https:\/\/github\.com\/FurosImage\/Scripti-Writer\//.test(rel.page)
    ? `<a href="${esc(rel.page)}" target="_blank" rel="noopener">What's new</a>`
    : '';
  b.innerHTML = `<span class="msg"><b>${esc(APP_NAME)} ${esc(rel.label)}</b> is available.</span>${notes}<button class="go">Download</button><button class="later" aria-label="Remind me next time">Later</button>`;
  b.querySelector<HTMLButtonElement>('.later')!.onclick = close;
  b.querySelector<HTMLButtonElement>('.go')!.onclick = () => {
    const d = desktop();
    if (!d?.downloadUpdate) return void window.open(rel.page || rel.url, '_blank');
    b.innerHTML = `<span class="msg">Downloading ${esc(APP_NAME)} ${esc(rel.label)}…</span><span class="pct"></span>`;
    d.downloadUpdate(rel.url);
  };
}

function progress(e: { state: string; pct?: number; file?: string }) {
  const b = banner();
  if (e.state == 'progress') {
    const p = b.querySelector('.pct');
    if (p) p.textContent = Math.round(e.pct || 0) + '%';
  } else if (e.state == 'done') {
    const mac = desktop()?.platform == 'darwin';
    b.innerHTML = `<span class="msg">The new version is in your Downloads and has opened. ${
      mac
        ? `Quit ${esc(APP_NAME)}, then drag it into Applications and choose <b>Replace</b>.`
        : `Close ${esc(APP_NAME)}, then follow the installer.`
    } Your stories stay as they are.</span><button class="later">OK</button>`;
    b.querySelector<HTMLButtonElement>('.later')!.onclick = close;
  } else {
    b.innerHTML = `<span class="msg">The download didn't finish. Try again later, or download it from the website.</span><button class="later">OK</button>`;
    b.querySelector<HTMLButtonElement>('.later')!.onclick = close;
  }
}

/** Check for a newer version. `manual` comes from Help → Check for Updates and always answers. */
export async function checkForUpdate(manual = false) {
  if (!desktop()) return;
  try {
    const rel = await latest();
    if (rel && compareVersions(__VERSION__, rel.version) < 0) {
      if (manual || shown != rel.version) offer(rel);
      shown = rel.version;
    } else if (manual) toast(`You have the newest version (${labelOf(__VERSION__)}).`);
  } catch (e) {
    if (manual) toast("Couldn't check for updates. Are you online?");
  }
}

/** Start checking a few seconds after opening, so the first screen isn't held up. */
export function setupUpdates() {
  const d = desktop();
  if (!d) return;
  d.onUpdate?.(progress);
  setTimeout(() => checkForUpdate(false), 4000);
}
