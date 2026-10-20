import { LogoOrb } from '@/components/brand/LogoOrb';

import type { AmeState } from './Ame';

export type { AmeState };

/**
 * Sur le web, Skia exige CanvasKit (≈ 3 Mo) : on garde le logo lumineux existant.
 * Même signature que la version native pour que les écrans n'aient rien à savoir.
 */
export function Ame({ size = 160 }: { size?: number; state?: AmeState; signal?: number; surface?: 'dark' | 'light' }) {
  return <LogoOrb size={size / 1.6} pulse={false} />;
}
