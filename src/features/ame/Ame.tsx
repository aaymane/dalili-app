import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import {
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { motion } from '@/theme/tokens';

import { AURORE, PERLE } from './shaders';

export type AmeVariant = 'perle' | 'aurore';
export type AmeState = 'rest' | 'listen' | 'think' | 'answer' | 'success';

const effects = {
  perle: Skia.RuntimeEffect.Make(PERLE)!,
  aurore: Skia.RuntimeEffect.Make(AURORE)!,
};

type Props = {
  size?: number;
  variant?: AmeVariant;
  state?: AmeState;
  /** Incrémenter à chaque frappe (écoute) ou paquet reçu (réponse) pour une impulsion. */
  signal?: number;
};

/**
 * L'Âme de Dalili : sphère de lumière vivante (shader Skia, thread UI uniquement).
 * Seule boucle de l'écran. Image fixe si « Réduire les animations », pause hors focus / en arrière-plan.
 */
export function Ame({ size = 180, variant = 'perle', state = 'rest', signal = 0 }: Props) {
  const reduce = useReducedMotion();
  const focused = useIsFocused();
  const clock = useSharedValue(2);
  const amp = useSharedValue(0);
  const swirl = useSharedValue(0);
  const pulse = useSharedValue(0);
  const flash = useSharedValue(0);

  const frame = useFrameCallback((f) => {
    clock.set(2 + f.timeSinceFirstFrame / 1000);
  }, false);

  useEffect(() => {
    const update = (s: string) => frame.setActive(!reduce && focused && s === 'active');
    update(AppState.currentState);
    const sub = AppState.addEventListener('change', update);
    return () => sub.remove();
  }, [frame, reduce, focused]);

  useEffect(() => {
    swirl.set(withTiming(state === 'think' ? 1 : 0, { duration: motion.base }));
    if (state === 'success') {
      flash.set(withSequence(withSpring(1, motion.springBouncy), withTiming(0, { duration: 600 })));
    }
  }, [state, swirl, flash]);

  useEffect(() => {
    if (!signal) return;
    if (state === 'listen') amp.set(withSequence(withTiming(1, { duration: 80 }), withTiming(0, { duration: motion.slow })));
    if (state === 'answer') pulse.set(withSequence(withTiming(1, { duration: 90 }), withSpring(0, motion.springSoft)));
  }, [signal, state, amp, pulse]);

  const uniforms = useDerivedValue(() => ({
    res: [size, size],
    t: clock.get(),
    amp: amp.get(),
    swirl: swirl.get(),
    pulse: pulse.get(),
    flash: flash.get(),
  }));

  return (
    <Canvas style={{ width: size, height: size }} accessibilityRole="image" accessibilityLabel="Dalili">
      <Fill>
        <Shader source={effects[variant]} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}
