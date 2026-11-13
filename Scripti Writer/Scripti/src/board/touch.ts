// Touch gestures on the brainstorm board: two-finger pinch to zoom and pan, and double-tap to open
// or edit. Runs in the capture phase, before the board's normal pointer handling.
import { drawLinks } from './links';
import { tmpDraw, zoomAt } from './actions';
import { tf } from './render';
import { App, persist } from '../state';

const pts = new Map<number, { x: number; y: number }>();
let pinch: any = null;
let lastTap = { t: 0, x: 0, y: 0 },
  down = { x: 0, y: 0, t: 0 };
export let synthDbl = 0;

const onBoard = (e: PointerEvent) =>
  App.P && App.tab == 'Brainstorming' && (e.target as Element)?.closest?.('#bd');

function start() {
  const [a, b] = [...pts.values()],
    B = App.P.board,
    r = document.querySelector('#bd')!.getBoundingClientRect();
  pinch = {
    d: Math.hypot(a.x - b.x, a.y - b.y) || 1,
    mx: (a.x + b.x) / 2 - r.left,
    my: (a.y + b.y) / 2 - r.top,
    z: B.z,
    x: B.x,
    y: B.y,
  };
  // Cancel whatever the first finger started (a stroke, a shape, a selection box).
  tmpDraw('');
  const mq = document.querySelector('#mq') as HTMLElement | null;
  if (mq) mq.style.display = 'none';
  App.drag = { pinch: 1 };
}

document.addEventListener(
  'pointerdown',
  (e) => {
    if (e.pointerType != 'touch' || !onBoard(e)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    down = { x: e.clientX, y: e.clientY, t: Date.now() };
    if (pts.size == 2) {
      start();
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  },
  true,
);

document.addEventListener(
  'pointermove',
  (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!pinch || pts.size < 2) return;
    e.stopImmediatePropagation();
    const [a, b] = [...pts.values()],
      B = App.P.board,
      r = document.querySelector('#bd')!.getBoundingClientRect();
    const d = Math.hypot(a.x - b.x, a.y - b.y),
      mx = (a.x + b.x) / 2 - r.left,
      my = (a.y + b.y) / 2 - r.top;
    const z = Math.min(3, Math.max(0.25, (pinch.z * d) / pinch.d));
    // Keep the point under the fingers' midpoint fixed while zooming, then follow the midpoint.
    B.x = mx - ((pinch.mx - pinch.x) * z) / pinch.z;
    B.y = my - ((pinch.my - pinch.y) * z) / pinch.z;
    B.z = z;
    tf();
    drawLinks();
  },
  true,
);

function end(e: PointerEvent) {
  if (!pts.has(e.pointerId)) return;
  pts.delete(e.pointerId);
  if (pinch) {
    e.stopImmediatePropagation();
    if (pts.size < 2) {
      pinch = null;
      App.drag = null;
      pts.clear();
      persist();
    }
    return;
  }
  // Double-tap: a second short tap close to the first opens or edits, like a double-click.
  const now = Date.now();
  if (
    e.type == 'pointerup' &&
    now - down.t < 300 &&
    Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10
  ) {
    if (now - lastTap.t < 350 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
      lastTap.t = 0;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (target) {
        synthDbl = now;
        setTimeout(
          () =>
            target.dispatchEvent(
              new MouseEvent('dblclick', { bubbles: true, clientX: e.clientX, clientY: e.clientY }),
            ),
          0,
        );
      }
    } else lastTap = { t: now, x: e.clientX, y: e.clientY };
  }
}
document.addEventListener('pointerup', end, true);
document.addEventListener('pointercancel', end, true);

// Safari on a Mac reports trackpad pinches as gesture events. Zoom the board with them (and stop
// Safari zooming the whole page). On iPhone and iPad the touch pinch above already handles it.
let gz = 0;
const gesture = (e: any) => {
  if (pts.size || !App.P || App.tab != 'Brainstorming' || !e.target?.closest?.('#bd')) return false;
  e.preventDefault();
  return true;
};
document.addEventListener('gesturestart', (e: any) => {
  if (gesture(e)) gz = App.P.board.z;
});
document.addEventListener('gesturechange', (e: any) => {
  if (!gesture(e) || !gz) return;
  const r = document.querySelector('#bd')!.getBoundingClientRect();
  zoomAt((gz * e.scale) / App.P.board.z, e.clientX - r.left, e.clientY - r.top);
  drawLinks();
});
document.addEventListener('gestureend', (e: any) => {
  if (gesture(e)) gz = 0;
});
