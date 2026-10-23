/**
 * Notifications sur le téléphone. L'app ne fait que donner le jeton de ce téléphone (s'il a dit oui) et prévenir
 * le serveur qu'il s'est passé quelque chose : c'est le serveur du site qui vérifie et envoie (`/api/v1/notify`).
 * Le jeton n'est demandé que si les rappels sont activés (Profil › Rappels d'échéances).
 */
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { Platform } from 'react-native';

import { useProfile } from '@/features/profile/store';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

// Une alerte qui arrive pendant qu'on utilise l'app s'affiche quand même, en bannière.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** Identifiant du projet EAS : sans lui, Expo ne donne pas de jeton (à créer une fois avec `eas init`). */
const projectId = (): string | null => Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;

let current: string | null = null;

async function session() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Donne le jeton de ce téléphone au serveur, si le compte est connecté et a dit oui aux notifications. */
export async function registerPush() {
  if (Platform.OS === 'web' || !useProfile.getState().profile.notificationsEnabled) return;
  if (!(await session())) return;
  const id = projectId();
  if (!id) return;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', { name: 'DALILI', importance: AndroidImportance.HIGH });
    }
    const token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
    if (token === current) return;
    const { error } = await supabase!.rpc('register_push_token', { p_token: token, p_platform: Platform.OS });
    if (!error) current = token;
  } catch {
    // Expo Go sur Android, simulateur sans réseau… : pas de notification, le reste de l'app marche.
  }
}

/**
 * Demande l'autorisation au bon moment (après une demande d'appel, en devenant mentor, ou depuis le Profil).
 * La fenêtre du système n'apparaît qu'une fois ; ensuite, c'est Réglages.
 */
export async function askNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
    useProfile.getState().update({ notificationsEnabled: perm.granted });
    if (perm.granted) await registerPush();
    return perm.granted;
  } catch {
    return false;
  }
}

/** Déconnexion ou rappels coupés : ce téléphone ne reçoit plus rien pour ce compte. */
export async function unregisterPush() {
  if (!supabase || !current) return;
  const token = current;
  current = null;
  await supabase.from('push_tokens').delete().eq('token', token);
}

/** Prévient le serveur qu'il s'est passé quelque chose sur une demande d'appel. Sans attendre, sans bloquer. */
export async function notifyServer(event: 'booking_created' | 'booking_answered' | 'booking_cancelled', bookingId: string) {
  const s = await session();
  if (!s) return;
  fetch(`${env.siteUrl}/api/v1/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.access_token}` },
    body: JSON.stringify({ event, bookingId }),
  }).catch(() => {});
}

/** Toucher une alerte ouvre le bon écran, dans le bon rôle (une demande reçue ouvre l'espace Mentor). */
export function openFromNotification(response: Notifications.NotificationResponse | null) {
  const data = response?.notification.request.content.data as { url?: string; role?: 'student' | 'mentor' } | undefined;
  if (!data?.url) return;
  const { profile, setActiveRole } = useProfile.getState();
  if (data.role && profile.roles.includes(data.role)) setActiveRole(data.role);
  router.push(data.url as Href);
  Notifications.clearLastNotificationResponse();
}
