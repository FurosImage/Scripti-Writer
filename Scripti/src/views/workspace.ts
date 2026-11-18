// Workspace chrome (menus, tabs, draft tabs) and the top-level render().
import { board } from '../board/render';
import { boardView } from '../board/view';
import { TABS, THEMES } from '../constants';
import { acHide } from '../editor/autocomplete';
import { hcHide } from '../editor/hoverCard';
import { scriptStats } from '../io/screenplay';
import { canAutoBackup } from '../backup';
import { App } from '../state';
import { $, $$, esc, words } from '../utils';
import { showBars } from '../phonebars';
import { findRefresh } from '../find';
import { bookButton, bookView, paintPages } from '../pages';
import { chars } from './characters';
import { cork } from './corkboard';
import { ctxMenu, dialog } from './dialogs';
import { menu } from './library';
import { locs } from './locations';
import { chapterNav, novel } from './novel';
import { sceneNav, script } from './script';
import { title } from './titlePage';

const THEME_BG: Record<string, string> = {
  dark: '#121417',
  light: '#f4f4f1',
  paper: '#F4EBE1',
  night: '#1E1915',
  lamp: '#1d1814',
};

export function work() {
  const P = App.P;
  const T =
    P.type == 'ideas'
      ? []
      : P.type == 'novel'
        ? ['Title Page', 'Script', 'Characters', 'Locations', 'Brainstorming']
        : TABS;
  const showDr = P.type != 'ideas' && ['Script', 'Corkboard', 'Brainstorming'].includes(App.tab);
  const ms = P.type == 'ms';
  return `<div class="bar top"><button class="homeb" data-a="home" title="Back to the library" aria-label="Back to the library"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg><span>Library</span></button><details><summary>Settings ▾</summary><div class="dd">
<button data-a="home">← Back to library</button><hr>
<button data-a="cover">Change cover colour</button><label class="mi" tabindex="0">Upload cover image…<input type="file" accept="image/*" data-c="img" hidden></label>${P.img ? '<button data-a="noimg">Remove cover image</button>' : ''}<hr>
${P.type != 'ideas' ? `<button data-a="split">${App.split ? 'Close split screen' : 'Split screen (two drafts)'}</button>` : ''}<button data-a="focus">Focus mode</button><hr>
<span class="fh">Look</span>${THEMES.map(([v, l]: any) => `<button data-a="th" data-t="${v}" class="${App.D.th == v ? 'on' : ''}">${l}</button>`).join('')}<label class="mi glowsw"><span>Soft glow</span><input type="checkbox" data-c="glow" ${App.D.glow !== false ? 'checked' : ''}><i aria-hidden="true"></i></label><hr>
${canAutoBackup() ? '<button data-a="backups">Automatic backups and save folder…</button>' : ''}<button data-a="help">Keyboard shortcuts</button>${(window as any).scriptiDesktop ? '<button data-a="updcheck">Check for updates</button>' : ''}<button data-a="about">About</button><hr>
<button data-a="delp" class="danger">Delete this story</button></div></details>
<details><summary>Export ▾</summary><div class="dd">
<button data-a="exppdf">Export PDF</button><button data-a="expopen">Export…</button><hr>
<button data-a="bkone">Back up this story (.json)</button>${ms ? '<button data-a="impdraft">Import screenplay as new draft…</button>' : ''}</div></details>
<input class="ttl" data-c="title" value="${esc(P.title)}" aria-label="Story title"><span class="sp"></span><span class="st" id="st"></span>
<label class="theme" title="Look"><select data-c="th" aria-label="Look">${THEMES.map(([v, l]: any) => `<option value="${v}" ${App.D.th == v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
${
  P.type == 'ideas'
    ? App.book
      ? `<div class="bar nb"><span class="sp"></span>${bookButton()}<span class="sp"></span></div>${bookView()}`
      : `<div class="main"><div class="wrap"><div class="hd"><h2>Story ideas</h2><span class="hint" id="iwc"></span>${bookButton()}</div><textarea class="ideas" data-c="ideas" placeholder="Raw notes and ideas…">${esc(P.ideas)}</textarea></div></div>`
    : `
<div class="bar tabs"><span class="tside"></span><div class="tabset" role="tablist">${T.map((t?: any) => `<button class="tab ${t == App.tab ? 'on' : ''}" role="tab" aria-selected="${t == App.tab}" data-a="tab" data-t="${t}">${P.type == 'novel' && t == 'Script' ? 'Novel' : t}</button>`).join('')}</div><span class="tside r">${App.tab == 'Script' ? `<button data-a="split" class="splitb ${App.split ? 'on tool' : ''}" title="Split screen: show two drafts side by side">◫ Split</button>` : ''}</span></div>
${showDr ? `<div class="dt">${P.drafts.map((d?: any, i?: any) => (App.ren == i ? `<input id="rn" value="${esc(d.name)}" data-i="${i}" aria-label="Draft name">` : `<button class="${i == App.dr ? 'on' : ''}" data-a="dr" data-i="${i}" title="Double-click to rename">${esc(d.name)}</button>${i == App.dr ? `<button class="dtm" data-a="drmenu" data-i="${i}" aria-label="Options for ${esc(d.name)}" title="Duplicate, rename or delete">⋯</button>` : ''}`)).join('')}<button data-a="drnew" title="New blank draft" aria-label="New draft">+</button></div>` : ''}
${view()}`
}${App.focus ? '<button class="fexit" data-a="focus" title="Leave focus mode (Esc)">Exit focus</button>' : ''}${dialog()}${ctxMenu()}`;
}

export function view() {
  if (App.tab == 'Script') return App.P.type == 'novel' ? novel() : script();
  if (App.tab == 'Title Page') return title();
  if (App.tab == 'Characters') return chars();
  if (App.tab == 'Locations') return locs();
  if (App.tab == 'Corkboard') return cork();
  if (App.tab == 'Brainstorming') return boardView();
  return '';
}

export function render() {
  document.body.dataset.th = App.D.th;
  document.body.classList.toggle('focus', !!(App.focus && App.P));
  document.body.classList.toggle('glow', App.D.glow !== false);
  $('meta[name=theme-color]')?.setAttribute('content', THEME_BG[App.D.th] || THEME_BG.dark);
  acHide();
  hcHide();
  $('#cpop')?.remove();
  $('#app').innerHTML = App.P ? work() : menu();
  showBars();
  // On narrow screens the tab bar scrolls: keep the open tab in view.
  const tabOn = $('.tabs .tab.on') as HTMLElement | null,
    tabBar = tabOn?.closest('.tabs') as HTMLElement | null;
  if (tabOn && tabBar && tabBar.scrollWidth > tabBar.clientWidth) {
    const a = tabOn.getBoundingClientRect(),
      b = tabBar.getBoundingClientRect();
    tabBar.scrollLeft += a.left - b.left - (b.width - a.width) / 2;
  }
  if (App.P && App.tab == 'Brainstorming' && App.P.type != 'ideas') board();
  wc();
  stats();
  paintStatus();
  findRefresh();
  paintPages();
  const m = $('.modal [role=dialog]');
  if (m) (m.querySelector('.opt.on,.pri,button.opt') || m.querySelector('button'))?.focus();
}

export function wc() {
  const n = $('#nv');
  if (n) $$('#wc,#wc2').forEach((w: any) => (w.textContent = words(n.innerText).toLocaleString() + ' words'));
  const iw = $('#iwc');
  if (iw && App.P) iw.textContent = words(App.P.ideas).toLocaleString() + ' words';
}

let statT: any = null;
/** Page, scene and word counts for the script toolbar (debounced while typing). */
export function stats(later = false) {
  clearTimeout(statT);
  const go = () => {
    const els = $$('#stats,#stats2');
    if (!els.length || !App.P || App.P.type != 'ms') return;
    const s = scriptStats(App.P.drafts[App.dr].blocks);
    els.forEach((el: any) => {
      el.textContent = `${s.pages} ${s.pages == 1 ? 'page' : 'pages'} · ${s.scenes} ${s.scenes == 1 ? 'scene' : 'scenes'} · ${s.words.toLocaleString()} words`;
      el.title = `About ${s.pages} ${s.pages == 1 ? 'minute' : 'minutes'} of screen time`;
    });
  };
  if (later) statT = setTimeout(go, 700);
  else go();
}

/** The small saved indicator. Updated without re-rendering the page. */
export function paintStatus() {
  const el = $('#st');
  if (!el) return;
  let t = '',
    cls = '';
  if (App.saved == 'error') ((t = 'Not saved'), (cls = 'bad'));
  else t = App.saved == 'saving' ? 'Saving…' : App.P ? 'Saved' : 'Stories are saved on this device';
  el.textContent = t;
  el.className = 'st ' + cls;
  el.title = 'Saved on this device. Use “Back up all” in the library to keep a copy.';
}

let navT: any = null;
/** Refresh the scene or chapter list in the side panel after edits. */
export function refreshNav() {
  clearTimeout(navT);
  navT = setTimeout(() => {
    const w = $('#navw');
    if (w && App.P) w.innerHTML = App.P.type == 'novel' ? chapterNav() : sceneNav();
  }, 600);
}
