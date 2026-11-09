import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { signedUrl } from '@/data/media';
import { notifyServer } from '@/features/notifications/push';
import { useProfile } from '@/features/profile/store';
import { queryClient } from '@/lib/query';
import { track } from '@/lib/analytics';

import {
  conversationForBooking,
  deleteMessage,
  editMessage,
  fetchConversations,
  fetchMessages,
  markConversationRead,
  sendMessage,
  subscribeToConversation,
  type Attachment,
  type Conversation,
  type Message,
} from './api';
import { useLocalMessages } from './local';

const CONVERSATIONS = ['messages', 'conversations'] as const;
export const threadKey = (id: string) => ['messages', 'thread', id] as const;
const thread = threadKey;

// Mode démo : les conversations d'exemple vivent sur le téléphone ; chaque changement relit la liste et la conversation.
useLocalMessages.subscribe((s, before) => {
  if (s.messages !== before.messages || s.read !== before.read) void queryClient.invalidateQueries({ queryKey: ['messages'] });
});

export function useConversations() {
  return useQuery({ queryKey: CONVERSATIONS, queryFn: fetchConversations });
}

/** Messages non lus dans le rôle actif (pastille de l'en-tête). */
export function useUnreadCount() {
  const role = useProfile((s) => s.profile.activeRole);
  const { data } = useConversations();
  return (data ?? []).filter((c) => c.asRole === role).reduce((n, c) => n + c.unread, 0);
}

export function useConversation(id: string) {
  const { data, ...rest } = useConversations();
  return { ...rest, data: data?.find((c) => c.id === id) };
}

/**
 * Une conversation ouverte : ses messages, ceux qui arrivent en direct, « en train d'écrire »,
 * et le « lu » envoyé dès qu'un message s'affiche.
 */
export function useThread(id: string) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: thread(id), queryFn: () => fetchMessages(id) });
  const [typing, setTyping] = useState(false);
  const demoTyping = useLocalMessages((s) => !!s.typing[id]);
  const live = useRef<ReturnType<typeof subscribeToConversation> | null>(null);

  useEffect(() => {
    let quiet: ReturnType<typeof setTimeout> | undefined;
    live.current = subscribeToConversation(id, {
      message: (m) => {
        setTyping(false);
        qc.setQueryData<Message[]>(thread(id), (list = []) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
      },
      typing: () => {
        setTyping(true);
        clearTimeout(quiet);
        quiet = setTimeout(() => setTyping(false), 3500);
      },
      changed: () => {
        void qc.invalidateQueries({ queryKey: thread(id) });
        void qc.invalidateQueries({ queryKey: CONVERSATIONS });
      },
    });
    return () => {
      clearTimeout(quiet);
      live.current?.close();
      live.current = null;
    };
  }, [qc, id]);

  const count = q.data?.length ?? 0;
  useEffect(() => {
    if (!count) return;
    void markConversationRead(id).then(() => qc.invalidateQueries({ queryKey: CONVERSATIONS }));
  }, [qc, id, count]);

  // « J'écris » : au plus une fois toutes les 2 secondes.
  const lastTyping = useRef(0);
  const notifyTyping = () => {
    const now = Date.now();
    if (now - lastTyping.current < 2000) return;
    lastTyping.current = now;
    live.current?.typing();
  };

  /** Tu as modifié ou supprimé un message : l'autre relit la conversation tout de suite. */
  const notifyChanged = () => live.current?.changed();

  return { ...q, typing: typing || demoTyping, notifyTyping, notifyChanged };
}

/** Modifier ton message : le nouveau texte s'affiche tout de suite, et revient comme avant si la base refuse. */
export function useEditMessage(conversationId: string) {
  const qc = useQueryClient();
  const key = thread(conversationId);
  return useMutation({
    mutationFn: ({ m, body }: { m: Message; body: string }) => editMessage(m, body),
    onMutate: ({ m, body }) => {
      const before = qc.getQueryData<Message[]>(key);
      qc.setQueryData<Message[]>(key, (list = []) => list.map((x) => (x.id === m.id ? { ...x, body, editedAt: new Date().toISOString() } : x)));
      return { before };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.before),
    onSettled: () => qc.invalidateQueries({ queryKey: CONVERSATIONS }),
  });
}

