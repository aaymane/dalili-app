import { useGuide } from '@/data/hooks';
import { useJourney } from '@/features/journey/store';
import { useCurrentLanguage, useT } from '@/i18n';


/**
 * 3 questions à proposer : celles de la FAQ du guide de ton étape en cours.
 * Elles viennent du site et sont indexées telles quelles : le cerveau y répond à coup sûr.
 */
export function useSuggestions(): string[] {
  const j = useJourney();
  const slug = j.current?.step.guides[0];
  const { data: guide } = useGuide(slug);
  const t = useT();
  const fromGuide = (guide?.faq ?? []).map((f) => f.question).filter((q) => q.length <= 90);
  // Les questions de la FAQ sont en français (le site) : dans une autre langue, on propose les questions générales traduites.
  const language = useCurrentLanguage();
  const general = [t('ai.general1'), t('ai.general2'), t('ai.general3')];
  return [...(language === 'fr' ? fromGuide : []), ...general].slice(0, 3);
}
