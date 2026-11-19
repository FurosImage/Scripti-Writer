// Actions added for the full app: export/import, backups, library menus, focus mode, side panel,
// install, and board extras. Dispatched from the click switch in events.ts.
import { turnSpread } from './pages';
import { editTx, goScene } from './board/actions';
import { linkedScene } from './board/render';
import { COV, TYPES } from './constants';
import { bstep } from './board/actions';
import { focusB } from './editor/caret';
import { cstep } from './editor/charHistory';
import { hcommit, hpush, hstep } from './editor/history';
import {
  backupAll,
  backupOne,
  exportEverything,
  importAsDraft,
  importToLibrary,
  runExport,
} from './io/files';
import { promptInstall } from './io/pwa';
import { deleteP, duplicateP, openP, sceneRef } from './project';
import { App, flush, persist } from './state';
import { $, $$, pickFile, toast } from './utils';
import { render } from './views/workspace';

const IMPORT_TYPES = '.json,.fountain,.spmd,.txt,.fdx,.xml,application/json,text/plain';

export function openMenuAt(el: Element, ctx: any) {
  const r = el.getBoundingClientRect();
  App.ctx = {
    ...ctx,
    x: Math.max(8, Math.min(r.left, innerWidth - 220)),
    y: Math.min(r.bottom + 4, innerHeight - 200),
  };
  render();
  ($('.ctxm button') as HTMLElement)?.focus();
}

export function toggleFocus(on = !App.focus) {
  App.focus = on;
  render();
  if (on) toast('Focus mode. Press Esc or “Exit focus” to leave.');
}

/** Change the block type of the focused script line to the next (or previous) type. */
export function cycleType(back = false) {
  const b = App.P?.drafts[App.F.d]?.blocks[App.F.i];
  if (!b) return toast('Tap a line in the script first');
  const el = $(`.b[data-d="${App.F.d}"][data-i="${App.F.i}"]`);
  const off = el && document.activeElement == el ? (getSelection()?.focusOffset ?? 0) : undefined;
  hpush();
  const j = TYPES.findIndex((t: any) => t[0] == b.t);
  b.t = TYPES[(j + (back ? TYPES.length - 1 : 1)) % TYPES.length][0];
  hcommit();
  render();
  focusB(App.F.d, App.F.i, off);
}

