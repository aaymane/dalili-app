import { Canvas, Group, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Clock, PhoneCall, Star, Users, Video } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { StarField } from '@/components/brand/StarField';
import { useScrollY } from '@/components/motion/scroll';
import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import type { MentorRequest, MyMentor } from '@/features/mentors/api';
import { appointmentState } from '@/features/mentors/appointments';
import { formatDecimal, useT } from '@/i18n';
import { daysFromToday, formatDayMonth, formatTime, relativeDays } from '@/lib/date';
import { EASE_OUT, rise } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

import { AvailabilityToggle } from './AvailabilityToggle';
import { SplitFlap } from './SplitFlap';

/** La salle d'appel ouvre 15 minutes avant l'heure (règle du site, `appointmentState`). */
const ROOM_OPENS_MS = 15 * 60_000;
/** Défilement sur lequel la carte recule (docs/DIRECTION.md §5 : ≤ 12 px, inclinaison ≤ 6°). */
const DEPTH_RANGE = 320;

/** L'heure, relue toutes les 30 secondes : le compte à rebours et l'ouverture de la salle se mettent à jour seuls. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const pad = (n: number) => String(n).padStart(2, '0');
/** « 18:30 » sur le tableau, dans toutes les langues (le volet ne connaît que les chiffres et les deux points). */
const boardTime = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const dayLabel = (iso: string) => (Math.abs(daysFromToday(iso)) <= 6 ? relativeDays(iso) : formatDayMonth(iso));

/** Le point rouge « en salle » : il respire (immobile si le mouvement est réduit). */
function LivePulse() {
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (!reduce) p.set(withRepeat(withTiming(1, { duration: 900, easing: EASE_OUT }), -1, true));
  }, [p, reduce]);
  const style = useAnimatedStyle(() => ({ opacity: 0.45 + p.get() * 0.55, transform: [{ scale: 0.85 + p.get() * 0.15 }] }));
  return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6B6B' }, style]} />;
}

/**
 * L'aurore : une lueur verte qui descend du haut (la porte du mentor, éclairée quand elle est ouverte), un reflet
 * bleu-violet sur le côté, et un halo derrière les volets. Dessinée une fois (Skia, carte graphique), sans boucle :
 * la boucle de la carte, c'est le ciel étoilé. En pause, elle baisse.
 */
function Aurora({ open }: { open: boolean }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const glow = useSharedValue(open ? 1 : 0.35);
  useEffect(() => {
    glow.set(withTiming(open ? 1 : 0.35, { duration: 600, easing: EASE_OUT }));
  }, [open, glow]);
  const opacity = useDerivedValue(() => glow.get());
  const { w, h } = size;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {w > 0 ? (
        <Canvas style={StyleSheet.absoluteFill}>
          <Group opacity={opacity}>
            <Rect x={0} y={0} width={w} height={h}>
              <RadialGradient c={vec(w * 0.18, -h * 0.05)} r={w * 1.05} colors={['rgba(43,199,143,0.42)', 'rgba(43,199,143,0.10)', 'rgba(43,199,143,0)']} />
            </Rect>
            <Rect x={0} y={0} width={w} height={h}>
              <RadialGradient c={vec(w * 0.5, h * 0.42)} r={w * 0.5} colors={['rgba(125,227,185,0.20)', 'rgba(125,227,185,0)']} />
            </Rect>
          </Group>
          <Rect x={0} y={0} width={w} height={h}>
            <RadialGradient c={vec(w * 1.05, h * 0.55)} r={w * 0.75} colors={['rgba(108,99,255,0.26)', 'rgba(108,99,255,0)']} />
          </Rect>
        </Canvas>
      ) : null}
    </View>
  );
}

/** Les visages qui attendent ta réponse, en pile (4 au plus, puis « +2 »). */
function Faces({ list }: { list: MentorRequest[] }) {
  const { c } = useTheme();
  const t = useT();
  const shown = list.slice(0, 4);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {shown.map((r, i) => (
        <Animated.View key={r.id} entering={rise(520 + i * 70)} style={{ marginStart: i ? -12 : 0, zIndex: shown.length - i }}>
          <Avatar name={r.student ?? t('mentorHome.aStudent')} size={44} color={c.mentor} uri={r.studentAvatarUrl} cacheKey={r.studentAvatarPath} ring="#151C55" />
        </Animated.View>
      ))}
      {list.length > shown.length ? (
        <Text variant="bodyStrong" color="rgba(255,255,255,0.85)" style={{ marginStart: 10 }}>
          +{list.length - shown.length}
        </Text>
      ) : null}
    </View>
  );
}

