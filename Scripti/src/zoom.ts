// Script page zoom: the − 100% + buttons in the script toolbar. Saved with the app settings.
import { App, persist } from './state';
import { $$ } from './utils';

export const ZOOMS = [0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.4, 1.6, 1.8];

/** The current zoom, kept to one of the steps. */
export function scriptZoom(): number {
  const z = +App.D.sz;
  return ZOOMS.includes(z) ? z : 1;
}

/** Apply the zoom and update the buttons without re-rendering, so the cursor stays put. */
export function paintZoom() {
  const z = scriptZoom();
  document.body.style.setProperty('--sz', String(z));
  $$('.zm .zv').forEach((e: HTMLElement) => (e.textContent = Math.round(z * 100) + '%'));
  $$('.zm [data-a=szo]').forEach((e: HTMLButtonElement) => (e.disabled = z <= ZOOMS[0]));
  $$('.zm [data-a=szi]').forEach((e: HTMLButtonElement) => (e.disabled = z >= ZOOMS[ZOOMS.length - 1]));
}

/** Zoom in (+1), out (-1) or back to 100% (0). */
export function zoomScript(dir: -1 | 0 | 1) {
  const i = ZOOMS.indexOf(scriptZoom());
  App.D.sz = dir == 0 ? 1 : ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i + dir))];
  persist();
  paintZoom();
}
