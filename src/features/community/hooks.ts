import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyServer } from '@/features/notifications/push';

import { deleteComment, editComment, fetchComments, sendComment, type Comment } from './api';

export const commentsKey = (postId: string) => ['comments', postId] as const;

export function useComments(postId: string) {
  return useQuery({ queryKey: commentsKey(postId), queryFn: () => fetchComments(postId) });
}

/** Commenter : le commentaire apparaît tout de suite ; si l'envoi rate, il le dit et se renvoie d'un tap. */
export function useSendComment(postId: string, groupId?: string) {
  const qc = useQueryClient();
  const key = commentsKey(postId);
  return useMutation({
    mutationFn: ({ body }: { body: string; author: string }) => sendComment(postId, body),
    onMutate: ({ body, author }) => {
      const tempId = `temp-${Date.now()}`;
      const temp: Comment = { id: tempId, postId, author, body: body.trim(), createdAt: new Date().toISOString(), isPostAuthor: false, mine: true, pending: true };
      qc.setQueryData<Comment[]>(key, (list = []) => [...list, temp]);
      return { tempId };
    },
    onSuccess: (c, _v, ctx) => {
      qc.setQueryData<Comment[]>(key, (list = []) => list.map((x) => (x.id === ctx?.tempId ? c : x)));
      // L'auteur de la publication est prévenu (le serveur vérifie et n'alerte qu'une fois). Rien en mode démo.
      if (!c.id.startsWith('local-')) void notifyServer('comment_created', c.id);
    },
    onError: (_e, _v, ctx) => qc.setQueryData<Comment[]>(key, (list = []) => list.map((x) => (x.id === ctx?.tempId ? { ...x, pending: false, failed: true } : x))),
    // Le compteur et l'aperçu de la carte, dans le fil du groupe.
    onSettled: () => qc.invalidateQueries({ queryKey: ['posts', groupId] }),
  });
}

/** Modifier le sien : le nouveau texte s'affiche tout de suite, « modifié » aussi ; si ça rate, il revient. */
export function useEditComment(postId: string, groupId?: string) {
  const qc = useQueryClient();
  const key = commentsKey(postId);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => editComment(id, body),
    onMutate: ({ id, body }) => {
      const before = qc.getQueryData<Comment[]>(key);
      qc.setQueryData<Comment[]>(key, (list = []) => list.map((c) => (c.id === id ? { ...c, body, editedAt: new Date().toISOString() } : c)));
      return { before };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.before),
    onSettled: () => qc.invalidateQueries({ queryKey: ['posts', groupId] }),
  });
}

/** Supprimer le sien : il disparaît tout de suite ; si ça rate, il revient. */
export function useDeleteComment(postId: string, groupId?: string) {
  const qc = useQueryClient();
  const key = commentsKey(postId);
  return useMutation({
    mutationFn: deleteComment,
    onMutate: (id: string) => {
      const before = qc.getQueryData<Comment[]>(key);
      qc.setQueryData<Comment[]>(key, (list = []) => list.filter((c) => c.id !== id));
      return { before };
    },
    onError: (_e, _id, ctx) => qc.setQueryData(key, ctx?.before),
    onSettled: () => qc.invalidateQueries({ queryKey: ['posts', groupId] }),
  });
}
