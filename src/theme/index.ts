import { useProfile } from '@/features/profile/store';

import { useTheme } from './scheme';
import { roleColorsFor, type Role } from './tokens';

export * from './tokens';
export * from './scheme';

/** Couleurs du rôle actif (Étudiant = bleu, Mentor = vert, Hôte = orange), dans le thème en cours. */
export function useRoleTheme(roleOverride?: Role) {
  const active = useProfile((s) => s.profile.activeRole);
  const { c, gradients } = useTheme();
  const role = roleOverride ?? active;
  const rc = roleColorsFor(c)[role];
  return {
    role,
    accent: rc.main,
    soft: rc.soft,
    label: rc.label,
    top: gradients.roleTop[role],
    gradient: role === 'mentor' ? gradients.mentor : role === 'host' ? gradients.host : gradients.electric,
    ink: c.navy,
  };
}
