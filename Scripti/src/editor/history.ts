// Undo / redo for script drafts.
import { focusB } from './caret';
import { ensureIds } from '../project';
import { App, save } from '../state';
import { toast } from '../utils';
import { render } from '../views/workspace';

export function hpush() {
  App.HU.push(App.cur);
  if (App.HU.length > 300) App.HU.shift();
  App.HR = [];
}

export function hcommit() {
  ensureIds(App.P);
  App.cur = JSON.stringify(App.P.drafts);
  save();
}

export function hstep(from?: any, to?: any) {
  if (!from.length) {
    toast(from === App.HU ? 'Nothing to undo' : 'Nothing to redo');
    return;
  }
  const f = App.F;
  to.push(JSON.stringify(App.P.drafts));
  App.P.drafts = JSON.parse(from.pop());
  App.cur = JSON.stringify(App.P.drafts);
  if (App.dr >= App.P.drafts.length) App.dr = 0;
  save();
  render();
  if (f && App.P.drafts[f.d]) {
    focusB(f.d, Math.min(f.i, App.P.drafts[f.d].blocks.length - 1));
  }
}
