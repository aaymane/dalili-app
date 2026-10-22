import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { useReveal } from '@/components/motion/Reveal';
import { EASE_IN_OUT } from '@/theme/motion';
import { depth } from '@/theme/tokens';

const APath = Animated.createAnimatedComponent(Path);

const H = 64;
const PAD = 10;
const PLANE = 28;
/** Silhouette d'avion vue de dessus, nez vers la droite (repère 24 × 24). */
const PLANE_PATH =
  'M22 12c0-.8-1-1-2-1h-6L10 3.5H8l2.5 7.5h-5L3.8 8H2.5l1 4-1 4h1.3l1.7-3h5L8 20.5h2l4-7.5h6c1 0 2-.2 2-1z';

/** Point et angle sur l'arc (courbe de Bézier quadratique) au temps t. */
function along(t: number, w: number) {
  'worklet';
  const x0 = PAD;
  const y0 = H - PAD;
  const x1 = w / 2;
  const y1 = -H * 0.35;
  const x2 = w - PAD;
  const y2 = H - PAD;
  const u = 1 - t;
  const x = u * u * x0 + 2 * u * t * x1 + t * t * x2;
  const y = u * u * y0 + 2 * u * t * y1 + t * t * y2;
  const dx = 2 * u * (x1 - x0) + 2 * t * (x2 - x1);
  const dy = 2 * u * (y1 - y0) + 2 * t * (y2 - y1);
  return { x, y, angle: Math.atan2(dy, dx) };
}

function arcLength(w: number) {
  let len = 0;
  let prev = along(0, w);
  for (let i = 1; i <= 40; i++) {
    const p = along(i / 40, w);
    len += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return len;
}

/**
 * Le trajet de la carte « Ta mobilité » : un arc de ta ville à ta ville d'arrivée.
 * Quand la carte apparaît, la part parcourue se trace et l'avion s'envole jusqu'à ta progression,
 * incliné en perspective (DIRECTION.md §5), puis se stabilise. Décoratif : le texte de la carte dit tout.
 */
export function RouteArc({ progress }: { progress: number }) {
  const [w, setW] = useState(0);
  const reveal = useReveal();
  const reduced = useReducedMotion();
  const target = Math.max(0, Math.min(1, progress));
  const fly = useSharedValue(reduced ? target : 0);
  const bank = useSharedValue(reduced ? 0 : 1);
  const len = w ? arcLength(w) : 0;

  // Décolle quand la carte apparaît (ou dès l'affichage hors d'une section `Reveal`), puis suit la progression.
  useAnimatedReaction(
    () => (reveal && reveal.get() < 0.4 ? -1 : target),
    (v, prev) => {
      if (v < 0 || v === prev) return;
      if (reduced) {
        fly.set(v);
        return;
      }
      const first = prev === null || prev < 0;
      fly.set(withDelay(first ? 200 : 0, withTiming(v, { duration: first ? 1600 : 900, easing: EASE_IN_OUT })));
      bank.set(1);
      bank.set(withDelay(first ? 1500 : 800, withSpring(0, { duration: 700, dampingRatio: 0.7 })));
    },
    [target, reduced],
  );

  const traveled = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - fly.get()) }));

  const plane = useAnimatedStyle(() => {
    if (!w) return { opacity: 0 };
    const t = 0.03 + fly.get() * 0.94;
    const p = along(t, w);
    return {
      opacity: 1,
      transform: [
        { translateX: p.x - PLANE / 2 },
        { translateY: p.y - PLANE / 2 },
        { perspective: depth.perspective },
        { rotateZ: `${p.angle}rad` },
        // Roulis pendant le vol : les ailes penchent, puis l'avion se remet à plat.
        { rotateX: `${bank.get() * 28}deg` },
        { scale: 0.9 + bank.get() * 0.12 },
      ],
    };
  });

  const d = w ? `M${PAD} ${H - PAD} Q${w / 2} ${-H * 0.35} ${w - PAD} ${H - PAD}` : '';

  return (
    <View style={styles.box} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {w ? (
        <Svg width={w} height={H} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="route" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#7FA6FF" />
              <Stop offset="1" stopColor="#3D78FF" />
            </LinearGradient>
          </Defs>
          <Path d={d} stroke="rgba(255,255,255,0.28)" strokeWidth={2} strokeDasharray="2 7" strokeLinecap="round" fill="none" />
          <APath d={d} stroke="url(#route)" strokeWidth={3} strokeLinecap="round" fill="none" strokeDasharray={`${len} ${len}`} animatedProps={traveled} />
          <Circle cx={PAD} cy={H - PAD} r={4} fill="#9DB6FF" />
          <Circle cx={w - PAD} cy={H - PAD} r={5} fill="#0D1438" stroke="rgba(255,255,255,0.55)" strokeWidth={2} />
        </Svg>
      ) : null}
      <Animated.View style={[styles.plane, plane]}>
        <View style={styles.planeGlow} />
        <Svg width={PLANE} height={PLANE} viewBox="0 0 24 24">
          <Path d={PLANE_PATH} fill="#FFFFFF" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { height: H, marginTop: 4 },
  plane: { position: 'absolute', left: 0, top: 0, width: PLANE, height: PLANE },
  planeGlow: { position: 'absolute', left: 4, top: 4, width: PLANE - 8, height: PLANE - 8, borderRadius: PLANE, backgroundColor: 'rgba(61,120,255,0.55)', shadowColor: '#3D78FF', shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
});
