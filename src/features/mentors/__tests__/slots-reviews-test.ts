import { useLocalDb } from '@/data/local-db';

import { fetchBusyTimes, fetchMentorSlots, fetchMyReviewedBookings, saveMySlots, sendReview } from '../api';

// Mode démo (pas de clés Supabase en test) : créneaux, demandes et avis vivent sur le téléphone.
describe('créneaux et avis (démo)', () => {
  beforeEach(() => useLocalDb.getState().reset());

  it('le mentor enregistre ses créneaux ; les mentors d’exemple en ont déjà', async () => {
    expect(await fetchMentorSlots('m-moi')).toEqual([]);
    await saveMySlots([{ weekday: 1, startTime: '18:00' }]);
    expect(await fetchMentorSlots('m-moi')).toEqual([{ weekday: 1, startTime: '18:00' }]);
    expect((await fetchMentorSlots('m1')).length).toBeGreaterThan(0);
  });

  it('les heures déjà demandées sont prises, pas celles annulées', async () => {
    const at = '2026-11-16T17:00:00.000Z';
    useLocalDb.getState().addBooking({ id: 'b1', mentorId: 'm1', startsAt: at, topic: 'Visa', status: 'pending' });
    useLocalDb.getState().addBooking({ id: 'b2', mentorId: 'm1', startsAt: '2026-11-18T11:30:00.000Z', topic: 'CAF', status: 'cancelled' });
    expect(await fetchBusyTimes('m1')).toEqual([at]);
  });

  it('un appel noté le reste', async () => {
    await sendReview({ bookingId: 'b1', mentorId: 'm1', rating: 5, comment: 'Top' });
    expect(await fetchMyReviewedBookings()).toEqual(['b1']);
  });
});
