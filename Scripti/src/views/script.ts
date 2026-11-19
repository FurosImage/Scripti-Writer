// Screenplay page editor view, split panes and the side panel (scenes, notes, comments).
import { PH, TYPES } from '../constants';
import { cstyle, sceneList } from '../project';
import { App } from '../state';
import { findButton } from '../find';
import { esc, hasMk, MOD } from '../utils';

export function pane(d?: any, second?: any) {
  const ph = App.split
    ? `<div class="ph">${second ? `<select data-c="d2" aria-label="Second draft">${App.P.drafts.map((x?: any, i?: any) => (i == App.dr ? '' : `<option value="${i}" ${i == d ? 'selected' : ''}>${esc(x.name)}</option>`)).join('')}</select>` : `<span class="hint">${esc(App.P.drafts[d].name)}</span>`}</div>`
    : '';
  let n = 0;
  return `<div class="pane">${ph}<div class="page" aria-label="Script">${App.P.drafts[d].blocks.map((b?: any, i?: any) => `<div class="b ${b.t}" contenteditable="true" spellcheck="true" data-d="${d}" data-i="${i}" data-ph="${PH[b.t]}"${b.t == 'scene' ? ` data-n="${sceneLabel(++n)}" aria-description="Scene ${n}"` : ''}${b.t == 'character' ? cstyle(b.x) : ''}>${b.h || esc(b.x)}</div>`).join('')}</div></div>`;
}

/** The number shown after "SCENE" on a heading, padded so the heading text always lines up. */
export const sceneLabel = (n: number) => (n + '.').padEnd(4, ' ');

/** Renumber scene headings in place (after a line becomes or stops being a heading). */
export function renumberScenes() {
  document.querySelectorAll('.page').forEach((pg) => {
    let n = 0;
    pg.querySelectorAll('.b').forEach((b: any) => {
      if (b.classList.contains('scene')) {
        b.dataset.n = sceneLabel(++n);
        b.setAttribute('aria-description', 'Scene ' + n);
      } else if (b.dataset.n) {
        delete b.dataset.n;
        b.removeAttribute('aria-description');
      }
    });
  });
}

export function comments(d?: any) {
  const o = [];
  App.P.drafts[d].blocks.forEach((b?: any, i?: any) => {
    if (!hasMk(b.h)) return;
    const t = document.createElement('template');
    t.innerHTML = b.h;
    t.content
      .querySelectorAll('mark')
      .forEach((m?: any) => o.push({ i, c: m.dataset.cm || '', t: m.textContent }));
  });
  return o;
}

/** The side panel: on wide screens beside the page, on phones a drawer opened with ☰. */
export function side(top: string) {
  return `<aside class="side ${App.side ? 'open' : ''}" aria-label="Side panel"><div class="sideh"><span class="hint" id="${App.P.type == 'novel' ? 'wc2' : 'stats2'}"></span><button class="ib sideclose" data-a="side" aria-label="Close panel">×</button></div><div id="navw">${top}</div>
<div class="lab">Margin notes</div><textarea data-c="notes" placeholder="Notes for this story…" aria-label="Margin notes">${esc(App.P.notes)}</textarea></aside>${App.side ? '<div class="scrim" data-a="side"></div>' : ''}`;
}

/** Scene list and comments for the side panel. */
export function sceneNav() {
  const C = comments(App.dr),
    S = sceneList(App.dr);
  const nav = `<div class="lab">Scenes</div>${S.length ? `<ol class="nav">${S.map((s?: any) => `<li><button data-a="goto" data-i="${s.i}" data-sid="${s.id}"><span>${App.P.drafts[App.dr].blocks.slice(0, s.i + 1).filter((b?: any) => b.t == 'scene').length}</span>${esc(s.x)}</button></li>`).join('')}</ol>` : '<p class="hint">Scenes appear here as you write scene headings.</p>'}`;
  const cm = `<div class="lab">Comments</div>${C.length ? C.map((c?: any) => `<div class="cm" data-a="gocm" data-i="${c.i}"><q>${esc(c.t)}</q>${esc(c.c) || '<span class="hint">No comment yet</span>'}</div>`).join('') : '<p class="hint">Select text and press 🖍 to leave a comment.</p>'}`;
  return nav + cm;
}

export function script() {
  const two = App.split && App.P.drafts.length > 1;
  if (two && (App.d2 < 0 || App.d2 == App.dr || App.d2 >= App.P.drafts.length)) App.d2 = App.dr == 0 ? 1 : 0;
  return `<div class="bar tb"><div class="tbl"><button data-a="addscene" title="Add a new scene at the end" aria-label="Add scene">+<span class="tlab"> Scene</span></button></div><div class="ctr"><button data-a="u" data-keep title="Undo (${MOD}+Z)" aria-label="Undo">↶</button><button data-a="r" data-keep title="Redo (${MOD}+Shift+Z)" aria-label="Redo">↷</button>
<select data-c="fmt" aria-label="Block type">${TYPES.map(([v, l]: any) => `<option value="${v}">${l}</option>`).join('')}</select><button data-a="cyc" data-keep title="Next block type (Tab)" aria-label="Next block type">⇥</button><button data-a="hl" data-keep title="Select text, then highlight and comment" aria-label="Highlight and comment">🖍</button>${findButton()}</div><div class="tr"><span class="zm" role="group" aria-label="Page zoom"><button data-a="szo" data-keep title="Zoom out" aria-label="Zoom out">−</button><button class="zv" data-a="sz1" data-keep title="Back to 100%">100%</button><button data-a="szi" data-keep title="Zoom in" aria-label="Zoom in">+</button></span><span class="hint" id="stats"></span><button class="sidebtn" data-a="side" title="Scenes, notes and comments" aria-label="Scenes, notes and comments">☰</button></div></div>
<div class="main"><div class="panes">${pane(App.dr, false)}${two ? pane(App.d2, true) : ''}${side(sceneNav())}</div></div>`;
}
