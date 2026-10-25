/**
 * Charte du mentor, à accepter avant d'envoyer sa fiche. Texte à faire relire par l'équipe avant la mise en ligne.
 * Changer un engagement = monter la version ici ET dans une nouvelle migration (`public.mentor_charter_version()`) :
 * la base refuse une version qu'elle ne connaît pas, et chaque mentor réaccepte la nouvelle.
 */
export const CHARTER_VERSION = '2026-10-24';

export const CHARTER = [
  { id: 'age', title: 'J’ai 18 ans ou plus', body: 'Le mentorat est réservé aux adultes.' },
  { id: 'kind', title: 'Bienveillance', body: 'J’écoute sans juger, avec respect et patience. Chaque parcours est différent.' },
  { id: 'free', title: 'Gratuité', body: 'J’aide gratuitement. Je ne demande jamais d’argent, de cadeau ni de service en échange.' },
  {
    id: 'documents',
    title: 'Aucun document personnel',
    body: 'Je ne demande jamais de passeport, de titre de séjour, de relevé bancaire ni de mot de passe.',
  },
  {
    id: 'in-app',
    title: 'Je reste dans DALILI au début',
    body: 'Pendant les 30 premiers jours, pas de numéro, de réseau social ni de rendez-vous en dehors de l’app.',
  },
  { id: 'report', title: 'Je préviens l’équipe', body: 'Si une situation m’inquiète (détresse, danger, arnaque), je le signale tout de suite.' },
] as const;

/** 18 ans au moins, déclarés : seule l'année est demandée. Né l'année « en cours − 18 », la case « 18 ans ou plus » fait foi. */
export function birthYearError(text: string): string | null {
  if (text.length < 4) return 'Ton année de naissance, sur 4 chiffres.';
  const year = Number(text);
  const max = new Date().getFullYear() - 18;
  if (!Number.isInteger(year) || year < 1930 || year > new Date().getFullYear()) return 'Cette année ne semble pas correcte.';
  if (year > max) return 'Il faut avoir 18 ans ou plus pour être mentor.';
  return null;
}
