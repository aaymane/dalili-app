/** La salle ouvre 15 minutes avant l'heure. */
export const CALL_OPENS_BEFORE_MS = 15 * 60_000;
/**
 * Elle ferme 45 minutes après l'heure (appel de 30 minutes + 15 de marge), ou dès que le mentor termine l'appel.
 * Mêmes règles que le site (lib/call.ts) et la base (20261030240000_fin_d_appel.sql).
 */
export const CALL_CLOSES_AFTER_MS = 45 * 60_000;

export function callIsOpen(startsAt: string) {
  const start = new Date(startsAt).getTime();
  const now = Date.now();
  return now >= start - CALL_OPENS_BEFORE_MS && now <= start + CALL_CLOSES_AFTER_MS;
}
