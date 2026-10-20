const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_SHORT = ['JANV', 'FÉVR', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'];
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

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
  return `${x.getDate()} ${MONTHS[x.getMonth()]}`;
}

export function formatLong(d: Date | string) {
  const x = new Date(d);
  return `${DAYS[x.getDay()]} ${x.getDate()} ${MONTHS[x.getMonth()]}`;
}

export function monthShort(d: Date | string) {
  return MONTHS_SHORT[new Date(d).getMonth()];
}

export function monthTitle(year: number, month: number) {
  const m = MONTHS[month];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${year}`;
}

export function formatTime(d: Date | string) {
  const x = new Date(d);
  return `${String(x.getHours()).padStart(2, '0')}h${String(x.getMinutes()).padStart(2, '0')}`;
}

/** « dans 32 jours », « demain », « aujourd'hui », « il y a 3 jours ». */
export function relativeDays(d: Date | string) {
  const n = daysFromToday(d);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return 'demain';
  if (n === -1) return 'hier';
  if (n > 1) return `dans ${n} jours`;
  return `il y a ${-n} jours`;
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

/** « 2026-08-06 » → « 6 août 2026 » (date de mise à jour d'un guide). */
export function formatFullDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d === 1 ? '1er' : d} ${MONTHS[m - 1]} ${y}`;
}
