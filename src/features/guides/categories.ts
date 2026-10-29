import { t } from '@/i18n';

/**
 * Catégories d'affichage des guides dans l'app, déduites de la catégorie du guide sur le site.
 */
export type GuideCategory = 'visa' | 'logement' | 'argent' | 'sante' | 'etudes' | 'vie';

/** `soft` : fond pastel en clair ; `softDark` : la même teinte, sombre (mode sombre). Voir `softOf`. */
export const categories: Record<GuideCategory, { color: string; soft: string; softDark: string; emoji: string }> = {
  visa: { color: '#014DF8', soft: '#E6EEFF', softDark: '#15244F', emoji: '🛂' },
  logement: { color: '#EA580C', soft: '#FDEDE3', softDark: '#3A1F12', emoji: '🏠' },
  argent: { color: '#16A34A', soft: '#E5F6EC', softDark: '#0F2C1C', emoji: '💶' },
  sante: { color: '#E5484D', soft: '#FDE8E8', softDark: '#3A161A', emoji: '🩺' },
  etudes: { color: '#7A5AF8', soft: '#EFE9FF', softDark: '#221F52', emoji: '🎓' },
  vie: { color: '#0EA5E9', soft: '#E0F4FD', softDark: '#0E2A3A', emoji: '🇫🇷' },
};

/** Le nom d'une catégorie, dans la langue en cours. */
export const categoryLabel = (cat: GuideCategory) => t(`guideCategories.${cat}`);

/** Le fond pastel d'une catégorie dans le thème en cours. */
export const softOf = (cat: { soft: string; softDark: string }, scheme: 'light' | 'dark') => (scheme === 'dark' ? cat.softDark : cat.soft);

const FROM_SITE: Record<string, GuideCategory> = {
  Visa: 'visa',
  Démarches: 'visa',
  Logement: 'logement',
  Banque: 'argent',
  Finances: 'argent',
  Budget: 'argent',
  Santé: 'sante',
  Études: 'etudes',
  'Vie étudiante': 'vie',
  Emploi: 'vie',
};

export const categoryOf = (siteCategory: string): GuideCategory => FROM_SITE[siteCategory] ?? 'vie';
