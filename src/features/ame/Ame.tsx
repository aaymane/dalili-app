import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Oval,
  Path,
  RadialGradient,
  Shader,
  Skia,
  vec,
  type SkPath,
} from '@shopify/react-native-skia';
import { useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import {
  Easing,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type DerivedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { motion, palette } from '@/theme/tokens';

import { FACE, LOGO_CENTER, LOGO_SIZE, PIECE_BAS, PIECE_HAUT } from './shaders';

export type AmeState = 'rest' | 'listen' | 'think' | 'answer' | 'success';

const face = Skia.RuntimeEffect.Make(FACE)!;
const pieces = [
  { path: Skia.Path.MakeFromSVGString(PIECE_HAUT)!, sign: -1 },
  { path: Skia.Path.MakeFromSVGString(PIECE_BAS)!, sign: 1 },
];
const TAU = Math.PI * 2;

type FaceUniforms = { c: number[]; r: number; t: number; sweep: number; glow: number; flash: number };
/** Direction d'ouverture des deux pièces (repère écran, normalisée à la main). */
const OPEN = { x: 0.33, y: 0.94 };

/** Couleur des tranches d'extrusion : navy au fond → électrique sous la face. */
function sliceColor(f: number) {
  const a = [0x0b, 0x12, 0x33];
  const b = [0x0a, 0x3a, 0xc8];
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

type Motion = {
  size: number;
  t: SharedValue<number>;
  rx: SharedValue<number>;
  ry: SharedValue<number>;
  rz: SharedValue<number>;
  sep: SharedValue<number>;
  pop: SharedValue<number>;
};

/** Transformation 3D d'une tranche (z en px) d'une pièce (sign ±1). */
function useSlice({ size, t, rx, ry, rz, sep, pop }: Motion, sign: number, z: number) {
  const k = (size * 0.6) / LOGO_SIZE;
  return useDerivedValue(() => {
    const s = sep.get();
    const time = t.get();
    return [
      { translateX: size / 2 },
      { translateY: size / 2 + Math.sin(time * 0.8) * size * 0.012 },
      { perspective: size * 3.2 },
      { rotateZ: rz.get() },
      { rotateY: ry.get() + Math.sin(time * 0.55) * 0.32 },
      { rotateX: rx.get() + Math.sin(time * 0.42 + 1) * 0.14 },
      { scale: pop.get() },
      { translateX: sign * OPEN.x * s * size * 0.14 },
      { translateY: sign * OPEN.y * s * size * 0.14 },
      { translateZ: z - sign * s * size * 0.12 },
      { scale: k },
      { translateX: -LOGO_CENTER.x },
      { translateY: -LOGO_CENTER.y },
    ];
  });
}

function Slice({ m, path, sign, z, color }: { m: Motion; path: SkPath; sign: number; z: number; color: string }) {
  const transform = useSlice(m, sign, z);
  return <Path path={path} color={color} transform={transform} />;
}

function Face({ m, path, sign, z, uniforms, rim }: { m: Motion; path: SkPath; sign: number; z: number; uniforms: DerivedValue<FaceUniforms>; rim: boolean }) {
  const transform = useSlice(m, sign, z);
  return (
    <Group transform={transform}>
      <Path path={path}>
        <Shader source={face} uniforms={uniforms} />
      </Path>
      {rim ? <Path path={path} style="stroke" strokeWidth={0.9} color="rgba(234,241,255,0.75)" /> : null}
    </Group>
  );
}

type Props = {
  size?: number;
  state?: AmeState;
  /** Incrémenter à chaque frappe (écoute) ou paquet reçu (réponse) pour une impulsion. */
  signal?: number;
  /** Fond sur lequel l'Âme est posée : halo additif sur fond sombre, ombre douce sur fond clair. */
  surface?: 'dark' | 'light';
};

/**
 * L'Âme de Dalili : le monogramme en 3D, deux pièces extrudées qui s'emboîtent,
 * face avant en lumière liquide. Thread UI uniquement (Skia + Reanimated).
 * Seule boucle de l'écran ; pose fixe si « Réduire les animations » ; pause hors focus.
 */
export function Ame({ size = 160, state = 'rest', signal = 0, surface = 'dark' }: Props) {
  const reduce = useReducedMotion();
  const focused = useIsFocused();
  const small = size < 64;
  const slices = small ? 4 : 10;
  const depth = size * (small ? 0.07 : 0.085);

  const t = useSharedValue(0);
  const rx = useSharedValue(reduce ? 0.12 : 0);
  const ry = useSharedValue(reduce ? -0.26 : 0.9);
  const rz = useSharedValue(0);
  const sep = useSharedValue(reduce ? 0 : 1.4);
  const pop = useSharedValue(1);
  const glow = useSharedValue(0);
  const flash = useSharedValue(0);
  const opacity = useSharedValue(reduce ? 1 : 0);
  const m: Motion = { size, t, rx, ry, rz, sep, pop };

  const frame = useFrameCallback((f) => {
    t.set(f.timeSinceFirstFrame / 1000);
  }, false);

  useEffect(() => {
    const update = (s: string | null | undefined) => frame.setActive(!reduce && focused && s === 'active');
    update(AppState.currentState);
    const sub = AppState.addEventListener('change', update);
    return () => sub.remove();
  }, [frame, reduce, focused]);

  // Entrée : les deux pièces arrivent de coins opposés et se verrouillent.
  useEffect(() => {
    if (reduce) return;
    opacity.set(withTiming(1, { duration: motion.slow }));
    sep.set(withDelay(120, withSpring(0, { damping: 14, stiffness: 90 })));
    ry.set(withSpring(0, motion.springSoft));
  }, [reduce, opacity, sep, ry]);

  useEffect(() => {
    if (reduce) return;
    glow.set(withTiming(state === 'answer' ? 0.7 : state === 'think' ? 0.35 : 0, { duration: motion.base }));
    if (state === 'think') {
      sep.set(withSpring(0.22, motion.springSoft));
      const from = rz.get();
      rz.set(withRepeat(withTiming(from + TAU, { duration: 2200, easing: Easing.linear }), -1, false));
      return;
    }
    // Sortie de réflexion : on revient au tour entier le plus proche, puis on se reverrouille.
    rz.set(withSpring(Math.round(rz.get() / TAU) * TAU, motion.springSoft));
    if (state === 'success') {
      sep.set(withSequence(withTiming(0.7, { duration: 200 }), withSpring(0, motion.springBouncy)));
      flash.set(withSequence(withDelay(220, withTiming(1, { duration: 120 })), withTiming(0, { duration: 600 })));
      rz.set(withTiming(Math.round(rz.get() / TAU) * TAU + TAU, { duration: 1100, easing: Easing.out(Easing.cubic) }));
    } else {
      sep.set(withSpring(0, motion.springSoft));
    }
  }, [state, reduce, glow, sep, rz, flash]);

  useEffect(() => {
    if (!signal || reduce) return;
    if (state === 'listen') sep.set(withSequence(withTiming(0.16, { duration: 70 }), withSpring(0, motion.springSoft)));
    if (state === 'answer') {
      pop.set(withSequence(withTiming(1.045, { duration: 90 }), withSpring(1, motion.springSoft)));
      glow.set(withSequence(withTiming(1, { duration: 90 }), withTiming(0.7, { duration: motion.slow })));
    }
  }, [signal, state, reduce, sep, pop, glow]);

  const uniforms = useDerivedValue(() => ({
    c: [LOGO_CENTER.x, LOGO_CENTER.y],
    r: LOGO_SIZE * 0.55,
    t: t.get(),
    sweep: (ry.get() + Math.sin(t.get() * 0.55) * 0.32) * 2.4 + Math.sin(t.get() * 0.3) * 0.5,
    glow: glow.get(),
    flash: flash.get(),
  }));
  const haloOpacity = useDerivedValue(() => 0.7 + glow.get() * 0.35 + flash.get() * 0.4);
  const shadowOpacity = useDerivedValue(() => opacity.get() * 0.22 * (1 - sep.get() * 0.3));

  const layers = Array.from({ length: slices }, (_, i) => -depth + (depth * i) / slices);

  return (
    <Canvas style={{ width: size, height: size }} accessibilityRole="image" accessibilityLabel="Dalili">
      <Group opacity={opacity}>
        {surface === 'dark' ? (
          <Circle cx={size / 2} cy={size / 2} r={size * 0.5} opacity={haloOpacity} blendMode="screen">
            <RadialGradient
              c={vec(size / 2, size / 2)}
              r={size * 0.5}
              colors={['rgba(120,160,255,0.85)', 'rgba(1,77,248,0.45)', 'rgba(91,92,240,0)']}
            />
          </Circle>
        ) : (
          <Oval
            x={size * 0.24}
            y={size * 0.84}
            width={size * 0.52}
            height={size * 0.07}
            color={palette.navy}
            opacity={shadowOpacity}
          >
            <BlurMask blur={size * 0.04} style="normal" />
          </Oval>
        )}
        {layers.map((z, i) =>
          pieces.map((p) => (
            <Slice key={`${i}${p.sign}`} m={m} path={p.path} sign={p.sign} z={z} color={sliceColor(i / slices)} />
          )),
        )}
        {pieces.map((p) => (
          <Face key={p.sign} m={m} path={p.path} sign={p.sign} z={0} uniforms={uniforms} rim={small} />
        ))}
      </Group>
    </Canvas>
  );
}
