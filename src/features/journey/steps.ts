import { useMemo } from 'react';

import { figuresForStep, guidesForStep, snapshot, type CountryCode, type FigureDisplay, type Figures, type Journey, type JourneyStepDTO } from '@/data/content';
import { useContent } from '@/data/hooks';
import { useProfile } from '@/features/profile/store';
import type { Profile } from '@/features/profile/types';
import { t } from '@/i18n';

/**
 * Démarches du Parcours-quête.
 * Les textes, guides et chiffres viennent du site (journey.json, figures.json) : l'app
 * n'écrit aucun contenu administratif. Ici ne vit que la logique propre au profil.
 */

export type Phase = JourneyStepDTO['phase'];

export type StepIcon =
  | 'languages'
  | 'graduation'
  | 'file'
  | 'passport'
  | 'home'
  | 'handshake'
  | 'receipt'
  | 'plane'
  | 'shield'
  | 'badge'
  | 'bank'
  | 'phone'
  | 'health'
  | 'wallet'
  | 'card'
  | 'bus'
  | 'heart';

export type Step = Omit<JourneyStepDTO, 'icon' | 'guides' | 'figures'> & {
  icon: StepIcon;
  /** Guides à afficher pour ce profil, ceux de son pays d'abord. */
  guides: string[];
  /** Faux si l'étape a des guides par pays mais aucun pour celui de l'étudiant. */
  hasCountryGuide: boolean;
  /** Chiffres officiels de l'étape (ou « À vérifier »). */
  figures: FigureDisplay[];
  /** Premier chiffre, pour les vues compactes (vide si aucun chiffre sourcé). */
  budget: string;
  when: string;
  appliesTo?: (p: Profile) => boolean;
  autoDone?: (p: Profile) => boolean;
};

const campusDone = (p: Profile) => p.campusStatus === 'accepted' || p.campusStatus === 'enrolled';
const beforeCampus = (p: Profile) => campusDone(p) || p.situation === 'in_france';

/** Ce que l'onboarding nous apprend déjà, étape par étape. */
const logic: Record<string, Pick<Step, 'appliesTo' | 'autoDone'>> = {
  bourses: { autoDone: beforeCampus },
  tcf: { autoDone: beforeCampus },
  ecole: { autoDone: beforeCampus },
  documents: { autoDone: beforeCampus },
  'campus-france': { autoDone: beforeCampus },
  ressources: { autoDone: (p) => p.situation === 'in_france' },
  visa: { autoDone: (p) => p.situation === 'in_france' },
  logement: { autoDone: (p) => p.housing === 'found' },
  garant: { autoDone: (p) => p.housing === 'found' },
  cvec: { autoDone: (p) => p.campusStatus === 'enrolled' },
};

export const PHASES: Phase[] = ['before', 'arrival', 'first_months'];

/** Titre et sous-titre d'une phase, dans la langue en cours. */
export const phaseMeta = (phase: Phase, p: Profile) => ({
  title: t(`journey.phase.${phase}`),
  subtitle: phase === 'before' ? t('journey.phase.beforeSub', { city: p.originCity || t('journey.home') }) : t(`journey.phase.${phase}Sub`),
});

export const countryOf = (p: Profile): CountryCode | null => (p.country && p.country !== 'other' ? p.country : null);

export function buildSteps(journey: Journey, figures: Figures, profile: Profile): Step[] {
  const country = countryOf(profile);
  return journey.steps
    .filter((s) => !s.countries || (country ? s.countries.includes(country) : true))
    .map((s) => {
      const figs = figuresForStep(s, country, figures);
      return {
        ...s,
        icon: s.icon as StepIcon,
        guides: guidesForStep(s, country),
        hasCountryGuide: Object.keys(s.guides).length === 1 || (!!country && !!s.guides[country]),
        figures: figs,
        budget: figs[0]?.value ?? '',
        when: s.window,
        ...logic[s.id],
      };
    });
}

/** Étapes du parcours pour le profil courant. */
export function useSteps(): Step[] {
  const profile = useProfile((s) => s.profile);
  const { data: journey } = useContent('journey');
  const { data: figures } = useContent('figures');
  return useMemo(() => buildSteps(journey, figures, profile), [journey, figures, profile]);
}

export function useStep(id?: string): Step | undefined {
  const steps = useSteps();
  return steps.find((s) => s.id === id);
}

/** Hors composant (mode démo de l'IA) : étapes de l'instantané embarqué. */
export function snapshotSteps(profile: Profile): Step[] {
  return buildSteps(snapshot.journey, snapshot.figures, profile);
}
