// Title page editor view.
import { App } from '../state';
import { esc } from '../utils';

/** The details printed at the bottom of the title page. */
const FOOT: [string, string, string, string][] = [
  ['prod', 'Produced by', 'Studio or producer', 'text'],
  ['copy', 'Copyright', '© 2026 Your name', 'text'],
  ['date', 'Date', 'e.g. Draft, 14 November 2026', 'text'],
  ['mail', 'Email', 'you@example.com', 'email'],
];

export function title() {
  const t = App.P.tp;
  return `<div class="bar" style="justify-content:center"><select data-c="tpf" aria-label="Font">${['Courier Prime', 'Newsreader', 'Instrument Sans'].map((f?: any) => `<option ${t.font == f ? 'selected' : ''}>${f}</option>`).join('')}</select><label class="hint">Size <input data-c="tps" type="number" min="10" max="60" value="${t.size}" style="width:64px"></label><button data-a="bold" data-keep><b>B</b></button><button data-a="ital" data-keep><i>I</i></button></div><div class="main"><div class="wrap"><div class="tpsheet"><div class="tp" id="tpe" contenteditable="true" aria-label="Title page" style="font-family:'${t.font}';font-size:${t.size}px">${t.html}</div>
<div class="tpfoot" style="font-family:'${t.font}'">${FOOT.map(([f, l, ph, ty]) => `<label><span>${l}</span><input type="${ty}" data-c="tpx" data-f="${f}" value="${esc(t[f] || '')}" placeholder="${ph}" autocomplete="off"></label>`).join('')}</div></div></div></div>`;
}
