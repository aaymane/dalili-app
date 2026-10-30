import { fromParis, parisParts, upcomingSlots } from '../paris';

describe('heure de Paris', () => {
  it('convertit l’heure de Paris, été comme hiver', () => {
    expect(fromParis(2026, 7, 6, 18, 0).toISOString()).toBe('2026-07-06T16:00:00.000Z'); // été : UTC+2
    expect(fromParis(2026, 11, 9, 18, 0).toISOString()).toBe('2026-11-09T17:00:00.000Z'); // hiver : UTC+1
  });

  it('lit le jour et l’heure de Paris', () => {
    expect(parisParts(new Date('2026-11-09T17:30:00Z'))).toMatchObject({ weekday: 1, hour: 18, minute: 30, day: 9 });
  });

  it('donne les prochains créneaux, au plus tôt dans une heure', () => {
    // Lundi 9 novembre 2026, 17 h 30 à Paris.
    const now = new Date('2026-11-09T16:30:00Z');
    const slots = [
      { weekday: 1, startTime: '18:00' }, // dans 30 min : trop tôt
      { weekday: 1, startTime: '19:00' },
      { weekday: 3, startTime: '12:30' },
    ];
    expect(upcomingSlots(slots, 8, now).map((d) => d.toISOString())).toEqual([
      '2026-11-09T18:00:00.000Z',
      '2026-11-11T11:30:00.000Z',
      '2026-11-16T17:00:00.000Z',
      '2026-11-16T18:00:00.000Z',
    ]);
  });

  it('passe le changement d’heure d’octobre sans décaler les créneaux', () => {
    // Samedi 24 octobre 2026 midi ; l'heure d'hiver arrive dans la nuit du 24 au 25.
    const now = new Date('2026-10-24T10:00:00Z');
    const [sat, mon] = upcomingSlots([{ weekday: 6, startTime: '18:00' }, { weekday: 1, startTime: '18:00' }], 3, now);
    expect(sat.toISOString()).toBe('2026-10-24T16:00:00.000Z');
    expect(mon.toISOString()).toBe('2026-10-26T17:00:00.000Z');
  });
});
