import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

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
