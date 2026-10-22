import { ChevronLeft } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { motion, palette, shadow } from '@/theme/tokens';
import { rise } from '@/theme/motion';

function Dot({ active, color }: { active: boolean; color: string }) {
  const s = useAnimatedStyle(() => ({
    width: withSpring(active ? 26 : 6, motion.spring),
    backgroundColor: active ? color : '#C9CFDF',
  }));
  return <Animated.View style={[styles.dot, s]} />;
}

type Props = {
  overline: string;
  title: string;
  subtitle?: string;
  step: number;
  total: number;
  onBack?: () => void;
  accent?: string;
  /** Change la clé pour rejouer l'animation d'entrée du titre. */
  animKey?: string | number;
};

/** En-tête des écrans à étapes : retour, « ÉTAPE 1/4 · DALILI », titre, indicateur. */
export function StepHeader({ overline, title, subtitle, step, total, onBack, accent = palette.electric, animKey }: Props) {
  return (
    <View style={{ paddingHorizontal: 22 }}>
      {onBack ? (
        <PressableScale onPress={onBack} style={styles.back} accessibilityLabel="Retour">
          <ChevronLeft size={18} color={palette.navy} />
        </PressableScale>
      ) : (
        <View style={{ height: 36 }} />
      )}
      <Animated.View key={animKey} entering={rise()}>
        <Text variant="overline" color={accent} style={{ marginTop: 18 }}>
          {overline}
        </Text>
        <Text variant="hero" style={{ marginTop: 8, fontSize: 27, lineHeight: 33 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" color={palette.subtle} style={{ marginTop: 10, maxWidth: 320 }}>
            {subtitle}
          </Text>
        ) : null}
      </Animated.View>
      <View style={styles.dots}>
        {Array.from({ length: total }, (_, i) => (
          <Dot key={i} active={i === step} color={accent} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  dots: { flexDirection: 'row', gap: 6, alignSelf: 'center', marginTop: 22, marginBottom: 18, alignItems: 'center' },
  dot: { height: 6, borderRadius: 3 },
});
