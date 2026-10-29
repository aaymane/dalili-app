import { Canvas, DashPathEffect, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import { router } from 'expo-router';
import { Check, MapPin } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
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
import { useCurrentLanguage, useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { EASE_IN_OUT, EASE_OUT } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';

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
 * (lié au doigt, dans les deux sens). L'avion suit la tangente et avance à chaque étape faite vers « Tu es ici » ; la suite est en pointillés.
 * Au bout, le billet, verrouillé tant que le visa n'est pas validé.
 */
export function JourneyPath() {
  const { c } = useTheme();
  const profile = useProfile((s) => s.profile);
  const j = useJourney();
  // La langue fait partie des dépendances : les titres des jalons sont traduits.
  const language = useCurrentLanguage();
  const milestones = useMemo(() => buildMilestones(profile, j.all), [profile, j.all, language]); // eslint-disable-line react-hooks/exhaustive-deps
  const [width, setWidth] = useState(0);
  const geo = useMemo(() => (width ? pathGeometry(width, milestones.length, TO_TICKET) : null), [width, milestones.length]);
  const skPath = useMemo(() => (geo ? Skia.Path.MakeFromSVGString(geo.d) : null), [geo]);

  const here = milestones.findIndex((m) => m.status === 'current');
  const target = geo ? (here >= 0 ? geo.at[here] : 1) : 0;
  // L'avion avance à chaque étape faite : entre le jalon précédent et « Tu es ici », au prorata des étapes du jalon,
  // en gardant un écart pour ne cacher aucune des deux pastilles.
  const goal = useMemo(() => {
    if (!geo) return 0;
    if (here <= 0) return 1;
    const gap = (NODE * 0.9) / geo.length;
    const from = geo.at[here - 1] + gap;
    const to = target - gap;
    return from + Math.max(0, to - from) * milestones[here].progress;
  }, [geo, here, target, milestones]);

  // Progression du tracé (0 → 1) : la section qui monte dans l'écran dessine le sentier.
  const ref = useAnimatedRef<Animated.View>();
  const scrollY = useScrollY();
  const reduced = useReducedMotion();
  const { height: screenH } = useWindowDimensions();
  const reveal = useSharedValue(reduced || !scrollY ? 1 : 0);
  const arrived = useSharedValue(false);
  // Une étape vient d'être faite : l'avion glisse jusqu'à sa nouvelle place au lieu de sauter.
  const flown = useSharedValue(goal);
  useEffect(() => {
    if (reduced || flown.get() === 0) flown.set(goal);
    else flown.set(withTiming(goal, { duration: 1600, easing: EASE_IN_OUT }));
  }, [goal, reduced, flown]);

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

  // Le trait plein s'arrête sous l'avion : c'est lui qui le dessine.
  const traveled = useDerivedValue(() => Math.min(reveal.get(), flown.get()));
  // L'avion se pose sur sa place : un petit retour haptique, une fois.
  useAnimatedReaction(
    () => goal > 0 && reveal.get() >= goal,
    (now, prev) => {
      if (now && !prev && !arrived.get() && !reduced) {
        arrived.set(true);
        scheduleOnRN(haptics.select);
      }
    },
  );

  const ticket = useTicket();

  return (
    // Le tracé et les jalons sont placés au pixel près : ils gardent le même sens dans toutes les langues.
    <Animated.View
      ref={ref}
      style={{ direction: 'ltr' }}
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
                <LinearGradient start={vec(0, 0)} end={vec(0, geo.height)} colors={[c.electricLight, c.electric]} />
              </Path>
            </Canvas>
          </View>
          {milestones.map((m, i) => (
            <Node key={m.id} m={m} pos={geo.nodes[i]} at={geo.at[i]} reveal={reveal} left={i % 2 === 0} width={width} />
          ))}
          <FlyingPlane geo={geo} traveled={traveled} />
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
  const { c } = useTheme();
  const styles = useStyles();
  const style = useAnimatedStyle(() => {
    const on = reveal.get() >= at - 0.01;
    const timing = { duration: 360, easing: EASE_OUT };
    return { opacity: withTiming(on ? 1 : 0.3, timing), transform: [{ scale: withTiming(on ? 1 : 0.86, timing) }] };
  });
  const current = m.status === 'current';
  const done = m.status === 'done';
  const size = current ? NODE + 6 : NODE;
  const labelW = width * 0.6 - NODE / 2 - 12;
  const t = useT();
  const open = () => (m.stepId ? router.push({ pathname: '/(app)/etape/[id]', params: { id: m.stepId } }) : router.push('/(app)/parcours'));

  return (
    <Animated.View style={[styles.node, { top: pos.y - size / 2, [left ? 'left' : 'right']: (left ? pos.x : width - pos.x) - size / 2 }, style]}>
      <PressableScale
        onPress={open}
        style={[styles.row, { flexDirection: left ? 'row' : 'row-reverse' }]}
        accessibilityRole="button"
        accessibilityLabel={[m.title + '.', current ? t('journey.milestone.hereA11y') : '', m.detail].filter(Boolean).join(' ')}>
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          {current ? <View style={styles.halo} /> : null}
          <View
            style={[
              styles.dot,
              { width: size, height: size, borderRadius: size / 2 },
              done && { backgroundColor: c.electric },
              current && { backgroundColor: c.card, borderWidth: 3, borderColor: c.electric },
              m.status === 'todo' && { backgroundColor: c.card, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#B7C0DA' },
              m.icon === 'start' && { backgroundColor: c.navy },
            ]}>
            {m.icon === 'start' ? (
              <MapPin size={18} color="#fff" />
            ) : done ? (
              <Check size={18} color="#fff" strokeWidth={3} />
            ) : (
              <StepIcon name={m.icon} size={18} color={current ? c.electric : c.muted} />
            )}
          </View>
        </View>
        <View style={{ width: labelW, alignItems: left ? 'flex-start' : 'flex-end', gap: 2 }}>
          {current ? (
            <View style={styles.here}>
              <Text variant="caption" color="#fff">
                {t('journey.milestone.here')}
              </Text>
            </View>
          ) : null}
          <Text variant="bodyStrong" color={m.status === 'todo' ? c.subtle : c.navy} align={left ? 'left' : 'right'} numberOfLines={2}>
            {m.title}
          </Text>
          <Text variant="caption" color={done && m.icon !== 'start' ? c.success : c.muted} align={left ? 'left' : 'right'}>
            {m.detail}
          </Text>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

/** L'avion suit la tangente du sentier, posé sur la part déjà parcourue. */
function FlyingPlane({ geo, traveled }: { geo: PathGeometry; traveled: SharedValue<number> }) {
  const { c } = useTheme();
  const styles = useStyles();
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
        <SvgPath d={PLANE_PATH} fill={c.electric} />
      </Svg>
    </Animated.View>
  );
}

const useStyles = makeStyles(({ c }) => ({
  node: { position: 'absolute' },
  row: { alignItems: 'center', gap: 12 },
  dot: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: NODE + 26, height: NODE + 26, borderRadius: (NODE + 26) / 2, backgroundColor: c.electricSoft },
  here: { backgroundColor: c.electric, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginBottom: 2 },
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
}));
