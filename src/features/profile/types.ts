import type { CountryCode } from '@/data/content';
import { t } from '@/i18n';
import type { Role } from '@/theme/tokens';

/** Les 7 pays couverts par les guides dalili.study, ou « Autre ». */
export type Country = CountryCode | 'other';
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

export const countries: { id: Country; flag: string; city: string }[] = [
  { id: 'MA', flag: '🇲🇦', city: 'Casablanca' },
  { id: 'DZ', flag: '🇩🇿', city: 'Alger' },
  { id: 'TN', flag: '🇹🇳', city: 'Tunis' },
  { id: 'SN', flag: '🇸🇳', city: 'Dakar' },
  { id: 'CI', flag: '🇨🇮', city: 'Abidjan' },
  { id: 'CM', flag: '🇨🇲', city: 'Douala' },
  { id: 'LB', flag: '🇱🇧', city: 'Beyrouth' },
  { id: 'other', flag: '🌍', city: 'chez toi' },
];

// Les libellés sont lus dans la langue en cours, au moment de l'affichage (src/i18n/locales).
export const countryLabel = (id: Country) => t(`countries.${id}`);

export const concernEmoji: Record<Concern, string> = {
  visa: '🛂',
  housing: '🏠',
  money: '💶',
  loneliness: '🫂',
  health: '🩺',
  admin: '🗂️',
  job: '💼',
  language: '🗣️',
};
export const CONCERNS = Object.keys(concernEmoji) as Concern[];
export const concernLabel = (c: Concern) => t(`concerns.${c}`);

export const STUDY_LEVELS: StudyLevel[] = ['bac', 'licence', 'master', 'doctorat'];
export const studyLevelLabel = (l: StudyLevel) => t(`studyLevels.${l}`);

export const CAMPUS_STATUSES: CampusStatus[] = ['not_started', 'in_progress', 'accepted', 'enrolled'];
export const campusStatusLabel = (s: CampusStatus) => t(`campusStatus.${s}`);

export const HOUSING_STATUSES: HousingStatus[] = ['none', 'searching', 'found'];
export const housingLabel = (h: HousingStatus) => t(`housingStatus.${h}`);
