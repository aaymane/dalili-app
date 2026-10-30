import { router } from 'expo-router';
import { CircleCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useMyReviewedBookings } from '@/features/mentors/hooks';
import { ReviewSheet } from '@/features/mentors/components/ReviewSheet';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { pop, rise } from '@/theme/motion';
import { useTheme } from '@/theme/scheme';

import { CallAvatar, CallBackdrop } from './CallParts';

/**
 * L'appel est fini (le mentor l'a terminé, ou la salle a fermé). L'étudiant est invité à noter son mentor — la
 * feuille s'ouvre d'elle-même s'il ne l'a pas encore fait — et peut réserver un autre appel tout de suite.
 * Le mentor est remercié et retrouve son agenda.
 */
export function CallEnded({ bookingId, role, name, color, mentorId }: { bookingId: string; role: 'student' | 'mentor'; name: string; color?: string; mentorId?: string }) {
  const { c } = useTheme();
  const t = useT();
  const { data: reviewed = [] } = useMyReviewedBookings();
  const canRate = role === 'student' && !!mentorId && !reviewed.includes(bookingId);
  const [rating, setRating] = useState(false);

  useEffect(() => {
    haptics.success();
    if (!canRate) return;
    const id = setTimeout(() => setRating(true), 700);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.root}>
      <CallBackdrop />
      <View style={styles.center}>
        <CallAvatar name={name} color={color} waiting={false} />
        <Animated.View entering={pop(120)}>
          <CircleCheck size={28} color={c.mentorGlow} />
        </Animated.View>
        <Animated.View entering={rise(180)} style={styles.card}>
          <Text variant="h1" color={c.white} align="center">
            {t('call.endedTitle')}
          </Text>
          <Text variant="small" color="rgba(255,255,255,0.7)" align="center">
            {role === 'student' ? t('call.endedStudent', { name }) : t('call.endedMentor', { name })}
          </Text>
        </Animated.View>
        <Animated.View entering={rise(260)} style={styles.actions}>
          {role === 'student' ? (
            <>
              {canRate ? <Button label={t('call.rate', { name })} variant="white" onPress={() => setRating(true)} /> : null}
              <Button label={t('call.bookAgain')} variant={canRate ? 'glass' : 'white'} onPress={() => router.replace(mentorId ? { pathname: '/(app)/mentor/[id]', params: { id: mentorId } } : '/(app)/(tabs)/explorer')} />
              <Button label={t('call.backHome')} variant="glass" onPress={() => router.replace('/(app)/(tabs)')} />
            </>
          ) : (
            <Button label={t('call.backAgenda')} variant="white" onPress={() => router.replace('/(app)/(tabs)/agenda')} />
          )}
        </Animated.View>
      </View>
      {role === 'student' ? <ReviewSheet visible={rating} onClose={() => setRating(false)} bookingId={bookingId} mentorId={mentorId ?? null} name={name} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0F2A' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 24 },
  card: { alignItems: 'center', gap: 6, maxWidth: 320 },
  actions: { gap: 10, width: 260, marginTop: 8 },
});
