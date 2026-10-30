import { router } from 'expo-router';
import { ArrowUp, Sparkles } from 'lucide-react-native';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useSuggestions } from '@/features/ai/suggestions';
import { useT } from '@/i18n';
import { EASE_IN_OUT, rise } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

const ask = (q?: string) => router.navigate({ pathname: '/(app)/(tabs)/ia', params: q ? { q } : {} });

/** Champ « Demande-moi n'importe quoi… » toujours visible sur l'accueil, + 3 questions de ton étape. */
export function AskField() {
  const { c } = useTheme();
  const styles = useStyles();
  const suggestions = useSuggestions();
  const t = useT();
  return (
    <View style={{ gap: 10 }}>
      <PressableScale onPress={() => ask()} haptic="press" style={styles.field} accessibilityRole="search" accessibilityLabel={t('aiProfile.ask')}>
        <Twinkle color={c.aiIndigo} />
        <Text variant="body" color={c.muted} style={{ flex: 1 }}>
          {t('home.askAnything')}
        </Text>
        <View style={styles.send}>
          <ArrowUp size={16} color="#fff" strokeWidth={2.8} />
        </View>
      </PressableScale>
      {/* Les questions défilent de côté, sur deux lignes : on les lit en entier, et la suivante dépasse pour inviter à glisser. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
        {suggestions.map((s, i) => (
          <Animated.View key={s} entering={rise(380 + i * 70)}>
            <PressableScale onPress={() => ask(s)} style={styles.chip} accessibilityLabel={s}>
              <Text variant="smallStrong" color={c.aiIndigo} numberOfLines={2}>
                {s}
              </Text>
            </PressableScale>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

/** L'étincelle du champ scintille de temps en temps : Dalili est là, prête. Immobile si les animations sont réduites. */
function Twinkle({ color }: { color: string }) {
  const reduce = useReducedMotion();
  const k = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    k.set(withDelay(1400, withRepeat(withSequence(withTiming(1, { duration: 420, easing: EASE_IN_OUT }), withTiming(0, { duration: 520, easing: EASE_IN_OUT }), withTiming(0, { duration: 3400 })), -1)));
  }, [reduce, k]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 + k.get() * 0.22 }, { rotate: `${k.get() * 24}deg` }] }));
  return (
    <Animated.View style={style}>
      <Sparkles size={18} color={color} />
    </Animated.View>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingLeft: 18, paddingRight: 6, borderRadius: 28, backgroundColor: c.card, borderWidth: 1.5, borderColor: c.aiSoft, ...shadow.md },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.aiIndigo, alignItems: 'center', justifyContent: 'center' },
  chip: { width: 236, minHeight: 44, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1, borderColor: c.aiSoft },
}));
