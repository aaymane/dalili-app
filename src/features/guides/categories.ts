/**
 * Catégories d'affichage des guides dans l'app, déduites de la catégorie du guide sur le site.
 */
export type GuideCategory = 'visa' | 'logement' | 'argent' | 'sante' | 'etudes' | 'vie';

export const categories: Record<GuideCategory, { label: string; color: string; soft: string; emoji: string }> = {
  visa: { label: 'Visa & séjour', color: '#014DF8', soft: '#E6EEFF', emoji: '🛂' },
  logement: { label: 'Logement', color: '#EA580C', soft: '#FDEDE3', emoji: '🏠' },
  argent: { label: 'Argent & aides', color: '#16A34A', soft: '#E5F6EC', emoji: '💶' },
  sante: { label: 'Santé', color: '#E5484D', soft: '#FDE8E8', emoji: '🩺' },
  etudes: { label: 'Études', color: '#7A5AF8', soft: '#EFE9FF', emoji: '🎓' },
  vie: { label: 'Vie en France', color: '#0EA5E9', soft: '#E0F4FD', emoji: '🇫🇷' },
};

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
