import { Easing, FadeOut, LinearTransition, ReduceMotion, withDelay, withTiming } from 'react-native-reanimated';

import { motion } from './tokens';

/** Courbes (docs/DIRECTION.md §3) : sortie franche pour ce qui entre, aller-retour pour ce qui se déplace à l'écran. */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
/** Feuilles et panneaux qui glissent depuis un bord (courbe des feuilles iOS) : départ franc, arrivée très douce. */
export const EASE_SHEET = Easing.bezier(0.32, 0.72, 0, 1);

/**
 * Entrée maison : fondu + petite montée et/ou léger agrandissement, en durée + courbe (pas de ressort,
 * donc aucun rebond). Réduction des animations : l'élément est directement à sa place.
 */
function entrance(delay: number, y: number, scale: number, duration: number) {
  return () => {
    'worklet';
    const timing = (to: number) => withDelay(delay, withTiming(to, { duration, easing: EASE_OUT, reduceMotion: ReduceMotion.System }));
    return {
      initialValues: { opacity: 0, transform: [{ translateY: y }, { scale }] },
      animations: { opacity: timing(1), transform: [{ translateY: timing(0) }, { scale: timing(1) }] },
    };
  };
}

/** Entrée standard : fondu + montée de 12 px, 360 ms. */
export const rise = (delay = 0) => entrance(delay, 12, 1, 360);

/** Petit élément qui se pose (icône, coche, badge) : fondu + 0,92 → 1, 260 ms. Jamais depuis 0. */
export const pop = (delay = 0) => entrance(delay, 0, 0.92, 260);

/** Cascade du premier écran (DIRECTION.md §3) : i-ème cran, plafonnée. */
export const enter = (i: number) => rise(Math.min(i, motion.staggerMax) * motion.stagger);

/** Sortie : un fondu court, sans direction (ce qui part n'a pas besoin d'être suivi des yeux). */
export const leave = FadeOut.duration(120).reduceMotion(ReduceMotion.System);

/** Liste qui se réorganise (filtre, ajout, suppression) : glissement de 300 ms, sans rebond. */
export const reflow = LinearTransition.duration(300).easing(EASE_IN_OUT).reduceMotion(ReduceMotion.System);
