// App entry point.
import './styles/themes.css';
import './styles/app.css';
import './styles/board.css';
import './styles/full.css';
import './editor/multisel';
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
  if (!(await initData())) return storageProblem();
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

/** Shown instead of the app when the saved stories couldn't be read. Nothing is changed. */
function storageProblem() {
  const app = document.getElementById('app')!;
  app.innerHTML = `<div class="main"><div class="menu sprob" role="alert"><h1>Scripti <span class="wr">Writer</span></h1>
<p><b>Your stories couldn't be opened just now.</b></p>
<p class="hint">They are still saved and nothing has been changed. Close Scripti Writer and open it again. If this keeps happening, restart your computer${(window as any).scriptiDesktop ? ', or bring your stories back from the Scripti Writer Backups folder with Import' : ''}.</p>
<p><button class="big pri" id="sretry">Try again</button></p></div></div>`;
  document.getElementById('sretry')!.onclick = () => location.reload();
}

// A file dropped on the window would otherwise replace the app with that file.
for (const ev of ['dragover', 'drop'])
  addEventListener(ev, (e) => {
    if ((e as DragEvent).dataTransfer?.types?.includes('Files')) e.preventDefault();
  });

boot();
