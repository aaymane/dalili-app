import { useQuery } from '@tanstack/react-query';

import { useMentors, useMyBookings } from '@/data/hooks';
import { useMentorRequests } from '@/features/mentors/hooks';
import { useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';

import { requestCall } from './api';

/** L'accès à la salle, demandé une fois à l'ouverture de l'écran (jamais relu en fond : ce serait rejoindre à nouveau). */
export function useCallAccess(bookingId: string) {
  return useQuery({
    queryKey: ['call', bookingId],
    queryFn: () => requestCall(bookingId),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/** L'autre personne du rendez-vous, d'après ce que l'app sait déjà (avant que la salle réponde). */
export function useCallPeer(bookingId: string) {
  const t = useT();
  const role = useProfile((s) => s.profile.activeRole);
  const bookings = useMyBookings().data;
  const { data: mentors = [] } = useMentors();
  const { data: requests = [] } = useMentorRequests();
  if (role === 'mentor') {
    const r = requests.find((x) => x.id === bookingId);
    return { name: r?.student ?? t('call.yourStudent'), color: undefined, topic: r?.topic, mentorId: undefined };
  }
  const booking = bookings.find((b) => b.id === bookingId);
  // Mode démo sans rendez-vous enregistré : le premier mentor d'exemple, pour que l'aperçu ait un visage.
  const m = mentors.find((x) => x.id === booking?.mentorId) ?? (booking ? undefined : mentors[0]);
  return { name: m ? m.firstName : t('call.yourMentor'), color: m?.avatarColor, topic: booking?.topic, mentorId: m?.id };
}
