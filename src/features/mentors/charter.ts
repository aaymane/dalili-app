import { t } from '@/i18n';

/**
 * Charte du mentor, à accepter avant d'envoyer sa fiche. Texte à faire relire par l'équipe avant la mise en ligne.
 * Changer un engagement = monter la version ici ET dans une nouvelle migration (`public.mentor_charter_version()`) :
 * la base refuse une version qu'elle ne connaît pas, et chaque mentor réaccepte la nouvelle.
 * Les textes sont dans `i18n/locales/*.json` (`mentors.charter.items`), le français fait foi.
 */
export const CHARTER_VERSION = '2026-10-24';

export const CHARTER = ['age', 'kind', 'free', 'documents', 'inApp', 'report'] as const;

/** Un engagement, dans la langue en cours. */
export const charterItem = (id: (typeof CHARTER)[number]) => ({
  title: t(`mentors.charter.items.${id}.title`),
  body: t(`mentors.charter.items.${id}.body`),
});

/** 18 ans au moins, déclarés : seule l'année est demandée. Né l'année « en cours − 18 », la case « 18 ans ou plus » fait foi. */
export function birthYearError(text: string): string | null {
  if (text.length < 4) return t('mentors.charter.yearDigits');
  const year = Number(text);
  const max = new Date().getFullYear() - 18;
  if (!Number.isInteger(year) || year < 1930 || year > new Date().getFullYear()) return t('mentors.charter.yearWrong');
  if (year > max) return t('mentors.charter.tooYoung');
  return null;
}
