// App entry point.
import './styles/themes.css';
import './styles/app.css';
import './styles/board.css';
import './styles/full.css';
import './events';
import './board/events';
import './board/touch';
import { setupPwa } from './io/pwa';
import { desktopMenu } from './actions';
import { setupUpdates } from './update';
import { setupBackups } from './backup';
import { normalize } from './project';
import { App, initData, persist, statusHooks } from './state';
import { paintStatus, render } from './views/workspace';

document.execCommand('defaultParagraphSeparator', false, 'p');

async function boot() {
  await initData();
  const D = App.D;
  D.ps = D.ps.map(normalize);
  if ((D.seeded || 0) < 6) {
    // Version 6: the old test stories are removed, so the library starts empty. Test stories that
    // were edited are tucked away in D.removedTests rather than thrown away; stories the writer
    // made stay as they are.
    const isTest = (p: any) =>
      p.sample || /^sample-(ms|novel|ideas)$/.test(p.id) || / \(my version\)$/.test(p.title || '');
    const tests = D.ps.filter(isTest);
    if (tests.length) {
      D.removedTests = [...(D.removedTests || []), ...tests.filter((p: any) => p.up > 0)];
      D.ps = D.ps.filter((p: any) => !isTest(p));
      for (const p of tests) D.dels[p.id] = Date.now();
    }
    D.seeded = 6;
    persist();
  }
  statusHooks.push(paintStatus);
  render();
  setupPwa(() => !App.P && render());
  (window as any).scriptiDesktop?.onMenu(desktopMenu);
  if ((window as any).scriptiDesktop) document.body.classList.add('desktop-app');
  setupUpdates();
  setupBackups();
}

boot();
