import { CONCERNS, concernLabel, type Concern } from '@/features/profile/types';

/**
 * Les spécialités d'un mentor reprennent les 8 inquiétudes des étudiants (visa, logement, argent…) : on les enregistre
 * par identifiant et on les lit dans la langue de l'étudiant. Les fiches plus anciennes (texte libre) s'affichent telles quelles.
 */
export const SPECIALTIES = CONCERNS;

export const specialtyLabel = (s: string) => ((CONCERNS as string[]).includes(s) ? concernLabel(s as Concern) : s);

export const MENTOR_LANGUAGES = ['fr', 'ar', 'en', 'ber'] as const;
export type MentorLanguage = (typeof MENTOR_LANGUAGES)[number];
