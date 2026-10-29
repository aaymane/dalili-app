import type { School } from '../api';
import { slidesOf } from '../story';
import { formatFigure, parseFigure } from '../components/Motion';

const school: School = {
  id: 's1',
  slug: 'ecole-test',
  name: 'École Test',
  city: 'Nantes',
  tagline: 'Une école pour tester',
  description: 'Un campus de 2 200 m². Des formations en alternance.',
  address: null,
  transport: [],
  website: null,
  logoUrl: null,
  coverUrl: 'https://dalili.study/c.jpg',
  photos: ['https://dalili.study/1.jpg', 'https://dalili.study/2.jpg'],
  photoCredit: null,
  programs: [
    { name: 'Bachelor A', level: 'Bac+3', format: 'Alternance' },
    { name: 'Mastère B', level: 'Bac+5', format: 'Alternance' },
  ],
  facts: [
    { value: '92,4 %', label: 'en alternance' },
    { value: '1 080', label: 'entreprises' },
  ],
  checkedOn: '2026-10-29',
};

describe('présentation « Découvrir en 30 s »', () => {
  it('construit bienvenue, campus, un chiffre par page, formations, puis l’appel à agir', () => {
    const slides = slidesOf(school);
    expect(slides.map((s) => s.kicker)).toEqual(['Bienvenue à', 'Nantes', 'En chiffres', 'En chiffres', 'Les formations', 'Et toi ?']);
    expect(slides[0].title).toBe('École Test');
    expect(slides[1].text).toBe('Un campus de 2 200 m².');
    expect(slides[2].big).toBe('92,4 %');
    expect(slides[4].chips).toEqual(['Bac+3 · Bachelor A', 'Bac+5 · Mastère B']);
    expect(slides[slides.length - 1].cta).toBe(true);
  });

  it('commence par la couverture et réutilise les photos quand il y a plus de pages', () => {
    const photos = slidesOf(school).map((s) => s.photo);
    expect(photos[0]).toBe(school.coverUrl);
    expect(photos.every(Boolean)).toBe(true);
  });

  it('marche sans photo, sans description ni formation', () => {
    const slides = slidesOf({ ...school, coverUrl: null, photos: [], description: null, programs: [], facts: [] });
    expect(slides.map((s) => s.kicker)).toEqual(['Bienvenue à', 'Et toi ?']);
    expect(slides.every((s) => s.photo === undefined)).toBe(true);
  });
});

describe('chiffres qui comptent', () => {
  it('lit les chiffres de la fiche', () => {
    expect(parseFigure('92,4 %')).toEqual({ target: 92.4, decimals: 1, suffix: ' %' });
    expect(parseFigure('82 %')).toEqual({ target: 82, decimals: 0, suffix: ' %' });
    expect(parseFigure('1 080')).toEqual({ target: 1080, decimals: 0, suffix: '' });
    expect(parseFigure('2 200 m²')).toEqual({ target: 2200, decimals: 0, suffix: ' m²' });
  });

  it('laisse tel quel ce qui ne se compte pas', () => {
    expect(parseFigure('Top 3')).toBeNull();
  });

  it('écrit les nombres à la française, avec une espace simple', () => {
    expect(formatFigure(92.4, 1)).toBe('92,4');
    expect(formatFigure(1080, 0)).toBe('1 080');
  });
});