/** Supprimer ton message, pour vous deux : il disparaît tout de suite, et revient si la base refuse. */
export function useDeleteMessage(conversationId: string) {
  const qc = useQueryClient();
  const key = thread(conversationId);
  return useMutation({
    mutationFn: (m: Message) => deleteMessage(m),
    onMutate: (m) => {
      const before = qc.getQueryData<Message[]>(key);
      qc.setQueryData<Message[]>(key, (list = []) => list.filter((x) => x.id !== m.id));
      return { before };
    },
    onError: (_e, _m, ctx) => qc.setQueryData(key, ctx?.before),
    onSettled: () => qc.invalidateQueries({ queryKey: CONVERSATIONS }),
  });
}

/**
 * Envoyer : la bulle apparaît tout de suite (la photo aussi, depuis le téléphone) ; si l'envoi rate, elle le dit
 * et se renvoie d'un tap.
 */
export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  const key = thread(conversationId);
  return useMutation({
    mutationFn: ({ body, attachment }: { body: string; tempId: string; attachment?: Attachment }) => sendMessage(conversationId, body, attachment),
    onMutate: ({ body, tempId, attachment }) => {
      const temp: Message = { id: tempId, conversationId, mine: true, body: body.trim(), attachment, createdAt: new Date().toISOString(), pending: true };
      qc.setQueryData<Message[]>(key, (list = []) => [...list.filter((m) => m.id !== tempId), temp]);
    },
    onSuccess: (m, { tempId }) => {
      track('message_sent', { as_role: useProfile.getState().profile.activeRole === 'mentor' ? 'mentor' : 'student' });
      if (!m.id.startsWith('local-')) void notifyServer('message_created', m.id);
      // La photo qu'on vient d'envoyer reste affichée depuis le téléphone (pas de nouveau téléchargement).
      const sent = (temp?: Message) => (temp?.attachment?.localUri && m.attachment ? { ...m, attachment: { ...m.attachment, localUri: temp.attachment.localUri } } : m);
      qc.setQueryData<Message[]>(key, (list = []) =>
        list.map((x) => (x.id === tempId ? sent(x) : x)).filter((x, i, all) => all.findIndex((y) => y.id === x.id) === i),
      );
    },
    onError: (_e, { tempId }) => qc.setQueryData<Message[]>(key, (list = []) => list.map((x) => (x.id === tempId ? { ...x, pending: false, failed: true } : x))),
    onSettled: () => qc.invalidateQueries({ queryKey: CONVERSATIONS }),
  });
}

/** Ouvrir la conversation d'une demande acceptée : son identifiant, ou null si elle n'existe pas (encore). */
export function useOpenFromBooking() {
  return useMutation({ mutationFn: ({ bookingId, role }: { bookingId: string; role: 'student' | 'mentor' }) => conversationForBooking(bookingId, role) });
}

/** Côté étudiant : la conversation avec ce mentor, s'il a déjà accepté un appel. */
export function useConversationWithMentor(mentorId?: string): Conversation | undefined {
  const { data } = useConversations();
  return data?.find((c) => c.asRole === 'student' && c.mentorId === mentorId);
}

/**
 * Le lien temporaire d'une pièce jointe (1 heure), demandé seulement quand on l'affiche ou l'ouvre.
 * Le fichier envoyé depuis ce téléphone s'affiche sans lien.
 */
export function useAttachmentUrl(attachment?: Attachment) {
  const path = attachment?.localUri ? null : attachment?.path;
  const q = useQuery({
    queryKey: ['messages', 'file', path],
    queryFn: () => signedUrl('message-files', path!),
    enabled: !!path,
    staleTime: 50 * 60_000,
  });
  return attachment?.localUri ?? q.data ?? null;
}
