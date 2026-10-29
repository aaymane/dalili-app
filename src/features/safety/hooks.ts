import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { blockUser, fetchMyBlocks, sendReport, unblockUser, type Block, type ReportReason, type ReportTarget } from './api';

const BLOCKS = ['safety', 'blocks'] as const;

/** Un blocage change ce que tu vois : la liste des mentors, tes demandes, celles que tu reçois. */
const refreshAfterBlock = (qc: QueryClient) =>
  Promise.all([
    qc.invalidateQueries({ queryKey: BLOCKS }),
    qc.invalidateQueries({ queryKey: ['mentors'] }),
    qc.invalidateQueries({ queryKey: ['bookings', 'mine'] }),
    qc.invalidateQueries({ queryKey: ['mentor', 'requests'] }),
  ]);

export function useSendReport() {
  return useMutation({
    mutationFn: ({ target, reason, comment }: { target: ReportTarget; reason: ReportReason; comment: string }) => sendReport(target, reason, comment),
  });
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: blockUser, onSuccess: () => refreshAfterBlock(qc) });
}

export function useMyBlocks() {
  return useQuery({ queryKey: BLOCKS, queryFn: fetchMyBlocks });
}

/** Débloquer : la personne quitte la liste tout de suite ; si ça échoue, elle revient. */
export function useUnblock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: unblockUser,
    onMutate: (id: string) => {
      const before = qc.getQueryData<Block[]>(BLOCKS);
      if (before) qc.setQueryData<Block[]>(BLOCKS, before.filter((b) => b.id !== id));
      return { before };
    },
    onError: (_e, _id, ctx) => qc.setQueryData(BLOCKS, ctx?.before),
    onSettled: () => refreshAfterBlock(qc),
  });
}
