import type { Booking } from '@/data/types';

/** La salle d'appel reste ouverte 2 heures après l'heure (features/call/window.ts) : jusque-là, le rendez-vous est « à venir ». */
const CALL_END_MS = 2 * 60 * 60_000;
const CALL_OPEN_MS = 15 * 60_000;

/** pending : le mentor n'a pas répondu. live : la salle est ouverte. expired : demande restée sans réponse. */
export type AppointmentState = 'pending' | 'confirmed' | 'live' | 'done' | 'cancelled' | 'expired';

/** Ce qu'il faut pour classer un rendez-vous : une réservation de l'étudiant ou une demande reçue par le mentor. */
type Dated = Pick<Booking, 'startsAt' | 'status'>;

export function appointmentState(b: Dated, now = Date.now()): AppointmentState {
  const start = new Date(b.startsAt).getTime();
  if (b.status === 'cancelled' || b.status === 'done') return b.status;
  if (now > start + CALL_END_MS) return b.status === 'pending' ? 'expired' : 'done';
  if (b.status === 'confirmed' && now >= start - CALL_OPEN_MS) return 'live';
  return b.status;
}

/** « À venir » du plus proche au plus lointain, puis l'historique du plus récent au plus ancien. */
export function splitAppointments<T extends Dated>(list: T[], now = Date.now()) {
  const upcoming: T[] = [];
  const history: T[] = [];
  list.forEach((b) => {
    const state = appointmentState(b, now);
    (state === 'pending' || state === 'confirmed' || state === 'live' ? upcoming : history).push(b);
  });
  upcoming.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  history.sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  return { upcoming, history };
}

/** Agenda du mentor : les demandes à traiter (la plus proche d'abord), les appels acceptés à venir, puis l'historique. */
export function splitMentorAgenda<T extends Dated>(list: T[], now = Date.now()) {
  const { upcoming, history } = splitAppointments(list, now);
  return {
    toHandle: upcoming.filter((r) => appointmentState(r, now) === 'pending'),
    upcoming: upcoming.filter((r) => appointmentState(r, now) !== 'pending'),
    history,
  };
}

/**
 * La demande qui empêche d'en faire une autre (règle de la base, 20261030210000_une_demande_a_la_fois.sql) :
 * en attente et pas encore à son heure, ou acceptée et salle pas encore fermée. `undefined` : l'étudiant peut demander.
 */
export function activeBooking<T extends Dated>(list: T[], now = Date.now()) {
  return list.find((b) => {
    const start = new Date(b.startsAt).getTime();
    return (b.status === 'pending' && start > now) || (b.status === 'confirmed' && start + CALL_END_MS > now);
  });
}
