import { View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { EASE_IN_OUT } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { motion, radius, roleColors, type Role } from '@/theme/tokens';

import { useProfile } from '../store';

const SEG = 86;
const ROLES: Role[] = ['student', 'mentor'];

/**
 * Bascule Étudiant / Mentor de l'en-tête, seulement pour qui a les deux rôles.
 * Le curseur glisse et prend la couleur du rôle, puis l'accueil change.
 */
export function RoleSwitch() {
  const { c } = useTheme();
  const styles = useStyles();
  const roles = useProfile((s) => s.profile.roles);
  const active = useProfile((s) => s.profile.activeRole);
  const setActiveRole = useProfile((s) => s.setActiveRole);
  const progress = useSharedValue(active === 'mentor' ? 1 : 0);

  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.get() * SEG }],
    backgroundColor: interpolateColor(progress.get(), [0, 1], [roleColors.student.main, roleColors.mentor.main]),
  }));

  if (!roles.includes('mentor')) return null;

  const choose = (r: Role) => {
    if (r === active) return;
    // L'accueil change une fois le curseur arrivé : sinon le nouvel écran couperait le glissement.
    progress.set(
      withTiming(r === 'mentor' ? 1 : 0, { duration: motion.base, easing: EASE_IN_OUT }, (done) => {
        if (done) scheduleOnRN(setActiveRole, r);
      }),
    );
  };

  return (
    <View style={styles.track} accessibilityRole="tablist">
      <Animated.View style={[styles.thumb, thumb]} />
      {ROLES.map((r) => {
        const on = r === active;
        return (
          <PressableScale
            key={r}
            haptic="select"
            scaleTo={0.97}
            onPress={() => choose(r)}
            hitSlop={{ top: 4, bottom: 4 }}
            style={styles.seg}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`Mode ${roleColors[r].label}`}>
            <Text variant="smallStrong" color={on ? c.white : c.subtle}>
              {roleColors[r].label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(({ shadow, scheme }) => ({
  track: { flexDirection: 'row', padding: 3, borderRadius: radius.pill, backgroundColor: scheme === 'dark' ? 'rgba(20,27,49,0.8)' : 'rgba(255,255,255,0.72)', ...shadow.sm },
  thumb: { position: 'absolute', top: 3, left: 3, width: SEG, height: 34, borderRadius: radius.pill },
  seg: { width: SEG, height: 34, alignItems: 'center', justifyContent: 'center' },
}));
