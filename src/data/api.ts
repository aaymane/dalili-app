/**
 * Couche d'accès aux données — UNIQUE point de contact avec Supabase pour les écrans.
 * Chaque fonction : Supabase si configuré, sinon données de démo.
 * Les écrans utilisent les hooks de `hooks.ts`, jamais `supabase` directement.
 */
import { supabase } from '@/lib/supabase';

import { demoEvents, demoGroups, demoMentors, demoPosts } from './demo';
import { useLocalDb } from './local-db';
import { fileName, prepareJpeg, removeFiles, signedUrls, uploadFile, type Bucket } from './media';
import type { Booking, CommunityEvent, Group, Mentor, Post } from './types';

/* ---------- Mappers (snake_case SQL → camelCase app) ---------- */

type Row = Record<string, any>;

export const toMentor = (r: Row): Mentor => ({
  id: r.id,
  firstName: r.first_name,
  lastName: r.last_name,
  headline: r.headline ?? '',
  study: r.study ?? '',
  city: r.city,
  origin: r.origin ?? '',
  rating: Number(r.rating ?? 5),
  sessions: r.sessions_count ?? 0,
  responseHours: r.response_hours ?? 24,
  quote: r.quote ?? '',
  specialties: r.specialties ?? [],
  languages: r.languages ?? ['fr'],
  journey: r.journey ?? [],
  reviews: r.reviews ?? [],
  availableThisWeek: r.available_this_week ?? true,
  avatarColor: r.avatar_color ?? '#3D78FF',
});

const toGroup = (r: Row): Group => ({
  id: r.id,
  name: r.name,
  city: r.city,
  description: r.description ?? '',
  tags: r.tags ?? [],
  members: r.members_count ?? 0,
  privacy: r.privacy ?? 'public',
  cover: [r.cover_from ?? '#3D78FF', r.cover_to ?? '#1F2850'],
  emoji: r.emoji ?? '👋',
  coverPath: r.cover_path ?? null,
  createdBy: r.created_by ?? null,
});

const toEvent = (r: Row): CommunityEvent => ({
  id: r.id,
  groupId: r.group_id ?? undefined,
  title: r.title,
  city: r.city,
  place: r.place ?? '',
  address: r.address ?? '',
  startsAt: r.starts_at,
  description: r.description ?? '',
  capacity: r.capacity ?? 0,
  attendees: r.attendees_count ?? 0,
  price: r.price ?? 'free',
  link: r.link ?? undefined,
  cover: [r.cover_from ?? '#014DF8', r.cover_to ?? '#1F2850'],
  emoji: r.emoji ?? '🎉',
  coverPath: r.cover_path ?? null,
  createdBy: r.created_by ?? null,
});

const toPost = (r: Row): Post => ({
  id: r.id,
  groupId: r.group_id,
  author: r.author_name ?? 'Membre',
  authorColor: r.author_color ?? '#3D78FF',
  createdAt: r.created_at,
  body: r.body,
  likes: r.likes_count ?? 0,
  comments: r.comments ?? [],
  imagePath: r.image_path ?? null,
});

/** Les liens temporaires des photos d'une liste (couvertures, photos des publications). */
async function withUrls<T>(items: T[], bucket: Bucket, path: (x: T) => string | null | undefined, set: (x: T, url: string | null) => T): Promise<T[]> {
  const paths = items.map(path).filter((p): p is string => !!p);
  const urls = await signedUrls(bucket, paths);
  return items.map((x) => {
    const p = path(x);
    return p ? set(x, urls[p] ?? null) : x;
  });
}

/* ---------- Lectures ---------- */

