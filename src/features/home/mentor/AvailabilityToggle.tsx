import { useEffect } from 'react';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { toast } from '@/components/feedback/Toast';
import { PressableScale } from '@/components/ui/PressableScale';
import type { MyMentor } from '@/features/mentors/api';
import { useSetAvailability } from '@/features/mentors/hooks';
import { useDirection, useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { fonts, radius } from '@/theme/tokens';
import { makeStyles, useTheme } from '@/theme/scheme';

const TRACK_W = 40;
const TRACK_H = 24;
const KNOB = 18;
const TRAVEL = TRACK_W - KNOB - 6;
/** Le bouton glisse en ressort net, sans dépasser. */
const SNAP = { duration: 320, dampingRatio: 0.85, overshootClamping: true } as const;

/**
 * « Ta porte », en petit, dans le coin du tableau des arrivées : « Ouvert » (les étudiants de ta ville peuvent te
 * proposer un appel) ou « En pause ». Un toucher bascule : le bouton glisse, la pastille change de couleur, retour
 * haptique ; si la base refuse, il revient et le dit.
 */
export function AvailabilityToggle({ mentor }: { mentor: MyMentor }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const rtl = useDirection() === 'rtl';
  const availability = useSetAvailability();
  const on = mentor.availableThisWeek;
  const p = useSharedValue(on ? 1 : 0);

  useEffect(() => {
    p.set(withSpring(on ? 1 : 0, SNAP));
  }, [on, p]);

  const toggle = () => {
    const next = !on;
    haptics.select();
    p.set(withSpring(next ? 1 : 0, SNAP));
    availability.mutate(next, {
      onError: () => {
        p.set(withSpring(on ? 1 : 0, SNAP));
        toast(t('common.notSaved'), 'info');
      },
    });
  };

  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(p.get(), [0, 1], ['rgba(255,255,255,0.18)', c.mentor]) }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: (rtl ? -1 : 1) * p.get() * TRAVEL }] }));
  const label = useAnimatedStyle(() => ({ color: interpolateColor(p.get(), [0, 1], ['rgba(255,255,255,0.65)', c.mentorGlow]) }));

  return (
    <PressableScale
      onPress={toggle}
      haptic={false}
      scaleTo={0.95}
      hitSlop={8}
      style={styles.pill}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={t('mentorHome.taking')}
      accessibilityHint={on ? t('mentorHome.takingText', { city: mentor.city }) : t('mentorHome.pausedText')}>
      <Animated.Text style={[styles.label, label]}>{on ? t('mentorHome.gate.open') : t('mentorHome.gate.paused')}</Animated.Text>
      <Animated.View style={[styles.track, track]}>
        <Animated.View style={[styles.knob, knob, rtl ? { right: 3 } : { left: 3 }]} />
      </Animated.View>
    </PressableScale>
  );
}

const useStyles = makeStyles(() => ({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingStart: 12, paddingEnd: 5, height: 34, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  label: { fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 16 },
  track: { width: TRACK_W, height: TRACK_H, borderRadius: TRACK_H / 2, justifyContent: 'center' },
  knob: { position: 'absolute', width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
}));
