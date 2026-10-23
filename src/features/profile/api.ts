import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

import { saveRemoteAvatar } from './avatar';
import type { Profile } from './types';

/**
 * Envoie la photo dans le bucket privé `avatars` (dossier du compte), note son chemin dans
 * `profiles.avatar_url`, puis supprime les anciennes photos (no-op en mode démo).
 */
export async function uploadAvatar(localUri: string, name: string) {
  if (!supabase) return;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  const uid = data.user.id;
  const path = `${uid}/${name}`;
  const body = Platform.OS === 'web' ? await (await fetch(localUri)).arrayBuffer() : await new File(localUri).arrayBuffer();
  const bucket = supabase.storage.from('avatars');
  const { error } = await bucket.upload(path, body, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  const { error: linkError } = await supabase.from('profiles').update({ avatar_url: path }).eq('id', uid);
  if (linkError) throw linkError;
  const { data: files } = await bucket.list(uid);
  const stale = (files ?? []).filter((f) => f.name !== name).map((f) => `${uid}/${f.name}`);
  if (stale.length) await bucket.remove(stale);
}

/** Envoie le profil vers la table `profiles` (no-op en mode démo). */
export async function syncProfile(p: Profile) {
  if (!supabase) return;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  const { error } = await supabase.from('profiles').upsert({
    id: data.user.id,
    first_name: p.firstName,
    last_name: p.lastName,
    gender: p.gender,
    country: p.country,
    origin_city: p.originCity,
    birth_date: p.birthDate,
    situation: p.situation,
    study_level: p.studyLevel,
    campus_status: p.campusStatus,
    destination_city: p.destinationCity,
    arrival_date: p.arrivalDate,
    housing: p.housing,
    concerns: p.concerns,
    roles: p.roles,
    active_role: p.activeRole,
    mentor_city: p.mentorCity,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/**
 * Relit le profil enregistré en ligne (nouveau téléphone, reconnexion).
 * `null` si l'onboarding n'a jamais été terminé : l'inscription crée un profil vide, et le profil n'est
 * envoyé qu'à la fin de l'onboarding (loading.tsx). La situation, première réponse, en est la preuve.
 */
export async function fetchProfile(): Promise<{ profile: Partial<Profile>; avatarPath: string | null } | null> {
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: row, error } = await supabase.from('profiles').select('*').eq('id', auth.user.id).maybeSingle();
  if (error) throw error;
  if (!row?.situation) return null;
  return {
    avatarPath: row.avatar_url,
    profile: {
      firstName: row.first_name,
      lastName: row.last_name,
      gender: row.gender,
      country: row.country,
      originCity: row.origin_city ?? '',
      birthDate: row.birth_date,
      situation: row.situation,
      studyLevel: row.study_level,
      campusStatus: row.campus_status,
      destinationCity: row.destination_city,
      arrivalDate: row.arrival_date,
      housing: row.housing,
      concerns: row.concerns ?? [],
      roles: row.roles?.length ? row.roles : ['student'],
      activeRole: row.active_role,
      mentorCity: row.mentor_city,
    },
  };
}

/** Télécharge la photo du bucket privé (lien valable 1 minute) et la range sur le téléphone. */
export async function restoreAvatar(path: string): Promise<string | null> {
  if (!supabase || Platform.OS === 'web') return null;
  const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path, 60);
  if (error) throw error;
  return saveRemoteAvatar(data.signedUrl, path.split('/').pop() ?? 'photo.jpg');
}
