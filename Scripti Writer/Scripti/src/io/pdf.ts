// A small PDF writer for monospaced documents. It uses the four built-in Courier fonts, so nothing
// has to be embedded and every PDF reader shows the pages identically.

export type Font = 'R' | 'B' | 'I' | 'BI';
export interface PdfText {
  /** Points from the left edge */
  x: number;
  /** Points from the top edge */
  y: number;
  text: string;
  font?: Font;
  size?: number;
}
export interface PdfPage {
  items: PdfText[];
}

const FONTS: Record<Font, string> = {
  R: 'Courier',
  B: 'Courier-Bold',
  I: 'Courier-Oblique',
  BI: 'Courier-BoldOblique',
};
const FN: Record<Font, string> = { R: 'F1', B: 'F2', I: 'F3', BI: 'F4' };

// Characters outside Latin-1 that Windows-1252 (the built-in fonts' encoding) can still show.
const CP: Record<string, number> = {
  '€': 0x80,
  '‚': 0x82,
  ƒ: 0x83,
  '„': 0x84,
  '…': 0x85,
  '†': 0x86,
  '‡': 0x87,
  ˆ: 0x88,
  '‰': 0x89,
  Š: 0x8a,
  '‹': 0x8b,
  Œ: 0x8c,
  Ž: 0x8e,
  '‘': 0x91,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '•': 0x95,
  '–': 0x96,
  '—': 0x97,
  '˜': 0x98,
  '™': 0x99,
  š: 0x9a,
  '›': 0x9b,
  œ: 0x9c,
  ž: 0x9e,
  Ÿ: 0x9f,
};

function encodeText(s: string) {
  let o = '';
  for (const ch of s.normalize('NFC')) {
    const c = ch.codePointAt(0)!;
    let b = c >= 0x20 && c < 0x7f ? c : c >= 0xa0 && c <= 0xff ? c : CP[ch];
    if (b == null) b = 0x3f; // '?'
    const h = String.fromCharCode(b);
    o += h == '(' || h == ')' || h == '\\' ? '\\' + h : h;
  }
  return o;
}

/** Build a PDF. Width and height are in points (72 per inch). */
export function makePdf(pages: PdfPage[], w: number, h: number, title = ''): Uint8Array {
  const objs: string[] = [];
  const add = (s: string) => (objs.push(s), objs.length);
  const catalog = add(''),
    pagesObj = add('');
  const fontIds = (Object.keys(FONTS) as Font[]).map((k) =>
    add(`<< /Type /Font /Subtype /Type1 /BaseFont /${FONTS[k]} /Encoding /WinAnsiEncoding >>`),
  );
  const fontRes = (Object.keys(FONTS) as Font[]).map((k, i) => `/${FN[k]} ${fontIds[i]} 0 R`).join(' ');
  const kids: number[] = [];
  for (const pg of pages) {
    let s = '';
    for (const t of pg.items) {
      if (!t.text) continue;
      const size = t.size || 12;
      s += `BT /${FN[t.font || 'R']} ${size} Tf 1 0 0 1 ${t.x.toFixed(2)} ${(h - t.y - size * 0.8).toFixed(2)} Tm (${encodeText(t.text)}) Tj ET\n`;
    }
    const content = add(`<< /Length ${s.length} >>\nstream\n${s}endstream`);
    kids.push(
      add(
        `<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /Font << ${fontRes} >> >> /Contents ${content} 0 R >>`,
      ),
    );
  }
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objs[pagesObj - 1] =
    `<< /Type /Pages /Kids [${kids.map((k) => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
  const info = add(`<< /Title (${encodeText(title)}) /Producer (Scripti Writer) >>`);
  let out = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
  const offs: number[] = [];
  objs.forEach((o, i) => {
    offs.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out +=
    `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` +
    offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
  return bytes;
}

export const PAPER = {
  letter: { w: 612, h: 792 },
  a4: { w: 595.28, h: 841.89 },
};
