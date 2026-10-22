import { Easing, FadeOut, LinearTransition, ReduceMotion, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';

import { motion } from './tokens';

/** Courbes (docs/DIRECTION.md §3) : sortie franche pour ce qui entre, aller-retour pour ce qui se déplace à l'écran. */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
/** Feuilles et panneaux qui glissent depuis un bord (courbe des feuilles iOS) : départ franc, arrivée très douce. */
export const EASE_SHEET = Easing.bezier(0.32, 0.72, 0, 1);

/**
 * Entrée maison : fondu + petit déplacement et/ou léger agrandissement, en durée + courbe (pas de ressort,
 * donc aucun rebond). Réduction des animations : l'élément est directement à sa place.
 */
function entrance(delay: number, y: number, scale: number, duration: number, x = 0) {
  return () => {
    'worklet';
    const timing = (to: number) => withDelay(delay, withTiming(to, { duration, easing: EASE_OUT, reduceMotion: ReduceMotion.System }));
    return {
      initialValues: { opacity: 0, transform: [{ translateX: x }, { translateY: y }, { scale }] },
      animations: { opacity: timing(1), transform: [{ translateX: timing(0) }, { translateY: timing(0) }, { scale: timing(1) }] },
    };
  };
}

/** Sortie maison : fondu + petit déplacement, court (ce qui part ne doit pas retenir l'œil). */
function exit(x: number, y: number, scale: number, duration: number) {
  return () => {
    'worklet';
    const timing = (to: number) => withTiming(to, { duration, easing: EASE_OUT, reduceMotion: ReduceMotion.System });
    return {
      initialValues: { opacity: 1, transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] },
      animations: { opacity: timing(0), transform: [{ translateX: timing(x) }, { translateY: timing(y) }, { scale: timing(scale) }] },
    };
  };
}

/** Entrée standard : fondu + montée de 12 px, 360 ms. */
export const rise = (delay = 0) => entrance(delay, 12, 1, 360);

/** Petit élément qui se pose (icône, coche, badge) : fondu + 0,92 → 1, 260 ms. Jamais depuis 0. */
export const pop = (delay = 0) => entrance(delay, 0, 0.92, 260);

/** Cascade du premier écran (DIRECTION.md §3) : i-ème cran, plafonnée. */
export const enter = (i: number) => rise(Math.min(i, motion.staggerMax) * motion.stagger);

/** Élément qui arrive du haut de l'écran (toast) : fondu + descente de 16 px + 0,96 → 1. */
export const drop = () => entrance(0, -16, 0.96, 360);

/** Sa sortie : il remonte d'où il vient. */
export const lift = exit(0, -10, 0.98, 200);

/** Contenu qui défile de côté (mois suivant : `dir` = 1, précédent : -1). */
export const slideIn = (dir: number) => entrance(0, 0, 1, 300, 32 * dir);
/** Sortie de côté. Le sens est lu au moment de partir : l'élément qui s'en va ne connaît pas le changement suivant. */
export const slideOut = (dir: SharedValue<number>) => () => {
  'worklet';
  const timing = (to: number) => withTiming(to, { duration: 180, easing: EASE_OUT, reduceMotion: ReduceMotion.System });
  return {
    initialValues: { opacity: 1, transform: [{ translateX: 0 }] },
    animations: { opacity: timing(0), transform: [{ translateX: timing(-32 * dir.value) }] },
  };
};

/** Carte modale (succès) : monte de 24 px et s'agrandit à peine, sur la courbe des feuilles. Sortie : se rétracte en fondu. */
export const cardIn = () => {
  'worklet';
  const timing = (to: number) => withTiming(to, { duration: 440, easing: EASE_SHEET, reduceMotion: ReduceMotion.System });
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 24 }, { scale: 0.94 }] },
    animations: {
      opacity: withTiming(1, { duration: 220, reduceMotion: ReduceMotion.System }),
      transform: [{ translateY: timing(0) }, { scale: timing(1) }],
    },
  };
};
export const cardOut = exit(0, 8, 0.96, 180);

/** Sortie : un fondu court, sans direction (ce qui part n'a pas besoin d'être suivi des yeux). */
export const leave = FadeOut.duration(120).reduceMotion(ReduceMotion.System);

/** Liste qui se réorganise (filtre, ajout, suppression) : glissement de 300 ms, sans rebond. */
export const reflow = LinearTransition.duration(300).easing(EASE_IN_OUT).reduceMotion(ReduceMotion.System);
