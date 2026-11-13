// SVG icons for the brainstorm tool rail.

export const SV = (p?: any) => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;

export const IC = {
  expand: SV('<path d="M6 6l6 6-6 6M13 6l6 6-6 6"/>'),
  collapse: SV('<path d="M18 6l-6 6 6 6M11 6l-6 6 6 6"/>'),
  select: SV('<path d="M5 3l14 8-6 2-3 6z"/>'),
  pan: SV(
    '<path d="M8 13V5.5a1.5 1.5 0 013 0V11M11 11V4a1.5 1.5 0 013 0v7M14 11V5.5a1.5 1.5 0 013 0V14a6 6 0 01-6 6h-1a6 6 0 01-5-2.7L3.5 14a1.5 1.5 0 012.5-1.6L8 15"/>',
  ),
  pencil: SV('<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>'),
  rect: SV('<rect x="4" y="6" width="16" height="12" rx="1"/>'),
  ellipse: SV('<ellipse cx="12" cy="12" rx="8.5" ry="7"/>'),
  tri: SV('<path d="M12 4l9 16H3z"/>'),
  line: SV('<path d="M5 19L19 5"/>'),
  arrow: SV('<path d="M5 19L19 5M11 5h8v8"/>'),
  darrow: SV('<path d="M5 19L19 5M11 5h8v8M13 19H5v-8"/>'),
  note: SV('<path d="M5 4h14v10l-6 6H5z"/><path d="M13 20v-6h6"/>'),
  scene: SV('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18"/>'),
  char: SV('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>'),
  beat: SV('<path d="M12 3l2.6 6.2H21l-5.2 4 2 6.8L12 16l-5.8 4 2-6.8-5.2-4h6.4z"/>'),
  tl: SV('<path d="M3 13h18M6 10v6M12 10v6M18 10v6"/><path d="M5 6h3M11 6h3M17 6h3"/>'),
  undo: SV('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>'),
  redo: SV('<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 000 10h3"/>'),
  plus: SV('<path d="M12 5v14M5 12h14"/>'),
  minus: SV('<path d="M5 12h14"/>'),
};
