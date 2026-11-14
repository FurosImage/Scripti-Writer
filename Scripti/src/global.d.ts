// Ambient types for the browser environment.
//
// Scripti started life as a single untyped script, so DOM access is typed leniently for now:
// Node and Element accept any property. Tighten this (and remove these index signatures)
// module by module as real types are added.

/** App version from package.json, e.g. '0.0.1' (set at build time). */
declare const __VERSION__: string;
/** Year of the build, e.g. '2026' (set at build time). */
declare const __YEAR__: string;

interface Node {
  [key: string]: any;
}
interface Element {
  [key: string]: any;
}
