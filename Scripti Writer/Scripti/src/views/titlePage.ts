// Title page editor view.
import { App } from '../state';

export function title() {
  const t = App.P.tp;
  return `<div class="bar" style="justify-content:center"><select data-c="tpf" aria-label="Font">${['Courier Prime', 'Newsreader', 'Instrument Sans'].map((f?: any) => `<option ${t.font == f ? 'selected' : ''}>${f}</option>`).join('')}</select><label class="hint">Size <input data-c="tps" type="number" min="10" max="60" value="${t.size}" style="width:64px"></label><button data-a="bold" data-keep><b>B</b></button><button data-a="ital" data-keep><i>I</i></button></div><div class="main"><div class="wrap"><div class="tp" id="tpe" contenteditable="true" style="font-family:'${t.font}';font-size:${t.size}px">${t.html}</div></div></div>`;
}
