/**
 * Couche d'accès aux données — UNIQUE point de contact avec Supabase pour les écrans.
 * Chaque fonction : Supabase si configuré, sinon données de démo.
 * Les écrans utilisent les hooks de `hooks.ts`, jamais `supabase` directement.
 */
import { supabase } from '@/lib/supabase';

import { demoEvents, demoGroups, demoMentors, demoPosts } from './demo';
import type { Booking, CommunityEvent, Group, Mentor, Post } from './types';

/* ---------- Mappers (snake_case SQL → camelCase app) ---------- */

type Row = Record<string, any>;

const toMentor = (r: Row): Mentor => ({
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
});

/* ---------- Lectures ---------- */

export async function fetchMentors(): Promise<Mentor[]> {
  if (!supabase) return demoMentors;
  const { data, error } = await supabase.from('mentors').select('*').eq('is_active', true).order('rating', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toMentor);
}

export async function fetchGroups(): Promise<Group[]> {
  if (!supabase) return demoGroups;
  const { data, error } = await supabase.from('groups').select('*').order('members_count', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toGroup);
}

export async function fetchEvents(): Promise<CommunityEvent[]> {
  if (!supabase) return demoEvents;
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at');
  if (error) throw error;
  return (data ?? []).map(toEvent);
}

export async function fetchPosts(groupId: string): Promise<Post[]> {
  if (!supabase) return demoPosts.filter((p) => p.groupId === groupId);
  const { data, error } = await supabase
    .from('posts_with_author')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toPost);
}

/* ---------- Écritures (no-op en démo : la base locale suffit) ---------- */

export async function remoteJoinGroup(groupId: string, join: boolean) {
  if (!supabase) return;
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  if (join) await supabase.from('group_members').upsert({ group_id: groupId, user_id: u.user.id }, { ignoreDuplicates: true });
  else await supabase.from('group_members').delete().match({ group_id: groupId, user_id: u.user.id });
}

export async function remoteCreatePost(groupId: string, body: string) {
  if (!supabase) return;
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const { error } = await supabase.from('posts').insert({ group_id: groupId, author_id: u.user.id, body });
  if (error) throw error;
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

export async function remoteCreateBooking(b: Omit<Booking, 'id' | 'status'>) {
  if (!supabase) return;
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const { error } = await supabase
    .from('bookings')
    .insert({ student_id: u.user.id, mentor_id: b.mentorId, starts_at: b.startsAt, topic: b.topic, status: 'confirmed' });
  if (error) throw error;
}
