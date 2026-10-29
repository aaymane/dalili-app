import { daysFromToday, formatTime, isSameDay, relativeDays, toISODate } from '../date';

describe('dates', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 29, 10, 0));
  });
  afterEach(() => jest.useRealTimers());

  it('compte les jours depuis aujourd’hui, en jours entiers', () => {
    expect(daysFromToday(new Date(2026, 9, 29, 23, 59))).toBe(0);
    expect(daysFromToday(new Date(2026, 9, 30, 0, 1))).toBe(1);
    expect(daysFromToday(new Date(2026, 9, 26))).toBe(-3);
  });

  it('dit « aujourd’hui », « demain », « hier », « dans N jours », « il y a N jours »', () => {
    expect(relativeDays(new Date(2026, 9, 29))).toBe("aujourd'hui");
    expect(relativeDays(new Date(2026, 9, 30))).toBe('demain');
    expect(relativeDays(new Date(2026, 9, 28))).toBe('hier');
    expect(relativeDays(new Date(2026, 10, 8))).toBe('dans 10 jours');
    expect(relativeDays(new Date(2026, 9, 26))).toBe('il y a 3 jours');
  });

  it('écrit l’heure à la française', () => {
    expect(formatTime(new Date(2026, 9, 29, 9, 5))).toBe('09h05');
  });

  it('compare les jours et écrit une date ISO', () => {
    expect(isSameDay(new Date(2026, 9, 29, 1), new Date(2026, 9, 29, 23))).toBe(true);
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
