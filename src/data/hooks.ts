import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchEvents, fetchGroups, fetchMentors, fetchMyBookings, fetchPosts, remoteCancelBooking } from './api';
import { fetchCore, fetchGuide, snapshot, snapshotGuide, type Core, type CoreKey } from './content';
import { notifyServer } from '@/features/notifications/push';

import { useLocalDb } from './local-db';
import type { Booking } from './types';

const MY_BOOKINGS = ['bookings', 'mine'] as const;

/**
 * Tes demandes et rendez-vous. Avec un compte : la base (la réponse du mentor est relue à chaque retour sur l'app, voir lib/query.ts).
 * En mode démo : ceux enregistrés sur le téléphone.
 */
export function useMyBookings() {
  const q = useQuery({ queryKey: MY_BOOKINGS, queryFn: fetchMyBookings });
  const local = useLocalDb((s) => s.bookings);
  return { ...q, data: q.data ?? local };
}

/** Annuler une demande ou un rendez-vous : disparaît tout de suite, revient si l'annulation échoue. */
export function useCancelBooking() {
  const qc = useQueryClient();
  const cancelLocal = useLocalDb((s) => s.cancelBooking);
  return useMutation({
    mutationFn: async (id: string) => {
      await remoteCancelBooking(id);
      void notifyServer('booking_cancelled', id);
    },
    onMutate: (id: string) => {
      cancelLocal(id);
      const before = qc.getQueryData<Booking[] | null>(MY_BOOKINGS);
      if (before) qc.setQueryData<Booking[]>(MY_BOOKINGS, before.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)));
      return { before };
    },
    onError: (_e, _id, ctx) => qc.setQueryData(MY_BOOKINGS, ctx?.before),
    onSettled: () => qc.invalidateQueries({ queryKey: MY_BOOKINGS }),
  });
}

export function useMentors() {
  return useQuery({ queryKey: ['mentors'], queryFn: fetchMentors });
}

export function useMentor(id?: string) {
  const q = useMentors();
  return { ...q, data: q.data?.find((m) => m.id === id) };
}

/** Groupes (base + créés localement) avec l'état « membre ». */
export function useGroups() {
  const q = useQuery({ queryKey: ['groups'], queryFn: fetchGroups });
  const created = useLocalDb((s) => s.createdGroups);
  const joined = useLocalDb((s) => s.joinedGroups);
  const data = useMemo(() => {
    const all = [...created, ...(q.data ?? [])];
    return all.map((g) => ({ ...g, isMember: joined.includes(g.id), members: g.members + (joined.includes(g.id) && !created.some((c) => c.id === g.id) ? 1 : 0) }));
  }, [q.data, created, joined]);
  return { ...q, data };
}

export function useGroup(id?: string) {
  const q = useGroups();
  return { ...q, data: q.data.find((g) => g.id === id) };
}

export function useEvents() {
  const q = useQuery({ queryKey: ['events'], queryFn: fetchEvents });
  const created = useLocalDb((s) => s.createdEvents);
  const joined = useLocalDb((s) => s.joinedEvents);
  const data = useMemo(() => {
    const all = [...created, ...(q.data ?? [])].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return all.map((e) => ({ ...e, isGoing: joined.includes(e.id), attendees: e.attendees + (joined.includes(e.id) && !created.some((c) => c.id === e.id) ? 1 : 0) }));
  }, [q.data, created, joined]);
  return { ...q, data };
}

export function useEvent(id?: string) {
  const q = useEvents();
  return { ...q, data: q.data.find((e) => e.id === id) };
}

export function usePosts(groupId?: string) {
  const q = useQuery({ queryKey: ['posts', groupId], queryFn: () => fetchPosts(groupId!), enabled: !!groupId });
  const local = useLocalDb((s) => s.posts);
  const liked = useLocalDb((s) => s.likedPosts);
  const data = useMemo(() => {
    const all = [...local.filter((p) => p.groupId === groupId), ...(q.data ?? [])];
    return all.map((p) => ({ ...p, liked: liked.includes(p.id), likes: p.likes + (liked.includes(p.id) ? 1 : 0) }));
  }, [q.data, local, liked, groupId]);
  return { ...q, data };
}

export type GroupWithState = ReturnType<typeof useGroups>['data'][number];
export type EventWithState = ReturnType<typeof useEvents>['data'][number];
export type PostWithState = ReturnType<typeof usePosts>['data'][number];

// ───────────── Contenu dalili.study (guides, parcours, chiffres…) ─────────────

const DAY = 86_400_000;
const snapshotAt = new Date(snapshot.snapshotAt).getTime();

/**
 * Une partie du contenu du site. Jamais vide : l'instantané embarqué sert de valeur
 * initiale, puis la version en ligne la remplace (rafraîchie au plus une fois par jour).
 */
export function useContent<K extends CoreKey>(key: K) {
  const q = useQuery<Core[K]>({
    queryKey: ['content', key],
    queryFn: () => fetchCore(key),
    initialData: snapshot[key],
    initialDataUpdatedAt: snapshotAt,
    staleTime: DAY,
    gcTime: 30 * DAY,
  });
  return { ...q, data: q.data ?? snapshot[key] };
}

/** Un guide complet. Hors ligne : version embarquée ; `isFallback` signale qu'elle peut dater. */
export function useGuide(slug?: string) {
  const q = useQuery({
    queryKey: ['content', 'guide', slug],
    queryFn: () => fetchGuide(slug!),
    enabled: !!slug,
    staleTime: DAY,
    gcTime: 30 * DAY,
  });
  const fallback = slug && !q.data ? snapshotGuide(slug) : undefined;
  return { ...q, data: q.data ?? fallback, isFallback: !q.data && !!fallback };
}
