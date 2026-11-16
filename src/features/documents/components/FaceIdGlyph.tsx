import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { EASE_IN_OUT, EASE_OUT } from '@/theme/motion';

export type GlyphPhase = 'idle' | 'scanning' | 'success' | 'failed';

const APath = Animated.createAnimatedComponent(Path);
const ACircle = Animated.createAnimatedComponent(Circle);

/** Boîte de 96 : le cadre va de 8 à 88 (80 de côté), centre à 48. */
const S = 96;
const A = 8;
const B = 88;
const HALF = 40;
const R0 = 17; // rayon des coins au repos
const ARM0 = 9; // longueur des branches au repos
/** Coche : deux segments, longueur totale pour le tracé. */
const CHECK = 'M33 49 L44 60 L64 38';
const CHECK_LEN = Math.hypot(11, 11) + Math.hypot(20, 22);

/**
 * Coin du cadre. `m` = 0 : crochet arrondi façon Face ID ; `m` = 1 : quart de cercle. Les quatre coins réunis à
 * `m` = 1 forment un anneau complet (rayon 40 centré), d'où le passage « crochets → anneau » sans couture.
 */
function corner(i: 0 | 1 | 2 | 3, m: number) {
  'worklet';
  const r = R0 + (HALF - R0) * m;
  const b = ARM0 * (1 - m);
  switch (i) {
    case 0:
      return `M${A} ${A + r + b} L${A} ${A + r} A${r} ${r} 0 0 1 ${A + r} ${A} L${A + r + b} ${A}`;
    case 1:
      return `M${B - r - b} ${A} L${B - r} ${A} A${r} ${r} 0 0 1 ${B} ${A + r} L${B} ${A + r + b}`;
    case 2:
      return `M${B} ${B - r - b} L${B} ${B - r} A${r} ${r} 0 0 1 ${B - r} ${B} L${B - r - b} ${B}`;
    default:
      return `M${A + r + b} ${B} L${A + r} ${B} A${r} ${r} 0 0 1 ${A} ${B - r} L${A} ${B - r - b}`;
  }
}

function Corner({ i, m, color }: { i: 0 | 1 | 2 | 3; m: SharedValue<number>; color: string }) {
  const props = useAnimatedProps(() => ({ d: corner(i, m.get()) }));
  return <APath animatedProps={props} stroke={color} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />;
}

type Props = { phase: GlyphPhase; color: string; success: string; size?: number };

/**
 * Le visage Face ID du coffre. Repos : crochets et visage qui respire. Scan : le visage s'efface, les coins se
 * courbent en anneau ouvert qui tourne. Reconnu : l'anneau se ferme sur un disque vert et la coche se trace.
 * Refusé : retour aux crochets avec un « non » de la tête. Réduction des animations : changements d'état directs.
 */
export function FaceIdGlyph({ phase, color, success, size = 112 }: Props) {
  const reduced = useReducedMotion();
  const m = useSharedValue(0); // crochets → anneau
  const face = useSharedValue(1); // visage visible
  const spin = useSharedValue(0); // degrés
  const check = useSharedValue(0); // coche tracée
  const fill = useSharedValue(0); // disque vert
  const shake = useSharedValue(0);
  const breathe = useSharedValue(0);

  useEffect(() => {
    const t = (to: number, duration: number, easing = EASE_OUT) => (reduced ? to : withTiming(to, { duration, easing }));
    cancelAnimation(spin);
    cancelAnimation(breathe);
    if (phase === 'scanning') {
      breathe.set(0);
      face.set(t(0, 220));
      m.set(t(0.72, 420, EASE_IN_OUT));
      if (!reduced) {
        const from = spin.get() % 360;
        spin.set(from);
        spin.set(withRepeat(withTiming(from + 360, { duration: 1100, easing: Easing.linear }), -1));
      }
      return;
    }
    // Hors scan, l'anneau se pose sur un multiple de 90° : les quatre coins retombent à leur place.
    const rest = Math.ceil(spin.get() / 90) * 90;
    spin.set(reduced ? 0 : withTiming(rest, { duration: 260, easing: EASE_OUT }));
    if (phase === 'success') {
      m.set(t(1, 300));
      face.set(t(0, 160));
      fill.set(reduced ? 1 : withDelay(140, withTiming(1, { duration: 320, easing: EASE_OUT })));
      check.set(reduced ? 1 : withDelay(240, withTiming(1, { duration: 360, easing: EASE_OUT })));
      return;
    }
    fill.set(t(0, 200));
    check.set(t(0, 160));
    m.set(t(0, 380, EASE_IN_OUT));
    face.set(reduced ? 1 : withDelay(160, withTiming(1, { duration: 260, easing: EASE_OUT })));
    if (phase === 'failed' && !reduced) {
      const d = { duration: 55, easing: Easing.inOut(Easing.quad) };
      shake.set(
        withSequence(withTiming(-9, d), withTiming(9, d), withTiming(-7, d), withTiming(6, d), withTiming(-3, d), withTiming(0, d)),
      );
    }
    if (phase === 'idle' && !reduced) {
      breathe.set(withDelay(500, withRepeat(withTiming(1, { duration: 1800, easing: EASE_IN_OUT }), -1, true)));
    }
  }, [phase, reduced, m, face, spin, check, fill, shake, breathe]);

  const frame = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get()}deg` }] }));
  const whole = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.get() }, { scale: interpolate(breathe.get(), [0, 1], [1, 1.035]) }],
  }));
  const faceProps = useAnimatedProps(() => ({ opacity: face.get() }));
  const fillProps = useAnimatedProps(() => ({ opacity: fill.get() * 0.95, r: interpolate(fill.get(), [0, 1], [30, HALF]) }));
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LEN * (1 - check.get()), opacity: check.get() > 0.02 ? 1 : 0 }));

  return (
    <Animated.View style={[{ width: size, height: size }, whole]}>
      <Svg width={size} height={size} viewBox={`0 0 ${S} ${S}`} style={{ position: 'absolute' }}>
        <ACircle cx={48} cy={48} fill={success} animatedProps={fillProps} />
      </Svg>
      <Animated.View style={[{ position: 'absolute', width: size, height: size }, frame]}>
        <Svg width={size} height={size} viewBox={`0 0 ${S} ${S}`}>
          {([0, 1, 2, 3] as const).map((i) => (
            <Corner key={i} i={i} m={m} color={color} />
          ))}
        </Svg>
      </Animated.View>
      <View style={{ position: 'absolute', width: size, height: size }}>
        <Svg width={size} height={size} viewBox={`0 0 ${S} ${S}`}>
          <APath
            animatedProps={faceProps}
            d="M34 34 V42 M62 34 V42 M48 36 V52 Q48 55 45 55 M36 64 Q48 73 60 64"
            stroke={color}
            strokeWidth={4.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <APath
            animatedProps={checkProps}
            d={CHECK}
            stroke={color}
            strokeWidth={5.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={[CHECK_LEN, CHECK_LEN]}
            fill="none"
          />
        </Svg>
      </View>
    </Animated.View>
  );
}
