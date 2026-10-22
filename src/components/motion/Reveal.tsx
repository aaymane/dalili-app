import { createContext, useContext, type ReactNode } from 'react';
import { useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  measure,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import { EASE_OUT } from '@/theme/motion';

import { useScrollY } from './scroll';

const RevealContext = createContext<SharedValue<number> | null>(null);

/** Progression d'apparition (0 → 1) de la section `Reveal` qui contient ce composant, ou `null`. */
export const useReveal = () => useContext(RevealContext);

/**
 * Fait apparaître une section quand elle entre à l'écran au défilement, une seule fois.
 * Tout se passe sur le thread UI (mesure + animation) : aucun rendu React pendant le défilement.
 * Les enfants peuvent se caler dessus avec `useReveal()` (anneau, trajet de l'avion…).
 */
export function Reveal({ children, style, delay = 0 }: { children: ReactNode; style?: StyleProp<ViewStyle>; delay?: number }) {
  const ref = useAnimatedRef<Animated.View>();
  const scrollY = useScrollY();
  const reduced = useReducedMotion();
  const { height } = useWindowDimensions();
  const shown = useSharedValue(reduced || !scrollY ? 1 : 0);
  const started = useSharedValue(reduced || !scrollY);

  const check = () => {
    'worklet';
    if (started.get()) return;
    const m = measure(ref);
    // La section commence à se montrer au-dessus du dernier sixième de l'écran.
    if (m && m.pageY < height * 0.85) {
      started.set(true);
      shown.set(withDelay(delay, withTiming(1, { duration: 520, easing: EASE_OUT })));
    }
  };

  useAnimatedReaction(
    () => scrollY?.get() ?? 0,
    () => check(),
  );

  const aStyle = useAnimatedStyle(() => ({
    opacity: shown.get(),
    transform: [{ translateY: (1 - shown.get()) * 28 }, { scale: 0.97 + shown.get() * 0.03 }],
  }));

  return (
    <RevealContext value={shown}>
      <Animated.View ref={ref} style={[style, aStyle]} onLayout={() => scheduleOnUI(check)}>
        {children}
      </Animated.View>
    </RevealContext>
  );
}
