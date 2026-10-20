import { useGuide } from '@/data/hooks';
import { useJourney } from '@/features/journey/store';

const GENERAL = ['Combien d’argent faut-il prouver pour le visa ?', 'Comment demander un logement CROUS ?', 'C’est quoi la CVEC ?'];

/**
 * 3 questions à proposer : celles de la FAQ du guide de ton étape en cours.
 * Elles viennent du site et sont indexées telles quelles : le cerveau y répond à coup sûr.
 */
export function useSuggestions(): string[] {
  const j = useJourney();
  const slug = j.current?.step.guides[0];
  const { data: guide } = useGuide(slug);
  const fromGuide = (guide?.faq ?? []).map((f) => f.question).filter((q) => q.length <= 90);
  return [...fromGuide, ...GENERAL].slice(0, 3);
}
