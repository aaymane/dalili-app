import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { celebrate } from '@/components/feedback/Confetti';
import { toast } from '@/components/feedback/Toast';
import { askNotifications, notifyServer } from '@/features/notifications/push';
import { useProfile } from '@/features/profile/store';
import { t } from '@/i18n';
import { track } from '@/lib/analytics';
import { haptics } from '@/lib/haptics';

import {
  answerRequest,
  approveDemoApplication,
  createMyMentor,
  fetchBusyTimes,
  fetchMentorRequests,
  fetchMentorSlots,
  fetchMyReviewedBookings,
  fetchMyApplication,
  fetchMyMentor,
  saveMySlots,
  sendReview,
  setMyAvailability,
  updateMyMentor,
  uploadMentorDocument,
  type DocKind,
  type MentorRequest,
  type MentorSheetPatch,
  type MyMentor,
} from './api';

const MINE = ['mentor', 'mine'] as const;
const REQUESTS = ['mentor', 'requests'] as const;
const APPLICATION = ['mentor', 'application'] as const;

export function useMyMentor() {
  return useQuery({ queryKey: MINE, queryFn: fetchMyMentor });
}

export function useMentorRequests(options?: { enabled?: boolean }) {
  return useQuery({ queryKey: REQUESTS, queryFn: fetchMentorRequests, enabled: options?.enabled ?? true });
}

export function useCreateMyMentor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof createMyMentor>[0]) => {
      await createMyMentor(input);
      // Pour apprendre la validation de ta fiche, puis chaque nouvelle demande.
      void askNotifications();
    },
    onSettled: () => Promise.all([qc.invalidateQueries({ queryKey: MINE }), qc.invalidateQueries({ queryKey: APPLICATION })]),
  });
}

export function useMyApplication() {
  return useQuery({ queryKey: APPLICATION, queryFn: fetchMyApplication });
}

/** Un document de la candidature : la carte passe « ajouté » dès que l'envoi est fini. */
export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, uri }: { kind: DocKind; uri: string }) => uploadMentorDocument(kind, uri),
    onSuccess: () => qc.invalidateQueries({ queryKey: APPLICATION }),
  });
}

/** Démo : simule la validation par l'équipe (la bascule vers l'espace mentor suit). */
export function useApproveDemo() {
  const qc = useQueryClient();
  return () => {
    approveDemoApplication();
    void qc.invalidateQueries({ queryKey: MINE });
    void qc.invalidateQueries({ queryKey: APPLICATION });
  };
}

/**
 * Un compte est étudiant OU mentor : il devient mentor quand l'équipe valide sa fiche, et l'app bascule toute seule
 * (confettis, accueil mentor). Une fiche suspendue ou retirée le ramène côté étudiant. Hors ligne : rien ne bouge.
 */
export function useMentorRoleSync() {
  const { data, isSuccess } = useMyMentor();
  const role = useProfile((s) => s.profile.activeRole);
  const mentor = !!data?.isActive;
  useEffect(() => {
    if (!isSuccess) return;
    if (mentor && role !== 'mentor') {
      useProfile.getState().update({ roles: ['mentor'], activeRole: 'mentor' });
      haptics.success();
      celebrate();
      toast(t('mentorApply.welcome'), 'success');
      router.navigate('/(app)/(tabs)');
    } else if (!mentor && role === 'mentor') {
      useProfile.getState().update({ roles: ['student'], activeRole: 'student' });
    }
  }, [isSuccess, mentor, role]);
}

/** Ta fiche publique : l'aperçu change tout de suite ; si l'enregistrement échoue, l'ancienne version revient. */
export function useUpdateMyMentor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: MentorSheetPatch) => updateMyMentor(patch),
    onMutate: (patch) => {
      const before = qc.getQueryData<MyMentor | null>(MINE);
      if (before) qc.setQueryData<MyMentor>(MINE, { ...before, ...patch });
      return { before };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(MINE, ctx?.before),
    // Les étudiants voient la nouvelle fiche dans Explorer.
    onSettled: () => qc.invalidateQueries({ queryKey: ['mentors'] }),
  });
}

export function useMentorSlots(mentorId?: string) {
  return useQuery({ queryKey: ['mentor', 'slots', mentorId], queryFn: () => fetchMentorSlots(mentorId!), enabled: !!mentorId });
}

export function useBusyTimes(mentorId?: string) {
  return useQuery({ queryKey: ['mentor', 'busy', mentorId], queryFn: () => fetchBusyTimes(mentorId!), enabled: !!mentorId });
}

export function useSaveMySlots(mentorId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveMySlots,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mentor', 'slots', mentorId] }),
  });
}

export function useMyReviewedBookings() {
  return useQuery({ queryKey: ['reviews', 'mine'], queryFn: fetchMyReviewedBookings });
}

/** Un avis : le rendez-vous passe « noté » tout de suite ; la fiche du mentor est relue. */
export function useSendReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sendReview,
    onMutate: ({ bookingId }) => {
      const before = qc.getQueryData<string[]>(['reviews', 'mine']);
      qc.setQueryData<string[]>(['reviews', 'mine'], [...(before ?? []), bookingId]);
      return { before };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['reviews', 'mine'], ctx?.before),
    onSettled: () => qc.invalidateQueries({ queryKey: ['mentors'] }),
  });
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
    mutationFn: async ({ id, status }: { id: string; status: 'confirmed' | 'cancelled' }) => {
      await answerRequest(id, status);
      track('mentor_request_answered', { accepted: status === 'confirmed' });
      // L'étudiant apprend la réponse sur son téléphone.
      void notifyServer('booking_answered', id);
    },
    onMutate: ({ id, status }) => {
      const before = qc.getQueryData<MentorRequest[]>(REQUESTS);
      if (before) qc.setQueryData<MentorRequest[]>(REQUESTS, before.map((r) => (r.id === id ? { ...r, status } : r)));
      return { before };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(REQUESTS, ctx?.before),
  });
}
