/**
 * Espace Mentor : sa fiche, ses demandes, sa disponibilité.
 * Avec Supabase et une session : la base (une demande se crée « en attente », le mentor accepte ou décline,
 * voir supabase/migrations/20261023130000_mentorat_reel.sql). Sans (mode démo, profils de test) : données d'exemple.
 */
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { toMentor } from '@/data/api';
import { demoMentorRequests, demoMentors } from '@/data/demo';
import { useLocalDb } from '@/data/local-db';
import type { Mentor } from '@/data/types';
import type { WeeklySlot } from '@/lib/paris';
import { supabase } from '@/lib/supabase';

import { CHARTER_VERSION } from './charter';
import { prepareDocument } from './documents';

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

/**
 * Ta fiche mentor : `null` si tu n'en as pas encore. `isActive` = validée par l'équipe.
 * `charterOk` = la charte en vigueur est acceptée (une fiche d'avant la charte, ou une charte qui a changé, la redemande).
 */
export type MyMentor = Mentor & { isActive: boolean; charterOk: boolean };

async function sessionUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

export async function fetchMyMentor(): Promise<MyMentor | null> {
  const user = await sessionUser();
  // Démo : une fiche seulement après la candidature, avec un identifiant à part (pas un mentor de la liste d'exemple).
  if (!supabase || !user) {
    const demo = useLocalDb.getState().mentorApplication;
    return demo.sent ? { ...demoMentors[0], ...useLocalDb.getState().mentorSheet, id: 'm-moi', isActive: demo.approved, charterOk: true } : null;
  }
  const [mentor, trust] = await Promise.all([
    supabase.from('mentors').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('mentor_trust').select('charter_version').eq('user_id', user.id).maybeSingle(),
  ]);
  if (mentor.error) throw mentor.error;
  const data = mentor.data;
  // La charte n'est qu'un rappel ici (la base tient la règle) : une lecture ratée ne bloque pas l'espace Mentor.
  const charterOk = trust.error ? true : trust.data?.charter_version === CHARTER_VERSION;
  return data ? { ...toMentor(data), isActive: !!data.is_active, charterOk } : null;
}

/**
 * « Devenir mentor » : la charte d'abord (la base refuse une fiche sans elle, et un mentor de moins de 18 ans),
 * puis la fiche part en validation (invisible des étudiants tant que l'équipe ne l'a pas vérifiée et validée).
 */
export async function createMyMentor(input: { firstName: string; lastName: string; city: string; origin: string; birthYear: number }) {
  const user = await sessionUser();
  if (!supabase || !user) return useLocalDb.getState().setMentorApplication({ sent: true });
  const charter = await supabase.rpc('accept_mentor_charter', { p_birth_year: input.birthYear, p_version: CHARTER_VERSION });
  if (charter.error) throw charter.error;
  const { error } = await supabase.from('mentors').insert({
    user_id: user.id,
    first_name: input.firstName.trim() || 'Mentor',
    last_name: input.lastName.trim(),
    city: input.city,
    origin: input.origin || null,
  });
  // Déjà créée (deuxième tap, autre téléphone, fiche d'avant la charte) : la charte acceptée suffit.
  if (error && error.code !== '23505') throw error;
}

export type DocKind = 'titre_sejour' | 'certificat_scolarite';
export const DOC_KINDS: DocKind[] = ['titre_sejour', 'certificat_scolarite'];

/**
 * Où en est ta candidature mentor. none : rien d'envoyé (ou des documents seulement) ; pending : fiche envoyée,
 * l'équipe vérifie ; rejected : refusée, avec le motif de l'équipe ; approved : tu es mentor.
 */
export type MentorApplication = { documents: DocKind[]; status: 'none' | 'pending' | 'rejected' | 'approved'; rejectedReason: string | null };

