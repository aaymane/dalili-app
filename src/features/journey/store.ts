import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { effectiveArrival, useProfile } from '@/features/profile/store';
import { addDays, toISODate } from '@/lib/date';
import { persistStorage } from '@/lib/storage';

import { syncCustomStep, syncStep } from './api';
import { useSteps, type Phase, type Step } from './steps';

export type CustomStep = { id: string; title: string; date: string; done: boolean };

type JourneyState = {
  /** Statut forcé par l'utilisateur (prioritaire sur `autoDone`). */
  overrides: Record<string, boolean>;
  custom: CustomStep[];
  /** Phases déjà célébrées (badge débloqué). */
  celebrated: Phase[];
  toggle: (id: string, done: boolean) => void;
  addCustom: (title: string, date: string) => CustomStep;
  toggleCustom: (id: string) => void;
  removeCustom: (id: string) => void;
  markCelebrated: (phase: Phase) => void;
  reset: () => void;
};

export const useJourneyStore = create<JourneyState>()(
  persist(
    (set) => ({
      overrides: {},
      custom: [],
      celebrated: [],
      toggle: (id, done) => {
        set((s) => ({ overrides: { ...s.overrides, [id]: done } }));
        syncStep(id, done).catch(() => {});
      },
      addCustom: (title, date) => {
        const item = { id: `custom-${Date.now()}`, title: title.trim(), date, done: false };
        set((s) => ({ custom: [...s.custom, item] }));
        syncCustomStep(item).catch(() => {});
        return item;
      },
      toggleCustom: (id) =>
        set((s) => {
          const custom = s.custom.map((c) => (c.id === id ? { ...c, done: !c.done } : c));
          const item = custom.find((c) => c.id === id);
          if (item) syncCustomStep(item).catch(() => {});
          return { custom };
        }),
      removeCustom: (id) =>
        set((s) => {
          const item = s.custom.find((c) => c.id === id);
          if (item) syncCustomStep(item, true).catch(() => {});
          return { custom: s.custom.filter((c) => c.id !== id) };
        }),
      markCelebrated: (phase) => set((s) => ({ celebrated: [...new Set([...s.celebrated, phase])] })),
      reset: () => set({ overrides: {}, custom: [], celebrated: [] }),
    }),
    { name: 'dalili.journey', storage: persistStorage, version: 1 },
  ),
);

export type JourneyItem =
  | { kind: 'official'; step: Step; date: Date; done: boolean; current: boolean }
  | { kind: 'custom'; custom: CustomStep; date: Date; done: boolean; current: false };

/**
 * Parcours personnalisé : étapes applicables au profil, datées, avec statut et étape courante.
 */
export function useJourney() {
  const profile = useProfile((s) => s.profile);
  const overrides = useJourneyStore((s) => s.overrides);
  const custom = useJourneyStore((s) => s.custom);
  const steps = useSteps();

  return useMemo(() => {
    const arrival = effectiveArrival(profile);
    const applicable = steps.filter((s) => (s.appliesTo ? s.appliesTo(profile) : true));
    const official = applicable.map((step) => {
      const done = overrides[step.id] ?? (step.autoDone ? step.autoDone(profile) : false);
      return { kind: 'official' as const, step, date: addDays(arrival, step.offsetDays), done, current: false };
    });
    const firstTodo = official.find((o) => !o.done);
    if (firstTodo) firstTodo.current = true;

    const byPhase: Record<Phase, JourneyItem[]> = { before: [], arrival: [], first_months: [] };
    official.forEach((o) => byPhase[o.step.phase].push(o));

    const customItems: JourneyItem[] = custom.map((c) => ({
      kind: 'custom',
      custom: c,
      date: new Date(c.date),
      done: c.done,
      current: false,
    }));
    // Les tâches perso s'insèrent dans la phase correspondant à leur date.
    customItems.forEach((c) => {
      const phase: Phase = c.date < arrival ? 'before' : c.date.getTime() - arrival.getTime() < 15 * 86_400_000 ? 'arrival' : 'first_months';
      byPhase[phase].push(c);
    });
    (Object.keys(byPhase) as Phase[]).forEach((p) =>
      byPhase[p].sort((a, b) => {
        // Les étapes faites restent en haut, comme sur le prototype, puis tri chronologique.
        if (a.kind === 'official' && b.kind === 'official') return a.step.offsetDays - b.step.offsetDays;
        return a.date.getTime() - b.date.getTime();
      }),
    );

    const doneCount = official.filter((o) => o.done).length;
    const progress = official.length ? doneCount / official.length : 0;
    const all: JourneyItem[] = [...official, ...customItems].sort((a, b) => a.date.getTime() - b.date.getTime());
    const upcoming = all.filter((i) => !i.done);

    return {
      arrival,
      arrivalISO: toISODate(arrival),
      byPhase,
      all,
      upcoming,
      current: firstTodo ?? null,
      doneCount,
      total: official.length,
      progress,
      phaseProgress: (p: Phase) => {
        const items = official.filter((o) => o.step.phase === p);
        return { done: items.filter((i) => i.done).length, total: items.length };
      },
    };
  }, [profile, overrides, custom, steps]);
}
