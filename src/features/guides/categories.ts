/**
 * Catégories d'affichage des guides dans l'app, déduites de la catégorie du guide sur le site.
 */
export type GuideCategory = 'visa' | 'logement' | 'argent' | 'sante' | 'etudes' | 'vie';

/** `soft` : fond pastel en clair ; `softDark` : la même teinte, sombre (mode sombre). Voir `softOf`. */
export const categories: Record<GuideCategory, { label: string; color: string; soft: string; softDark: string; emoji: string }> = {
  visa: { label: 'Visa & séjour', color: '#014DF8', soft: '#E6EEFF', softDark: '#15244F', emoji: '🛂' },
  logement: { label: 'Logement', color: '#EA580C', soft: '#FDEDE3', softDark: '#3A1F12', emoji: '🏠' },
  argent: { label: 'Argent & aides', color: '#16A34A', soft: '#E5F6EC', softDark: '#0F2C1C', emoji: '💶' },
  sante: { label: 'Santé', color: '#E5484D', soft: '#FDE8E8', softDark: '#3A161A', emoji: '🩺' },
  etudes: { label: 'Études', color: '#7A5AF8', soft: '#EFE9FF', softDark: '#221F52', emoji: '🎓' },
  vie: { label: 'Vie en France', color: '#0EA5E9', soft: '#E0F4FD', softDark: '#0E2A3A', emoji: '🇫🇷' },
};

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