/** Une pastille de verre : un chiffre du mois. */
function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon}
        <Text variant="h2" color="#fff">
          {value}
        </Text>
      </View>
      <Text variant="caption" color="rgba(255,255,255,0.6)" numberOfLines={2} align="center">
        {label}
      </Text>
    </View>
  );
}

/**
 * Le tableau des arrivées : le héros de l'accueil mentor, et son seul moment nuit. Les grands volets disent la seule
 * chose qui compte maintenant (l'heure de ton prochain appel, sinon combien t'attendent, sinon combien tu as
 * accompagnés ce mois) ; dessous, qui et quoi ; en bas, ton mois en trois chiffres. Ta porte (Ouvert / En pause) vit
 * dans son coin. Au défilement, la carte recule doucement (profondeur liée au doigt, thread de l'interface).
 */
export function ArrivalsBoard({
  mentor,
  next,
  pending,
  helped,
  calls,
}: {
  mentor: MyMentor;
  next?: MentorRequest;
  pending: MentorRequest[];
  helped: number;
  calls: number;
}) {
  const { c, gradients } = useTheme();
  const t = useT();
  const styles = useStyles();
  const now = useNow();
  const reduce = useReducedMotion();
  const { height: screenH } = useWindowDimensions();
  const scrollY = useScrollY();
  const open = mentor.availableThisWeek;

  const depth = useAnimatedStyle(() => {
    const y = scrollY && !reduce ? scrollY.get() : 0;
    const down = Math.max(0, y);
    return {
      transform: [
        { perspective: 900 },
        { translateY: interpolate(down, [0, DEPTH_RANGE], [0, 12], Extrapolation.CLAMP) },
        { rotateX: `${interpolate(down, [0, DEPTH_RANGE], [0, 4], Extrapolation.CLAMP)}deg` },
        // Tirer vers le bas : la carte s'avance un peu, comme pour qu'on la regarde de plus près.
        { scale: y < 0 ? interpolate(y, [-140, 0], [1.03, 1], Extrapolation.CLAMP) : interpolate(down, [0, DEPTH_RANGE], [1, 0.96], Extrapolation.CLAMP) },
      ],
    };
  });

  let flap: string;
  let flapLabel: string;
  let unit: string | null = null;
  let body: React.ReactNode;

  if (next) {
    const live = appointmentState(next, now) === 'live';
    const name = next.student ?? t('mentorHome.aStudent');
    const minutes = Math.max(0, Math.round((new Date(next.startsAt).getTime() - now) / 60_000));
    const left =
      minutes >= 24 * 60
        ? dayLabel(next.startsAt)
        : minutes >= 60
          ? t('mentorHome.next.inHours', { hours: Math.floor(minutes / 60), minutes: pad(minutes % 60) })
          : t('mentorHome.next.inMinutes', { count: minutes });
    flap = boardTime(next.startsAt);
    flapLabel = t('mentorHome.board.nextA11y', { day: dayLabel(next.startsAt), time: formatTime(next.startsAt), name });
    body = (
      <View style={{ gap: 12, alignSelf: 'stretch' }}>
        <Animated.View entering={rise(520)} style={styles.glass}>
          <Avatar name={name} size={48} color={c.mentor} uri={next.studentAvatarUrl} cacheKey={next.studentAvatarPath} ring={c.mentorGlow} />
          <View style={{ flex: 1, gap: 1 }}>
            <Text variant="h3" color="#fff" numberOfLines={1}>
              {name}
            </Text>
            <Text variant="small" color="rgba(255,255,255,0.72)" numberOfLines={1}>
              {next.topic}
            </Text>
          </View>
          <View style={styles.badge}>
            {live ? <LivePulse /> : <Clock size={12} color="#fff" />}
            <Text variant="caption" color="#fff">
              {live ? t('mentorHome.next.live') : left}
            </Text>
          </View>
        </Animated.View>
        <Animated.View entering={rise(600)}>
          {live ? (
            <PressableScale
              haptic="press"
              onPress={() => router.push({ pathname: '/(app)/appel/[id]', params: { id: next.id } })}
              style={styles.cta}
              accessibilityLabel={t('mentorHome.startA11y', { name })}>
              <Video size={18} color={c.navy} />
              <Text variant="button" color={c.navy}>
                {t('mentorHome.start')}
              </Text>
            </PressableScale>
          ) : (
            <Text variant="smallStrong" color="rgba(255,255,255,0.7)" align="center">
              {t('mentorHome.board.opensAt', { time: formatTime(new Date(new Date(next.startsAt).getTime() - ROOM_OPENS_MS).toISOString()) })}
            </Text>
          )}
        </Animated.View>
      </View>
    );
  } else if (pending.length) {
    flap = pad(Math.min(pending.length, 99));
    flapLabel = t('mentorHome.board.waiting', { count: pending.length });
    unit = t('mentorHome.board.waitingUnit', { count: pending.length });
    body = (
      <View style={{ alignItems: 'center', gap: 10 }}>
        <Faces list={pending} />
        <Animated.View entering={rise(600)}>
          <Text variant="small" color="rgba(255,255,255,0.72)" align="center">
            {t('mentorHome.board.waitingHint')}
          </Text>
        </Animated.View>
      </View>
    );
  } else {
    flap = pad(Math.min(helped, 99));
    flapLabel = t('mentorHome.board.helped', { count: helped });
    unit = t('mentorHome.board.helpedUnit', { count: helped });
    body = (
      <Animated.View entering={rise(560)}>
        <Text variant="small" color="rgba(255,255,255,0.72)" align="center">
          {!open ? t('mentorHome.board.pausedHint') : helped ? t('mentorHome.allAnswered') : t('mentorHome.board.quiet')}
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.shadow, depth]}>
      <View style={[styles.card, { minHeight: Math.max(440, Math.round(screenH * 0.58)) }]}>
        <LinearGradient colors={gradients.night} style={StyleSheet.absoluteFill} />
        <StarField variant="card" />
        <Aurora open={open} />

        <View style={styles.head}>
          <Text variant="overline" color="rgba(255,255,255,0.62)" style={{ flex: 1 }} numberOfLines={1}>
            {t('mentorHome.board.title', { city: mentor.city })}
          </Text>
          <AvailabilityToggle mentor={mentor} />
        </View>

        <View style={styles.center}>
          {next ? (
            <Text variant="overline" color={c.mentorGlow} align="center">
              {t('mentorHome.board.next', { day: dayLabel(next.startsAt) })}
            </Text>
          ) : null}
          <SplitFlap value={flap} label={flapLabel} size={next ? 'time' : 'xl'} />
          {unit ? (
            <Text variant="h2" color="#fff" align="center" style={{ maxWidth: 260 }} importantForAccessibility="no" accessibilityElementsHidden>
              {unit}
            </Text>
          ) : null}
          {body}
        </View>

        <View style={styles.stats}>
          <Stat icon={<Users size={14} color={c.mentorGlow} />} value={String(helped)} label={t('mentorHome.acceptedMonth')} />
          <Stat icon={<PhoneCall size={14} color={c.mentorGlow} />} value={String(calls)} label={t('mentorHome.calls')} />
          {mentor.sessions > 0 ? (
            <Stat icon={<Star size={14} color={c.mentorGlow} fill={c.mentorGlow} />} value={formatDecimal(mentor.rating)} label={t('mentorHome.rating')} />
          ) : (
            <Stat icon={<Star size={14} color={c.mentorGlow} />} value={t('mentorHome.new')} label={t('mentorHome.notRated')} />
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles(({ shadow }) => ({
  // L'ombre sur l'enveloppe, le dégradé coupé dans l'arrondi.
  shadow: { borderRadius: 36, ...shadow.md, shadowOpacity: 0.28, shadowRadius: 28, shadowOffset: { width: 0, height: 18 } },
  card: { borderRadius: 36, padding: 20, gap: 18, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.10)' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 8 },
  glass: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.xl, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.10)' },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 54, borderRadius: radius.pill, backgroundColor: '#fff' },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
}));
