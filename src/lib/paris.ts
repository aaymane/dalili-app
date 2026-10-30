/**
 * Heure de Paris : les créneaux des mentors sont des horaires de Paris (« le lundi à 18 h »). L'étudiant, au Maroc ou
 * ailleurs, les voit à son heure. On passe par Intl (fuseau Europe/Paris), changements d'heure compris.
 */
const FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Paris',
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
});
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Ce qu'affiche une horloge de Paris à cet instant. weekday : 0 = dimanche. */
export function parisParts(d: Date) {
  const p = Object.fromEntries(FMT.formatToParts(d).map((x) => [x.type, x.value]));
  return { year: +p.year, month: +p.month, day: +p.day, hour: +p.hour % 24, minute: +p.minute, weekday: WEEKDAYS.indexOf(p.weekday) };
}

/** L'instant où l'horloge de Paris affiche cette date et cette heure. */
export function fromParis(year: number, month: number, day: number, hour: number, minute: number) {
  const wanted = Date.UTC(year, month - 1, day, hour, minute);
  let guess = wanted;
  // Deux passes suffisent : la première trouve le décalage (1 ou 2 h), la seconde corrige autour d'un changement d'heure.
  for (let i = 0; i < 2; i++) {
    const p = parisParts(new Date(guess));
    guess -= Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - wanted;
  }
  return new Date(guess);
}

export type WeeklySlot = { weekday: number; startTime: string };

/** Les prochains rendez-vous possibles d'après des créneaux hebdomadaires, sur `days` jours, au plus tôt dans 1 heure. */
export function upcomingSlots(slots: WeeklySlot[], days = 14, now = new Date()) {
  const out: Date[] = [];
  const today = parisParts(now);
  for (let i = 0; i < days; i++) {
    // Midi évite tout souci de changement d'heure pour trouver le jour.
    const noon = fromParis(today.year, today.month, today.day + i, 12, 0);
    const d = parisParts(noon);
    for (const s of slots) {
      if (s.weekday !== d.weekday) continue;
      const [h, m] = s.startTime.split(':').map(Number);
      const at = fromParis(d.year, d.month, d.day, h, m);
      if (at.getTime() > now.getTime() + 3_600_000) out.push(at);
    }
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
}
