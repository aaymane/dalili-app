import { supabase } from '@/lib/supabase';

import type { Profile } from './types';

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
