/**
 * Espace Mentor : sa fiche, ses demandes, sa disponibilité.
 * Avec Supabase et une session : la base (une demande se crée « en attente », le mentor accepte ou décline,
 * voir supabase/migrations/20261023130000_mentorat_reel.sql). Sans (mode démo, profils de test) : données d'exemple.
 */
import { toMentor } from '@/data/api';
import { demoMentorRequests, demoMentors } from '@/data/demo';
import type { Mentor } from '@/data/types';
import { supabase } from '@/lib/supabase';

export type RequestStatus = 'pending' | 'confirmed' | 'cancelled' | 'done';

export type MentorRequest = {
  id: string;
  startsAt: string;
  topic: string;
  status: RequestStatus;
  /** « Prénom N. », ou null si l'étudiant n'a pas encore de prénom. */
  student: string | null;
  city: string | null;
  country: string | null;
};

/** Ta fiche mentor : `null` si tu n'en as pas encore. `isActive` = validée par l'équipe. */
export type MyMentor = Mentor & { isActive: boolean };

async function sessionUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

export async function fetchMyMentor(): Promise<MyMentor | null> {
  const user = await sessionUser();
  if (!supabase || !user) return { ...demoMentors[0], isActive: true };
  const { data, error } = await supabase.from('mentors').select('*').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  return data ? { ...toMentor(data), isActive: !!data.is_active } : null;
}

/** « Devenir mentor » : la fiche part en validation (invisible des étudiants tant que l'équipe ne l'a pas validée). */
export async function createMyMentor(input: { firstName: string; lastName: string; city: string; origin: string }) {
  const user = await sessionUser();
  if (!supabase || !user) return;
  const { error } = await supabase.from('mentors').insert({
    user_id: user.id,
    first_name: input.firstName.trim() || 'Mentor',
    last_name: input.lastName.trim(),
    city: input.city,
    origin: input.origin || null,
  });
  // Déjà créée (deuxième tap, autre téléphone) : rien à faire.
  if (error && error.code !== '23505') throw error;
}

/** L'interrupteur « Je prends des demandes / En pause ». */
export async function setMyAvailability(available: boolean) {
  const user = await sessionUser();
  if (!supabase || !user) return;
  const { error } = await supabase.from('mentors').update({ available_this_week: available }).eq('user_id', user.id);
  if (error) throw error;
}

export async function fetchMentorRequests(): Promise<MentorRequest[]> {
  const user = await sessionUser();
  if (!supabase || !user) {
    return demoMentorRequests.map((r) => {
      const [first, last] = r.student.split(' ');
      const status: RequestStatus = r.status === 'accepted' ? 'confirmed' : r.status;
      return { id: r.id, startsAt: r.when, topic: r.topic, status, student: `${first} ${last?.charAt(0) ?? ''}.`, city: r.origin, country: null };
    });
  }
  const { data, error } = await supabase.rpc('mentor_requests');
  if (error) throw error;
  return (data ?? []).map((r: Record<string, any>) => ({
    id: r.id,
    startsAt: r.starts_at,
    topic: r.topic,
    status: r.status,
    student: r.student_name,
    city: r.student_city,
    country: r.student_country,
  }));
}

/** Accepter (`confirmed`) ou décliner (`cancelled`) une demande. */
export async function answerRequest(id: string, status: 'confirmed' | 'cancelled') {
  const user = await sessionUser();
  if (!supabase || !user) return;
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
  if (error) throw error;
}
