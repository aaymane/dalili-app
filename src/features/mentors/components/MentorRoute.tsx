import { Plane } from 'lucide-react-native';
import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n';
import { EASE_OUT } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';

const PLANE = 22;

/**
 * Le trajet du mentor : la ville d'où il est parti, celle où il vit aujourd'hui. Le même voyage que celui de
 * l'étudiant, d'où l'avion qui fait la traversée à l'ouverture (il est déjà arrivé si le mouvement est réduit).
 */
export function MentorRoute({ from, to }: { from: string; to: string }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const plane = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }, { rotate: '45deg' }] }));

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (!w || w === width) return;
    setWidth(w);
    x.set(0);
    x.set(withDelay(250, withTiming(w - PLANE, { duration: 1100, easing: EASE_OUT, reduceMotion: ReduceMotion.System })));
  };

  return (
    // Départ à gauche, arrivée à droite, comme le billet : même sens dans toutes les langues.
    <View style={styles.row} accessible accessibilityLabel={t('mentors.profile.routeA11y', { from, to })}>
      <View style={{ gap: 2 }}>
        <Text variant="h3" numberOfLines={1}>
          {from}
        </Text>
        <Text variant="caption" color={c.muted}>
          {t('mentors.profile.from')}
        </Text>
      </View>
      <View style={styles.track} onLayout={onLayout}>
        <Svg height={2} width="100%" style={styles.line}>
          <Line x1="0" y1="1" x2="100%" y2="1" stroke={c.muted} strokeWidth={1.5} strokeDasharray="3 5" strokeLinecap="round" />
        </Svg>
        {width ? (
          <Animated.View style={[styles.plane, plane]}>
            <Plane size={PLANE - 4} color={c.electric} fill={c.electric} />
          </Animated.View>
        ) : null}
      </View>
      <View style={{ gap: 2, alignItems: 'flex-end' }}>
        <Text variant="h3" numberOfLines={1}>
          {to}
        </Text>
        <Text variant="caption" color={c.muted}>
          {t('mentors.profile.now')}
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ c }) => ({
  row: { direction: 'ltr', flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: { flex: 1, height: PLANE, justifyContent: 'center', marginTop: -16 },
  line: { position: 'absolute', left: 0, right: 0 },
  plane: { position: 'absolute', left: 0, width: PLANE, height: PLANE, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card },
}));
