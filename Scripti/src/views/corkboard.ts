// Corkboard of scene index cards.
import { sceneList } from '../project';
import { App } from '../state';
import { esc, titleCase } from '../utils';

export function cork() {
  const S = sceneList(App.dr);
  return `<div class="main"><div class="wrap wide"><div class="hd"><h2>Corkboard</h2><span class="hint">Click a card to open the scene</span></div>${S.length ? `<div class="cork">${S.map((s?: any, n?: any) => `<div class="ic" data-a="goto" data-i="${s.i}" tabindex="0"><span class="n">${n + 1}</span><b>${esc(s.x)}</b><p>${esc(s.syn)}</p><div class="hint">${[...s.cues].map(titleCase).join(', ')}</div></div>`).join('')}</div>` : '<p class="hint">Scenes appear here as you write scene headings.</p>'}</div></div>`;
}
