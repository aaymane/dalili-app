import { useContent } from '@/data/hooks';
import { useJourney } from '@/features/journey/store';
import { useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';

/**
 * Brief du jour : déterministe, jamais généré par l'IA (docs/VISION.md §8.1).
 * L'étape vient du parcours, la phrase est rédigée par l'équipe dans journey.json.
 * Gratuit, instantané, disponible hors ligne, sans risque d'inventer un fait.
 */
export function useBrief() {
  const profile = useProfile((s) => s.profile);
  const t = useT();
  const j = useJourney();
  const { data: manifest } = useContent('manifest');
  const current = j.current;
  const firstName = profile.firstName.trim();
  const hello = firstName ? t('home.hello', { name: firstName }) : t('home.helloAnon');

  if (!current) {
    return { hello, lead: t('home.allDoneLead'), sentence: t('home.allDone'), step: null, source: null };
  }
  const lead =
    j.doneCount === 0 ? t('home.leadStart') : t('home.leadDone', { count: j.doneCount });
  const step = current.step;
  const sentence = (step.brief ?? step.oneLiner).replace('{minutes}', String(step.minutes));
  const guide = manifest.guides.find((g) => g.slug === step.guides[0]);
  return { hello, lead, sentence, step, source: guide ? { slug: guide.slug, title: guide.title } : null };
}
