import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchMyInterests, fetchSchools, sendInterest, withdrawInterest, type Interest } from './api';

const SCHOOLS = ['schools'] as const;
const INTERESTS = ['schools', 'interests'] as const;

export function useSchools() {
  return useQuery({ queryKey: SCHOOLS, queryFn: fetchSchools });
}

export function useSchool(slug?: string) {
  const q = useSchools();
  return { ...q, data: q.data?.find((s) => s.slug === slug) };
}

/** Ta demande pour cette école, si tu en as envoyé une. */
export function useMyInterest(schoolId?: string) {
  const q = useQuery({ queryKey: INTERESTS, queryFn: fetchMyInterests });
  return { ...q, data: q.data?.find((i) => i.schoolId === schoolId) };
}

export function useSendInterest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ schoolId, program, message }: { schoolId: string; program: string | null; message: string }) => sendInterest(schoolId, program, message),
    onSuccess: (i) => qc.setQueryData<Interest[]>(INTERESTS, (list = []) => [...list.filter((x) => x.schoolId !== i.schoolId), i]),
  });
}

/** Retirer sa demande : elle disparaît tout de suite ; si ça rate, elle revient. */
export function useWithdrawInterest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: withdrawInterest,
    onMutate: (i: Interest) => {
      const before = qc.getQueryData<Interest[]>(INTERESTS);
      qc.setQueryData<Interest[]>(INTERESTS, (list = []) => list.filter((x) => x.id !== i.id));
      return { before };
    },
    onError: (_e, _i, ctx) => qc.setQueryData(INTERESTS, ctx?.before),
  });
}
