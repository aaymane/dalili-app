/**
 * Rappels d'échéances du Parcours-quête : une notification 7 jours avant et la veille de chaque étape à faire.
 * Tout se passe sur le téléphone (notifications locales) : rien n'est envoyé, aucun compte n'est nécessaire,
 * le mode démo et Supabase se comportent pareil. Le serveur, lui, ne prévient que des demandes d'appel (push.ts).
 *
 * On replanifie tout quand la liste change (date d'arrivée, étape cochée, tâche perso, langue) ;
 * on annule tout quand les rappels sont coupés, à la déconnexion ou quand le compte change.
 */
import * as Notifications from 'expo-notifications';
import { AndroidImportance, SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

import type { JourneyItem } from '@/features/journey/store';
import { t } from '@/i18n';
import { DAY_MS, startOfDay } from '@/lib/date';

/** Préfixe de nos rappels : on ne touche jamais aux autres notifications planifiées. */
const PREFIX = 'reminder:';
const CHANNEL = 'reminders';
/** Heure d'envoi : 10 h, heure du téléphone. */
const HOUR = 10;
/** iOS garde au plus 64 notifications planifiées par app : on garde les plus proches, avec de la marge. */
const MAX = 60;
const LEADS = [7, 1] as const;

export type Reminder = { id: string; date: Date; title: string; body: string; url: string };

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
      });
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, MAX);
}

/** La dernière liste planifiée : si rien n'a changé, on ne refait rien. */
let planned = '';

const signature = (list: Reminder[]) => list.map((r) => `${r.id}@${r.date.getTime()}|${r.title}`).join(';');

async function cancelOurs() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(all.filter((n) => n.identifier.startsWith(PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

// Une opération à la fois : deux changements rapprochés ne doivent pas planifier en double.
let queue: Promise<void> = Promise.resolve();
const serial = (job: () => Promise<void>) => (queue = queue.then(job, job));

/** Remplace les rappels planifiés par `list`. Sans autorisation, il n'y a rien à faire. */
export const syncReminders = (list: Reminder[]) => serial(() => replace(list));

async function replace(list: Reminder[]) {
  if (Platform.OS === 'web') return;
  const sig = signature(list);
  if (sig === planned) return;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, { name: t('reminders.channel'), importance: AndroidImportance.HIGH });
    }
    await cancelOurs();
    for (const r of list) {
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        // Toucher le rappel ouvre l'étape, côté étudiant (voir openFromNotification).
        content: { title: r.title, body: r.body, data: { url: r.url, role: 'student' } },
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: r.date, channelId: CHANNEL },
      });
    }
    planned = sig;
  } catch {
    // Expo Go, simulateur… : pas de rappel, le reste de l'app marche. On réessaiera au prochain changement.
    planned = '';
  }
}

/** Rappels coupés, déconnexion, autre compte : plus aucun rappel sur ce téléphone. */
export const cancelReminders = () =>
  serial(async () => {
    planned = '';
    if (Platform.OS === 'web') return;
    await cancelOurs().catch(() => {});
  });
