import * as Notifications from 'expo-notifications';

import type { JourneyItem } from '@/features/journey/store';
import type { Step } from '@/features/journey/steps';

import { cancelCallReminders, cancelReminders, planCallReminders, planReminders, syncCallReminders, syncReminders } from '../reminders';

const NOW = new Date(2026, 9, 29, 12, 0);
const day = (d: number) => new Date(2026, 9, 29 + d);
const official = (id: string, inDays: number, done = false): JourneyItem => ({
  kind: 'official',
  step: { id, title: id.toUpperCase() } as Step,
  date: day(inDays),
  done,
  current: false,
});

describe('rappels d’échéances', () => {
  it('7 jours avant et la veille, à 10 h, du plus proche au plus lointain', () => {
    const list = planReminders([official('caf', 30), official('cvec', 10)], NOW);
    expect(list.map((r) => r.id)).toEqual(['reminder:cvec:7', 'reminder:cvec:1', 'reminder:caf:7', 'reminder:caf:1']);
    expect(list[0].date).toEqual(new Date(2026, 10, 1, 10, 0));
    expect(list[0].title).toBe('Dans 7 jours : CVEC');
    expect(list[1].title).toBe('Demain : CVEC');
    expect(list[0].url).toBe('/(app)/etape/cvec');
  });

  it('rien pour une étape faite, rien dans le passé', () => {
    const list = planReminders([official('visa', 20, true), official('cvec', 3), official('caf', -2)], NOW);
    expect(list.map((r) => r.id)).toEqual(['reminder:cvec:1']);
  });

  it('une tâche perso ouvre le parcours', () => {
    const custom: JourneyItem = { kind: 'custom', custom: { id: 'custom-1', title: 'Banque', date: '', done: false }, date: day(5), done: false, current: false };
    expect(planReminders([custom], NOW)[0]).toMatchObject({ id: 'reminder:custom-1:1', url: '/(app)/parcours' });
  });

  it('au plus 50 rappels (iOS en garde 64 : la place restante est pour les appels)', () => {
    const many = Array.from({ length: 50 }, (_, i) => official(`s${i}`, 10 + i));
    expect(planReminders(many, NOW)).toHaveLength(50);
  });

  it('sans autorisation, rien n’est planifié ; avec, la liste remplace les anciens rappels et seulement eux', async () => {
    const n = jest.mocked(Notifications);
    const list = planReminders([official('cvec', 10)], NOW);
    await syncReminders(list);
    expect(n.scheduleNotificationAsync).not.toHaveBeenCalled();

    n.getPermissionsAsync.mockResolvedValue({ granted: true } as never);
    n.getAllScheduledNotificationsAsync.mockResolvedValue([{ identifier: 'reminder:old:7' }, { identifier: 'autre' }] as never);
    await syncReminders(list);
    expect(n.cancelScheduledNotificationAsync).toHaveBeenCalledWith('reminder:old:7');
    expect(n.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('autre');
    expect(n.scheduleNotificationAsync).toHaveBeenCalledTimes(2);

    // Même liste : rien ne bouge. Rappels coupés : tout part.
    await syncReminders(list);
    expect(n.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    n.cancelScheduledNotificationAsync.mockClear();
    await cancelReminders();
    expect(n.cancelScheduledNotificationAsync).toHaveBeenCalledWith('reminder:old:7');
  });
});

describe('rappels d’appel', () => {
  const inHours = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();

  it('1 heure et 10 minutes avant, côté étudiant : ouvrent « Mes rendez-vous »', () => {
    const list = planCallReminders([{ id: 'b1', startsAt: inHours(3), topic: 'Visa' }], 'student', NOW);
    expect(list.map((r) => r.id)).toEqual(['call:b1:60', 'call:b1:10']);
    expect(list[0].date).toEqual(new Date(NOW.getTime() + 2 * 3_600_000));
    expect(list[0]).toMatchObject({ title: 'Ton appel est dans 1 heure', body: '« Visa ». Ton mentor ouvre le salon : tu recevras une alerte.', url: '/(app)/rendez-vous', role: 'student' });
    expect(list[1].title).toBe('Ton appel commence dans 10 minutes');
  });

  it('côté mentor : le prénom de l’étudiant, l’Agenda, et rien de passé', () => {
    const list = planCallReminders(
      [
        { id: 'b2', startsAt: inHours(0.5), topic: 'Logement', with: 'Aymen A.' },
        { id: 'b3', startsAt: inHours(-1), topic: 'CAF', with: 'Salma B.' },
      ],
      'mentor',
      NOW,
    );
    expect(list.map((r) => r.id)).toEqual(['call:b2:10']);
    expect(list[0]).toMatchObject({ title: 'Appel avec Aymen A. dans 10 minutes', url: '/(app)/(tabs)/agenda', role: 'mentor' });
    expect(planCallReminders([{ id: 'b4', startsAt: inHours(2), topic: 'CAF', with: null }], 'mentor', NOW)[0].title).toBe('Appel avec un·e étudiant·e dans 1 heure');
  });

  it('planifier les appels ne touche pas aux rappels d’échéance (et inversement)', async () => {
    const n = jest.mocked(Notifications);
    n.getPermissionsAsync.mockResolvedValue({ granted: true } as never);
    n.getAllScheduledNotificationsAsync.mockResolvedValue([{ identifier: 'reminder:cvec:7' }, { identifier: 'call:old:60' }] as never);
    n.cancelScheduledNotificationAsync.mockClear();
    n.scheduleNotificationAsync.mockClear();

    await syncCallReminders(planCallReminders([{ id: 'b1', startsAt: inHours(3), topic: 'Visa' }], 'student', NOW));
    expect(n.cancelScheduledNotificationAsync).toHaveBeenCalledWith('call:old:60');
    expect(n.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('reminder:cvec:7');
    expect(n.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(n.scheduleNotificationAsync.mock.calls[0][0]).toMatchObject({ content: { data: { url: '/(app)/rendez-vous', role: 'student' } } });

    n.cancelScheduledNotificationAsync.mockClear();
    await cancelReminders();
    expect(n.cancelScheduledNotificationAsync).toHaveBeenCalledWith('reminder:cvec:7');
    expect(n.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('call:old:60');
    n.cancelScheduledNotificationAsync.mockClear();
    await cancelCallReminders();
    expect(n.cancelScheduledNotificationAsync).toHaveBeenCalledWith('call:old:60');
  });
});