export async function extraAction(a: string, t: any) {
  const id = t.dataset.id;
  switch (a) {
    case 'mclose':
      App.modal = null;
      render();
      break;
    case 'expopen':
      App.modal = 'export';
      render();
      break;
    case 'expfmt':
      App.exp.fmt = t.dataset.t;
      render();
      break;
    case 'expgo':
      App.modal = null;
      render();
      await flush();
      runExport();
      break;
    case 'bkall':
      await flush();
      backupAll();
      break;
    case 'bkone':
      await flush();
      backupOne(App.P);
      break;
    case 'imp': {
      App.modal = null;
      const f = await pickFile(IMPORT_TYPES);
      if (f) importToLibrary(f).catch(() => toast('That file could not be read.'));
      else render();
      break;
    }
    case 'impdraft': {
      const f = await pickFile('.fountain,.spmd,.txt,.fdx,.xml,text/plain');
      if (f) importAsDraft(f).catch(() => toast('That file could not be read.'));
      break;
    }
    case 'cardmenu':
      openMenuAt(t, { kind: 'card', id });
      break;
    case 'drmenu':
      openMenuAt(t, { kind: 'draft', i: +t.dataset.i });
      break;
    case 'cdup': {
      App.ctx = null;
      const p = App.D.ps.find((p: any) => p.id == id);
      if (p) {
        duplicateP(p);
        render();
        toast('Story duplicated');
      }
      break;
    }
    case 'cbk': {
      App.ctx = null;
      render();
      const p = App.D.ps.find((p: any) => p.id == id);
      if (p) {
        await flush();
        backupOne(p);
      }
      break;
    }
    case 'cpdf': {
      App.ctx = null;
      render();
      const p = App.D.ps.find((p: any) => p.id == id);
      if (p) {
        await flush();
        runExport(p, p.drafts.length - 1, 'pdf');
      }
      break;
    }
    case 'ccol':
    case 'cnoimg': {
      const p = App.D.ps.find((p: any) => p.id == id);
      if (p) {
        if (a == 'ccol') p.cv = COV[(COV.indexOf(p.cv) + 1) % COV.length];
        p.img = null;
        p.up = Date.now();
        persist();
      }
      App.ctx = null;
      render();
      break;
    }
    case 'wml':
      App.exp.wml = t.dataset.t;
      render();
      break;
    case 'szo':
    case 'szi':
    case 'sz1':
      import('./zoom').then((m) => m.zoomScript(a == 'szi' ? 1 : a == 'szo' ? -1 : 0));
      break;
    case 'sp2prev':
      turnSpread(-1);
      break;
    case 'sp2next':
      turnSpread(1);
      break;
    case 'book':
      App.book = !App.book;
      render();
      break;
    case 'exppdf':
      await flush();
      runExport(App.P, App.dr, 'pdf');
      break;
    case 'cexp': {
      App.ctx = null;
      render();
      const p = App.D.ps.find((p: any) => p.id == id);
      if (p) {
        await flush();
        exportEverything(p);
      }
      break;
    }
    case 'cdel': {
      App.ctx = null;
      const p = App.D.ps.find((p: any) => p.id == id);
      if (p) deleteP(p);
      break;
    }
    case 'focus':
      toggleFocus();
      break;
    case 'help':
      App.modal = 'help';
      render();
      break;
    case 'about':
      App.ctx = null;
      App.modal = 'about';
      render();
      break;
    case 'backups': {
      App.modal = 'backups';
      render();
      const m = await import('./backup');
      if ((await m.loadBackupFolder()) && App.modal == 'backups') render();
      break;
    }
    case 'abdir': {
      const m = await import('./backup');
      const dir = await m.chooseBackupFolder();
      if (dir) {
        render();
        toast('Backups are now saved in ' + dir);
      }
      break;
    }
    case 'abopen':
      import('./backup').then((m) => m.openBackupFolder());
      break;
    case 'abnow': {
      const m = await import('./backup');
      const ok = await m.autoBackup(true);
      render();
      toast(ok ? 'Backup saved' : "The backup couldn't be saved.");
      break;
    }
    case 'updcheck':
      App.modal = null;
      render();
      import('./update').then((m) => m.checkForUpdate(true));
      break;
    case 'find':
      import('./find').then((m) => m.openFind());
      break;
    case 'install':
      if (!(await promptInstall())) {
        App.modal = 'install';
        render();
      } else render();
      break;
    case 'side':
      App.side = !App.side;
      $('.side')?.classList.toggle('open', App.side);
      if (App.side) {
        if (!$('.scrim'))
          $('.panes')?.insertAdjacentHTML('beforeend', '<div class="scrim" data-a="side"></div>');
      } else $('.scrim')?.remove();
      break;
    case 'cyc':
      cycleType();
      break;
    case 'goch': {
      App.side = false;
      $('.side')?.classList.remove('open');
      $('.scrim')?.remove();
      const h = $$('#nv h1,#nv h2')[+t.dataset.i];
      h?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      break;
    }
    case 'scedit': {
      const el = $(`[data-sct="${id}"]`);
      if (el) {
        el.dataset.fresh = '1';
        editTx(el);
      }
      break;
    }
    case 'nscene': {
      const c = linkedScene(id);
      if (c) {
        const r = sceneRef(c);
        goScene(r.d, r.i);
      }
      break;
    }
    case 'savenow':
      await flush();
      toast('Saved');
      break;
    case 'openid':
      openP(App.D.ps.find((p: any) => p.id == id));
      break;
  }
}

/** Commands from the desktop app's menu bar (File, Edit, View, Help). */
export function desktopMenu(a: string) {
  const el = document.activeElement as any;
  if (a == 'undo' || a == 'redo') {
    const u = a == 'undo';
    if (el?.closest?.('.b') && App.P) return u ? hstep(App.HU, App.HR) : hstep(App.HR, App.HU);
    if (App.P && App.tab == 'Characters' && !el?.closest?.('input,textarea')) {
      if (cstep(u)) render();
      return;
    }
    if (App.P && App.tab == 'Brainstorming' && !el?.closest?.('input,textarea,[contenteditable=true]'))
      return u ? bstep(App.BU, App.BR) : bstep(App.BR, App.BU);
    document.execCommand(a);
    return;
  }
  if (a.startsWith('theme:')) {
    App.D.th = a.slice(6);
    import('./state').then((m) => m.persist());
    return render();
  }
  App.ctx = null;
  const fake = document.createElement('button');
  switch (a) {
    case 'new':
      App.P = null;
      App.modal = 'new';
      return render();
    case 'library':
      App.P = null;
      App.modal = null;
      return render();
    case 'import':
      return extraAction('imp', fake);
    case 'backup':
      return extraAction('bkall', fake);
    case 'export':
      if (!App.P) return toast('Open a story to export it');
      App.modal = 'export';
      return render();
    case 'focus':
      if (App.P) toggleFocus();
      return;
    case 'help':
      App.modal = 'help';
      return render();
    case 'update':
      return void import('./update').then((m) => m.checkForUpdate(true));
    case 'about':
      App.modal = 'about';
      return render();
    case 'backups':
      return void extraAction('backups', document.body);
    case 'find':
      return void import('./find').then((m) => m.openFind());
  }
}
