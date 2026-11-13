// Installing Scripti as an app and working offline (service worker).

let deferred: any = null;
export const pwa = { installable: false };

export const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform == 'MacIntel' && navigator.maxTouchPoints > 1);

/** Safari 17+ on a Mac can add web apps to the Dock (File → Add to Dock). */
export const isMacSafari = () => {
  const ua = navigator.userAgent;
  if (
    isIOS() ||
    !/Macintosh/.test(ua) ||
    !/Safari\//.test(ua) ||
    /Chrome|Chromium|Edg|Firefox|Electron/.test(ua)
  )
    return false;
  return +(ua.match(/Version\/(\d+)/)?.[1] || 0) >= 17;
};

/** Running inside the Scripti desktop app (Electron). */
export const isDesktopApp = () => !!(window as any).scriptiDesktop;

/** Show an "Install app" option: when the browser can install, on iPhone/iPad, or in Safari on a Mac. */
export const canOfferInstall = () =>
  !isDesktopApp() && !isStandalone() && (pwa.installable || isIOS() || isMacSafari());

export function setupPwa(onChange: () => void) {
  if (isDesktopApp()) return;
  addEventListener('beforeinstallprompt', (e: any) => {
    e.preventDefault();
    deferred = e;
    pwa.installable = true;
    onChange();
  });
  addEventListener('appinstalled', () => {
    deferred = null;
    pwa.installable = false;
    onChange();
  });
  if ('serviceWorker' in navigator && (location.protocol == 'https:' || location.hostname == 'localhost'))
    addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

/** Returns false when the browser has no install prompt (e.g. iPhone), so a how-to is shown instead. */
export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  await deferred.userChoice.catch(() => null);
  deferred = null;
  pwa.installable = false;
  return true;
}
