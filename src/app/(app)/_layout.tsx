import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { useEffect } from 'react';

import { useJourney, useJourneyStore } from '@/features/journey/store';
import { AnalyticsConsentSheet, useAnalyticsTracking } from '@/features/profile/components/AnalyticsConsent';
import { openFromNotification, registerPush } from '@/features/notifications/push';
import { cancelReminders, planReminders, syncReminders } from '@/features/notifications/reminders';
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
 * Notifications : le téléphone est inscrit dès que le compte est connecté et a dit oui,
 * et toucher une alerte (app ouverte ou lancée par elle) ouvre le bon écran.
 */
function usePushNotifications() {
  const enabled = useProfile((s) => s.profile.notificationsEnabled);
  useEffect(() => {
    if (enabled) void registerPush();
  }, [enabled]);
  useEffect(() => {
    openFromNotification(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(openFromNotification);
    return () => sub.remove();
  }, []);
}

/**
 * Rappels d'échéances (7 jours avant et la veille), replanifiés quand le parcours, la date d'arrivée ou la langue
 * changent, annulés quand les rappels sont coupés. Seulement pour un compte étudiant : un mentor n'a pas de parcours.
 */
function useDeadlineReminders() {
  const enabled = useProfile((s) => s.profile.notificationsEnabled && s.profile.roles.includes('student'));
  const { all } = useJourney();
  const language = useCurrentLanguage();
  const list = enabled ? planReminders(all) : null;
  // La liste change de forme à chaque rendu : on suit son contenu, pas l'objet.
  const key = list ? `${language}|${list.map((r) => `${r.id}@${r.date.getTime()}|${r.title}`).join(';')}` : 'off';
  useEffect(() => {
    if (list) void syncReminders(list);
    else void cancelReminders();
    // `list` est décrit par `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

export default function AppLayout() {
  const { c } = useTheme();
  useTicketUnlock();
  usePushNotifications();
  useDeadlineReminders();
  useAnalyticsTracking();
  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="etape/[id]"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetCornerRadius: 30, sheetGrabberVisible: true, contentStyle: { backgroundColor: c.card } }}
        />
        <Stack.Screen
          name="role"
          options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', sheetCornerRadius: 30, sheetGrabberVisible: true, contentStyle: { backgroundColor: c.card } }}
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
