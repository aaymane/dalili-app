import type { Role } from '@/theme/tokens';

export type Country = 'MA' | 'DZ' | 'TN' | 'other';
export type Gender = 'male' | 'female' | 'other';
export type Situation = 'abroad' | 'in_france';
export type StudyLevel = 'bac' | 'licence' | 'master' | 'doctorat';
export type CampusStatus = 'not_started' | 'in_progress' | 'accepted' | 'enrolled';
export type HousingStatus = 'none' | 'searching' | 'found';
export type Concern = 'visa' | 'housing' | 'money' | 'loneliness' | 'health' | 'admin' | 'job' | 'language';
export type HelpChoice = 'mentor' | 'host';

export type Profile = {
  firstName: string;
  lastName: string;
  email: string;
  gender: Gender | null;
  country: Country | null;
  originCity: string;
  birthDate: string | null; // ISO yyyy-mm-dd
  avatarUri: string | null;

  situation: Situation | null;
  studyLevel: StudyLevel | null;
  campusStatus: CampusStatus | null;
  /** `null` = « je ne sais pas encore ». */
  destinationCity: string | null;
  /** `null` = « je ne sais pas encore » → on utilise la rentrée de septembre. */
  arrivalDate: string | null;
  housing: HousingStatus | null;
  concerns: Concern[];

  roles: Role[];
  activeRole: Role;
  mentorCity: string | null;
  notificationsEnabled: boolean;
};

export const emptyProfile: Profile = {
  firstName: '',
  lastName: '',
  email: '',
  gender: null,
  country: null,
  originCity: '',
  birthDate: null,
  avatarUri: null,
  situation: null,
  studyLevel: null,
  campusStatus: null,
  destinationCity: null,
  arrivalDate: null,
  housing: null,
  concerns: [],
  roles: ['student'],
  activeRole: 'student',
  mentorCity: null,
  notificationsEnabled: false,
};

export const countries: { id: Country; label: string; flag: string; city: string }[] = [
  { id: 'MA', label: 'Maroc', flag: '🇲🇦', city: 'Casablanca' },
  { id: 'DZ', label: 'Algérie', flag: '🇩🇿', city: 'Alger' },
  { id: 'TN', label: 'Tunisie', flag: '🇹🇳', city: 'Tunis' },
  { id: 'other', label: 'Autre pays', flag: '🌍', city: 'chez toi' },
];

export const concernLabels: Record<Concern, { label: string; emoji: string }> = {
  visa: { label: 'Le visa', emoji: '🛂' },
  housing: { label: 'Trouver un logement', emoji: '🏠' },
  money: { label: "L'argent & le budget", emoji: '💶' },
  loneliness: { label: 'Être seul·e', emoji: '🫂' },
  health: { label: 'La santé', emoji: '🩺' },
  admin: { label: 'La paperasse', emoji: '🗂️' },
  job: { label: 'Trouver un job', emoji: '💼' },
  language: { label: 'Le français', emoji: '🗣️' },
};

export const studyLevelLabels: Record<StudyLevel, string> = {
  bac: 'Bac — 1ʳᵉ année',
  licence: 'Licence (L1 · L2 · L3)',
  master: 'Master (M1 · M2)',
  doctorat: 'Doctorat / Recherche',
};

export const campusStatusLabels: Record<CampusStatus, string> = {
  not_started: 'Pas encore commencé',
  in_progress: 'Dossier en cours',
  accepted: 'Dossier accepté',
  enrolled: 'Inscrit à l’université',
};

export const housingLabels: Record<HousingStatus, string> = {
  none: 'Pas encore cherché',
  searching: 'Je cherche',
  found: 'C’est réglé',
};
