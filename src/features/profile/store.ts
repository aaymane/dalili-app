import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/lib/storage';
import type { Role } from '@/theme/tokens';

import { emptyProfile, type Profile } from './types';

type ProfileState = {
  profile: Profile;
  onboardingDone: boolean;
  update: (patch: Partial<Profile>) => void;
  setActiveRole: (role: Role) => void;
  addRole: (role: Role) => void;
  completeOnboarding: () => void;
  reset: () => void;
};

/**
 * Profil de l'utilisateur, persisté localement.
 * Synchronisé vers la table `profiles` de Supabase par `features/profile/api.ts` quand Supabase est configuré.
 */
export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      profile: emptyProfile,
      onboardingDone: false,
      update: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      setActiveRole: (role) =>
        set((s) => ({
          profile: {
            ...s.profile,
            activeRole: role,
            roles: s.profile.roles.includes(role) ? s.profile.roles : [...s.profile.roles, role],
          },
        })),
      addRole: (role) =>
        set((s) => ({
          profile: {
            ...s.profile,
            roles: s.profile.roles.includes(role) ? s.profile.roles : [...s.profile.roles, role],
          },
        })),
      completeOnboarding: () => set({ onboardingDone: true }),
      reset: () => set({ profile: emptyProfile, onboardingDone: false }),
    }),
    { name: 'dalili.profile', storage: persistStorage, version: 1 },
  ),
);

/** Date d'arrivée effective : celle saisie, sinon la prochaine rentrée (1er septembre). */
export function effectiveArrival(profile: Profile): Date {
  if (profile.arrivalDate) return new Date(profile.arrivalDate);
  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  return new Date(year, 8, 1);
}

export function displayName(profile: Profile) {
  return profile.firstName.trim() || 'toi';
}

export function initials(first: string, last = '') {
  const a = first.trim().charAt(0);
  const b = last.trim().charAt(0);
  return (a + b).toUpperCase() || 'D';
}
