import type { Booking } from '@/data/types';

import { activeBooking, appointmentState, splitAppointments, splitMentorAgenda } from '../appointments';

const now = new Date('2026-11-10T12:00:00Z').getTime();
const at = (minutes: number) => new Date(now + minutes * 60_000).toISOString();
const booking = (id: string, minutes: number, status: Booking['status']): Booking => ({ id, mentorId: 'm1', startsAt: at(minutes), topic: 'Visa', status });

describe('mes rendez-vous', () => {
  it('donne l’état de chaque rendez-vous', () => {
    expect(appointmentState(booking('a', 60 * 24, 'pending'), now)).toBe('pending');
    expect(appointmentState(booking('b', 60 * 24, 'confirmed'), now)).toBe('confirmed');
    expect(appointmentState(booking('c', 10, 'confirmed'), now)).toBe('live');
    expect(appointmentState(booking('d', -30, 'confirmed'), now)).toBe('live');
    expect(appointmentState(booking('d', -50, 'confirmed'), now)).toBe('done'); // salle fermée 45 min après l'heure
    expect(appointmentState(booking('e', -180, 'confirmed'), now)).toBe('done');
    expect(appointmentState(booking('f', -180, 'pending'), now)).toBe('expired');
    expect(appointmentState(booking('g', 60, 'cancelled'), now)).toBe('cancelled');
  });

  it('range à venir (le plus proche d’abord) et historique (le plus récent d’abord)', () => {
    const list = [booking('loin', 60 * 48, 'pending'), booking('vieux', -60 * 48, 'done'), booking('proche', 30, 'confirmed'), booking('hier', -60 * 24, 'cancelled')];
    const { upcoming, history } = splitAppointments(list, now);
    expect(upcoming.map((b) => b.id)).toEqual(['proche', 'loin']);
    expect(history.map((b) => b.id)).toEqual(['hier', 'vieux']);
  });

  it('agenda du mentor : à traiter, à venir, historique', () => {
    const list = [booking('demande', 60 * 24, 'pending'), booking('appel', 20, 'confirmed'), booking('vieille', -60 * 24, 'pending'), booking('fait', -60 * 48, 'done')];
    const { toHandle, upcoming, history } = splitMentorAgenda(list, now);
    expect(toHandle.map((b) => b.id)).toEqual(['demande']);
    expect(upcoming.map((b) => b.id)).toEqual(['appel']);
    expect(history.map((b) => b.id)).toEqual(['vieille', 'fait']);
  });

  it('une demande à la fois : en attente avant son heure, ou acceptée jusqu’à la fin de l’appel', () => {
    expect(activeBooking([booking('a', 60, 'pending')], now)?.id).toBe('a');
    expect(activeBooking([booking('a', -10, 'pending')], now)).toBeUndefined(); // sans réponse, elle a expiré
    expect(activeBooking([booking('b', -30, 'confirmed')], now)?.id).toBe('b'); // appel en cours
    expect(activeBooking([booking('b', -50, 'confirmed')], now)).toBeUndefined(); // salle fermée : l'étudiant redemande
    expect(activeBooking([booking('b', -10, 'done')], now)).toBeUndefined(); // terminé par le mentor
    expect(activeBooking([booking('c', 60, 'cancelled'), booking('d', -60 * 24, 'done')], now)).toBeUndefined();
  });
});