export async function fetchMentors(): Promise<Mentor[]> {
  if (!supabase) return demoMentors;
  // Profils de test sans session (captures) : la base refuserait, on montre les mentors d'exemple.
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return demoMentors;
  // Ta propre fiche n'apparaît pas parmi les mentors qu'on te propose (on ne se réserve pas soi-même).
  const { data, error } = await supabase
    .from('mentors')
    .select('*')
    .eq('is_active', true)
    .or(`user_id.is.null,user_id.neq.${s.session.user.id}`)
    .order('rating', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toMentor);
}

/** Profils de test sans session (captures) : la base refuserait, on montre les données d'exemple. */
async function noSession() {
  const { data } = await supabase!.auth.getSession();
  return !data.session;
}

export async function fetchGroups(): Promise<Group[]> {
  if (!supabase || (await noSession())) return demoGroups;
  const { data, error } = await supabase.from('groups').select('*').order('members_count', { ascending: false });
  if (error) throw error;
  return withUrls((data ?? []).map(toGroup), 'covers', (g) => g.coverPath, (g, coverUrl) => ({ ...g, coverUrl }));
}

export async function fetchEvents(): Promise<CommunityEvent[]> {
  if (!supabase || (await noSession())) return demoEvents;
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at');
  if (error) throw error;
  return withUrls((data ?? []).map(toEvent), 'covers', (e) => e.coverPath, (e, coverUrl) => ({ ...e, coverUrl }));
}

export async function fetchPosts(groupId: string): Promise<Post[]> {
  if (!supabase || (await noSession())) return demoPosts.filter((p) => p.groupId === groupId);
  const { data, error } = await supabase
    .from('posts_with_author')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return withUrls((data ?? []).map(toPost), 'post-photos', (p) => p.imagePath, (p, imageUrl) => ({ ...p, imageUrl }));
}

/* ---------- Écritures (no-op en démo : la base locale suffit) ---------- */

/**
 * Les groupes dont tu es membre, d'après la base (la vérité, sur tous tes téléphones et après une reconnexion).
 * `null` en mode démo : l'app se fie alors à ce que tu as rejoint sur ce téléphone.
 */
export async function fetchMyGroupIds(): Promise<string[] | null> {
  if (!supabase) return null;
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return null;
  const { data, error } = await supabase.from('group_members').select('group_id').eq('user_id', s.session.user.id);
  if (error) throw error;
  return (data ?? []).map((r) => r.group_id as string);
}

/** Rejoindre ou quitter un groupe. Un refus de la base remonte : l'écran remet l'état d'avant et le dit. */
export async function remoteJoinGroup(groupId: string, join: boolean) {
  if (!supabase) return;
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const { error } = join
    ? await supabase.from('group_members').upsert({ group_id: groupId, user_id: u.user.id }, { ignoreDuplicates: true })
    : await supabase.from('group_members').delete().match({ group_id: groupId, user_id: u.user.id });
  if (error) throw error;
}

/**
 * Publier dans un groupe : du texte, une photo, ou les deux. La photo part d'abord (réduite, sans métadonnées)
 * dans le dossier du groupe et de l'auteur ; si la publication est refusée, elle est retirée.
 * `false` en mode démo : rien n'est parti, l'écran garde la publication sur le téléphone.
 */
export async function remoteCreatePost(groupId: string, body: string, photoUri?: string | null): Promise<boolean> {
  if (!supabase) return false;
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  let image_path: string | null = null;
  if (photoUri) {
    image_path = `${groupId}/${u.user.id}/${fileName()}.jpg`;
    await uploadFile('post-photos', image_path, await prepareJpeg(photoUri), 'image/jpeg');
  }
  const { error } = await supabase.from('posts').insert({ group_id: groupId, author_id: u.user.id, body, image_path });
  if (error) {
    if (image_path) await removeFiles('post-photos', [image_path]);
    throw error;
  }
  return true;
}

/**
 * Photo de couverture d'un groupe ou d'un événement (seul son créateur peut, la base le vérifie). Elle remplace
 * l'ancienne, qui est retirée. En démo, elle reste sur le téléphone.
 */
