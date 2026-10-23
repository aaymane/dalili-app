import { Canvas, DashPathEffect, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import { router } from 'expo-router';
import { Check, MapPin } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  measure,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { useScrollY } from '@/components/motion/scroll';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useProfile } from '@/features/profile/store';
import { haptics } from '@/lib/haptics';
import { EASE_OUT } from '@/theme/motion';
import { palette } from '@/theme/tokens';

import { buildMilestones, pathGeometry, type Milestone, type PathGeometry } from '../path';
import { useTicket } from '../ticket';
import { useJourney } from '../store';
import { PLANE_PATH } from './RouteArc';
import { StepIcon } from './StepIcon';
import { LockedTicket, Ticket } from './Ticket';

const NODE = 44;
const PLANE = 30;
/** Le sentier continue sous le dernier jalon jusqu'au billet. */
const TO_TICKET = 84;
/** Hauteur approximative du billet, pour finir le tracé quand il arrive. */
const TICKET_H = 156;

/**
 * « Ton chemin » (docs/VISION.md §4.B) : un sentier de ta ville à ta nouvelle vie, qui se trace au fil du défilement
 * (lié au doigt, dans les deux sens). L'avion suit la tangente jusqu'à « Tu es ici » ; la suite est en pointillés.
 * Au bout, le billet, verrouillé tant que le visa n'est pas validé.
 */
export function JourneyPath() {
  const profile = useProfile((s) => s.profile);
  const j = useJourney();
  const milestones = useMemo(() => buildMilestones(profile, j.all), [profile, j.all]);
  const [width, setWidth] = useState(0);
  const geo = useMemo(() => (width ? pathGeometry(width, milestones.length, TO_TICKET) : null), [width, milestones.length]);
  const skPath = useMemo(() => (geo ? Skia.Path.MakeFromSVGString(geo.d) : null), [geo]);

  const here = milestones.findIndex((m) => m.status === 'current');
  const target = geo ? (here >= 0 ? geo.at[here] : 1) : 0;

  // Progression du tracé (0 → 1) : la section qui monte dans l'écran dessine le sentier.
  const ref = useAnimatedRef<Animated.View>();
  const scrollY = useScrollY();
  const reduced = useReducedMotion();
  const { height: screenH } = useWindowDimensions();
  const reveal = useSharedValue(reduced || !scrollY ? 1 : 0);
  const arrived = useSharedValue(false);

  const check = () => {
    'worklet';
    if (reduced || !scrollY) return;
    const m = measure(ref);
    if (!m || !m.height) return;
    // Commence quand le haut du chemin arrive à 85 % de la hauteur de l'écran ; complet quand le haut du billet atteint 75 %.
    const v = (screenH * 0.85 - m.pageY) / (m.height - TICKET_H + screenH * 0.1);
    reveal.set(Math.min(1, Math.max(0, v)));
  };
  useAnimatedReaction(
    () => scrollY?.get() ?? 0,
    () => check(),
  );

  // L'avion se pose sur « Tu es ici » : un petit retour haptique, une fois.
  const traveled = useDerivedValue(() => Math.min(reveal.get(), target));
  // L'avion s'arrête juste avant la pastille « Tu es ici », pour ne pas la cacher.
  const stop = geo && here >= 0 ? Math.max(0, target - (NODE * 0.9) / geo.length) : target;
  const flight = useDerivedValue(() => Math.min(reveal.get(), stop));
  useAnimatedReaction(
    () => target > 0 && reveal.get() >= target,
    (now, prev) => {
      if (now && !prev && !arrived.get() && !reduced) {
        arrived.set(true);
        scheduleOnRN(haptics.select);
      }
    },
  );

  const ticket = useTicket();

  return (
    <Animated.View
      ref={ref}
      onLayout={(e) => {
        setWidth(e.nativeEvent.layout.width);
        scheduleOnUI(check);
      }}>
      {geo && skPath ? (
        <View style={{ height: geo.height }}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Canvas style={{ width, height: geo.height + 4 }}>
              <Path path={skPath} style="stroke" strokeWidth={3} strokeCap="round" color="#C5CDE3" start={0} end={reveal}>
                <DashPathEffect intervals={[2, 9]} />
              </Path>
              <Path path={skPath} style="stroke" strokeWidth={5} strokeCap="round" start={0} end={traveled}>
                <LinearGradient start={vec(0, 0)} end={vec(0, geo.height)} colors={[palette.electricLight, palette.electric]} />
              </Path>
            </Canvas>
          </View>
          {milestones.map((m, i) => (
            <Node key={m.id} m={m} pos={geo.nodes[i]} at={geo.at[i]} reveal={reveal} left={i % 2 === 0} width={width} />
          ))}
          <FlyingPlane geo={geo} traveled={flight} />
        </View>
      ) : null}
      <View style={{ marginTop: 6 }}>{ticket.unlocked ? <Ticket data={ticket.data} /> : <LockedTicket />}</View>
    </Animated.View>
  );
}

