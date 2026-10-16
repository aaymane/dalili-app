import { Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { openTerm } from '@/features/guides/components/GlossarySheet';
import { glossary } from '@/features/guides/glossary';
import { palette, radius, shadow } from '@/theme/tokens';

/** Lexique A→Z des démarches françaises, en mots simples. */
export default function Lexique() {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return glossary.filter((g) => !t || `${g.term} ${g.full ?? ''} ${g.simple}`.toLowerCase().includes(t));
  }, [q]);
  const letters = [...new Set(list.map((g) => g.term[0].toUpperCase()))];
  return (
    <Screen top={['#CDB6FF', '#EFE8FF', '#F5F7FD']} padded={false} header={<AppHeader back />}>
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        <Text variant="hero">Le lexique{'\n'}anti-jargon</Text>
        <Text variant="body" color={palette.subtle}>
          {glossary.length} mots de l’administration française, expliqués comme par un ami.
        </Text>
        <Input icon={<Search size={16} color={palette.electric} />} placeholder="CAF, VLS-TS, caution…" value={q} onChangeText={setQ} autoCapitalize="none" />
        <Animated.View layout={LinearTransition.springify()} style={{ gap: 18 }}>
          {letters.map((l) => (
            <View key={l} style={{ gap: 8 }}>
              <Text variant="h2" color={palette.aiIndigo}>
                {l}
              </Text>
              {list
                .filter((g) => g.term[0].toUpperCase() === l)
                .map((g, i) => (
                  <Animated.View key={g.term} entering={FadeInDown.delay(i * 30).springify()}>
                    <PressableScale onPress={() => openTerm(g.term)} style={styles.row}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text variant="bodyStrong">
                          {g.term}
                          {g.full ? (
                            <Text variant="small" color={palette.muted}>
                              {'  '}
                              {g.full}
                            </Text>
                          ) : null}
                        </Text>
                        <Text variant="small" color={palette.subtle} numberOfLines={2}>
                          {g.simple}
                        </Text>
                      </View>
                    </PressableScale>
                  </Animated.View>
                ))}
            </View>
          ))}
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { padding: 14, borderRadius: radius.lg, backgroundColor: '#fff', ...shadow.sm },
});
