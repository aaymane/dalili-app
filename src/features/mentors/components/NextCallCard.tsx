import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Clock, Video } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n';
import { formatLong, formatTime } from '@/lib/date';
import { makeStyles, useTheme } from '@/theme/scheme';
import { palette, radius } from '@/theme/tokens';

import type { MentorRequest } from '../api';
import { appointmentState } from '../appointments';

/** « dans 2 h 15 », « dans 25 min » : le temps qui reste avant l'appel, relu chaque minute. */
function useCountdown(iso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const minutes = Math.max(0, Math.round((new Date(iso).getTime() - now) / 60_000));
  return { minutes, hours: Math.floor(minutes / 60), rest: minutes % 60, now };
}

/** Point rouge qui respire quand la salle est ouverte. */
function LiveDot() {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withRepeat(withTiming(1, { duration: 900 }), -1, true));
  }, [p]);
  const style = useAnimatedStyle(() => ({ opacity: 0.4 + p.get() * 0.6 }));
  return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6B6B' }, style]} />;
}

/** Émeraude profond : le vert du mentor, assez sombre pour du texte blanc lisible (contraste > 6:1). */
const DEEP_MENTOR = ['#0F6B4E', '#0A4535'] as const;

/** Le prochain appel accepté : avec qui, quand, et « Démarrer l'appel » dès que la salle s'ouvre (15 min avant). */
export function NextCallCard({ r }: { r: MentorRequest }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const { minutes, hours, rest, now } = useCountdown(r.startsAt);
  const live = appointmentState(r, now) === 'live';
  const name = r.student ?? t('mentorHome.aStudent');
  const left = minutes >= 24 * 60 ? formatLong(r.startsAt) : hours ? t('mentorHome.next.inHours', { hours, minutes: String(rest).padStart(2, '0') }) : t('mentorHome.next.inMinutes', { count: minutes });

  return (
    <LinearGradient colors={DEEP_MENTOR} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <View style={styles.row}>
        <Text variant="overline" color="rgba(255,255,255,0.85)">
          {t('mentorHome.next.title')}
        </Text>
        <View style={styles.badge}>
          {live ? <LiveDot /> : <Clock size={12} color="#fff" />}
          <Text variant="caption" color="#fff">
            {live ? t('mentorHome.next.live') : left}
          </Text>
        </View>
      </View>
      <View style={styles.row}>
        <Avatar name={name} size={50} color={palette.mentor} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="h3" color="#fff" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="small" color="rgba(255,255,255,0.85)" numberOfLines={1}>
            {r.topic}
          </Text>
        </View>
        <Text variant="h2" color="#fff">
          {formatTime(r.startsAt)}
        </Text>
      </View>
      <PressableScale
        haptic="press"
        disabled={!live}
        onPress={() => router.push({ pathname: '/(app)/appel/[id]', params: { id: r.id } })}
        style={[styles.cta, !live && { opacity: 0.55 }]}
        accessibilityLabel={live ? t('mentorHome.startA11y', { name }) : t('mentorHome.next.opensA11y', { time: formatTime(r.startsAt) })}>
        <Video size={17} color={c.navy} />
        <Text variant="bodyStrong" color={c.navy}>
          {live ? t('mentorHome.start') : t('mentorHome.next.opens')}
        </Text>
      </PressableScale>
    </LinearGradient>
  );
}

const useStyles = makeStyles(({ shadow }) => ({
  card: { borderRadius: radius.xxl, padding: 18, gap: 14, overflow: 'hidden', ...shadow.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.18)' },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50, borderRadius: radius.pill, backgroundColor: '#fff' },
}));
