import { useProfile } from '@/features/profile/store';
import { daysFromToday, formatDayMonth } from '@/lib/date';

import type { TicketData } from './components/Ticket';
import { visaDone } from './path';
import { useJourney } from './store';

/** Le billet reste « Bienvenue à … » en haut de l'accueil pendant une semaine après l'arrivée. */
const WELCOME_DAYS = 7;

/**
 * Le billet (docs/VISION.md §3) : verrouillé tant que le visa n'est pas validé, puis compte à rebours,
 * puis « Bienvenue à … » le jour J. `onHome` dit s'il trône en haut de l'accueil.
 */
export function useTicket() {
  const profile = useProfile((s) => s.profile);
  const j = useJourney();
  const days = daysFromToday(j.arrival);
  const unlocked = visaDone(j.all);
  const data: TicketData = {
    from: profile.originCity || 'Chez toi',
    to: profile.destinationCity ?? 'France',
    days,
    dateKnown: profile.arrivalDate != null,
    passenger: [profile.firstName, profile.lastName?.charAt(0) ? `${profile.lastName.charAt(0)}.` : ''].filter(Boolean).join(' ') || 'Toi',
    date: formatDayMonth(j.arrival),
  };
  return { unlocked, data, onHome: unlocked && days >= -WELCOME_DAYS };
}
