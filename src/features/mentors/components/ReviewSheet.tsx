import { Star } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { celebrate } from '@/components/feedback/Confetti';
import { BottomSheet } from '@/components/feedback/BottomSheet';
import { toast } from '@/components/feedback/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { pop } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';

import { useSendReview } from '../hooks';

type Props = { visible: boolean; onClose: () => void; bookingId: string | null; mentorId: string | null; name: string };

/** Après l'appel : une note de 1 à 5 et un mot. Elle aide les prochains étudiants à choisir, et remercie le mentor. */
export function ReviewSheet({ visible, onClose, bookingId, mentorId, name }: Props) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const send = useSendReview();
  const [rating, setRating] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [comment, setComment] = useState('');

  const submit = () => {
    if (!bookingId || !mentorId || !rating) return;
    send.mutate(
      { bookingId, mentorId, rating, comment },
      {
        onSuccess: () => {
          haptics.success();
          celebrate();
          toast(t('review.thanks', { name }));
          onClose();
        },
        onError: () => toast(t('common.notSaved'), 'info'),
      },
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      onClosed={() => {
        setRating(0);
        setComment('');
      }}>
      <View style={{ gap: 16 }}>
        <View style={{ gap: 6 }}>
          <Text variant="h2">{t('review.title', { name })}</Text>
          <Text variant="small" color={c.subtle}>
            {t('review.text', { name })}
          </Text>
        </View>
        <View style={styles.stars} accessibilityRole="adjustable" accessibilityLabel={t('review.starsA11y', { count: rating })}>
          {[1, 2, 3, 4, 5].map((n) => {
            const on = n <= rating;
            return (
              <PressableScale key={n} haptic="select" scaleTo={0.85} onPress={() => setRating(n as 1 | 2 | 3 | 4 | 5)} style={styles.star} accessibilityLabel={t('review.starA11y', { count: n })}>
                <Animated.View key={on ? 'on' : 'off'} entering={on ? pop() : undefined}>
                  <Star size={38} color={on ? '#F59E0B' : c.line} fill={on ? '#F59E0B' : 'transparent'} strokeWidth={1.8} />
                </Animated.View>
              </PressableScale>
            );
          })}
        </View>
        {rating ? (
          <Text variant="smallStrong" align="center" color={c.subtle}>
            {t(`review.levels.${rating}`)}
          </Text>
        ) : null}
        <Input value={comment} onChangeText={setComment} placeholder={t('review.placeholder')} maxLength={500} multiline />
        <Text variant="caption" color={c.muted}>
          {t('review.public')}
        </Text>
        <Button label={t('review.send')} disabled={!rating} loading={send.isPending} onPress={submit} />
      </View>
    </BottomSheet>
  );
}

const useStyles = makeStyles(() => ({
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  star: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
}));
