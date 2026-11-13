// Undo / redo for the Characters page. A snapshot holds the characters plus the board cards and
// connections that belong to them, because deleting a character also removes its cards.
import { App, save } from '../state';
import { toast } from '../utils';

const CU: string[] = [],
  CR: string[] = [];
let lastType = 0;
let projectId = '';

const snapshot = () => JSON.stringify({ ch: App.P.chars, c: App.P.board.c, l: App.P.board.l });

function reset() {
  if (App.P && App.P.id !== projectId) {
    projectId = App.P.id;
    CU.length = 0;
    CR.length = 0;
  }
}

/** Call before changing characters. `typing` groups keystrokes into one undo step. */
export function csnap(typing = false) {
  reset();
  const now = Date.now();
  if (typing && now - lastType < 1200) {
    lastType = now;
    return;
  }
  lastType = typing ? now : 0;
  CU.push(snapshot());
  if (CU.length > 100) CU.shift();
  CR.length = 0;
}

function restore(s: string) {
  const o = JSON.parse(s);
  App.P.chars = o.ch;
  App.P.board.c = o.c;
  App.P.board.l = o.l;
}

/** Undo (`back`) or redo. Returns false when there is nothing to step to. */
export function cstep(back: boolean) {
  reset();
  const from = back ? CU : CR,
    to = back ? CR : CU;
  if (!from.length) {
    toast(back ? 'Nothing to undo' : 'Nothing to redo');
    return false;
  }
  to.push(snapshot());
  restore(from.pop()!);
  lastType = 0;
  save();
  return true;
}

export const canUndo = () => (reset(), CU.length > 0);
export const canRedo = () => (reset(), CR.length > 0);
