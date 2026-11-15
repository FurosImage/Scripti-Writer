// Brainstorm board layout: the canvas, a tool island at the bottom and undo/zoom at the top.
import { IC } from './icons';
import { BEATS } from '../constants';
import { sceneList } from '../project';
import { App } from '../state';
import { esc, MOD } from '../utils';

export function boardView() {
  const B = App.P.board,
    S = sceneList(App.dr);
  // Each tool shows a short label under its icon; the full name is in the tooltip.
  const lab = (s: string, l: string) => `<span class="rl rl-s">${s}</span><span class="rl rl-l">${l}</span>`;
  const key = (k: string) => (k ? ` (${k})` : '');
  const tb = (t: string, s: string, l: string, k = '') =>
    `<button class="rb ${App.tool == t ? 'on' : ''}" data-a="tool" data-t="${t}" title="${l}${key(k)}" aria-label="${l}">${IC[t]}${lab(s, l)}</button>`;
  const act = (a: string, icon: string, s: string, l: string, k = '') =>
    `<button class="rb" data-a="${a}" title="${l}${key(k)}" aria-label="${l}">${IC[icon]}${lab(s, l)}</button>`;
  const isl = (a: string, icon: string, l: string, k = '') =>
    `<button data-a="${a}" title="${l}${key(k)}" aria-label="${l}">${IC[icon]}</button>`;
  const fly = (icon: string, s: string, l: string, menu: string, cls = '') =>
    `<details class="fly"><summary class="rb" title="${l}" aria-label="${l}">${IC[icon]}${lab(s, l)}</summary><div class="dd flyd ${cls}">${menu}</div></details>`;
  // All tools sit in one floating island at the bottom of the canvas.
  return `<div class="bwrap"><div class="main bmain"><div id="bd" class="tool-${App.tool}"><div id="cv"></div><div id="mq"></div></div>
<div class="railw"><nav class="rail" role="toolbar" aria-label="Board tools">
${tb('select', 'Select', 'Select and move', 'V')}${tb('pan', 'Pan', 'Pan', 'H')}<span class="rs"></span>
${tb('pencil', 'Pencil', 'Pencil', 'P')}${tb('rect', 'Rect', 'Rectangle', 'R')}${tb('ellipse', 'Circle', 'Circle', 'O')}${tb('tri', 'Triangle', 'Triangle')}${tb('line', 'Line', 'Line', 'L')}${tb('arrow', 'Arrow', 'Arrow', 'A')}${tb('darrow', '2-way', 'Double arrow')}<span class="rs"></span>
${act('note', 'note', 'Note', 'Sticky note', 'N')}
${fly('scene', 'Scene', 'Scene card', `<span class="fh">Scenes in ${esc(App.P.drafts[App.dr].name)}</span>${S.map((s?: any) => `<button data-a="bsc" data-i="${s.i}">${esc(s.x)}</button>`).join('') || '<span class="hint" style="padding:6px 10px">No scenes yet</span>'}`)}
${fly('char', 'Person', 'Character card', `<span class="fh">Characters</span>${App.P.chars.map((c?: any) => `<button data-a="bch" data-id="${c.id}"><span style="color:${c.col}">●</span> ${esc(c.n || 'Unnamed')}</button>`).join('') || '<span class="hint" style="padding:6px 10px">No characters yet</span>'}`)}
${fly('beat', 'Beat', 'Story beat', BEATS.map((b?: any) => `<button data-a="beat" data-t="${b}">${b}</button>`).join(''), 'beats')}
${act('tl', 'tl', 'Acts', 'Timeline', 'T')}</nav></div>
<div class="bisl" role="toolbar" aria-label="Undo and zoom">${isl('bu', 'undo', 'Undo', MOD + '+Z')}${isl('br', 'redo', 'Redo', MOD + '+Shift+Z')}<span class="isep"></span>${isl('zo', 'minus', 'Zoom out')}<button class="zl" data-a="z1" title="Reset zoom to 100%" aria-label="Reset zoom"><b class="zv">${Math.round(B.z * 100)}%</b></button>${isl('zi', 'plus', 'Zoom in')}</div><div id="props" class="props" hidden></div><div class="bhint">Drag empty space to select. Hold Space to pan. Drag from a dot to connect. Double-click to edit or open.</div></div></div>`;
}
