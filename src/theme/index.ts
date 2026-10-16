import { useProfile } from '@/features/profile/store';

import { gradients, palette, roleColors, type Role } from './tokens';

export * from './tokens';

/** Couleurs du rôle actif (Étudiant = bleu, Mentor = vert, Hôte = orange). */
export function useRoleTheme(roleOverride?: Role) {
  const active = useProfile((s) => s.profile.activeRole);
  const role = roleOverride ?? active;
  const c = roleColors[role];
  return {
    role,
    accent: c.main,
    soft: c.soft,
    label: c.label,
    top: gradients.roleTop[role],
    gradient: role === 'mentor' ? gradients.mentor : role === 'host' ? gradients.host : gradients.electric,
    ink: palette.navy,
  };
}
