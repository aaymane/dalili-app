import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { demoMentors } from '@/data/demo';
import { persistStorage } from '@/lib/storage';

import type { Message } from './api';

/**
 * Mode démo : une conversation d'exemple par rôle, gardée sur le téléphone.
 * Ton premier message reçoit une réponse, pour voir « en train d'écrire » et l'arrivée d'un message.
 */
export const DEMO_CONVERSATIONS = {
  student: { id: 'demo-conv-student', mentorId: demoMentors[0].id, otherName: `${demoMentors[0].firstName} ${demoMentors[0].lastName}` },
  mentor: { id: 'demo-conv-mentor', mentorId: 'm-moi', otherName: 'Amine D.' },
} as const;

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const seed = (): Record<string, Message[]> => ({
  [DEMO_CONVERSATIONS.student.id]: [
    { id: 'd1', conversationId: DEMO_CONVERSATIONS.student.id, mine: false, body: `Salut ! J’ai accepté ton appel. Dis-moi déjà où tu en es, comme ça on gagne du temps.`, createdAt: ago(90) },
  ],
  [DEMO_CONVERSATIONS.mentor.id]: [
    { id: 'd2', conversationId: DEMO_CONVERSATIONS.mentor.id, mine: false, body: 'Merci d’avoir accepté ! Ma question porte surtout sur la CAF.', createdAt: ago(45) },
  ],
});

type LocalMessages = {
  messages: Record<string, Message[]>;
  read: Record<string, string>;
  /** Conversations où l'autre « écrit » en ce moment (réponse simulée). */
  typing: Record<string, boolean>;
  add: (m: Message) => void;
  markRead: (conversationId: string) => void;
  setTyping: (conversationId: string, typing: boolean) => void;
};

export const useLocalMessages = create<LocalMessages>()(
  persist(
    (set) => ({
      messages: seed(),
      read: {},
      typing: {},
      add: (m) => set((s) => ({ messages: { ...s.messages, [m.conversationId]: [...(s.messages[m.conversationId] ?? []), m] } })),
      markRead: (id) => set((s) => ({ read: { ...s.read, [id]: new Date().toISOString() } })),
      setTyping: (id, typing) => set((s) => ({ typing: { ...s.typing, [id]: typing } })),
    }),
    { name: 'dalili.demo-messages', storage: persistStorage, partialize: (s) => ({ messages: s.messages, read: s.read }) },
  ),
);
