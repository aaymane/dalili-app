/**
 * Un PDF à partir des pages d'un scan (photos JPEG), sans bibliothèque : un PDF sait afficher un JPEG tel quel
 * (filtre DCTDecode), il suffit de l'envelopper. Une page par photo, de la largeur d'une page A4, à la hauteur
 * de la photo : un scan de feuille A4 donne une page A4. Aucune métadonnée (ni auteur, ni appareil, ni date).
 */

export type JpegInfo = { width: number; height: number; components: 1 | 3 | 4 };

/** Largeur d'une page A4, en points PDF (1/72 de pouce). */
const A4_WIDTH = 595.28;
const COLOR_SPACE = { 1: 'DeviceGray', 3: 'DeviceRGB', 4: 'DeviceCMYK' } as const;

/** Lit la taille et les couleurs d'un JPEG dans son en-tête (marqueur SOF). */
export function jpegInfo(bytes: Uint8Array): JpegInfo {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Pas un JPEG');
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = bytes[i + 1];
    // Octets de remplissage, et marqueurs sans longueur (TEM, RSTn).
    if (marker === 0xff) {
      i++;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    // SOF0 à SOF15, sauf DHT (C4), JPG (C8) et DAC (CC) qui partagent la plage.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = (bytes[i + 5] << 8) | bytes[i + 6];
      const width = (bytes[i + 7] << 8) | bytes[i + 8];
      const components = bytes[i + 9];
      if (!width || !height || (components !== 1 && components !== 3 && components !== 4)) break;
      return { width, height, components };
    }
    // Début des données d'image sans en-tête de taille : fichier abîmé.
    if (marker === 0xda || marker === 0xd9) break;
    i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
  }
  throw new Error('JPEG illisible');
}

const ascii = (s: string) => {
  const out = new Uint8Array(s.length);
  for (let k = 0; k < s.length; k++) out[k] = s.charCodeAt(k) & 0xff;
  return out;
};

const num = (n: number) => String(Math.round(n * 100) / 100);

/** Assemble les pages (JPEG) en un seul PDF. */
export function jpegsToPdf(pages: Uint8Array[]): Uint8Array {
  if (!pages.length) throw new Error('Aucune page');
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (part: Uint8Array | string) => {
    const b = typeof part === 'string' ? ascii(part) : part;
    chunks.push(b);
    length += b.length;
  };
  const object = (id: number, body: () => void) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
    body();
    push('\nendobj\n');
  };

  push('%PDF-1.4\n');
  // Un commentaire d'octets hauts : les outils savent que le fichier contient du binaire.
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  // 1 : catalogue ; 2 : arbre des pages ; puis 3 objets par page (page, image, dessin).
  const pageId = (i: number) => 3 + i * 3;
  object(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  object(2, () => push(`<< /Type /Pages /Kids [${pages.map((_, i) => `${pageId(i)} 0 R`).join(' ')}] /Count ${pages.length} >>`));
  pages.forEach((jpeg, i) => {
    const info = jpegInfo(jpeg);
    const w = num(A4_WIDTH);
    const h = num((A4_WIDTH * info.height) / info.width);
    const id = pageId(i);
    const draw = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
    // Les JPEG CMJN (Adobe) sont stockés inversés.
    const decode = info.components === 4 ? ' /Decode [1 0 1 0 1 0 1 0]' : '';
    object(id, () =>
      push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`),
    );
    object(id + 1, () => {
      push(
        `<< /Type /XObject /Subtype /Image /Width ${info.width} /Height ${info.height} /ColorSpace /${COLOR_SPACE[info.components]} /BitsPerComponent 8 /Filter /DCTDecode${decode} /Length ${jpeg.length} >>\nstream\n`,
      );
      push(jpeg);
      push('\nendstream');
    });
    object(id + 2, () => push(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`));
  });

  const count = 2 + pages.length * 3;
  const xref = length;
  push(`xref\n0 ${count + 1}\n0000000000 65535 f \n`);
  for (let id = 1; id <= count; id++) push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${count + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}
