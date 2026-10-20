import { useContent } from '@/data/hooks';
import { useJourney } from '@/features/journey/store';
import { useProfile } from '@/features/profile/store';

/**
 * Brief du jour : déterministe, jamais généré par l'IA (docs/VISION.md §8.1).
 * L'étape vient du parcours, la phrase est rédigée par l'équipe dans journey.json.
 * Gratuit, instantané, disponible hors ligne, sans risque d'inventer un fait.
 */
export function useBrief() {
  const profile = useProfile((s) => s.profile);
  const j = useJourney();
  const { data: manifest } = useContent('manifest');
  const current = j.current;
  const firstName = profile.firstName.trim();
  const hello = firstName ? `Salut ${firstName}.` : 'Salut.';

  if (!current) {
    return { hello, lead: 'Tout ton parcours est coché.', sentence: 'Bravo, tu y es arrivé·e. Je reste là si une question te vient.', step: null, source: null };
  }
  const lead =
    j.doneCount === 0 ? 'On commence ensemble. Une étape à la fois.' : `${j.doneCount} étape${j.doneCount > 1 ? 's' : ''} déjà faite${j.doneCount > 1 ? 's' : ''}. On continue.`;
  const step = current.step;
  const sentence = (step.brief ?? step.oneLiner).replace('{minutes}', String(step.minutes));
  const guide = manifest.guides.find((g) => g.slug === step.guides[0]);
  return { hello, lead, sentence, step, source: guide ? { slug: guide.slug, title: guide.title } : null };
}
