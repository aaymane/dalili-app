import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchEvents, fetchGroups, fetchMentors, fetchMyBookings, fetchMyGroupIds, fetchPosts, remoteCancelBooking, remoteSetLike } from './api';
import { fetchCore, fetchGuide, snapshot, snapshotGuide, type Core, type CoreKey } from './content';
import { toast } from '@/components/feedback/Toast';
import { useAuth } from '@/features/auth/store';
import { notifyServer } from '@/features/notifications/push';
import { t } from '@/i18n';

import { useLocalDb } from './local-db';
import type { Booking, Post } from './types';

const MY_BOOKINGS = ['bookings', 'mine'] as const;
/** Tes adhésions aux groupes (base), sous la clé des groupes : actualiser les groupes les relit aussi. */
export const MY_GROUPS = ['groups', 'mine'] as const;

/**
 * Tes demandes et rendez-vous. Avec un compte : la base (la réponse du mentor est relue à chaque retour sur l'app, voir lib/query.ts).
 * En mode démo : ceux enregistrés sur le téléphone.
 */
export function useMyBookings(options?: { enabled?: boolean }) {
  const q = useQuery({ queryKey: MY_BOOKINGS, queryFn: fetchMyBookings, enabled: options?.enabled ?? true });
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

/** Groupes (base + créés localement) avec l'état « membre », et « à toi » (tu l'as créé : tu changes sa photo). */
export function useGroups() {
  const q = useQuery({ queryKey: ['groups', 'list'], queryFn: fetchGroups });
  // Membre ou non : la base le dit (avec un compte) ; en démo, ce qui a été rejoint sur ce téléphone.
  const mine = useQuery({ queryKey: MY_GROUPS, queryFn: fetchMyGroupIds });
  const created = useLocalDb((s) => s.createdGroups);
  const joined = useLocalDb((s) => s.joinedGroups);
  const covers = useLocalDb((s) => s.covers);
  const uid = useAuth((s) => s.user?.id);
  const data = useMemo(() => {
    // Un groupe créé en ligne revient aussi du serveur : on garde la version du serveur, une seule fois.
    const remote = q.data ?? [];
    const all = [...created.filter((c) => !remote.some((r) => r.id === c.id)), ...remote];
    const demo = !Array.isArray(mine.data);
    const memberOf = demo ? joined : (mine.data as string[]);
    return all.map((g) => ({
      ...g,
      coverUrl: covers[g.id] ?? g.coverUrl ?? null,
      isMine: created.some((c) => c.id === g.id) || (!!uid && g.createdBy === uid),
      isMember: memberOf.includes(g.id),
      // Avec un compte, le nombre de membres vient de la base (déjà à jour) ; en démo, on ajoute le tien.
      members: g.members + (demo && joined.includes(g.id) && !created.some((c) => c.id === g.id) ? 1 : 0),
    }));
  }, [q.data, mine.data, created, joined, covers, uid]);
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
  const covers = useLocalDb((s) => s.covers);
  const uid = useAuth((s) => s.user?.id);
  const data = useMemo(() => {
    const remote = q.data ?? [];
    const all = [...created.filter((c) => !remote.some((r) => r.id === c.id)), ...remote].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return all.map((e) => ({
      ...e,
      coverUrl: covers[e.id] ?? e.coverUrl ?? null,
      isMine: created.some((c) => c.id === e.id) || (!!uid && e.createdBy === uid),
      isGoing: joined.includes(e.id),
      attendees: e.attendees + (joined.includes(e.id) && !created.some((c) => c.id === e.id) ? 1 : 0),
    }));
  }, [q.data, created, joined, covers, uid]);
  return { ...q, data };
}

export function useEvent(id?: string) {
  const q = useEvents();
  return { ...q, data: q.data.find((e) => e.id === id) };
}

const postsKey = (groupId?: string) => ['posts', groupId] as const;

export function usePosts(groupId?: string) {
  const q = useQuery({ queryKey: postsKey(groupId), queryFn: () => fetchPosts(groupId!), enabled: !!groupId });
  const local = useLocalDb((s) => s.posts);
  const liked = useLocalDb((s) => s.likedPosts);
  const localComments = useLocalDb((s) => s.comments);
  const data = useMemo(() => {
    const all = [...local.filter((p) => p.groupId === groupId), ...(q.data ?? [])];
    return all.map((p) => {
      // Avec un compte, la base dit qui aime et combien ; en démo, le téléphone ajoute ton cœur au compteur.
      const online = p.liked !== undefined;
      const isLiked = online ? !!p.liked : liked.includes(p.id);
      return {
        ...p,
        comments: [...p.comments, ...localComments.filter((c) => c.postId === p.id).map((c) => ({ author: c.author, body: c.body, isAuthor: false }))],
        online,
        liked: isLiked,
        likes: online ? p.likes : p.likes + (isLiked ? 1 : 0),
      };
    });
  }, [q.data, local, liked, localComments, groupId]);
  return { ...q, data };
}

/**
 * Le cœur d'une publication : il change tout de suite, la base suit (un geste à la fois par groupe, pour qu'un
 * double tap ne s'emmêle pas). Si la base refuse, il revient comme avant. L'auteur est prévenu d'un nouveau cœur.
 */
export function useToggleLike(groupId: string) {
  const qc = useQueryClient();
  const toggleLocal = useLocalDb((s) => s.toggleLike);
  const flip = (id: string, like: boolean) =>
    qc.setQueryData<Post[]>(postsKey(groupId), (list) =>
      list?.map((p) => (p.id === id && p.liked !== like ? { ...p, liked: like, likes: Math.max(0, p.likes + (like ? 1 : -1)) } : p)),
    );
  const m = useMutation({
    scope: { id: `likes-${groupId}` },
    mutationFn: ({ id, like }: { id: string; like: boolean }) => remoteSetLike(id, like),
    onMutate: ({ id, like }) => flip(id, like),
    onSuccess: (_d, { id, like }) => {
      if (like) void notifyServer('post_liked', id);
    },
    onError: (_e, { id, like }) => {
      flip(id, !like);
      toast(t('community.post.likeFailed'), 'info');
    },
  });
  return (p: { id: string; liked: boolean; online: boolean }) => (p.online ? m.mutate({ id: p.id, like: !p.liked }) : toggleLocal(p.id));
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
