import { callIsOpen } from '../window';

describe('salle d’appel : 15 min avant, 2 h après (comme le site)', () => {
  const start = new Date('2026-11-02T18:00:00Z');
  const at = (iso: string) => jest.setSystemTime(new Date(iso));

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('fermée 16 minutes avant', () => {
    at('2026-11-02T17:44:00Z');
    expect(callIsOpen(start.toISOString())).toBe(false);
  });

  it('ouverte 15 minutes avant, à l’heure, et jusqu’à 2 h après', () => {
    for (const t of ['2026-11-02T17:45:00Z', '2026-11-02T18:00:00Z', '2026-11-02T20:00:00Z']) {
      at(t);
      expect(callIsOpen(start.toISOString())).toBe(true);
    }
  });

  it('fermée après 2 h', () => {
    at('2026-11-02T20:00:01Z');
    expect(callIsOpen(start.toISOString())).toBe(false);
  });
});
