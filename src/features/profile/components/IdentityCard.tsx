import { Canvas, DashPathEffect, Fill, Group, LinearGradient, Path, PathOp, Shader, Skia, vec } from '@shopify/react-native-skia';
import { BadgeCheck, Camera } from 'lucide-react-native';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, useReducedMotion, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';

import { holoEffect, useDeviceTilt } from '@/components/brand/Holo';
import { LogoMark } from '@/components/brand/Logo';
import { skyEffect, useSkyUniforms } from '@/components/brand/StarField';
import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { EASE_OUT } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { depth, radius } from '@/theme/tokens';

const R = radius.xxl;
const NOTCH = 11;
/** Décalage max du ciel (points) quand le téléphone penche, comme sur le billet. */
const SKY_TILT = 22;

export type IdentityStat = { value: string; label: string; icon?: ReactNode };

type Props = {
  name: string;
  avatarUri?: string | null;
  /** « Casablanca → Paris » pour un étudiant, « Mentor vérifié·e à Paris » pour un mentor. */
  line: string;
  role: string;
  verified?: boolean;
  stats: IdentityStat[];
  /** Étudiant : où il en est (0 → 1), un filet sous les chiffres. */
  progress?: number;
  accent: string;
  onAvatar: () => void;
  avatarA11y: string;
};

/**
 * Fond Skia : dégradé nuit, ciel étoilé et reflet holographique qui suivent l'inclinaison du téléphone, découpés
 * en vrai (coins arrondis + deux encoches de perforation au-dessus des chiffres, comme le billet du Parcours).
 */
function CardBackground({ cut, tilt, on }: { cut: SharedValue<number>; tilt: SharedValue<{ x: number; y: number }>; on: SharedValue<number> }) {
  const { gradients } = useTheme();
  const size = useSharedValue({ width: 0, height: 0 });
  const skyTilt = useDerivedValue(() => ({ x: tilt.get().x * SKY_TILT, y: tilt.get().y * SKY_TILT }));
  const sky = useSkyUniforms(size, { variant: 'card', tilt: skyTilt });
  const clip = useDerivedValue(() => {
    const { width: w, height: h } = size.get();
    const shape = Skia.Path.RRect(Skia.RRectXY(Skia.XYWHRect(0, 0, w, h), R, R));
    const y = cut.get();
    if (!y) return shape;
    const holes = Skia.PathBuilder.Make().addCircle(0, y, NOTCH).addCircle(w, y, NOTCH).detach();
    return Skia.Path.MakeFromOp(shape, holes, PathOp.Difference) ?? shape;
  });
  const perforation = useDerivedValue(() => {
    const { width: w } = size.get();
    const y = cut.get();
    return Skia.PathBuilder.Make().moveTo(NOTCH + 8, y).lineTo(w - NOTCH - 8, y).detach();
  });
  const end = useDerivedValue(() => vec(size.get().width, size.get().height));
  const holo = useDerivedValue(() => ({ res: [size.get().width, size.get().height], tilt: [tilt.get().x, tilt.get().y], on: on.get() }));
  return (
    <Canvas style={StyleSheet.absoluteFill} onSize={size}>
      <Group clip={clip}>
        <Fill>
          <LinearGradient start={vec(0, 0)} end={end} colors={[...gradients.night]} />
        </Fill>
        {skyEffect ? (
          <Fill>
            <Shader source={skyEffect} uniforms={sky} />
          </Fill>
        ) : null}
        {holoEffect ? (
          <Fill>
            <Shader source={holoEffect} uniforms={holo} />
          </Fill>
        ) : null}
        <Path path={perforation} style="stroke" strokeWidth={1.5} color="rgba(255,255,255,0.22)">
          <DashPathEffect intervals={[5, 6]} />
        </Path>
      </Group>
    </Canvas>
  );
}

/**
 * La carte DALILI du Profil : qui tu es, d'où tu pars et où tu vas, et tes chiffres sous la perforation.
 * Elle penche légèrement avec le téléphone et son reflet s'allume à l'ouverture (immobile si le mouvement est réduit).
 */
