import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { FileText, FolderInput, PencilLine, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { PhotoViewer } from '@/components/feedback/PhotoViewer';
import { toast } from '@/components/feedback/Toast';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { ListGroup } from '@/components/ui/ListGroup';
import { ListRow } from '@/components/ui/ListRow';
import { PressableScale } from '@/components/ui/PressableScale';
import { Tag } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import { openDocument } from '@/features/documents/api';
import { CATEGORY_LOOK } from '@/features/documents/categories';
import { DeleteSheet, MoveSheet, RenameSheet } from '@/features/documents/components/DocumentSheets';
import { categoryName, docMeta } from '@/features/documents/format';
import { useDeleteDocument, useDocumentUrl, useVaultDocument } from '@/features/documents/hooks';
import { keepOpen } from '@/features/documents/lock';
import { useT } from '@/i18n';
import { formatDayMonth } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { rise } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

/** Un document du coffre : l'aperçu, l'ouvrir (Quick Look : zoom, partage), le renommer, le ranger ailleurs, le supprimer. */
export default function VaultDocument() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c, gradients, tones } = useTheme();
  const t = useT();
  const styles = useStyles();
  const { doc, isPending } = useVaultDocument(id);
  const url = useDocumentUrl(doc);
  const remove = useDeleteDocument();
  const [sheet, setSheet] = useState<'rename' | 'move' | 'delete' | null>(null);
  const [viewing, setViewing] = useState(false);
  const [opening, setOpening] = useState(false);

  if (!doc) {
    return (
      <Screen top={gradients.peach} header={<AppHeader back />}>
        {isPending ? null : (
          <Text variant="body" color={c.muted} align="center" style={{ marginTop: 40 }}>
            {t('vault.notFound')}
          </Text>
        )}
      </Screen>
    );
  }

  const isPdf = doc.type === 'application/pdf';
  const tone = tones[CATEGORY_LOOK[doc.category].tone];

  const open = async () => {
    setOpening(true);
    const ok = await keepOpen(() => openDocument(doc)).catch(() => false);
    setOpening(false);
    if (!ok) toast(t('vault.openFailed'), 'info');
  };

  const confirmDelete = () => {
    setSheet(null);
    haptics.warning();
    remove.mutate(doc, { onSuccess: () => toast(t('vault.deleted')), onError: () => toast(t('common.notSaved'), 'info') });
    router.back();
  };

  return (
    <Screen top={gradients.peach} padded={false} header={<AppHeader back />}>
      <View style={styles.page}>
        <Animated.View entering={rise()}>
          {isPdf ? (
            <PressableScale onPress={open} scaleTo={0.98} style={[styles.preview, styles.pdf]} accessibilityLabel={t('vault.openA11y', { name: doc.title })}>
              <IconTile icon={FileText} tone={CATEGORY_LOOK[doc.category].tone} size={72} />
              <Text variant="smallStrong" color={c.muted}>
                {docMeta(doc)}
              </Text>
            </PressableScale>
          ) : (
            <PressableScale
              onPress={() => url.data && setViewing(true)}
              scaleTo={0.98}
              style={styles.preview}
              accessibilityLabel={t('vault.photoA11y', { name: doc.title })}>
              {url.data ? (
                <Image
                  source={{ uri: url.data, cacheKey: doc.path }}
                  style={styles.photo}
                  contentFit="contain"
                  cachePolicy="memory"
                  transition={150}
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <ActivityIndicator color={c.electric} />
              )}
            </PressableScale>
          )}
        </Animated.View>

        <Animated.View entering={rise(60)} style={{ gap: 8 }}>
          <Text variant="h1">{doc.title}</Text>
          <View style={styles.tags}>
            <Tag label={categoryName(doc.category)} color={tone.ink} bg={tone.bg} />
            <Text variant="caption" color={c.muted}>
              {t('vault.addedOn', { date: formatDayMonth(doc.createdAt) })}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={rise(100)}>
          <Button label={t('vault.open')} size="lg" full loading={opening} onPress={open} />
        </Animated.View>

        <Animated.View entering={rise(140)}>
          <ListGroup>
            <ListRow icon={PencilLine} label={t('vault.rename')} onPress={() => setSheet('rename')} />
            <ListRow icon={FolderInput} label={t('vault.move')} sub={categoryName(doc.category)} onPress={() => setSheet('move')} />
            <ListRow icon={Trash2} label={t('vault.delete')} danger onPress={() => setSheet('delete')} />
          </ListGroup>
        </Animated.View>
      </View>

      <PhotoViewer uri={viewing ? (url.data ?? null) : null} cacheKey={doc.path} secret label={doc.title} onClose={() => setViewing(false)} />
      <RenameSheet doc={doc} visible={sheet === 'rename'} onClose={() => setSheet(null)} />
      <MoveSheet doc={doc} visible={sheet === 'move'} onClose={() => setSheet(null)} />
      <DeleteSheet doc={doc} visible={sheet === 'delete'} onClose={() => setSheet(null)} onConfirm={confirmDelete} />
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  page: { paddingHorizontal: 20, gap: 20, paddingBottom: 24 },
  preview: { height: 320, borderRadius: radius.xl, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...shadow.sm },
  pdf: { gap: 14 },
  photo: { width: '100%', height: '100%' },
  tags: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
}));
