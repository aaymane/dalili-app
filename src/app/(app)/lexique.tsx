import { Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { openTerm } from '@/features/guides/components/GlossarySheet';
import { useGlossary } from '@/features/guides/glossary';
import { useCurrentLanguage, useT } from '@/i18n';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';
import { reflow, rise } from '@/theme/motion';

/** Lexique A→Z des démarches françaises, en mots simples. */
export default function Lexique() {
  const { c, gradients } = useTheme();
  const styles = useStyles();
  const [q, setQ] = useState('');
  const glossary = useGlossary();
  const t = useT();
  const language = useCurrentLanguage();
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...glossary]
      .sort((a, b) => a.term.localeCompare(b.term, 'fr'))
      .filter((g) => !needle || `${g.term} ${g.full ?? ''} ${g.simple}`.toLowerCase().includes(needle));
  }, [q, glossary]);
  const letters = [...new Set(list.map((g) => g.term[0].toUpperCase()))];
  return (
    <Screen top={gradients.lilacTop} padded={false} header={<AppHeader back />}>
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        <Text variant="hero">{t('glossary.title')}</Text>
        <Text variant="body" color={c.subtle}>
          {t('glossary.text', { count: glossary.length })}
        </Text>
        {language !== 'fr' ? (
          <Text variant="caption" color={c.muted}>
            {t('glossary.frenchNote')}
          </Text>
        ) : null}
        <Input icon={<Search size={16} color={c.electric} />} placeholder={t('glossary.search')} value={q} onChangeText={setQ} autoCapitalize="none" />
        <Animated.View layout={reflow} style={{ gap: 18 }}>
          {letters.map((l) => (
            <View key={l} style={{ gap: 8 }}>
              <Text variant="h2" color={c.aiIndigo}>
                {l}
              </Text>
              {list
                .filter((g) => g.term[0].toUpperCase() === l)
                .map((g, i) => (
                  <Animated.View key={g.term} entering={rise(i * 30)}>
                    <PressableScale onPress={() => openTerm(g.term)} style={styles.row}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text variant="bodyStrong">
                          {g.term}
                          {g.full ? (
                            <Text variant="small" color={c.muted}>
                              {'  '}
                              {g.full}
                            </Text>
                          ) : null}
                        </Text>
                        <Text variant="small" color={c.subtle} numberOfLines={2}>
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

const useStyles = makeStyles(({ c, shadow }) => ({
  row: { padding: 14, borderRadius: radius.lg, backgroundColor: c.card, ...shadow.sm },
}));