export function IdentityCard({ name, avatarUri, line, role, verified, stats, progress, accent, onAvatar, avatarA11y }: Props) {
  const { c, gradients } = useTheme();
  const styles = useStyles();
  const reduce = useReducedMotion();
  const tilt = useDeviceTilt();
  const on = useSharedValue(reduce ? 0.5 : 0);
  const cut = useSharedValue(0);
  const fill = useSharedValue(reduce ? (progress ?? 0) : 0);

  useEffect(() => {
    if (reduce) return;
    // La carte s'allume une fois posée, puis le filet de progression se remplit.
    on.set(withDelay(350, withTiming(0.6, { duration: 1000, easing: EASE_OUT })));
  }, [reduce, on]);
  useEffect(() => {
    fill.set(reduce ? (progress ?? 0) : withDelay(500, withTiming(progress ?? 0, { duration: 1100, easing: EASE_OUT })));
  }, [reduce, fill, progress]);

  const lean = useAnimatedStyle(() => ({
    transform: [{ perspective: depth.perspective }, { rotateY: `${tilt.get().x * depth.tilt * 0.6}deg` }, { rotateX: `${-tilt.get().y * depth.tilt * 0.6}deg` }],
  }));
  const bar = useAnimatedStyle(() => ({ transform: [{ scaleX: Math.max(0.0001, fill.get()) }] }));

  return (
    <Animated.View style={[styles.card, lean]}>
      <CardBackground cut={cut} tilt={tilt} on={on} />
      <View
        style={styles.top}
        onLayout={(e) => {
          cut.set(e.nativeEvent.layout.y + e.nativeEvent.layout.height);
        }}>
        <View style={styles.brand}>
          <LogoMark size={22} color={c.white} />
          <View style={styles.role}>
            {verified ? <BadgeCheck size={13} color={c.mentorGlow} /> : null}
            <Text variant="caption" color={c.white}>
              {role}
            </Text>
          </View>
        </View>
        <View style={styles.identity}>
          <PressableScale onPress={onAvatar} accessibilityRole="button" accessibilityLabel={avatarA11y}>
            <Avatar name={name || '?'} uri={avatarUri} size={68} ring="rgba(255,255,255,0.9)" />
            <View style={[styles.camera, { backgroundColor: accent, borderColor: gradients.night[1] }]}>
              <Camera size={13} color={c.white} />
            </View>
          </PressableScale>
          <View style={{ flex: 1, gap: 3 }}>
            <Text variant="h1" color={c.white} numberOfLines={2}>
              {name}
            </Text>
            <Text variant="small" color="rgba(255,255,255,0.75)" numberOfLines={1}>
              {line}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.stub}>
        {progress !== undefined ? (
          <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Animated.View style={[styles.fill, { backgroundColor: c.electricLight }, bar]} />
          </View>
        ) : null}
        <View style={{ flexDirection: 'row' }}>
          {stats.map((s, i) => (
            <View key={s.label} style={[styles.stat, i > 0 && styles.statSep]} accessible accessibilityLabel={`${s.value} ${s.label}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                {s.icon}
                <Text variant="h2" color={c.white}>
                  {s.value}
                </Text>
              </View>
              <Text variant="caption" color="rgba(255,255,255,0.7)" numberOfLines={1}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  card: { borderRadius: R, ...shadow.md, shadowColor: '#0A0F3A', shadowOpacity: 0.28 },
  top: { padding: 20, paddingBottom: 22, gap: 18 },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  role: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.14)' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  camera: { position: 'absolute', end: -2, bottom: -2, width: 28, height: 28, borderRadius: 14, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  stub: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 18, gap: 14 },
  track: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.16)', overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, width: '100%', transformOrigin: 'left' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statSep: { borderStartWidth: StyleSheet.hairlineWidth, borderStartColor: 'rgba(255,255,255,0.2)' },
}));
