import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDeviceTilt } from '@/components/brand/Holo';
import { TiltingStarField } from '@/components/brand/StarField';
import { celebrate } from '@/components/feedback/Confetti';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { EASE_OUT, rise } from '@/theme/motion';
import { useTheme } from '@/theme/scheme';
import { depth, motion } from '@/theme/tokens';

import { useJourneyStore } from '../store';
import { useTicket } from '../ticket';
import { Ticket } from './Ticket';

/** Inclinaison (radians) qui pousse le reflet jusqu'au bord du billet. */

/**
 * Déblocage du billet (docs/VISION.md §4.C), une seule fois, juste après avoir coché le visa :
 * le billet bascule de 12° à plat, puis un reflet holographique suit l'inclinaison du téléphone.
 * Réduction des animations : billet à plat, sans reflet.
 */
export function TicketUnlock() {
  const { c, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const ticket = useTicket();
  const tr = useT();
  const markTicketSeen = useJourneyStore((s) => s.markTicketSeen);

  const shown = useSharedValue(reduce ? 1 : 0);
  const on = useSharedValue(0);
  // Le téléphone penché déplace le reflet ; la position de repos se recentre doucement (comme le ciel).
  const tilt = useDeviceTilt();

  useEffect(() => {
    markTicketSeen();
    if (reduce) {
      haptics.success();
      celebrate();
      return;
    }
    shown.set(withDelay(250, withSpring(1, motion.springSoft)));
    // Le billet s'est posé : la victoire, puis le reflet s'allume.
    const t = setTimeout(() => {
      haptics.success();
      celebrate();
      on.set(withTiming(1, { duration: 900, easing: EASE_OUT }));
    }, 750);
    return () => clearTimeout(t);
  }, [markTicketSeen, reduce, shown, on]);

  const card = useAnimatedStyle(() => {
    const k = shown.get();
    const t = tilt.get();
    return {
      opacity: Math.min(1, k * 1.6),
      transform: [
        { perspective: depth.perspective },
        { rotateY: `${(1 - k) * depth.tiltEntrance + t.x * depth.tilt}deg` },
        { rotateX: `${-t.y * depth.tilt}deg` },
        { scale: 0.9 + 0.1 * k },
      ],
    };
  });

  return (
    <LinearGradient colors={gradients.night} style={styles.root}>
      <TiltingStarField ignite origin={{ x: 0.5, y: 0.55 }} />
      <View style={[styles.content, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 }]}>
        <Animated.View entering={rise(0)} style={{ gap: 8 }} accessible accessibilityRole="header">
          <Text variant="smallStrong" color={c.mentorGlow} align="center">
            {tr('ticket.unlockA')}
          </Text>
          <Text variant="hero" color={c.white} align="center">
            {tr('ticket.unlockB')}
          </Text>
          <Text variant="body" color="rgba(255,255,255,0.7)" align="center">
            {ticket.data.from} → {ticket.data.to}. Le plus dur est derrière toi.
          </Text>
        </Animated.View>

        <Animated.View style={[styles.ticket, card]}>
          <Ticket data={ticket.data} holo={reduce ? undefined : { tilt, on }} />
        </Animated.View>

        <Animated.View entering={rise(900)} style={{ gap: 12 }}>
          <Text variant="small" color="rgba(255,255,255,0.6)" align="center">
            {tr('ticket.unlockText')}
          </Text>
          <Button label={tr('ticket.keep')} variant="white" onPress={() => router.back()} />
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20, justifyContent: 'space-between' },
  ticket: { marginVertical: 24 },
});
