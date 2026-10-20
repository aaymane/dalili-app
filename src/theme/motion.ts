import { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { motion } from './tokens';

/** Entrée en cascade plafonnée (DIRECTION.md §3) — respecte la réduction des animations. */
export const enter = (i: number) =>
  FadeInDown.delay(Math.min(i, motion.staggerMax) * motion.stagger)
    .springify()
    .damping(motion.springSoft.damping)
    .stiffness(motion.springSoft.stiffness)
    .reduceMotion(ReduceMotion.System);
