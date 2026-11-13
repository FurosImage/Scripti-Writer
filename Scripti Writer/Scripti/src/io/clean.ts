// Cleaning story data that comes from outside (imported backups, older saves), so a crafted file
// can't slip code into the app. Text fields are escaped when rendered; these helpers cover the
// fields that are put into the page as HTML or inside attributes and styles.
import { esc } from '../utils';

/** Elements that are kept (with their children). Anything else is unwrapped to its text. */
const KEEP = new Set([
  'p', 'div', 'span', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'b', 'strong', 'i', 'em', 'u', 's',
  'strike', 'mark', 'hr', 'blockquote', 'ul', 'ol', 'li', 'sub', 'sup', 'font', 'small',
]);
/** Elements dropped together with everything inside them. */
const DROP = new Set([
  'script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'svg', 'math',
  'link', 'meta', 'base', 'img', 'image', 'picture', 'video', 'audio', 'source', 'track', 'canvas',
  'form', 'input', 'button', 'textarea', 'select', 'option', 'template', 'noscript', 'title', 'head',
]);
const VOID = new Set(['br', 'hr']);

/** A CSS value or declaration list with nothing that can load a resource or run code. */
const badCss = /url\s*\(|expression|javascript|@import|behavior|-moz-binding|\\|[<>{}]/i;

/** A colour or similar CSS value used inside a style attribute: no quotes, semicolons or url(). */
export function safeCss(v: unknown, fallback: string): string {
  const s = typeof v == 'string' ? v.trim() : '';
  return s && s.length <= 120 && /^[\w\s#.,%()+\-]*$/.test(s) && !badCss.test(s) ? s : fallback;
}

/** An id used in data attributes. */
export const safeId = (v: unknown) => typeof v == 'string' && /^[\w-]{1,80}$/.test(v);

/** A font family name. */
export const safeFont = (v: unknown, fallback: string) =>
  typeof v == 'string' && /^[\w\s-]{1,60}$/.test(v) ? v : fallback;

/** A cover image: only an embedded picture, never a link to another site. */
export const safeImage = (v: unknown) =>
  typeof v == 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=\s]+$/.test(v) ? v : undefined;

function cleanAttrs(el: Element): string {
  let out = '';
  for (const a of Array.from(el.attributes)) {
    const n = a.name.toLowerCase(),
      v = a.value;
    if (n == 'data-cm' || n == 'align' || n == 'dir') out += ` ${n}="${esc(v)}"`;
    else if (n == 'class' && /^[\w\s-]*$/.test(v)) out += ` class="${v}"`;
    else if (n == 'style' && !badCss.test(v)) out += ` style="${esc(v)}"`;
    else if (n == 'color' && el.localName == 'font') out += ` color="${esc(safeCss(v, ''))}"`;
  }
  return out;
}

function walk(node: Node): string {
  let out = '';
  node.childNodes.forEach((c) => {
    if (c.nodeType == 3) out += esc(c.nodeValue);
    else if (c.nodeType == 1) {
      const el = c as Element,
        tag = el.localName;
      if (DROP.has(tag)) return;
      if (!KEEP.has(tag)) {
        out += walk(el);
        return;
      }
      out += `<${tag}${cleanAttrs(el)}>`;
      if (!VOID.has(tag)) out += walk(el) + `</${tag}>`;
    }
  });
  return out;
}

/**
 * Rebuild rich text (novel chapters, the title page, highlighted script lines) keeping only plain
 * formatting. The HTML is parsed inside a <template>, where nothing runs or loads.
 */
export function cleanHTML(html: unknown): string {
  if (typeof html != 'string' || !html) return '';
  // Plain text and simple markup without anything risky skips the rebuild.
  if (!/[<&]/.test(html)) return html;
  const t = document.createElement('template');
  t.innerHTML = html;
  return walk(t.content);
}

/** Keys on board items whose text is escaped when shown, so any string is fine there. */
const TEXT_KEYS = new Set(['t', 'acts']);

/**
 * Board items, links and notes are plain objects whose numbers and short strings go into SVG
 * attributes and styles. Keep numbers, booleans and safe short strings; drop anything else.
 */
export function cleanBoardValue(v: any, key = ''): any {
  if (v == null || typeof v == 'boolean') return v;
  if (typeof v == 'number') return isFinite(v) ? v : 0;
  if (typeof v == 'string') {
    if (TEXT_KEYS.has(key)) return v;
    return v.length <= 20000 && /^[\w\s#.,%()+\-]*$/.test(v) && !badCss.test(v) ? v : undefined;
  }
  if (Array.isArray(v))
    return v
      .map((x) => (TEXT_KEYS.has(key) ? (typeof x == 'string' ? x : String(x ?? '')) : cleanBoardValue(x)))
      .filter((x) => x !== undefined);
  if (typeof v == 'object') {
    const o: any = {};
    for (const k of Object.keys(v)) {
      if (k == '__proto__' || k == 'constructor' || k == 'prototype') continue;
      const c = cleanBoardValue(v[k], k);
      if (c !== undefined) o[k] = c;
    }
    return o;
  }
  return undefined;
}

/** A list of board objects: each must have a safe id. */
export const cleanBoardList = (a: unknown) =>
  (Array.isArray(a) ? a : [])
    .filter((x) => x && typeof x == 'object' && !Array.isArray(x))
    .map((x) => cleanBoardValue(x))
    .filter((x) => safeId(x.id));
