import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, Extrapolation } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Text } from '@/components/ui/Text';
import { EASE_IN_OUT, EASE_OUT } from '@/theme/motion';
import { fonts } from '@/theme/tokens';

/**
 * Le tableau des arrivées d'un aéroport, en petit : chaque chiffre est une tuile coupée en deux sur sa charnière.
 * Quand la valeur change, la moitié haute tombe (rotation en perspective autour de la charnière) et la moitié
 * basse du nouveau chiffre vient se poser. À l'apparition, quelques chiffres défilent avant le bon, en cascade de
 * gauche à droite. Tout tourne sur le thread de l'interface ; le JS ne fait que passer au chiffre suivant (≤ 6 fois).
 * Réduction des animations : le chiffre est directement le bon, sans rotation.
 */

const DIGITS = '0123456789';
/** Volet rapide (chiffres qui défilent) et volet final (le bon chiffre se pose, plus lentement). */
const FAST = 120;
const FINAL = 340;
const PERSPECTIVE = 340;

type Size = { w: number; h: number; font: number; r: number; gap: number };
/** `xl` : un nombre seul (le héros) ; `time` : une heure « 18:30 » qui tient dans la largeur d'un téléphone. */
export const FLAP_SIZES = {
  xl: { w: 92, h: 128, font: 92, r: 18, gap: 10 },
  time: { w: 64, h: 92, font: 64, r: 13, gap: 6 },
  lg: { w: 50, h: 70, font: 46, r: 10, gap: 5 },
} satisfies Record<string, Size>;
export type FlapSize = keyof typeof FLAP_SIZES;

const randomDigit = (not: string) => {
  let d = not;
  while (d === not) d = DIGITS[Math.floor(Math.random() * 10)];
  return d;
};

/** Une moitié de tuile : le glyphe entier, coupé à la charnière (haut ou bas), sur un dégradé de lumière venue d'en haut. */
function Half({ char, size, part }: { char: string; size: Size; part: 'top' | 'bottom' }) {
  return (
    <View style={[styles.half, { height: size.h / 2 }, part === 'top' ? styles.halfTop : styles.halfBottom]}>
      <LinearGradient colors={part === 'top' ? TOP : BOTTOM} style={StyleSheet.absoluteFill} />
      <Text
        allowFontScaling={false}
        style={[
          styles.glyph,
          { fontSize: size.font, lineHeight: size.h, height: size.h, width: size.w, top: part === 'top' ? 0 : -size.h / 2 },
        ]}>
        {char}
      </Text>
    </View>
  );
}

