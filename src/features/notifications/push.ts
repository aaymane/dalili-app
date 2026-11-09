/**
 * Notifications sur le téléphone. L'app ne fait que donner le jeton de ce téléphone (s'il a dit oui) et prévenir
 * le serveur qu'il s'est passé quelque chose : c'est le serveur du site qui vérifie et envoie (`/api/v1/notify`).
 *
 * L'interrupteur du Profil suit l'autorisation du téléphone (donnée à la question d'iOS ou plus tard dans Réglages),
 * sauf si tu l'as coupé dans l'app. Il est relu à l'ouverture et à chaque retour sur l'app : une nouvelle
 * installation ou une autorisation donnée dans Réglages suffit, sans repasser par le Profil.
 * Un compte reçoit ses alertes sur le dernier téléphone où l'app a été ouverte (la base garde un seul jeton).
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { Linking, Platform } from 'react-native';

import { useProfile } from '@/features/profile/store';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

// Une alerte qui arrive pendant qu'on utilise l'app s'affiche quand même, en bannière.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** Identifiant du projet EAS : sans lui, Expo ne donne pas de jeton (à créer une fois avec `eas init`). */
const projectId = (): string | null => Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;

/**
 * Dans Expo Go, le jeton appartient à Expo Go : les alertes arriveraient « depuis Expo Go », et continueraient
 * d'y arriver après l'installation de la vraie app. On n'inscrit donc jamais Expo Go.
 */
const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const canPush = () => Platform.OS !== 'web' && !inExpoGo;

let current: string | null = null;

async function session() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

async function deviceToken(): Promise<string | null> {
  const id = projectId();
  if (!id) return null;
  return (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
}

/** Donne le jeton de ce téléphone au serveur, si le compte est connecté, que le téléphone autorise et que tu n'as pas coupé. */
export async function registerPush() {
  if (!canPush() || useProfile.getState().profile.notificationsOff) return;
  if (!(await session())) return;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', { name: 'DALILI', importance: AndroidImportance.HIGH });
    }
    const token = await deviceToken();
    if (!token || token === current) return;
    const { error } = await supabase!.rpc('register_push_token', { p_token: token, p_platform: Platform.OS });
    if (!error) current = token;
  } catch {
    // Simulateur sans réseau, Android sans Firebase… : pas de notification, le reste de l'app marche.
  }
}

/**
 * À l'ouverture de l'app et à chaque retour dessus : l'interrupteur suit l'autorisation du téléphone, et le
 * téléphone est (ré)inscrit. Ce que tu as coupé dans le Profil reste coupé.
 */
export async function syncNotifications() {
  if (Platform.OS === 'web') return;
  try {
    const perm = await Notifications.getPermissionsAsync();
    const { profile, update } = useProfile.getState();
    const on = perm.granted && !profile.notificationsOff;
    if (profile.notificationsEnabled !== on) update({ notificationsEnabled: on });
    if (on) await registerPush();
  } catch {
    // Rien à faire : on réessaiera au prochain retour sur l'app.
  }
}

/**
 * Demande l'autorisation au bon moment (après une demande d'appel, en devenant mentor) ou depuis l'interrupteur
 * du Profil (`fromSwitch`). La fenêtre d'iOS n'apparaît qu'une fois : ensuite, l'interrupteur ouvre Réglages.
 * Si tu as coupé les notifications dans le Profil, seul l'interrupteur les rallume.
 */
export async function askNotifications(fromSwitch = false): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { profile, update } = useProfile.getState();
  if (!fromSwitch && profile.notificationsOff) return false;
  try {
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
    update({ notificationsEnabled: perm.granted, notificationsOff: false });
    if (perm.granted) await registerPush();
    else if (fromSwitch) void Linking.openSettings();
    return perm.granted;
  } catch {
    return false;
  }
}

/** Notifications coupées dans le Profil : ce téléphone ne reçoit plus rien, jusqu'à ce que tu les rallumes. */
export async function turnOffNotifications() {
  useProfile.getState().update({ notificationsEnabled: false, notificationsOff: true });
  await unregisterPush();
}

/** Déconnexion ou notifications coupées : ce téléphone ne reçoit plus rien pour ce compte. */
export async function unregisterPush() {
  if (!supabase) return;
  let token = current;
  current = null;
  // App relancée depuis : le jeton n'est plus en mémoire, on le redemande au téléphone pour le retirer.
  if (!token && canPush()) {
    try {
      if ((await Notifications.getPermissionsAsync()).granted) token = await deviceToken();
    } catch {
      token = null;
    }
  }
  if (token) await supabase.from('push_tokens').delete().eq('token', token);
}

type ServerEvent =
  | { event: 'booking_created' | 'booking_answered' | 'booking_cancelled'; bookingId: string }
  | { event: 'message_created'; messageId: string }
  | { event: 'post_liked'; postId: string }
  | { event: 'comment_created'; commentId: string };

const bodyFor = (event: ServerEvent['event'], id: string): ServerEvent =>
  event === 'message_created'
    ? { event, messageId: id }
    : event === 'post_liked'
      ? { event, postId: id }
      : event === 'comment_created'
        ? { event, commentId: id }
        : { event, bookingId: id };

/**
 * Prévient le serveur qu'il s'est passé quelque chose : demande d'appel, message, cœur ou commentaire.
 * Sans attendre, sans bloquer : la base prévient aussi le site, et le serveur n'alerte qu'une fois.
 */
export async function notifyServer(event: ServerEvent['event'], id: string) {
  const s = await session();
  if (!s) return;
  fetch(`${env.siteUrl}/api/v1/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.access_token}` },
    body: JSON.stringify(bodyFor(event, id)),
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
