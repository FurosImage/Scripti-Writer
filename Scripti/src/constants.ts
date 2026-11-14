// Fixed lists and lookup tables shared across the app.

export const TABS = ['Script', 'Title Page', 'Characters', 'Locations', 'Corkboard', 'Brainstorming'];

export const TYPES = [
  ['scene', 'Scene Heading'],
  ['action', 'Action'],
  ['character', 'Character'],
  ['parenthetical', 'Parenthetical'],
  ['dialogue', 'Dialogue'],
  ['transition', 'Transition'],
];

export const NEXT = {
  scene: 'action',
  action: 'action',
  character: 'dialogue',
  dialogue: 'character',
  parenthetical: 'dialogue',
  transition: 'scene',
};

export const PH = {
  scene: 'INT. LOCATION - DAY',
  action: 'Describe what we see…',
  character: 'CHARACTER',
  dialogue: 'Dialogue',
  parenthetical: '(beat)',
  transition: 'CUT TO:',
};

export const COV = ['#5b3a29', '#27405e', '#4a5a3a', '#5e2f4a', '#3c3c3c', '#6b5a1e', '#2f5e5a', '#7a2e2e'];

export const BEATS = [
  'Opening Hook',
  'Theme Stated',
  'Inciting Incident',
  'Debate',
  'Plot Point 1',
  'Conflict',
  'B Story',
  'Fun and Games',
  'Midpoint',
  'False Victory / Defeat',
  'Point of No Return',
  'All Hope Is Lost',
  'Dark Night of the Soul',
  'Break Into 3',
  'Plot Twist',
  'Climax',
  'Resolution',
  'Custom Beat',
];

export const TIMES = [
  'DAY',
  'NIGHT',
  'MORNING',
  'AFTERNOON',
  'EVENING',
  'DAWN',
  'DUSK',
  'CONTINUOUS',
  'LATER',
  'MOMENTS LATER',
];

export const THEMES = [
  ['dark', 'Dark'],
  ['light', 'Light'],
  ['paper', 'Paper / Warm'],
  ['night', 'Night Warm'],
];

export const TN = { ms: 'Manuscript', novel: 'Novel', ideas: 'Ideas' };

export const COLS = ['#6f9cf0', '#e57a87', '#4fb38a', '#e0a458', '#a785e8', '#45b5c6', '#d98ac9', '#b5a64a'];

export const CN = {
  '#6f9cf0': 'Blue',
  '#e57a87': 'Rose',
  '#4fb38a': 'Green',
  '#e0a458': 'Amber',
  '#a785e8': 'Violet',
  '#45b5c6': 'Teal',
  '#d98ac9': 'Pink',
  '#b5a64a': 'Olive',
  ink: 'Ink',
  white: 'White',
  black: 'Black',
};

export const NSEQ = ['white', 'black', ...COLS],
  DRAW = ['pencil', 'rect', 'ellipse', 'tri', 'line', 'arrow', 'darrow'],
  SHP = DRAW.slice(1),
  PAD = 12;

export const TK = {
  v: 'select',
  h: 'pan',
  p: 'pencil',
  r: 'rect',
  o: 'ellipse',
  l: 'line',
  a: 'arrow',
  n: 'note',
  t: 'tl',
};

export const LRE = /^(INT\.?\/EXT\.?|EXT\.?\/INT\.?|I\/E\.?|INT\.?|EXT\.?)\s+(.+?)(?:\s+-\s+.*)?$/;

/** The app's name as shown to writers. */
export const APP_NAME = 'Scripti Writer';
/** The project's pages (source code, website, feedback forms). */
export const REPO_URL = 'https://github.com/FurosImage/Scripti-Writer';
export const SITE_URL = 'https://furosimage.github.io/Scripti-Writer/';
export const FEEDBACK_URL = REPO_URL + '/issues/new?template=feedback.yml';
export const BUG_URL = REPO_URL + '/issues/new?template=bug_report.yml';
/** Year shown in the copyright line (set when the version is built). */
export const BUILD_YEAR = __YEAR__;

/**
 * Versions before 1.0.0 are betas and count up in small steps: 0.0.1, 0.0.2, 0.0.3 …
 * They are shown as "Beta 0.0.1". From 1.0.0 the plain number is shown.
 */
export const isBetaVersion = (v: string) => /^v?0\./.test(v) || /beta/i.test(v);
export const versionLabel = (v: string) => {
  const n = v.replace(/^v/i, '').replace(/-.*$/, '');
  return isBetaVersion(v) ? 'Beta ' + n : n;
};
export const VERSION_LABEL = versionLabel(__VERSION__);
export const IS_BETA = isBetaVersion(__VERSION__);
