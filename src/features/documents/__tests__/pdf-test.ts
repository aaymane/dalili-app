import { jpegInfo, jpegsToPdf } from '../pdf';

// Le plus petit JPEG : 1 × 1 pixel, niveaux de gris (SOF2).
const TINY = Uint8Array.from(
  atob('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='),
  (ch) => ch.charCodeAt(0),
);

/** Un faux JPEG couleur de `w` × `h` : juste l'en-tête que lit `jpegInfo`. */
function fakeJpeg(w: number, h: number) {
  return Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 0xff, w >> 8, w & 0xff, 0x03, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xd9]);
}

const text = (b: Uint8Array) => Array.from(b, (x) => String.fromCharCode(x)).join('');

describe('PDF des scans', () => {
  it('lit la taille et les couleurs d’un JPEG', () => {
    expect(jpegInfo(TINY)).toEqual({ width: 1, height: 1, components: 1 });
    expect(jpegInfo(fakeJpeg(1600, 2263))).toEqual({ width: 1600, height: 2263, components: 3 });
  });

  it('refuse ce qui n’est pas un JPEG', () => {
    expect(() => jpegInfo(Uint8Array.from([0x25, 0x50, 0x44, 0x46]))).toThrow();
    expect(() => jpegsToPdf([])).toThrow();
  });

  it('une page par photo, à la largeur A4, et une table des objets juste', () => {
    const pdf = jpegsToPdf([fakeJpeg(1600, 2263), TINY, fakeJpeg(800, 400)]);
    const s = text(pdf);
    expect(s.startsWith('%PDF-1.4\n')).toBe(true);
    expect(s.endsWith('%%EOF\n')).toBe(true);
    expect(s).toContain('/Count 3');
    expect(s).toContain('/MediaBox [0 0 595.28 841.95]');
    expect(s).toContain('/MediaBox [0 0 595.28 297.64]');
    expect(s).toContain('/ColorSpace /DeviceGray');
    // Aucune métadonnée.
    expect(s).not.toMatch(/\/(Info|Producer|Author|CreationDate)/);

    // Chaque entrée de la table pointe sur le début de son objet.
    const startxref = Number(s.match(/startxref\n(\d+)\n/)![1]);
    expect(s.slice(startxref, startxref + 4)).toBe('xref');
    const entries = s.slice(startxref).split('\n').slice(3, 3 + 11);
    entries.forEach((line, i) => {
      expect(line).toHaveLength(19); // 20 octets avec le saut de ligne
      const offset = Number(line.slice(0, 10));
      expect(s.slice(offset, offset + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`);
    });

    // La longueur annoncée de chaque image est celle du JPEG.
    expect(s).toContain(`/Length ${TINY.length} >>\nstream\n`);
  });
});
