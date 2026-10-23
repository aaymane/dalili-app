import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { answerRequest, createMyMentor, fetchMentorRequests, fetchMyMentor, setMyAvailability, type MentorRequest, type MyMentor } from './api';

const MINE = ['mentor', 'mine'] as const;
const REQUESTS = ['mentor', 'requests'] as const;

export function useMyMentor() {
  return useQuery({ queryKey: MINE, queryFn: fetchMyMentor });
}

export function useMentorRequests() {
  return useQuery({ queryKey: REQUESTS, queryFn: fetchMentorRequests });
}

export function useCreateMyMentor() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: createMyMentor, onSettled: () => qc.invalidateQueries({ queryKey: MINE }) });
}

/** L'interrupteur bascule tout de suite ; s'il n'est pas enregistré, il revient. */
export function useSetAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setMyAvailability,
    onMutate: (available: boolean) => {
      const before = qc.getQueryData<MyMentor | null>(MINE);
      if (before) qc.setQueryData<MyMentor>(MINE, { ...before, availableThisWeek: available });
      return { before };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(MINE, ctx?.before),
  });
}

/** Accepter ou décliner : la carte change tout de suite ; en cas d'échec, elle revient. */
export function useAnswerRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'confirmed' | 'cancelled' }) => answerRequest(id, status),
    onMutate: ({ id, status }) => {
      const before = qc.getQueryData<MentorRequest[]>(REQUESTS);
      if (before) qc.setQueryData<MentorRequest[]>(REQUESTS, before.map((r) => (r.id === id ? { ...r, status } : r)));
      return { before };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(REQUESTS, ctx?.before),
  });
}
