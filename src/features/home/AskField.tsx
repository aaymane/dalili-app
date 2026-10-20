import { router } from 'expo-router';
import { ArrowUp, Sparkles } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useSuggestions } from '@/features/ai/suggestions';
import { palette, radius, shadow } from '@/theme/tokens';

const ask = (q?: string) => router.navigate({ pathname: '/(app)/(tabs)/ia', params: q ? { q } : {} });

/** Champ « Demande-moi n'importe quoi… » toujours visible sur l'accueil, + 3 questions de ton étape. */
export function AskField() {
  const suggestions = useSuggestions();
  return (
    <View style={{ gap: 10 }}>
      <PressableScale onPress={() => ask()} haptic="press" style={styles.field} accessibilityRole="search" accessibilityLabel="Poser une question à Dalili">
        <Sparkles size={18} color={palette.aiIndigo} />
        <Text variant="body" color={palette.muted} style={{ flex: 1 }}>
          Demande-moi n’importe quoi…
        </Text>
        <View style={styles.send}>
          <ArrowUp size={16} color="#fff" strokeWidth={2.8} />
        </View>
      </PressableScale>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
        {suggestions.map((s) => (
          <PressableScale key={s} onPress={() => ask(s)} style={styles.chip}>
            <Text variant="smallStrong" color={palette.aiIndigo} numberOfLines={1}>
              {s}
            </Text>
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingLeft: 18, paddingRight: 6, borderRadius: 28, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E3E1FF', ...shadow.md },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: palette.aiIndigo, alignItems: 'center', justifyContent: 'center' },
  chip: { maxWidth: 280, minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radius.lg, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E3E1FF' },
});
