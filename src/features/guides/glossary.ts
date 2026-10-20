/**
 * Lexique anti-jargon (« le mur du vocabulaire »).
 * Source unique : le lexique du site (glossary.json), partagé avec dalili.study.
 */
import { snapshot, type Term } from '@/data/content';
import { useContent } from '@/data/hooks';

export type { Term };

export function useGlossary(): Term[] {
  return useContent('glossary').data;
}

export const findTerm = (list: Term[], t: string) => list.find((g) => g.term.toLowerCase() === t.toLowerCase());

/** Hors composant (mode démo de l'IA) : lexique de l'instantané embarqué. */
export const snapshotGlossary = (): Term[] => snapshot.glossary;
