// Main menu: story library.
import { IS_BETA, TN } from '../constants';
import { canOfferInstall } from '../io/pwa';
import { App } from '../state';
import { ago, esc } from '../utils';
import { ctxMenu, dialog } from './dialogs';

export function card(p?: any) {
  const n = p.drafts.length;
  return `<div class="card" data-a="open" data-id="${p.id}" tabindex="0" role="button" aria-label="Open ${esc(p.title)}"><div class="cov" style="${p.img ? `background:#000 url(${p.img}) center/cover` : `background:${p.cv}`}">${p.img ? '' : `<span>${esc(p.title)}</span>`}<button class="cmenu" data-a="cardmenu" data-id="${p.id}" aria-label="More options for ${esc(p.title)}">⋯</button></div><div class="meta"><b>${esc(p.title)}</b><div><span class="bdg">${TN[p.type]}</span> <span class="hint">${p.type == 'ideas' ? '' : n + (n == 1 ? ' draft' : ' drafts')}</span></div><span class="hint">${ago(p.up)}</span></div></div>`;
}

export function cards() {
  const q = App.q.trim().toLowerCase();
  let list = App.D.ps.filter(
    (p: any) => !q || p.title.toLowerCase().includes(q) || (TN[p.type] || '').toLowerCase().includes(q),
  );
  list =
    App.D.sort == 'title'
      ? [...list].sort((a: any, b: any) => a.title.localeCompare(b.title))
      : [...list].sort((a: any, b: any) => (b.up || 0) - (a.up || 0));
  if (!App.D.ps.length)
    return '<p class="hint empty">No stories yet. Create one to begin, or import a screenplay.</p>';
  if (!list.length) return `<p class="hint empty">No stories match “${esc(App.q)}”.</p>`;
  return list.map(card).join('');
}

export function menu() {
  const many = App.D.ps.length > 3;
  return `<div class="main"><div class="menu"><h1>Scripti <span class="wr">Writer</span>${IS_BETA ? '<span class="beta">Beta</span>' : ''}</h1><p class="sub">A quiet place to write.</p>
<div class="acts"><button class="big pri" data-a="new">Create new story</button><button class="big" data-a="lib">${App.D.lib ? 'Hide stories' : 'Open stories'}</button></div>
${
  App.D.lib
    ? `<div class="libbar">${many ? `<input type="search" data-c="q" value="${esc(App.q)}" placeholder="Search stories" aria-label="Search stories"><select data-c="sort" aria-label="Sort stories"><option value="up">Recently edited</option><option value="title" ${App.D.sort == 'title' ? 'selected' : ''}>Title</option></select>` : ''}<span class="sp"></span><button data-a="imp">Import…</button><button data-a="bkall" ${App.D.ps.length ? '' : 'disabled'}>Back up all</button></div>
<div class="grid" id="grid">${cards()}</div>`
    : ''
}
<footer class="lfoot"><span class="st" id="st"></span><button class="lnk" data-a="help">Keyboard shortcuts</button>${canOfferInstall() ? '<button class="lnk" data-a="install">Install app</button>' : ''}</footer></div></div>
${dialog()}${ctxMenu()}`;
}
