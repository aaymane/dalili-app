import { router } from 'expo-router';
import { FolderLock, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { ChevronRight } from '@/components/ui/DirIcons';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { AddFlow } from '@/features/documents/components/AddFlow';
import { CategoryTile } from '@/features/documents/components/CategoryTile';
import { SecurityCard } from '@/features/documents/components/SecurityCard';
import { useLockSupport } from '@/features/documents/components/VaultGate';
import { CATEGORIES, SUGGESTIONS } from '@/features/documents/categories';
import { useByCategory, useReadiness, useVaultDocuments } from '@/features/documents/hooks';
import { useT } from '@/i18n';
import { rise } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { motion, radius } from '@/theme/tokens';

/** Le coffre « Mes documents » : les rubriques, l'ajout, la liste « À préparer » et ce qui protège les fichiers. */
export default function Vault() {
  const { c, gradients } = useTheme();
  const t = useT();
  const styles = useStyles();
  const { data: docs, isError } = useVaultDocuments();
  const byCategory = useByCategory(docs);
  const readiness = useReadiness(docs);
  const support = useLockSupport();
  const [adding, setAdding] = useState(false);
  const pct = readiness.done / readiness.total;
  const bar = useAnimatedStyle(() => ({ width: withSpring(`${pct * 100}%`, motion.springSoft) }));
  // « À préparer » mène à la première rubrique où il manque un papier.
  const next = SUGGESTIONS.find((s) => !readiness.ready(s.id))?.category ?? 'identity';

  return (
    <Screen top={gradients.peach} padded={false} header={<AppHeader back />}>
      <View style={styles.page}>
        <Animated.View entering={rise()} style={{ gap: 6 }}>
          <Text variant="hero">{t('tools.documents.title')}</Text>
          <Text variant="body" color={c.muted}>
            {t('vault.subtitle')}
          </Text>
        </Animated.View>

        <Animated.View entering={rise(60)}>
          <Button label={t('vault.add')} size="lg" full iconLeft={<Plus size={20} color={c.onAccent} />} onPress={() => setAdding(true)} />
        </Animated.View>

        {isError && !docs ? (
          <Text variant="small" color={c.danger} align="center">
            {t('vault.loadError')}
          </Text>
        ) : docs && docs.length === 0 ? (
          <Animated.View entering={rise(100)} style={styles.empty}>
            <IconTile icon={FolderLock} tone="blue" size={48} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="h3">{t('vault.emptyTitle')}</Text>
              <Text variant="small" color={c.muted}>
                {t('vault.emptyBody')}
              </Text>
            </View>
          </Animated.View>
        ) : null}

        <View style={{ gap: 12 }}>
          <Text variant="h2">{t('vault.categoriesTitle')}</Text>
          <View style={styles.grid}>
            {CATEGORIES.map((category, i) => (
              <CategoryTile
                key={category}
                category={category}
                count={byCategory[category]?.length ?? 0}
                index={i}
                onPress={() => router.push({ pathname: '/(app)/outils/documents/[rubrique]', params: { rubrique: category } })}
              />
            ))}
          </View>
        </View>

        <Animated.View entering={rise(120)}>
          <PressableScale
            onPress={() => router.push({ pathname: '/(app)/outils/documents/[rubrique]', params: { rubrique: next } })}
            scaleTo={0.985}
            style={styles.progress}
            accessibilityLabel={`${t('vault.toPrepare')}, ${t('tools.documents.ready', { done: readiness.done, total: readiness.total })}`}>
            <View style={styles.progressHead}>
              <Text variant="h3" style={{ flex: 1 }}>
                {t('vault.toPrepare')}
              </Text>
              <Text variant="smallStrong" color={c.success}>
                {t('tools.documents.ready', { done: readiness.done, total: readiness.total })}
              </Text>
              <ChevronRight size={18} color={c.subtle} />
            </View>
            <View style={styles.track}>
              <Animated.View style={[styles.fill, bar]} />
            </View>
            <Text variant="small" color={c.muted}>
              {t('vault.toPrepareSub')}
            </Text>
          </PressableScale>
        </Animated.View>

        <Animated.View entering={rise(180)}>
          <SecurityCard support={support} />
        </Animated.View>
      </View>
      <AddFlow visible={adding} onClose={() => setAdding(false)} />
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  page: { paddingHorizontal: 20, gap: 20, paddingBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.xl, backgroundColor: c.card, ...shadow.sm },
  progress: { gap: 10, padding: 16, borderRadius: radius.xl, backgroundColor: c.card, ...shadow.sm },
  progressHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { height: 10, borderRadius: 5, backgroundColor: c.fill, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: c.success },
}));
