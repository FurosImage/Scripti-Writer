// Hover summaries for characters, locations and comments.
import { App } from '../state';
import { $, charMatch, cue, esc, locOf } from '../utils';

export function hcShow(el?: any) {
  let html = '';
  if (el.tagName == 'MARK') {
    const c = el.dataset.cm;
    html = `<b>Comment</b><p>${c ? esc(c) : '<span class="hint">No comment yet. Click to add one.</span>'}</p>`;
  } else if (el.classList.contains('character')) {
    const q = cue(el.textContent),
      c = App.P.chars.find((c?: any) => charMatch(c, q));
    if (!c) return;
    html = `<b><span style="color:${c.col}">●</span> ${esc(c.n)}</b>${c.r ? `<span class="hint">${esc(c.r)}</span>` : ''}${c.p ? `<p><span class="hint">Personality</span><br>${esc(c.p)}</p>` : ''}${c.g ? `<p><span class="hint">Goal</span><br>${esc(c.g)}</p>` : ''}${!c.p && !c.g && c.d ? `<p>${esc(c.d)}</p>` : ''}`;
  } else if (el.classList.contains('scene')) {
    const n = locOf(el.textContent),
      l = App.P.locs.find((l?: any) => l.n == n);
    if (!l) return;
    html = `<b>${esc(l.n)}</b><p>${l.d ? esc(l.d) : '<span class="hint">No details yet. Add them in Locations.</span>'}</p>`;
  }
  if (!html) return;
  let h = $('#hc');
  if (!h) {
    h = document.createElement('div');
    h.id = 'hc';
    h.className = 'hc';
    document.body.append(h);
  }
  h.innerHTML = html;
  const r = el.getBoundingClientRect();
  h.style.left = Math.min(r.left, innerWidth - 300) + 'px';
  h.style.top = r.bottom + 6 + 'px';
}

export function hcHide() {
  clearTimeout(App.hcT);
  $('#hc')?.remove();
}