function FlapTile({ char, delay, size }: { char: string; delay: number; size: Size }) {
  const reduce = useReducedMotion();
  // `from` : le chiffre qui part (sa moitié haute tombe), `to` : celui qui arrive.
  const [pair, setPair] = useState({ from: ' ', to: ' ' });
  const p = useSharedValue(1);
  const queue = useRef<string[]>([]);
  const running = useRef(false);
  const settled = useRef(reduce ? char : ' ');

  const run = () => {
    const next = queue.current.shift();
    if (next === undefined) {
      running.current = false;
      return;
    }
    running.current = true;
    const last = queue.current.length === 0;
    setPair({ from: settled.current, to: next });
    settled.current = next;
    p.set(0);
    p.set(
      withTiming(1, { duration: last ? FINAL : FAST, easing: last ? EASE_OUT : EASE_IN_OUT }, (done) => {
        if (done) scheduleOnRN(run);
      }),
    );
  };

  useEffect(() => {
    if (reduce) return;
    if (char === settled.current && !running.current) return;
    // Un chiffre défile 3 à 5 fois avant le bon à l'apparition, 1 fois quand il change ensuite.
    const first = settled.current === ' ';
    const isDigit = DIGITS.includes(char);
    const steps = isDigit ? (first ? 3 + Math.floor(Math.random() * 3) : 1) : 0;
    const path: string[] = [];
    let prev = settled.current;
    for (let i = 0; i < steps; i++) {
      prev = randomDigit(prev === ' ' ? char : prev);
      path.push(prev);
    }
    queue.current = [...path, char];
    if (running.current) return;
    const timer = setTimeout(run, first ? delay : 0);
    return () => clearTimeout(timer);
    // `run` lit ses refs : il n'a pas besoin d'être une dépendance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char, reduce, delay]);

  // La moitié haute de l'ancien chiffre tombe (0 → -90°), puis la moitié basse du nouveau se pose (90° → 0).
  const topFlap = useAnimatedStyle(() => ({
    transform: [{ perspective: PERSPECTIVE }, { rotateX: `${interpolate(p.get(), [0, 0.5], [0, -90], Extrapolation.CLAMP)}deg` }],
    opacity: p.get() < 0.5 ? 1 : 0,
  }));
  const topShade = useAnimatedStyle(() => ({ opacity: interpolate(p.get(), [0, 0.5], [0, 0.45], Extrapolation.CLAMP) }));
  const bottomFlap = useAnimatedStyle(() => ({
    transform: [{ perspective: PERSPECTIVE }, { rotateX: `${interpolate(p.get(), [0.5, 1], [90, 0], Extrapolation.CLAMP)}deg` }],
    opacity: p.get() >= 0.5 ? 1 : 0,
  }));
  const bottomShade = useAnimatedStyle(() => ({ opacity: interpolate(p.get(), [0.5, 1], [0.4, 0], Extrapolation.CLAMP) }));

  // Mouvement réduit : le bon chiffre, tout de suite, sans volet.
  const shown = reduce ? { from: char, to: char } : pair;

  return (
    // L'ombre sur l'enveloppe : sur iOS, une vue qui coupe son contenu (`overflow`) perd son ombre.
    <View style={[styles.tileShadow, { width: size.w, height: size.h, borderRadius: size.r }]}>
      <View style={[styles.tile, { width: size.w, height: size.h, borderRadius: size.r }]}>
      {/* Fixes : en haut le nouveau chiffre (dévoilé par la chute), en bas l'ancien (recouvert à l'arrivée). */}
      <Half char={shown.to} size={size} part="top" />
      <Half char={shown.from} size={size} part="bottom" />
      <Animated.View style={[styles.flap, { height: size.h / 2, top: 0, transformOrigin: 'center bottom' }, topFlap]}>
        <Half char={shown.from} size={size} part="top" />
        <Animated.View style={[StyleSheet.absoluteFill, styles.shade, topShade]} />
      </Animated.View>
      <Animated.View style={[styles.flap, { height: size.h / 2, top: size.h / 2, transformOrigin: 'center top' }, bottomFlap]}>
        <Half char={shown.to} size={size} part="bottom" />
        <Animated.View style={[StyleSheet.absoluteFill, styles.shade, bottomShade]} />
      </Animated.View>
      {/* La charnière : un trait sombre et un reflet d'un pixel, ce qui fait « mécanique ». L'arête haute accroche la lumière. */}
      <View style={[styles.hinge, { top: size.h / 2 - 1 }]} />
      <View style={[styles.edge, { left: size.r, right: size.r }]} />
      {/* Les ergots de l'axe, de chaque côté de la charnière. */}
      <View style={[styles.pin, { top: size.h / 2 - size.h * 0.03, height: size.h * 0.06, left: 0 }]} />
      <View style={[styles.pin, { top: size.h / 2 - size.h * 0.03, height: size.h * 0.06, right: 0 }]} />
      </View>
      {/* Le liseré par-dessus : posé sur la tuile, il ne rétrécit pas la zone des moitiés (sinon elles se chevauchent
          de 2 px et le chiffre fait une marche à la charnière). */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.rim, { borderRadius: size.r }]} />
    </View>
  );
}

/**
 * Une valeur affichée en volets : chiffres et lettres en tuiles, « : » et espaces en séparateurs.
 * `label` est lu par les lecteurs d'écran à la place des tuiles.
 */
export function SplitFlap({ value, label, size = 'lg' }: { value: string; label: string; size?: FlapSize }) {
  const s = FLAP_SIZES[size];
  const dot = Math.round(s.h * 0.08);
  let tileIndex = 0;
  return (
    <View style={[styles.row, { gap: s.gap }]} accessible accessibilityRole="text" accessibilityLabel={label}>
      {[...value].map((ch, i) =>
        ch === ':' ? (
          <View key={`sep-${i}`} style={[styles.colon, { height: s.h, gap: s.h * 0.2 }]}>
            <View style={[styles.dot, { width: dot, height: dot, borderRadius: dot / 2 }]} />
            <View style={[styles.dot, { width: dot, height: dot, borderRadius: dot / 2 }]} />
          </View>
        ) : (
          <FlapTile key={`t-${i}`} char={ch} size={s} delay={90 * tileIndex++} />
        ),
      )}
    </View>
  );
}

/** Tuiles : un bleu nuit plus clair que la carte ; la moitié haute accroche la lumière, la basse s'assombrit vers le bas. */
const TOP = ['#3B47AC', '#2B3690'] as const;
const BOTTOM = ['#242E7D', '#18205E'] as const;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', direction: 'ltr' },
  tileShadow: { shadowColor: '#020515', shadowOpacity: 0.55, shadowRadius: 14, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  tile: { overflow: 'hidden' },
  rim: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  half: { position: 'absolute', left: 0, right: 0, overflow: 'hidden' },
  halfTop: { top: 0 },
  halfBottom: { bottom: 0 },
  glyph: { position: 'absolute', left: 0, textAlign: 'center', color: '#F6F7FF', fontFamily: fonts.displayBlack, includeFontPadding: false },
  flap: { position: 'absolute', left: 0, right: 0, overflow: 'hidden', backfaceVisibility: 'hidden' },
  shade: { backgroundColor: '#000' },
  hinge: { position: 'absolute', left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(6,10,40,0.55)', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  edge: { position: 'absolute', top: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.32)' },
  pin: { position: 'absolute', width: 2, borderRadius: 1, backgroundColor: 'rgba(6,10,40,0.6)' },
  colon: { width: 12, alignItems: 'center', justifyContent: 'center' },
  dot: { backgroundColor: 'rgba(255,255,255,0.88)' },
});
