// Characters page.
import { CN, COLS, PALETTE } from '../constants';
import { sceneList } from '../project';
import { App } from '../state';
import { canRedo, canUndo } from '../editor/charHistory';
import { charMatch, cue, esc, MOD } from '../utils';

export function chars() {
  const S = sceneList(App.dr),
    dn = esc(App.P.drafts[App.dr].name);
  const n = App.P.chars.length;
  return `<div class="main"><div class="wrap wide"><div class="hd"><h2>Characters</h2><button data-a="addch">+ Add character</button></div>
<div class="chbar" role="toolbar" aria-label="Character tools"><button data-a="chundo" ${canUndo() ? '' : 'disabled'} title="Undo (${MOD}+Z)" aria-label="Undo">↶ Undo</button><button data-a="chredo" ${canRedo() ? '' : 'disabled'} title="Redo (${MOD}+Shift+Z)" aria-label="Redo">↷ Redo</button><span class="sp"></span><span class="hint">${n} ${n == 1 ? 'character' : 'characters'}</span><button class="danger" data-a="chdelall" data-cf ${n ? '' : 'disabled'}>Delete all</button></div>${
    App.P.chars
      .map((c?: any) => {
        const sc = S.filter((s?: any) => [...s.cues].some((q?: any) => charMatch(c, q))).length,
          ln =
            App.P.type == 'ms'
              ? App.P.drafts[App.dr].blocks.filter((b?: any) => b.t == 'character' && charMatch(c, cue(b.x)))
                  .length
              : 0;
        const F = (f: string, l: string, ph: string, ta = false, cls = '') =>
          `<label class="fl ${cls}"><span>${l}</span>${ta ? `<textarea data-ch="${c.id}" data-f="${f}" placeholder="${ph}" rows="3">${esc(c[f])}</textarea>` : `<input data-ch="${c.id}" data-f="${f}" value="${esc(c[f])}" placeholder="${ph}">`}</label>`;
        return `<div class="cc chc" data-chid="${c.id}" style="--cc:${c.col || COLS[0]}"><div class="row"><span class="cdot"></span><b class="chn">${esc(c.n) || 'New character'}</b><span class="sp"></span><span class="sws" role="group" aria-label="Colour">${COLS.map((x?: any) => `<button class="sw ${x == c.col ? 'on' : ''}" data-a="chcol" data-id="${c.id}" data-v="${x}" style="background:${x}" title="${CN[x]}" aria-label="${CN[x]}"></button>`).join('')}</span><button class="ib danger" data-a="delch" data-id="${c.id}" data-cf>Delete</button></div>
<div class="chgrid">${F('n', 'Character name', 'e.g. Mara Holt')}${F('r', 'Role', 'Protagonist, mentor…')}${F('ge', 'Gender', 'e.g. Female')}${F('ac', 'Played by', 'Actor or actress')}</div><div class="chgrid long">${F('p', 'Personality', 'How they think, speak and behave', true, 'tall')}${F('m', 'Motivation', 'Why they want what they want', true, 'tall')}${F('g', 'Goal', 'What they are trying to achieve', true, 'tall')}<div class="fl full look"><span>Look and style</span><div class="pals" role="group" aria-label="Colours">${(c.pal || PALETTE).map((x: string, j: number) => `<input type="color" data-ch="${c.id}" data-f="pal" data-pi="${j}" value="${esc(x)}" title="Colour ${j + 1}: hair, skin, clothes…" aria-label="${esc(c.n || 'Character')} colour ${j + 1}">`).join('')}</div><textarea data-ch="${c.id}" data-f="d" placeholder="Clothes, hair, build, how they carry themselves" rows="3" aria-label="Look and style">${esc(c.d)}</textarea></div></div>
${App.P.type == 'ms' ? `<div class="hint">${sc} ${sc == 1 ? 'scene' : 'scenes'} and ${ln} ${ln == 1 ? 'line' : 'lines'} of dialogue in ${dn}</div>` : ''}</div>`;
      })
      .join('') ||
    '<p class="hint">No characters yet. Add one here, or type a character name in the script and it will appear.</p>'
  }</div></div>`;
}
