// Locations page.
import { sceneList } from '../project';
import { App } from '../state';
import { esc, locOf } from '../utils';

export function locs() {
  const S = sceneList(App.dr);
  return `<div class="main"><div class="wrap"><div class="hd"><h2>Locations</h2><button data-a="addloc">+ Add location</button></div>${
    App.P.locs
      .map((l?: any, i?: any) => {
        const u = S.filter((s?: any) => locOf(s.x) == l.n).length;
        return `<div class="cc"><div class="row">${l.auto ? `<b class="nm">${esc(l.n)}</b>` : `<input class="nm" data-lc="${i}" data-f="n" value="${esc(l.n)}" placeholder="Location name" aria-label="Location name">`}<button class="ib danger" data-a="delloc" data-i="${i}" data-cf>Delete</button></div><textarea data-lc="${i}" data-f="d" placeholder="Venue details, atmosphere, practical notes" aria-label="Details">${esc(l.d)}</textarea>${App.P.type == 'ms' ? `<div class="hint">${l.auto ? 'Added from scene headings. ' : ''}Used in ${u} ${u == 1 ? 'scene' : 'scenes'} of ${esc(App.P.drafts[App.dr].name)}.</div>` : ''}</div>`;
      })
      .join('') ||
    '<p class="hint">Write a scene heading like INT. COFFEE SHOP - DAY and the location appears here.</p>'
  }</div></div>`;
}
