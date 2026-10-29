import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { toast } from '@/components/feedback/Toast';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/scheme';
import { useT } from '@/i18n';

import { isDemoMode, useAuth } from '../store';


/** Confirmation avant de supprimer le compte : ce qui disparaît, ce qui reste, sans retour possible. */
export function DeleteAccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const gone = isDemoMode
    ? [t('auth.delete.goneDemo')]
    : [t('auth.delete.goneAccount'), t('auth.delete.goneProfile'), t('auth.delete.goneMessages'), t('auth.delete.goneMentor')];
  const deleteAccount = useAuth((s) => s.deleteAccount);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    const res = await deleteAccount();
    setBusy(false);
    if (!res.ok) {
      haptics.warning();
      return toast(res.error, 'info');
    }
    haptics.success();
    toast(t('auth.delete.done'));
  };

  return (
    <BottomSheet visible={visible} onClose={busy ? () => {} : onClose}>
      <View style={{ gap: 12 }}>
        <Text variant="h2">{t('auth.delete.title')}</Text>
        <Text variant="small" color={c.muted}>
          {t('auth.delete.text')}
        </Text>
        <View style={{ gap: 6 }}>
          {gone.map((g) => (
            <View key={g} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Trash2 size={14} color={c.danger} />
              <Text variant="small" style={{ flex: 1 }}>
                {g}
              </Text>
            </View>
          ))}
        </View>
        {!isDemoMode && (
          <Text variant="caption" color={c.muted}>
            {t('auth.delete.community')}
          </Text>
        )}
        <Button label={t('auth.delete.confirm')} variant="danger" loading={busy} onPress={confirm} />
        <Button label={t('auth.delete.keep')} variant="secondary" disabled={busy} onPress={onClose} />
      </View>
    </BottomSheet>
  );
}
