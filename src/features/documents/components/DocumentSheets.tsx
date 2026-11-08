import { useState } from 'react';
import { View } from 'react-native';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { toast } from '@/components/feedback/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { Chip } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { makeStyles, useTheme } from '@/theme/scheme';

import { CATEGORIES, suggestionById, type Category } from '../categories';
import { categoryName } from '../format';
import { useUpdateDocument } from '../hooks';
import type { VaultDoc } from '../store';

/** Renommer un document. */
export function RenameSheet({ doc, visible, onClose }: { doc: VaultDoc; visible: boolean; onClose: () => void }) {
  const t = useT();
  const update = useUpdateDocument();
  const [title, setTitle] = useState(doc.title);
  const save = () => {
    const next = title.trim();
    if (!next || next === doc.title) return onClose();
    update.mutate(
      { id: doc.id, patch: { title: next } },
      { onSuccess: () => toast(t('vault.renamed')), onError: () => toast(t('common.notSaved'), 'info') },
    );
    haptics.success();
    onClose();
  };
  return (
    <BottomSheet visible={visible} onClose={onClose} onClosed={() => setTitle(doc.title)}>
      <View style={{ gap: 16 }}>
        <Text variant="h2">{t('vault.rename')}</Text>
        <Input label={t('vault.name')} value={title} onChangeText={setTitle} maxLength={80} autoFocus returnKeyType="done" onSubmitEditing={save} />
        <Button label={t('common.save')} size="lg" full disabled={!title.trim()} onPress={save} />
      </View>
    </BottomSheet>
  );
}

/** Changer de rubrique. Un document conseillé d'une autre rubrique n'y répond plus (la liste « À préparer » suit). */
export function MoveSheet({ doc, visible, onClose }: { doc: VaultDoc; visible: boolean; onClose: () => void }) {
  const t = useT();
  const styles = useStyles();
  const update = useUpdateDocument();
  const move = (category: Category) => {
    onClose();
    if (category === doc.category) return;
    const kind = suggestionById(doc.kind)?.category === category ? doc.kind : null;
    update.mutate(
      { id: doc.id, patch: { category, kind } },
      { onSuccess: () => toast(t('vault.moved', { category: categoryName(category) })), onError: () => toast(t('common.notSaved'), 'info') },
    );
  };
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ gap: 16 }}>
        <Text variant="h2">{t('vault.move')}</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((cat) => (
            <PressableScale key={cat} haptic="select" onPress={() => move(cat)} accessibilityRole="radio" accessibilityState={{ selected: doc.category === cat }}>
              <Chip label={categoryName(cat)} active={doc.category === cat} />
            </PressableScale>
          ))}
        </View>
      </View>
    </BottomSheet>
  );
}

/** Supprimer pour de bon, après confirmation. */
export function DeleteSheet({ doc, visible, onClose, onConfirm }: { doc: VaultDoc; visible: boolean; onClose: () => void; onConfirm: () => void }) {
  const { c } = useTheme();
  const t = useT();
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ gap: 14 }}>
        <Text variant="h2">{t('vault.deleteTitle', { name: doc.title })}</Text>
        <Text variant="body" color={c.muted}>
          {t('vault.deleteBody')}
        </Text>
        <Button label={t('vault.deleteConfirm')} variant="danger" size="lg" full onPress={onConfirm} />
        <Button label={t('common.cancel')} variant="ghost" full onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const useStyles = makeStyles(() => ({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
}));
