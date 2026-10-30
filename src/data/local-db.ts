import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/lib/storage';

import type { Booking, CommunityEvent, Group, LocalComment, Mentor, Post } from './types';

/**
 * « Base locale » : stocke les actions de l'utilisateur (rejoindre, poster, réserver…).
 * - Mode démo : c'est la seule source de vérité.
 * - Mode Supabase : sert de cache optimiste (l'UI réagit instantanément), la base reste la vérité.
 */
type LocalDb = {
  joinedGroups: string[];
  createdGroups: Group[];
  posts: Post[];
  /** Mode démo : tes commentaires (avec Supabase, la base est la vérité). */
  comments: LocalComment[];
  likedPosts: string[];
  joinedEvents: string[];
  createdEvents: CommunityEvent[];
  bookings: Booking[];
  savedGuides: string[];
  readGuides: string[];
  documents: Record<string, boolean>;
  aiHistory: { role: 'user' | 'assistant'; content: string }[];
  /** Mode démo : ta candidature mentor (documents envoyés, fiche envoyée, validée). */
  mentorApplication: { documents: string[]; sent: boolean; approved: boolean };
  /** Mode démo : ce que le mentor a modifié sur sa fiche publique. */
  mentorSheet: Partial<Mentor>;

  toggleGroup: (id: string) => void;
  addGroup: (g: Group) => void;
  addPost: (p: Post) => void;
  addComment: (c: LocalComment) => void;
  removeComment: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleEvent: (id: string) => void;
  addEvent: (e: CommunityEvent) => void;
  addBooking: (b: Booking) => void;
  cancelBooking: (id: string) => void;
  toggleSavedGuide: (id: string) => void;
  markGuideRead: (id: string) => void;
  toggleDocument: (id: string) => void;
  setAiHistory: (h: LocalDb['aiHistory']) => void;
  setMentorApplication: (patch: Partial<LocalDb['mentorApplication']>) => void;
  setMentorSheet: (patch: Partial<Mentor>) => void;
  reset: () => void;
};

const initial = {
  joinedGroups: [] as string[],
  createdGroups: [] as Group[],
  posts: [] as Post[],
  comments: [] as LocalComment[],
  likedPosts: [] as string[],
  joinedEvents: [] as string[],
  createdEvents: [] as CommunityEvent[],
  bookings: [] as Booking[],
  savedGuides: [] as string[],
  readGuides: [] as string[],
  documents: {} as Record<string, boolean>,
  aiHistory: [] as LocalDb['aiHistory'],
  mentorApplication: { documents: [], sent: false, approved: false } as LocalDb['mentorApplication'],
  mentorSheet: {} as Partial<Mentor>,
};

const toggleIn = (arr: string[], id: string) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

export const useLocalDb = create<LocalDb>()(
  persist(
    (set) => ({
      ...initial,
      toggleGroup: (id) => set((s) => ({ joinedGroups: toggleIn(s.joinedGroups, id) })),
      addGroup: (g) => set((s) => ({ createdGroups: [g, ...s.createdGroups], joinedGroups: [...s.joinedGroups, g.id] })),
      addPost: (p) => set((s) => ({ posts: [p, ...s.posts] })),
      addComment: (c) => set((s) => ({ comments: [...s.comments, c] })),
      removeComment: (id) => set((s) => ({ comments: s.comments.filter((c) => c.id !== id) })),
      toggleLike: (id) => set((s) => ({ likedPosts: toggleIn(s.likedPosts, id) })),
      toggleEvent: (id) => set((s) => ({ joinedEvents: toggleIn(s.joinedEvents, id) })),
      addEvent: (e) => set((s) => ({ createdEvents: [e, ...s.createdEvents], joinedEvents: [...s.joinedEvents, e.id] })),
      addBooking: (b) => set((s) => ({ bookings: [b, ...s.bookings] })),
      cancelBooking: (id) =>
        set((s) => ({ bookings: s.bookings.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)) })),
      toggleSavedGuide: (id) => set((s) => ({ savedGuides: toggleIn(s.savedGuides, id) })),
      markGuideRead: (id) => set((s) => ({ readGuides: s.readGuides.includes(id) ? s.readGuides : [...s.readGuides, id] })),
      toggleDocument: (id) => set((s) => ({ documents: { ...s.documents, [id]: !s.documents[id] } })),
      setAiHistory: (h) => set({ aiHistory: h.slice(-40) }),
      setMentorApplication: (patch) => set((s) => ({ mentorApplication: { ...s.mentorApplication, ...patch } })),
      setMentorSheet: (patch) => set((s) => ({ mentorSheet: { ...s.mentorSheet, ...patch } })),
      reset: () => set(initial),
    }),
    { name: 'dalili.localdb', storage: persistStorage, version: 1 },
  ),
);
