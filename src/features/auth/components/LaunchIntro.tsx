import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { Glow } from '@/components/brand/Glow';
import { LogoMark } from '@/components/brand/Logo';
import { Text } from '@/components/ui/Text';
import { EASE_IN_OUT, EASE_OUT, rise } from '@/theme/motion';
import { palette } from '@/theme/tokens';

/**
 * Ouverture de l'app (docs/DIRECTION.md §3, « Lancement »). La première image reproduit l'écran de lancement natif
 * (app.json → expo-splash-screen : fond `navyDeep`, monogramme blanc de 96 pt dont ≈ 80,6 pt visibles, centré) :
 * aucune coupure quand il disparaît. Puis le halo s'allume, le logo glisse à sa place et « DALILI » s'écrit.
 * Une seule fois par lancement : si on revient sur l'accueil (déconnexion), il apparaît simplement.
 */
const SPLASH_MARK = (96 * 430) / 512; // largeur visible du monogramme dans splash-icon.png
const WORD = 'DALILI';

/** Repères de la chorégraphie (ms). Le logo respire au centre, puis monte ; les lettres arrivent quand il se pose. Lisible à ≈ 2,7 s. */
export const INTRO = { bloom: 900, move: 1000, moveFor: 1000, word: 1800, letter: 80, content: 2050 } as const;

/** L'écran de lancement natif, à l'identique : affiché tant que l'app se prépare (polices, session). */
export function SplashFrame() {
  return (
    <View style={{ flex: 1, backgroundColor: palette.navyDeep, alignItems: 'center', justifyContent: 'center' }}>
      <LogoMark size={SPLASH_MARK} color="#fff" />
    </View>
  );
}

let played = false;

/** `true` au premier affichage de l'accueil depuis le lancement de l'app. */
export function useLaunchIntro() {
  const [play] = useState(() => !played);
  useEffect(() => {
    played = true;
  }, []);
  return play;
}

/** Fond plat de l'écran de lancement, qui s'efface pour révéler la nuit pendant que les étoiles s'allument. */
export function SplashCover() {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.set(reduced ? 0 : withDelay(400, withTiming(0, { duration: 1400, easing: EASE_OUT })));
  }, [opacity, reduced]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: palette.navyDeep }, style]} />;
}

/**
 * Logo flottant : part du centre de l'écran (là où était celui du lancement) et rejoint `target`,
 * l'emplacement réservé dans la mise en page, mesuré dans la fenêtre.
 */
export function FlyingMark({ size, target }: { size: number; target: { x: number; y: number } | null }) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const scale = useSharedValue(SPLASH_MARK / size);
  const white = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (!target) return;
    const toX = target.x + size / 2 - width / 2;
    const toY = target.y + (size * 0.99) / 2 - height / 2;
    if (reduced) {
      dx.set(toX);
      dy.set(toY);
      scale.set(1);
      white.set(0);
      return;
    }
    const travel = (to: number) => withDelay(INTRO.move, withTiming(to, { duration: INTRO.moveFor, easing: EASE_IN_OUT }));
    dx.set(travel(toX));
    dy.set(travel(toY));
    // Au centre, le logo prend une inspiration (×1,08) pendant que le halo s'allume, puis rejoint sa place.
    const start = SPLASH_MARK / size;
    scale.set(
      withSequence(
        withTiming(start * 1.08, { duration: INTRO.bloom, easing: EASE_OUT }),
        withDelay(INTRO.move - INTRO.bloom, withTiming(1, { duration: INTRO.moveFor, easing: EASE_IN_OUT })),
      ),
    );
    white.set(withDelay(INTRO.move, withTiming(0, { duration: 800, easing: EASE_OUT })));
    glow.set(withSequence(withTiming(1, { duration: INTRO.bloom, easing: EASE_OUT }), withDelay(200, withTiming(0, { duration: 800, easing: EASE_OUT }))));
  }, [target, size, width, height, reduced, dx, dy, scale, white, glow]);

  const move = useAnimatedStyle(() => ({
    transform: [{ translateX: dx.value }, { translateY: dy.value }, { scale: scale.value }],
  }));
  const whiteStyle = useAnimatedStyle(() => ({ opacity: white.value }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 0.6 + glow.value * 0.4 }],
  }));
  const halo = size * 3;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: width / 2 - size / 2,
          top: height / 2 - (size * 0.99) / 2,
          width: size,
          height: size * 0.99,
        },
        move,
      ]}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: (size - halo) / 2,
            top: (size * 0.99 - halo) / 2,
          },
          glowStyle,
        ]}>
        <Glow size={halo} color={palette.electricLight} opacity={0.7} />
      </Animated.View>
      <LogoMark size={size} color={palette.electricLight} />
      <Animated.View style={[StyleSheet.absoluteFill, whiteStyle]}>
        <LogoMark size={size} color="#fff" />
      </Animated.View>
    </Animated.View>
  );
}

/** Emplacement du logo dans la mise en page : invisible, il donne sa position au logo flottant. */
export function MarkSlot({ size, onMeasure }: { size: number; onMeasure: (p: { x: number; y: number }) => void }) {
  const ref = useRef<View>(null);
  return <View ref={ref} style={{ width: size, height: size * 0.99 }} onLayout={() => ref.current?.measureInWindow((x, y) => onMeasure({ x, y }))} />;
}

/** « DALILI » qui s'écrit lettre par lettre. */
export function Wordmark({ play, style }: { play: boolean; style: object }) {
  return (
    <View style={{ flexDirection: 'row' }} accessible accessibilityRole="header" accessibilityLabel="DALILI">
      {WORD.split('').map((l, i) => (
        <Animated.View key={i} entering={rise(play ? INTRO.word + i * INTRO.letter : 0)}>
          <Text variant="h1" color="#fff" style={style}>
            {l}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
}
