import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { toast } from '@/components/feedback/Toast';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { haptics } from '@/lib/haptics';
import { palette } from '@/theme/tokens';

import { isDemoMode, useAuth } from '../store';

const GONE = isDemoMode
  ? ['Ton profil, ta photo et ton parcours gardés sur ce téléphone']
  : ['Ton compte et ton email', 'Ton profil, ta photo et ton parcours', 'Tes messages, commentaires et réservations', 'Ta fiche mentor, si tu en as une'];

/** Confirmation avant de supprimer le compte : ce qui disparaît, ce qui reste, sans retour possible. */
export function DeleteAccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
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
    toast('Ton compte est supprimé. Bonne route 💙');
  };

  return (
    <BottomSheet visible={visible} onClose={busy ? () => {} : onClose}>
      <View style={{ gap: 12 }}>
        <Text variant="h2">Supprimer ton compte ?</Text>
        <Text variant="small" color={palette.muted}>
          C’est définitif : on ne pourra rien récupérer. Ce qui sera effacé :
        </Text>
        <View style={{ gap: 6 }}>
          {GONE.map((g) => (
            <View key={g} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Trash2 size={14} color={palette.danger} />
              <Text variant="small" style={{ flex: 1 }}>
                {g}
              </Text>
            </View>
          ))}
        </View>
        {!isDemoMode && (
          <Text variant="caption" color={palette.muted}>
            Les groupes et événements que tu as créés restent pour la communauté, sans ton nom.
          </Text>
        )}
        <Button label="Supprimer définitivement" variant="danger" loading={busy} onPress={confirm} />
        <Button label="Garder mon compte" variant="secondary" disabled={busy} onPress={onClose} />
      </View>
    </BottomSheet>
  );
}
