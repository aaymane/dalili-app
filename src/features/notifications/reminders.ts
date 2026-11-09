/**
 * Rappels planifiés sur le téléphone (notifications locales) : rien n'est envoyé, aucun compte n'est nécessaire,
 * le mode démo et Supabase se comportent pareil. Les alertes venues d'ailleurs (messages, demandes, cœurs) passent
 * par le serveur (push.ts).
 *
 * - Échéances du Parcours-quête : 7 jours avant et la veille de chaque étape à faire.
 * - Appels (calls.ts) : 1 heure et 10 minutes avant chaque appel confirmé.
 *
 * Chaque famille a son préfixe : replanifier les échéances ne touche jamais aux rappels d'appel, ni aux autres
 * notifications du téléphone. On replanifie quand la liste change, on annule tout quand les notifications sont
 * coupées, à la déconnexion ou quand le compte change.
 */
import * as Notifications from 'expo-notifications';
import { AndroidImportance, SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

import type { JourneyItem } from '@/features/journey/store';
import { t } from '@/i18n';
import { DAY_MS, startOfDay } from '@/lib/date';

export type Reminder = { id: string; date: Date; title: string; body: string; url: string; role: 'student' | 'mentor' };

/** Une famille de rappels : son préfixe et son canal Android. */
function scheduler(prefix: string, channel: string, channelName: () => string) {
  /** La dernière liste planifiée : si rien n'a changé, on ne refait rien. */
  let planned = '';
  const signature = (list: Reminder[]) => list.map((r) => `${r.id}@${r.date.getTime()}|${r.title}|${r.body}`).join(';');

  async function cancelOurs() {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(all.filter((n) => n.identifier.startsWith(prefix)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  }

  // Une opération à la fois : deux changements rapprochés ne doivent pas planifier en double.
  let queue: Promise<void> = Promise.resolve();
  const serial = (job: () => Promise<void>) => (queue = queue.then(job, job));

  async function replace(list: Reminder[]) {
    if (Platform.OS === 'web') return;
    const sig = signature(list);
    if (sig === planned) return;
    try {
      const perm = await Notifications.getPermissionsAsync();
      if (!perm.granted) return;
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(channel, { name: channelName(), importance: AndroidImportance.HIGH });
      }
      await cancelOurs();
      for (const r of list) {
        await Notifications.scheduleNotificationAsync({
          identifier: r.id,
          // Toucher le rappel ouvre le bon écran, dans le bon rôle (voir openFromNotification).
          content: { title: r.title, body: r.body, data: { url: r.url, role: r.role } },
          trigger: { type: SchedulableTriggerInputTypes.DATE, date: r.date, channelId: channel },
        });
      }
      planned = sig;
    } catch {
      // Expo Go, simulateur… : pas de rappel, le reste de l'app marche. On réessaiera au prochain changement.
      planned = '';
    }
  }

  return {
    /** Remplace les rappels de cette famille par `list`. Sans autorisation, il n'y a rien à faire. */
    sync: (list: Reminder[]) => serial(() => replace(list)),
    /** Notifications coupées, déconnexion, autre compte : plus aucun rappel de cette famille. */
    cancel: () =>
      serial(async () => {
        planned = '';
        if (Platform.OS === 'web') return;
        await cancelOurs().catch(() => {});
      }),
  };
}

// ───────────── Échéances du Parcours-quête ─────────────

/** Préfixe des rappels d'échéance. */
const PREFIX = 'reminder:';
/** Heure d'envoi : 10 h, heure du téléphone. */
const HOUR = 10;
/** iOS garde au plus 64 notifications planifiées par app : 50 échéances, la place restante pour les appels. */
const MAX = 50;
const LEADS = [7, 1] as const;

/** Les rappels à planifier, du plus proche au plus lointain. Ceux dont l'heure est passée sont ignorés. */
export function planReminders(items: JourneyItem[], now = new Date()): Reminder[] {
  const out: Reminder[] = [];
  for (const item of items) {
    if (item.done) continue;
    const key = item.kind === 'official' ? item.step.id : item.custom.id;
    const title = item.kind === 'official' ? item.step.title : item.custom.title;
    const url = item.kind === 'official' ? `/(app)/etape/${item.step.id}` : '/(app)/parcours';
    for (const lead of LEADS) {
      const date = new Date(startOfDay(item.date).getTime() - lead * DAY_MS);
      date.setHours(HOUR, 0, 0, 0);
      if (date.getTime() <= now.getTime()) continue;
      out.push({
        id: `${PREFIX}${key}:${lead}`,
        date,
        title: lead === 1 ? t('reminders.tomorrowTitle', { title }) : t('reminders.weekTitle', { title }),
        body: lead === 1 ? t('reminders.tomorrowBody') : t('reminders.weekBody'),
        url,
        role: 'student',
      });
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, MAX);
}

const deadlines = scheduler(PREFIX, 'reminders', () => t('reminders.channel'));
export const syncReminders = deadlines.sync;
export const cancelReminders = deadlines.cancel;

// ───────────── Appels confirmés ─────────────

const CALL_PREFIX = 'call:';
/** 1 heure et 10 minutes avant l'heure de l'appel. */
const CALL_LEADS = [60, 10] as const;
/** Au plus 6 appels à venir (12 rappels) : avec les 50 échéances, on reste sous la limite d'iOS. */
const CALL_MAX = 12;

export type CallToRemind = { id: string; startsAt: string; topic: string; with?: string | null };

/**
 * Les rappels de tes appels confirmés. Côté étudiant, ils ouvrent « Mes rendez-vous » ; côté mentor, l'Agenda
 * (le mentor y lance l'appel quand il est prêt : un rappel ne le lance jamais à sa place).
 */
export function planCallReminders(calls: CallToRemind[], role: 'student' | 'mentor', now = new Date()): Reminder[] {
  const out: Reminder[] = [];
  for (const call of calls) {
    const start = new Date(call.startsAt).getTime();
    if (Number.isNaN(start)) continue;
    for (const lead of CALL_LEADS) {
      const date = new Date(start - lead * 60_000);
      if (date.getTime() <= now.getTime()) continue;
      const soon = lead === 10;
      const name = call.with?.trim() || t('callReminders.someone');
      out.push({
        id: `${CALL_PREFIX}${call.id}:${lead}`,
        date,
        title:
          role === 'mentor'
            ? t(soon ? 'callReminders.mentorSoonTitle' : 'callReminders.mentorHourTitle', { name })
            : t(soon ? 'callReminders.studentSoonTitle' : 'callReminders.studentHourTitle'),
        body:
          role === 'mentor'
            ? soon
              ? t('callReminders.mentorSoonBody')
              : t('callReminders.mentorHourBody', { topic: call.topic })
            : soon
              ? t('callReminders.studentSoonBody')
              : t('callReminders.studentHourBody', { topic: call.topic }),
        url: role === 'mentor' ? '/(app)/(tabs)/agenda' : '/(app)/rendez-vous',
        role,
      });
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, CALL_MAX);
}

const calls = scheduler(CALL_PREFIX, 'calls', () => t('callReminders.channel'));
export const syncCallReminders = calls.sync;
export const cancelCallReminders = calls.cancel;