export async function uploadCover(kind: 'groups' | 'events', id: string, photoUri: string) {
  const prepared = await prepareJpeg(photoUri);
  if (!supabase || (await noSession())) return useLocalDb.getState().setCover(id, prepared);
  const folder = `${kind}/${id}`;
  const path = `${folder}/${fileName()}.jpg`;
  await uploadFile('covers', path, prepared, 'image/jpeg');
  const { error } = await supabase.from(kind).update({ cover_path: path }).eq('id', id);
  if (error) {
    await removeFiles('covers', [path]);
    throw error;
  }
  const { data: files } = await supabase.storage.from('covers').list(folder);
  await removeFiles('covers', (files ?? []).map((f) => `${folder}/${f.name}`).filter((p) => p !== path));
}

export async function remoteJoinEvent(eventId: string, join: boolean) {
  if (!supabase) return;
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  if (join) await supabase.from('event_attendees').upsert({ event_id: eventId, user_id: u.user.id }, { ignoreDuplicates: true });
  else await supabase.from('event_attendees').delete().match({ event_id: eventId, user_id: u.user.id });
}

export async function remoteCreateGroup(g: Omit<Group, 'id' | 'members'>) {
  if (!supabase) return null;
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('groups')
    .insert({
      name: g.name,
      city: g.city,
      description: g.description,
      tags: g.tags,
      privacy: g.privacy,
      cover_from: g.cover[0],
      cover_to: g.cover[1],
      emoji: g.emoji,
      created_by: u.user?.id,
    })
    .select()
    .single();
  if (error) throw error;
  return toGroup(data);
}

export async function remoteCreateEvent(e: Omit<CommunityEvent, 'id' | 'attendees'>) {
  if (!supabase) return null;
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('events')
    .insert({
      group_id: e.groupId,
      title: e.title,
      city: e.city,
      place: e.place,
      address: e.address,
      starts_at: e.startsAt,
      description: e.description,
      capacity: e.capacity,
      price: e.price,
      link: e.link,
      cover_from: e.cover[0],
      cover_to: e.cover[1],
      emoji: e.emoji,
      created_by: u.user?.id,
    })
    .select()
    .single();
  if (error) throw error;
  return toEvent(data);
}

const toBooking = (r: Row): Booking => ({ id: r.id, mentorId: r.mentor_id, startsAt: r.starts_at, topic: r.topic, status: r.status });

/**
 * Demande d'appel. Pas de statut envoyé : la base décide (« en attente » depuis la migration mentorat_reel,
 * le mentor accepte ou décline). Renvoie la réservation enregistrée, ou `null` en mode démo.
 */
export async function remoteCreateBooking(b: Omit<Booking, 'id' | 'status'>): Promise<Booking | null> {
  if (!supabase) return null;
  const { data: s } = await supabase.auth.getSession();
  const user = s.session?.user;
  if (!user) return null;
  const { data, error } = await supabase
    .from('bookings')
    .insert({ student_id: user.id, mentor_id: b.mentorId, starts_at: b.startsAt, topic: b.topic })
    .select('id, mentor_id, starts_at, topic, status')
    .single();
  if (error) throw error;
  return toBooking(data);
}

/** Tes demandes et rendez-vous, avec la réponse du mentor. `null` = mode démo (on lit le téléphone). */
export async function fetchMyBookings(): Promise<Booking[] | null> {
  if (!supabase) return null;
  const { data: s } = await supabase.auth.getSession();
  const user = s.session?.user;
  if (!user) return null;
  const { data, error } = await supabase
    .from('bookings')
    .select('id, mentor_id, starts_at, topic, status')
    .eq('student_id', user.id)
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toBooking);
}

/** Annuler sa demande ou son rendez-vous (la base n'autorise rien d'autre à l'étudiant). */
export async function remoteCancelBooking(id: string) {
  if (!supabase) return;
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return;
  const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
  if (error) throw error;
}
