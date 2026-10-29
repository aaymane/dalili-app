/** La salle est ouverte de 15 minutes avant l'heure à 2 heures après (mêmes règles que le site, lib/call.ts). */
export function callIsOpen(startsAt: string) {
  const start = new Date(startsAt).getTime();
  const now = Date.now();
  return now >= start - 15 * 60_000 && now <= start + 2 * 60 * 60_000;
}
