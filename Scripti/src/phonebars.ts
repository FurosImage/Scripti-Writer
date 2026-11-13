// On phones, the top bar, tabs and draft tabs slide away while you scroll down through the page
// and come back when you scroll up (like Safari's address bar), so the writing gets the screen.
const phone = matchMedia('(max-width: 700px)');
let last = 0;

function setHidden(on: boolean) {
  const app = document.getElementById('app');
  if (app && app.classList.contains('hidebars') != on) app.classList.toggle('hidebars', on);
}

document.addEventListener(
  'scroll',
  (e) => {
    const m = e.target as HTMLElement;
    if (!m?.classList?.contains('main')) return;
    if (!phone.matches) return setHidden(false);
    const y = m.scrollTop;
    const dy = y - last;
    if (y < 24) setHidden(false);
    else if (dy > 14) setHidden(true);
    else if (dy < -14) setHidden(false);
    if (Math.abs(dy) > 14 || y < 24) last = y;
  },
  true,
);

phone.addEventListener?.('change', () => setHidden(false));

/** Show the bars again (called after every full render). */
export function showBars() {
  last = 0;
  setHidden(false);
}
