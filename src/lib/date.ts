import { currentLanguage, t, type Language } from '@/i18n';

// Les mois et les jours de chaque langue (arabe standard, compris dans tout le Maghreb).
const MONTHS: Record<Language, string[]> = {
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const MONTHS_SHORT: Record<Language, string[]> = {
  fr: ['JANV', 'FÉVR', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'],
  ar: MONTHS.ar,
  en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
};
const DAYS: Record<Language, string[]> = {
  fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

const months = () => MONTHS[currentLanguage()];

export const DAY_MS = 86_400_000;

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number) {
  return new Date(startOfDay(d).getTime() + n * DAY_MS);
}

/** Nombre de jours entiers entre aujourd'hui et `d` (négatif si passé). */
export function daysFromToday(d: Date | string) {
  const target = startOfDay(new Date(d)).getTime();
  return Math.round((target - startOfDay(new Date()).getTime()) / DAY_MS);
}

export function formatDayMonth(d: Date | string) {
  const x = new Date(d);
  return `${x.getDate()} ${months()[x.getMonth()]}`;
}

export function formatLong(d: Date | string) {
  const x = new Date(d);
  return `${DAYS[currentLanguage()][x.getDay()]} ${x.getDate()} ${months()[x.getMonth()]}`;
}

export function monthShort(d: Date | string) {
  return MONTHS_SHORT[currentLanguage()][new Date(d).getMonth()];
}

/** Les initiales des jours, du lundi au dimanche (en-tête du calendrier). */
export const weekInitials = () => t('dates.weekInitials').split(',');

export function monthTitle(year: number, month: number) {
  const m = months()[month];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${year}`;
}

export function formatTime(d: Date | string) {
  const x = new Date(d);
  // « 09h05 » en français, « 09:05 » ailleurs.
  const sep = currentLanguage() === 'fr' ? 'h' : ':';
  return `${String(x.getHours()).padStart(2, '0')}${sep}${String(x.getMinutes()).padStart(2, '0')}`;
}

/** « dans 32 jours », « demain », « aujourd'hui », « il y a 3 jours ». */
export function relativeDays(d: Date | string) {
  const n = daysFromToday(d);
  if (n === 0) return t('dates.today');
  if (n === 1) return t('dates.tomorrow');
  if (n === -1) return t('dates.yesterday');
  if (n > 1) return t('dates.inDays', { count: n });
  return t('dates.daysAgo', { count: -n });
}

export function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isSameDay(a: Date | string, b: Date | string) {
  return startOfDay(new Date(a)).getTime() === startOfDay(new Date(b)).getTime();
}

/** « 2026-08-06 » → « 6 août 2026 », « 6 August 2026 », « 6 أغسطس 2026 » (date de mise à jour d'un guide). */
export function formatFullDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const day = d === 1 && currentLanguage() === 'fr' ? '1er' : d;
  return `${day} ${months()[m - 1]} ${y}`;
}
