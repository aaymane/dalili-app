import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useMyBookings } from '@/data/hooks';
import { useAuth } from '@/features/auth/store';
import { useJourney, useJourneyStore } from '@/features/journey/store';
import { useMentorRequests, useMentorRoleSync } from '@/features/mentors/hooks';
import { AnalyticsConsentSheet, useAnalyticsTracking } from '@/features/profile/components/AnalyticsConsent';
import { openFromNotification, syncNotifications } from '@/features/notifications/push';
import {
  cancelCallReminders,
  cancelReminders,
  planCallReminders,
  planReminders,
  syncCallReminders,
  syncReminders,
  type CallToRemind,
  type Reminder,
} from '@/features/notifications/reminders';
import { useProfile } from '@/features/profile/store';
import { useCurrentLanguage } from '@/i18n';
import { useTheme } from '@/theme/scheme';

/** Le visa vient d'être coché : on ouvre le déblocage du billet une fois la fiche de l'étape refermée. */
function useTicketUnlock() {
  const pending = useJourneyStore((s) => s.ticketPending);
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => router.push('/(app)/billet'), 1000);
    return () => clearTimeout(t);
  }, [pending]);
}

/**
 * Notifications : à l'ouverture, à la connexion d'un compte et à chaque retour sur l'app, l'interrupteur suit
 * l'autorisation du téléphone et le téléphone est inscrit. Toucher une alerte (app ouverte ou lancée par elle)
 * ouvre le bon écran.
 */
function usePushNotifications() {
  const uid = useAuth((s) => s.user?.id);
  useEffect(() => {
    void syncNotifications();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncNotifications();
    });
    return () => sub.remove();
  }, [uid]);
  useEffect(() => {
    openFromNotification(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(openFromNotification);
    return () => sub.remove();
  }, []);
}

/**
 * Garde planifiée sur le téléphone exactement `list` (null = tout annuler). La liste change de forme à chaque
 * rendu : on suit son contenu, pas l'objet.
 */
function usePlanned(list: Reminder[] | null, sync: (l: Reminder[]) => Promise<void>, cancel: () => Promise<void>) {
  const language = useCurrentLanguage();
  const key = list ? `${language}|${list.map((r) => `${r.id}@${r.date.getTime()}|${r.title}|${r.body}`).join(';')}` : 'off';
  useEffect(() => {
    if (list) void sync(list);
    else void cancel();
    // `list` est décrit par `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

/**
 * Rappels d'échéances (7 jours avant et la veille), replanifiés quand le parcours, la date d'arrivée ou la langue
 * changent, annulés quand les notifications sont coupées. Seulement pour un compte étudiant : un mentor n'a pas de parcours.
 */
function useDeadlineReminders() {
  const enabled = useProfile((s) => s.profile.notificationsEnabled && s.profile.roles.includes('student'));
  const { all } = useJourney();
  usePlanned(enabled ? planReminders(all) : null, syncReminders, cancelReminders);
}

/**
 * Rappels d'appel (1 heure et 10 minutes avant chaque appel confirmé), pour l'étudiant comme pour le mentor.
 * Les rendez-vous sont relus à chaque retour sur l'app : un appel annulé perd ses rappels.
 */
function useCallReminders() {
  const enabled = useProfile((s) => s.profile.notificationsEnabled);
  const isMentor = useProfile((s) => s.profile.activeRole === 'mentor');
  const bookings = useMyBookings({ enabled: enabled && !isMentor });
  const requests = useMentorRequests({ enabled: enabled && isMentor });
  const confirmed: CallToRemind[] = isMentor
    ? (requests.data ?? []).filter((r) => r.status === 'confirmed').map((r) => ({ id: r.id, startsAt: r.startsAt, topic: r.topic, with: r.student }))
    : bookings.data.filter((b) => b.status === 'confirmed').map((b) => ({ id: b.id, startsAt: b.startsAt, topic: b.topic }));
  usePlanned(enabled ? planCallReminders(confirmed, isMentor ? 'mentor' : 'student') : null, syncCallReminders, cancelCallReminders);
}

export default function AppLayout() {
  const { c } = useTheme();
  useTicketUnlock();
  usePushNotifications();
  useDeadlineReminders();
  useCallReminders();
  useAnalyticsTracking();
  useMentorRoleSync();
  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="etape/[id]"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetCornerRadius: 30, sheetGrabberVisible: true, contentStyle: { backgroundColor: c.card } }}
        />
        <Stack.Screen name="appel/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="ecole/decouvrir" options={{ presentation: 'fullScreenModal', animation: 'fade', contentStyle: { backgroundColor: c.navyDeep } }} />
        {/* Écran normal (pas une modale native) : les confettis de la racine passent par-dessus. */}
        <Stack.Screen name="billet" options={{ animation: 'fade', gestureEnabled: false, contentStyle: { backgroundColor: c.navyDeep } }} />
      </Stack>
      <AnalyticsConsentSheet />
    </>
  );
}
