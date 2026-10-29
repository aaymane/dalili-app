import { create } from 'zustand';

import type { School } from './api';

/** Une page de la présentation. `big` : un chiffre qui compte ; `cta` : la dernière, « Je suis intéressé·e ». */
export type Slide = { photo?: string; kicker: string; title?: string; big?: string; text?: string | null; chips?: string[]; cta?: boolean };

/**
 * La présentation d'une école, construite à partir de sa fiche (rien d'écrit en dur par école) :
 * bienvenue, le campus, un chiffre par page, les formations, puis « Cette école t'attire ? ».
 */
export function slidesOf(s: School): Slide[] {
  const pics = [s.coverUrl, ...s.photos].filter((u): u is string => !!u);
  const pic = (i: number) => (pics.length ? pics[i % pics.length] : undefined);
  const campus = s.description ? `${s.description.split('. ')[0].replace(/\.$/, '')}.` : null;
  const slides: Slide[] = [{ photo: pic(0), kicker: 'Bienvenue à', title: s.name, text: s.tagline }];
  if (campus) slides.push({ photo: pic(1), kicker: s.city, title: 'Le campus', text: campus });
  s.facts.forEach((f, i) => slides.push({ photo: pic(2 + i), kicker: 'En chiffres', big: f.value, text: f.label }));
  if (s.programs.length) {
    slides.push({
      photo: pic(2 + s.facts.length),
      kicker: 'Les formations',
      title: `${s.programs.length} formations`,
      chips: s.programs.map((p) => `${p.level} · ${p.name}`),
    });
  }
  slides.push({
    photo: pic(3 + s.facts.length),
    kicker: 'Et toi ?',
    title: 'Cette école t’attire ?',
    text: 'Dis-nous ce qui te plaît : l’équipe DALILI te recontacte pour t’aider à y voir clair.',
    cta: true,
  });
  return slides;
}

/** Le bouton final de la présentation demande à la fiche d'ouvrir « Je suis intéressé·e » une fois refermée. */
export const useStoryCta = create<{ slug: string | null; request: (slug: string) => void; clear: () => void }>((set) => ({
  slug: null,
  request: (slug) => set({ slug }),
  clear: () => set({ slug: null }),
}));
