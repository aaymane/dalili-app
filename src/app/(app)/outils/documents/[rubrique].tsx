import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { ListGroup } from '@/components/ui/ListGroup';
import { Text } from '@/components/ui/Text';
import { AddFlow, type AddPreset } from '@/features/documents/components/AddFlow';
import { DocumentRow, SuggestionRow } from '@/features/documents/components/DocumentRow';
import { CATEGORY_LOOK, isCategory, SUGGESTIONS } from '@/features/documents/categories';
import { useByCategory, useReadiness, useVaultDocuments } from '@/features/documents/hooks';
import type { VaultDoc } from '@/features/documents/store';
import { useT } from '@/i18n';
import { enter, leave, reflow, rise } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

const openDoc = (d: VaultDoc) => router.push({ pathname: '/(app)/outils/documents/fichier/[id]', params: { id: d.id } });

/** Une rubrique du coffre : ses documents, puis les papiers conseillés qui vont avec. */
export default function Rubrique() {
  const { rubrique } = useLocalSearchParams<{ rubrique: string }>();
  const { c, gradients } = useTheme();
  const t = useT();
  const styles = useStyles();
  const { data, isPending } = useVaultDocuments();
  const byCategory = useByCategory(data);
  const readiness = useReadiness(data);
  const [adding, setAdding] = useState(false);
  const [preset, setPreset] = useState<AddPreset>({});
  if (!isCategory(rubrique)) return <Redirect href="/(app)/outils/documents" />;

  const look = CATEGORY_LOOK[rubrique];
  const name = t(`vault.categories.${rubrique}`);
  const docs = byCategory[rubrique] ?? [];
  const suggestions = SUGGESTIONS.filter((s) => s.category === rubrique);
  const addWith = (p: AddPreset) => {
    setPreset(p);
    setAdding(true);
  };

  return (
    <Screen
      top={gradients.peach}
      padded={false}
      header={<AppHeader back />}
      footer={<Button label={t('vault.addIn', { category: name })} size="lg" full iconLeft={<Plus size={20} color={c.onAccent} />} onPress={() => addWith({ category: rubrique })} />}>
      <View style={styles.page}>
        <Animated.View entering={rise()} style={styles.head}>
          <IconTile icon={look.icon} tone={look.tone} size={52} />
          <View style={{ flex: 1 }}>
            <Text variant="hero" numberOfLines={2}>
              {name}
            </Text>
            <Text variant="small" color={c.muted}>
              {docs.length ? t('vault.count', { count: docs.length }) : t('vault.empty')}
            </Text>
          </View>
        </Animated.View>

        {docs.length ? (
          <ListGroup>
            {docs.map((d, i) => (
              <Animated.View key={d.id} entering={enter(i)} exiting={leave} layout={reflow}>
                <DocumentRow doc={d} onPress={() => openDoc(d)} />
              </Animated.View>
            ))}
          </ListGroup>
        ) : isPending ? null : (
          <Animated.View entering={rise(60)} style={styles.empty}>
            <Text variant="body" color={c.muted} align="center">
              {t('vault.emptyCategory')}
            </Text>
          </Animated.View>
        )}

        {suggestions.length ? (
          <Animated.View entering={rise(120)} style={{ gap: 10 }}>
            <View style={{ gap: 2 }}>
              <Text variant="h2">{t('vault.toPrepare')}</Text>
              <Text variant="small" color={c.muted}>
                {t('vault.toPrepareSub')}
              </Text>
            </View>
            <ListGroup>
              {suggestions.map((s) => (
                <SuggestionRow
                  key={s.id}
                  s={s}
                  stored={readiness.stored(s.id)}
                  onOpen={openDoc}
                  onAdd={() => addWith({ category: rubrique, kind: s.id, title: t(`tools.documents.items.${s.key}`) })}
                />
              ))}
            </ListGroup>
          </Animated.View>
        ) : null}
      </View>
      <AddFlow visible={adding} preset={preset} onClose={() => setAdding(false)} />
    </Screen>
  );
}

const useStyles = makeStyles(({ c }) => ({
  page: { paddingHorizontal: 20, gap: 20, paddingBottom: 24 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: radius.xl, borderWidth: 1, borderStyle: 'dashed', borderColor: c.lineStrong },
}));