export async function fetchMyApplication(): Promise<MentorApplication> {
  const user = await sessionUser();
  if (!supabase || !user) {
    const demo = useLocalDb.getState().mentorApplication;
    return { documents: demo.documents as DocKind[], status: demo.approved ? 'approved' : demo.sent ? 'pending' : 'none', rejectedReason: null };
  }
  const [mentor, docs, trust] = await Promise.all([
    supabase.from('mentors').select('is_active').eq('user_id', user.id).maybeSingle(),
    supabase.from('mentor_documents').select('kind').eq('user_id', user.id),
    supabase.from('mentor_trust').select('rejected_at, rejected_reason').eq('user_id', user.id).maybeSingle(),
  ]);
  if (mentor.error) throw mentor.error;
  if (docs.error) throw docs.error;
  const status = mentor.data ? (mentor.data.is_active ? 'approved' : 'pending') : trust.data?.rejected_at ? 'rejected' : 'none';
  return { documents: (docs.data ?? []).map((d) => d.kind as DocKind), status, rejectedReason: trust.data?.rejected_reason ?? null };
}

/** Un document choisi : une photo (réencodée en JPEG avant l'envoi) ou un PDF (envoyé tel quel). */
export type PickedDocument = { uri: string; pdf?: boolean };

/** 5 Mo au plus (limite du bucket). */
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

/**
 * Envoie un document dans le dossier privé du compte (bucket `mentor-documents`), en remplaçant l'ancien de la même sorte.
 * Seule l'équipe le lit, le temps de la vérification. En démo, rien ne part : on note seulement qu'il est ajouté.
 */
export async function uploadMentorDocument(kind: DocKind, picked: PickedDocument) {
  const uri = picked.pdf ? picked.uri : await prepareDocument(picked.uri);
  const user = await sessionUser();
  if (!supabase || !user) {
    const demo = useLocalDb.getState().mentorApplication;
    return useLocalDb.getState().setMentorApplication({ documents: [...new Set([...demo.documents, kind])] });
  }
  const bucket = supabase.storage.from('mentor-documents');
  const path = `${user.id}/${kind === 'titre_sejour' ? 'sejour' : 'scolarite'}-${Date.now().toString(36)}.${picked.pdf ? 'pdf' : 'jpg'}`;
  const body = Platform.OS === 'web' ? await (await fetch(uri)).arrayBuffer() : await new File(uri).arrayBuffer();
  const { error } = await bucket.upload(path, body, { contentType: picked.pdf ? 'application/pdf' : 'image/jpeg', upsert: false });
  if (error) throw error;
  const { data: old } = await supabase.from('mentor_documents').select('path').eq('user_id', user.id).eq('kind', kind).maybeSingle();
  if (old) {
    await supabase.from('mentor_documents').delete().eq('user_id', user.id).eq('kind', kind);
    await bucket.remove([old.path]);
  }
  const { error: rowError } = await supabase.from('mentor_documents').insert({ kind, path });
  if (rowError) {
    await bucket.remove([path]);
    throw rowError;
  }
}

/** Démo seulement : l'équipe « valide » la candidature, pour montrer la bascule vers l'espace mentor. */
export function approveDemoApplication() {
  useLocalDb.getState().setMentorApplication({ approved: true });
}

/** Ce que le mentor modifie lui-même sur sa fiche publique (la note, les séances et les avis restent tenus par la base). */
export type MentorSheetPatch = Partial<Pick<Mentor, 'headline' | 'study' | 'quote' | 'specialties' | 'languages'>>;

export async function updateMyMentor(patch: MentorSheetPatch) {
  const user = await sessionUser();
  if (!supabase || !user) return useLocalDb.getState().setMentorSheet(patch);
  const { error } = await supabase
    .from('mentors')
    .update({ headline: patch.headline, study: patch.study, quote: patch.quote, specialties: patch.specialties, languages: patch.languages })
    .eq('user_id', user.id);
  if (error) throw error;
}

/** Démo : les mentors d'exemple ont quelques soirées et le samedi matin, pour montrer la réservation sur créneaux. */
const DEMO_SLOTS: WeeklySlot[] = [
  { weekday: 1, startTime: '18:00' },
  { weekday: 1, startTime: '19:00' },
  { weekday: 3, startTime: '12:30' },
  { weekday: 3, startTime: '18:30' },
  { weekday: 6, startTime: '10:00' },
  { weekday: 6, startTime: '11:00' },
];

