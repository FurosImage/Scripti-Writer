// Floating properties bar for the board selection.
import { accOf, findO, noteBgSw } from './render';
import { CN, COLS, DRAW, NSEQ } from '../constants';
import { App } from '../state';
import { $ } from '../utils';

export const selObjs = () => [...App.sel].map(findO).filter(Boolean);

export const minable = (o?: any) => !o.k || o.k == 's' || o.k == 'c';

export function props() {
  const p = $('#props');
  if (!p || !App.P) return;
  const O = selObjs(),
    drawing = DRAW.includes(App.tool);
  if (!O.length && !drawing) {
    p.hidden = true;
    return;
  }
  const onlyNotes = O.length && O.every((o?: any) => !o.k),
    anyNote = O.some((o?: any) => !o.k),
    sw = onlyNotes ? NSEQ : anyNote ? COLS : ['ink', ...COLS];
  const cur = O.length
    ? O[0].k
      ? O[0].col || (O[0].k == 'c' ? accOf(O[0]) : 'ink')
      : O[0].c || 'white'
    : App.penCol || 'ink';
  let h =
    `<span class="hint">${O.length ? (O.length == 1 ? 'Colour' : O.length + ' selected') : 'Pen colour'}</span>` +
    sw
      .map(
        (c?: any) =>
          `<button class="sw ${c == cur ? 'on' : ''}" data-a="pcol" data-v="${c}" title="${CN[c] || c}" aria-label="${CN[c] || c}" style="background:${c == 'ink' ? 'var(--tx)' : noteBgSw(c)}"></button>`,
      )
      .join('');
  const strokey = drawing || O.some((o?: any) => ['stroke', 'shape', 'line'].includes(o.k));
  const wNow = O.find((o?: any) => o.sw)?.sw || App.penW;
  if (strokey)
    h +=
      '<span class="sep"></span>' +
      [2, 4, 8]
        .map(
          (w?: any) =>
            `<button class="pw ${w == wNow ? 'on' : ''}" data-a="pw" data-v="${w}" title="Line width ${w}" aria-label="Line width ${w}"><i style="height:${w}px"></i></button>`,
        )
        .join('');
  if (O.length == 1 && O[0].k == 'tl')
    h += `<span class="sep"></span><button data-a="tlact">+ Act</button><button data-a="tlrm" ${O[0].acts.length < 2 ? 'disabled' : ''}>− Act</button><button data-a="tlor">${O[0].or == 'v' ? 'Make horizontal' : 'Make vertical'}</button>`;
  const M = O.filter(minable);
  if (M.length)
    h += `<span class="sep"></span><button data-a="pmin">${M.every((o?: any) => o.min) ? 'Expand' : 'Minimise'}</button>`;
  if (O.length) h += `<button data-a="pdel" class="danger">Delete</button>`;
  p.innerHTML = h;
  p.hidden = false;
}

export const selTl = () => {
  const O = selObjs();
  return O.length == 1 && O[0].k == 'tl' ? O[0] : null;
};
