import { Pencil, Trash2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Alert, View } from 'react-native';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { toast } from '@/components/feedback/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ListGroup } from '@/components/ui/ListGroup';
import { ListRow } from '@/components/ui/ListRow';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/scheme';

/** Ce que tu as écrit : son texte, et ce que tu peux en faire. */
export type OwnContent = {
  body: string;
  maxLength: number;
  /** Faux : « Modifier » est grisé, avec `lockedHint` pour dire pourquoi (un message après 15 minutes). */
  canEdit: boolean;
  lockedHint?: string;
  /** Vrai : le texte peut être vidé (une publication qui a une photo, un message qui a une pièce jointe). */
  allowEmpty?: boolean;
  deleteTitle: string;
  deleteText: string;
};

type Step = 'menu' | 'edit' | null;

/**
 * Appui long sur ce que tu as écrit (message, commentaire, publication) : « Modifier » ou « Supprimer ».
 * Seul l'auteur voit ce menu, et la base refuse de toute façon le geste de quelqu'un d'autre.
 * Chaque étape s'ouvre une fois la précédente refermée (une feuille à la fois, puis la confirmation du système).
 */
export function OwnContentSheet({
  target,
  onClose,
  onSave,
  onDelete,
}: {
  target: OwnContent | null;
  onClose: () => void;
  onSave: (body: string) => Promise<unknown>;
  onDelete: () => void;
}) {
  const { c } = useTheme();
  const t = useT();
  const [step, setStep] = useState<Step>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const next = useRef<'edit' | 'delete' | null>(null);
  // Le dernier contenu ouvert, gardé pendant que les feuilles se referment. Un nouvel appui long (nouvel objet)
  // rouvre le menu : l'état s'ajuste pendant le rendu, sans effet.
  const [current, setCurrent] = useState<OwnContent | null>(null);
  if (target && target !== current) {
    setCurrent(target);
    setDraft(target.body);
    setStep('menu');
  }

  const close = () => {
    next.current = null;
    setStep(null);
  };

  const choose = (what: 'edit' | 'delete') => {
    haptics.select();
    next.current = what;
    setStep(null);
  };

  // Le menu est refermé : on ouvre la suite (modifier), on demande confirmation (supprimer), ou on s'arrête.
  const onMenuClosed = () => {
    const what = next.current;
    next.current = null;
    if (what === 'edit') return setStep('edit');
    if (what === 'delete' && current) {
      haptics.warning();
      Alert.alert(current.deleteTitle, current.deleteText, [
        { text: t('own.keep'), style: 'cancel', onPress: onClose },
        {
          text: t('own.delete'),
          style: 'destructive',
          onPress: () => {
            onDelete();
            onClose();
          },
        },
      ]);
      return;
    }
    onClose();
  };

  const trimmed = draft.trim();
  const unchanged = trimmed === (current?.body ?? '').trim();
  const empty = !trimmed && !current?.allowEmpty;

  const save = async () => {
    if (unchanged || empty || saving) return;
    setSaving(true);
    try {
      await onSave(trimmed);
      haptics.success();
      setStep(null);
    } catch (e) {
      toast(e instanceof Error && e.message.startsWith('Un message se modifie') ? t('own.tooLate') : t('own.saveFailed'), 'info');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <BottomSheet visible={step === 'menu'} onClose={close} onClosed={onMenuClosed}>
        <View style={{ gap: 12 }}>
          <ListGroup>
            <ListRow
              icon={Pencil}
              label={t('own.edit')}
              sub={current && !current.canEdit ? current.lockedHint : undefined}
              onPress={current?.canEdit ? () => choose('edit') : undefined}
            />
            <ListRow icon={Trash2} label={t('own.delete')} danger onPress={() => choose('delete')} />
          </ListGroup>
          <Button label={t('common.cancel')} variant="secondary" onPress={close} />
        </View>
      </BottomSheet>

      <BottomSheet visible={step === 'edit'} onClose={() => setStep(null)} onClosed={onClose}>
        <View style={{ gap: 12 }}>
          <Text variant="h2">{t('own.editTitle')}</Text>
          <Input
            value={draft}
            onChangeText={setDraft}
            maxLength={current?.maxLength}
            multiline
            autoFocus
            accessibilityLabel={t('own.editTitle')}
          />
          <Text variant="caption" color={c.muted}>
            {t('own.editNote')}
          </Text>
          <Button label={t('own.save')} disabled={unchanged || empty} loading={saving} onPress={save} />
          <Button label={t('common.cancel')} variant="secondary" onPress={() => setStep(null)} />
        </View>
      </BottomSheet>
    </>
  );
}
