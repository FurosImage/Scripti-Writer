// Novel / prose editor view.
import { App } from '../state';
import { findButton } from '../find';
import { bookButton } from '../pages';
import { esc, MOD } from '../utils';
import { side } from './script';

/** Chapter and subheading titles in the current draft, for the side panel. */
function chapters(html: string) {
  const d = document.createElement('div');
  d.innerHTML = html;
  return [...d.querySelectorAll('h1,h2')].map((h: any) => ({
    t: h.textContent.trim(),
    sub: h.tagName == 'H2',
  }));
}

export function chapterNav() {
  const d = App.P.drafts[App.dr];
  const C = chapters(d.novel);
  const nav = `<div class="lab">Chapters</div>${C.length ? `<ol class="nav">${C.map((c, i) => `<li class="${c.sub ? 'sub' : ''}"><button data-a="goch" data-i="${i}">${esc(c.t) || '<span class="hint">Untitled</span>'}</button></li>`).join('')}</ol>` : '<p class="hint">Use “Chapter heading” to start a chapter.</p>'}`;
  return nav;
}

export function novel() {
  const d = App.P.drafts[App.dr],
    f = App.P.nf || 'Newsreader',
    s = App.P.ns || 18;
  return `<div class="bar nb"><select data-c="nf" aria-label="Font">${['Newsreader', 'Courier Prime', 'Instrument Sans'].map((x?: any) => `<option ${x == f ? 'selected' : ''}>${x}</option>`).join('')}</select><select data-c="ns" aria-label="Font size">${[15, 16, 17, 18, 20, 22, 24].map((x?: any) => `<option ${x == s ? 'selected' : ''}>${x}</option>`).join('')}</select><button data-a="bold" data-keep title="Bold (${MOD}+B)" aria-label="Bold"><b>B</b></button><button data-a="ital" data-keep title="Italic (${MOD}+I)" aria-label="Italic"><i>I</i></button>
<select data-c="np" aria-label="Text style"><option value="p">Body text</option><option value="h1">Chapter heading</option><option value="h2">Subheading</option></select><button data-a="sb" data-keep title="Insert scene break" aria-label="Insert scene break">***</button>${findButton()}${bookButton()}<span class="sp"></span><span class="hint" id="wc"></span>${App.book ? '' : '<button class="sidebtn" data-a="side" title="Chapters and notes" aria-label="Chapters and notes">☰</button>'}</div>${App.book ? spread(f, s, d.novel) : `<div class="main"><div class="panes"><div class="pane"><div class="prose" id="nv" contenteditable="true" spellcheck="true" aria-label="Novel text" style="font-family:'${f}';font-size:${s}px">${d.novel}</div></div>${side(chapterNav())}</div></div>`}`;
}

/** Two pages side by side on a landscape sheet, a line down the middle. The text flows from the
 *  left page to the right one, then on to the next spread (‹ › or just keep typing). */
function spread(f: string, s: number, html: string) {
  return `<div class="main"><div class="spreadw"><div class="sheet2"><div class="prose sp2" id="nv" contenteditable="true" spellcheck="true" aria-label="Novel text" style="font-family:'${f}';font-size:${s}px">${html}</div><div class="sp2n l"></div><div class="sp2n r"></div></div><div class="sp2bar"><button data-a="sp2prev" aria-label="Previous pages">‹</button><span class="hint" id="sp2info"></span><button data-a="sp2next" aria-label="Next pages">›</button></div></div></div>`;
}
