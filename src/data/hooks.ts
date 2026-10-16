import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchEvents, fetchGroups, fetchMentors, fetchPosts } from './api';
import { useLocalDb } from './local-db';

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
