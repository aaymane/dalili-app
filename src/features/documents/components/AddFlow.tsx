import { Image } from 'expo-image';
import { Camera, FileText, FileUp, Images, ScanLine, ShieldCheck, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { toast } from '@/components/feedback/Toast';
import { Button } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { Input } from '@/components/ui/Input';
import { ListGroup } from '@/components/ui/ListGroup';
import { PressableScale } from '@/components/ui/PressableScale';
import { Chip } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n';
import { track } from '@/lib/analytics';
import { formatDayMonth } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { enter, rise } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

import { VaultFull } from '../api';
import { capture, discardPrepared, MAX_SCAN_PAGES, type Prepared, type Source } from '../capture';
import { CATEGORIES, SUGGESTIONS, type Category } from '../categories';
import { categoryName } from '../format';
import { useAddDocument, useReadiness, useVaultDocuments } from '../hooks';
import { keepOpen } from '../lock';

/** Ce que l'écran sait déjà : la rubrique ouverte, ou le document conseillé qu'on ajoute. */
export type AddPreset = { category?: Category; kind?: string | null; title?: string };

const SOURCES: { source: Source; icon: LucideIcon }[] = [
  { source: 'scan', icon: ScanLine },
  { source: 'camera', icon: Camera },
  { source: 'library', icon: Images },
  { source: 'file', icon: FileUp },
];

/**
 * Ajouter un document, en deux temps dans la même feuille : d'où il vient (scanner, photo, galerie, fichier),
 * puis son nom et sa rubrique. La feuille reste ouverte pendant le scan ou le choix : rien ne se perd.
 */
export function AddFlow({ visible, preset, onClose }: { visible: boolean; preset?: AddPreset; onClose: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const add = useAddDocument();
  const { data: docs } = useVaultDocuments();
  const readiness = useReadiness(docs);
  const [busy, setBusy] = useState<Source | null>(null);
  const [file, setFile] = useState<Prepared | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [kind, setKind] = useState<string | null>(null);

  const defaultTitle = (p: Prepared) =>
    preset?.title ??
    (p.source === 'scan'
      ? t('vault.scanName', { date: formatDayMonth(new Date()) })
      : p.fileName || t('vault.photoName', { date: formatDayMonth(new Date()) }));

  const choose = async (source: Source) => {
    if (busy) return;
    setBusy(source);
    const res = await keepOpen(() => capture(source));
    setBusy(null);
    if (res === null) return;
    if (typeof res === 'string') {
      const message = {
        denied: t('vault.errors.denied'),
        unavailable: source === 'scan' ? t('vault.errors.scanUnavailable') : t('vault.errors.fileUnavailable'),
        unsupported: t('vault.errors.unsupported'),
        tooBig: t('vault.errors.tooBig'),
        failed: t('vault.errors.failed'),
      }[res];
      return toast(message, 'info');
    }
    if (res.pages && res.pages >= MAX_SCAN_PAGES) toast(t('vault.tooManyPages', { count: MAX_SCAN_PAGES }), 'info');
    haptics.tap();
    setFile(res);
    setTitle(defaultTitle(res));
    setCategory(preset?.category ?? null);
    setKind(preset?.kind ?? null);
  };

  // Le papier conseillé choisi donne son nom, si on n'en a pas tapé un autre.
  const pickKind = (id: string, label: string) => {
    const next = kind === id ? null : id;
    if (file && (title === defaultTitle(file) || SUGGESTIONS.some((s) => t(`tools.documents.items.${s.key}`) === title))) {
      setTitle(next ? label : defaultTitle(file));
    }
    setKind(next);
  };

  const save = () => {
    if (!file || !category || !title.trim()) return;
    add.mutate(
      { file, title, category, kind },
      {
        onSuccess: () => {
          haptics.success();
          track('vault_document_added', { category, source: file.source });
          toast(t('vault.added', { category: categoryName(category) }));
          onClose();
        },
        onError: (e) => toast(e instanceof VaultFull ? t('vault.errors.full') : t('common.notSaved'), 'info'),
      },
    );
  };

  // Après la fermeture (rangé ou abandonné) : on oublie l'aperçu et on repart de zéro.
  const reset = () => {
    discardPrepared(file);
    setFile(null);
    setTitle('');
    setCategory(null);
    setKind(null);
  };

  const suggestions = category ? SUGGESTIONS.filter((s) => s.category === category && !readiness.stored(s.id)) : [];

  return (
    <BottomSheet visible={visible} onClose={add.isPending ? () => {} : onClose} onClosed={reset} scroll>
      {!file ? (
        <View style={{ gap: 14 }}>
          <Text variant="h2">{preset?.title ?? t('vault.addTitle')}</Text>
          <ListGroup>
            {SOURCES.map(({ source, icon }, i) => (
              <Animated.View key={source} entering={enter(i)}>
                <PressableScale onPress={() => choose(source)} disabled={!!busy} scaleTo={0.985} style={styles.source}>
                  <IconTile icon={icon} tone={source === 'scan' ? 'blue' : 'slate'} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{t(`vault.sources.${source}`)}</Text>
                    <Text variant="caption" color={c.muted}>
                      {t(`vault.sources.${source}Sub`)}
                    </Text>
                  </View>
                  {busy === source ? <ActivityIndicator color={c.electric} /> : null}
                </PressableScale>
              </Animated.View>
            ))}
          </ListGroup>
          <View style={styles.note}>
            <ShieldCheck size={16} color={c.success} />
            <Text variant="small" color={c.muted} style={{ flex: 1 }}>
              {t('vault.security.clean')}
            </Text>
          </View>
        </View>
      ) : (
        <Animated.View entering={rise()} style={{ gap: 16 }}>
          <Text variant="h2">{t('vault.saveTitle')}</Text>
          <View style={styles.preview}>
            {file.preview ? (
              <Image source={{ uri: file.preview }} style={styles.thumb} contentFit="cover" cachePolicy="none" accessibilityIgnoresInvertColors />
            ) : (
              <IconTile icon={FileText} tone="blue" size={56} />
            )}
            <Text variant="small" color={c.muted} style={{ flex: 1 }}>
              {file.type === 'application/pdf'
                ? [t('vault.pdf'), file.pages ? t('vault.pages', { count: file.pages }) : null].filter(Boolean).join(' · ')
                : t('vault.photo')}
            </Text>
          </View>
          <Input label={t('vault.name')} value={title} onChangeText={setTitle} placeholder={t('vault.namePlaceholder')} maxLength={80} returnKeyType="done" />
          <View style={{ gap: 10 }}>
            <Text variant="h3">{t('vault.chooseCategory')}</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((cat) => (
                <PressableScale
                  key={cat}
                  haptic="select"
                  onPress={() => {
                    setCategory(cat);
                    if (kind && SUGGESTIONS.find((s) => s.id === kind)?.category !== cat) setKind(null);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: category === cat }}>
                  <Chip label={categoryName(cat)} active={category === cat} />
                </PressableScale>
              ))}
            </View>
            {suggestions.length ? (
              <View style={styles.chips}>
                {suggestions.map((s) => {
                  const label = t(`tools.documents.items.${s.key}`);
                  return (
                    <PressableScale
                      key={s.id}
                      haptic="select"
                      onPress={() => pickKind(s.id, label)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: kind === s.id }}>
                      <Chip label={label} active={kind === s.id} color={c.success} />
                    </PressableScale>
                  );
                })}
              </View>
            ) : null}
          </View>
          <Button
            label={add.isPending ? t('vault.saving') : t('vault.save')}
            size="lg"
            full
            loading={add.isPending}
            disabled={!category || !title.trim()}
            onPress={save}
          />
          {!category ? (
            <Text variant="caption" color={c.muted} align="center">
              {t('vault.chooseCategoryHint')}
            </Text>
          ) : null}
        </Animated.View>
      )}
    </BottomSheet>
  );
}

const useStyles = makeStyles(({ c }) => ({
  source: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, minHeight: 64 },
  note: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 4 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: radius.lg, backgroundColor: c.surface },
  thumb: { width: 56, height: 72, borderRadius: 10, backgroundColor: c.fill },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
}));