const sameSlot = (a: WeeklySlot, b: WeeklySlot) => a.weekday === b.weekday && a.startTime === b.startTime;

/** Les créneaux d'un mentor (heure de Paris). Vide : l'étudiant propose une heure, comme avant. */
export async function fetchMentorSlots(mentorId: string): Promise<WeeklySlot[]> {
  const user = await sessionUser();
  if (!supabase || !user) return mentorId === 'm-moi' ? useLocalDb.getState().mentorSlots : DEMO_SLOTS;
  const { data, error } = await supabase.from('mentor_slots').select('weekday, start_time').eq('mentor_id', mentorId);
  if (error) throw error;
  return (data ?? []).map((r) => ({ weekday: r.weekday, startTime: String(r.start_time).slice(0, 5) }));
}

/** Les heures déjà demandées chez ce mentor (30 prochains jours) : seulement l'heure, jamais qui. */
export async function fetchBusyTimes(mentorId: string): Promise<string[]> {
  const user = await sessionUser();
  if (!supabase || !user) {
    return useLocalDb
      .getState()
      .bookings.filter((b) => b.mentorId === mentorId && (b.status === 'pending' || b.status === 'confirmed'))
      .map((b) => b.startsAt);
  }
  const { data, error } = await supabase.rpc('mentor_busy_times', { p_mentor_id: mentorId });
  if (error) throw error;
  return ((data ?? []) as string[]).map((d) => new Date(d).toISOString());
}

/** Enregistre tes créneaux : retire ceux que tu as enlevés, ajoute les nouveaux. */
export async function saveMySlots(next: WeeklySlot[]) {
  const user = await sessionUser();
  if (!supabase || !user) return useLocalDb.getState().setMentorSlots(next);
  const { data: mentor, error } = await supabase.from('mentors').select('id').eq('user_id', user.id).single();
  if (error) throw error;
  const current = await fetchMentorSlots(mentor.id);
  const removed = current.filter((s) => !next.some((n) => sameSlot(n, s)));
  const added = next.filter((n) => !current.some((s) => sameSlot(n, s)));
  for (const s of removed) {
    const { error: e } = await supabase.from('mentor_slots').delete().match({ mentor_id: mentor.id, weekday: s.weekday, start_time: s.startTime });
    if (e) throw e;
  }
  if (added.length) {
    const { error: e } = await supabase.from('mentor_slots').insert(added.map((s) => ({ mentor_id: mentor.id, weekday: s.weekday, start_time: s.startTime })));
    if (e) throw e;
  }
}

/** Les rendez-vous que tu as déjà notés (étudiant). */
export async function fetchMyReviewedBookings(): Promise<string[]> {
  const user = await sessionUser();
  if (!supabase || !user) return useLocalDb.getState().reviewedBookings;
  const { data, error } = await supabase.from('mentor_reviews').select('booking_id').eq('student_id', user.id);
  if (error) throw error;
  return (data ?? []).map((r) => r.booking_id);
}

/** Noter un appel passé (1 à 5) avec un mot. La base met à jour la note et les avis de la fiche du mentor. */
export async function sendReview(input: { bookingId: string; mentorId: string; rating: number; comment: string }) {
  const user = await sessionUser();
  if (!supabase || !user) return useLocalDb.getState().markReviewed(input.bookingId);
  const { error } = await supabase
    .from('mentor_reviews')
    .insert({ booking_id: input.bookingId, mentor_id: input.mentorId, rating: input.rating, comment: input.comment.trim() || null });
  if (error) throw error;
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

/** Le nom affiché aux étudiants suit celui du profil (prénom ajouté ou corrigé après coup). */
export async function setMyMentorName(firstName: string, lastName: string) {
  const user = await sessionUser();
  if (!supabase || !user) return;
  const { error } = await supabase.from('mentors').update({ first_name: firstName, last_name: lastName }).eq('user_id', user.id);
  if (error) throw error;
}
