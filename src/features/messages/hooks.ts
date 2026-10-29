import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { useProfile } from '@/features/profile/store';
import { queryClient } from '@/lib/query';

import {
  conversationForBooking,
  fetchConversations,
  fetchMessages,
  markConversationRead,
  sendMessage,
  subscribeToConversation,
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

  return { ...q, typing: typing || demoTyping, notifyTyping };
}

/** Envoyer : la bulle apparaît tout de suite ; si l'envoi rate, elle le dit et se renvoie d'un tap. */
export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  const key = thread(conversationId);
  return useMutation({
    mutationFn: ({ body }: { body: string; tempId: string }) => sendMessage(conversationId, body),
    onMutate: ({ body, tempId }) => {
      const temp: Message = { id: tempId, conversationId, mine: true, body: body.trim(), createdAt: new Date().toISOString(), pending: true };
      qc.setQueryData<Message[]>(key, (list = []) => [...list.filter((m) => m.id !== tempId), temp]);
    },
    onSuccess: (m, { tempId }) => qc.setQueryData<Message[]>(key, (list = []) => list.map((x) => (x.id === tempId ? m : x)).filter((x, i, all) => all.findIndex((y) => y.id === x.id) === i)),
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