/** Un jalon : pastille + titre. Il se pose quand le tracé l'atteint. */
function Node({
  m,
  pos,
  at,
  reveal,
  left,
  width,
}: {
  m: Milestone;
  pos: { x: number; y: number };
  at: number;
  reveal: SharedValue<number>;
  left: boolean;
  width: number;
}) {
  const style = useAnimatedStyle(() => {
    const on = reveal.get() >= at - 0.01;
    const timing = { duration: 360, easing: EASE_OUT };
    return { opacity: withTiming(on ? 1 : 0.3, timing), transform: [{ scale: withTiming(on ? 1 : 0.86, timing) }] };
  });
  const current = m.status === 'current';
  const done = m.status === 'done';
  const size = current ? NODE + 6 : NODE;
  const labelW = width * 0.6 - NODE / 2 - 12;
  const open = () => (m.stepId ? router.push({ pathname: '/(app)/etape/[id]', params: { id: m.stepId } }) : router.push('/(app)/parcours'));

  return (
    <Animated.View style={[styles.node, { top: pos.y - size / 2, [left ? 'left' : 'right']: (left ? pos.x : width - pos.x) - size / 2 }, style]}>
      <PressableScale
        onPress={open}
        style={[styles.row, { flexDirection: left ? 'row' : 'row-reverse' }]}
        accessibilityRole="button"
        accessibilityLabel={`${m.title}. ${current ? 'Tu es ici. ' : ''}${m.detail}`}>
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          {current ? <View style={styles.halo} /> : null}
          <View
            style={[
              styles.dot,
              { width: size, height: size, borderRadius: size / 2 },
              done && { backgroundColor: palette.electric },
              current && { backgroundColor: '#fff', borderWidth: 3, borderColor: palette.electric },
              m.status === 'todo' && { backgroundColor: '#fff', borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#B7C0DA' },
              m.icon === 'start' && { backgroundColor: palette.navy },
            ]}>
            {m.icon === 'start' ? (
              <MapPin size={18} color="#fff" />
            ) : done ? (
              <Check size={18} color="#fff" strokeWidth={3} />
            ) : (
              <StepIcon name={m.icon} size={18} color={current ? palette.electric : palette.muted} />
            )}
          </View>
        </View>
        <View style={{ width: labelW, alignItems: left ? 'flex-start' : 'flex-end', gap: 2 }}>
          {current ? (
            <View style={styles.here}>
              <Text variant="caption" color="#fff">
                Tu es ici
              </Text>
            </View>
          ) : null}
          <Text variant="bodyStrong" color={m.status === 'todo' ? palette.subtle : palette.navy} align={left ? 'left' : 'right'} numberOfLines={2}>
            {m.title}
          </Text>
          <Text variant="caption" color={done && m.icon !== 'start' ? palette.success : palette.muted} align={left ? 'left' : 'right'}>
            {m.detail}
          </Text>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

/** L'avion suit la tangente du sentier, posé sur la part déjà parcourue. */
function FlyingPlane({ geo, traveled }: { geo: PathGeometry; traveled: SharedValue<number> }) {
  const { lut } = geo;
  const style = useAnimatedStyle(() => {
    const f = Math.min(1, Math.max(0, traveled.get())) * (lut.length - 1);
    const i = Math.min(lut.length - 2, Math.floor(f));
    const k = f - i;
    const a = lut[i];
    const b = lut[i + 1];
    return {
      opacity: traveled.get() > 0.005 ? 1 : 0,
      transform: [{ translateX: a.x + (b.x - a.x) * k - PLANE / 2 }, { translateY: a.y + (b.y - a.y) * k - PLANE / 2 }, { rotate: `${a.a}rad` }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.plane, style]}>
      <View style={styles.planeGlow} />
      <Svg width={PLANE} height={PLANE} viewBox="0 0 24 24">
        <SvgPath d={PLANE_PATH} fill={palette.electric} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  node: { position: 'absolute' },
  row: { alignItems: 'center', gap: 12 },
  dot: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: NODE + 26, height: NODE + 26, borderRadius: (NODE + 26) / 2, backgroundColor: palette.electricSoft },
  here: { backgroundColor: palette.electric, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginBottom: 2 },
  plane: { position: 'absolute', left: 0, top: 0, width: PLANE, height: PLANE },
  planeGlow: {
    position: 'absolute',
    left: 3,
    top: 3,
    width: PLANE - 6,
    height: PLANE - 6,
    borderRadius: PLANE,
    backgroundColor: 'rgba(1,77,248,0.18)',
  },
});
