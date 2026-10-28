import { router } from 'expo-router';
import { ChevronRight, ShieldAlert } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { toast } from '@/components/feedback/Toast';
import { Button } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { Chip } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import { isInFrance, useProfile } from '@/features/profile/store';
import { haptics } from '@/lib/haptics';
import { useRoleTheme } from '@/theme';
import { palette, radius } from '@/theme/tokens';

import { ReportRefused, type ReportReason, type ReportTarget } from '../api';
import { useSendReport } from '../hooks';

const REASONS: { id: ReportReason; label: string }[] = [
  { id: 'harcelement', label: 'Propos ou gestes déplacés' },
  { id: 'argent', label: 'Me demande de l’argent' },
  { id: 'donnees', label: 'Veut mon numéro ou mes réseaux' },
  { id: 'faux_profil', label: 'Faux profil' },
  { id: 'autre', label: 'Autre chose' },
];

/**
 * « Signaler » : un motif, un mot (obligatoire pour « Autre chose »), et les numéros d'urgence à portée de main.
 * Seule l'équipe lit le signalement ; la personne signalée n'est pas prévenue.
 */
export function ReportSheet({ visible, onClose, target, name }: { visible: boolean; onClose: () => void; target: ReportTarget | null; name: string }) {
  const theme = useRoleTheme();
  const inFrance = useProfile((s) => isInFrance(s.profile));
  const send = useSendReport();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [comment, setComment] = useState('');
  const ready = !!target && !!reason && (reason !== 'autre' || comment.trim().length > 0);

  const submit = () => {
    if (!target || !reason || send.isPending) return;
    send.mutate(
      { target, reason, comment },
      {
        onSuccess: (result) => {
          haptics.success();
          toast(
            result === 'demo'
              ? 'Merci ! En mode démo, rien n’est envoyé.'
              : result === 'already'
                ? 'L’équipe a déjà ton signalement sur cette personne. Elle s’en occupe.'
                : 'Merci. L’équipe lit ton signalement et revient vers toi si besoin.',
          );
          onClose();
        },
        onError: (e) => toast(e instanceof ReportRefused ? e.message : 'Pas envoyé. Vérifie ta connexion et réessaie.', 'info'),
      },
    );
  };

  const sos = () => {
    onClose();
    router.push('/(app)/outils/sos');
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      scroll
      onClosed={() => {
        setReason(null);
        setComment('');
      }}>
      <View style={{ gap: 14 }}>
        <View style={{ gap: 4 }}>
          <Text variant="h2">Signaler {name}</Text>
          <Text variant="small" color={palette.subtle}>
            Seule l’équipe DALILI lit ton signalement. {name} n’est pas prévenu·e.
          </Text>
        </View>
        <View style={styles.reasons} accessibilityRole="radiogroup">
          {REASONS.map((r) => (
            <PressableScale
              key={r.id}
              haptic="select"
              onPress={() => setReason(r.id)}
              hitSlop={4}
              accessibilityRole="radio"
              accessibilityState={{ selected: reason === r.id }}>
              <Chip label={r.label} active={reason === r.id} color={theme.accent} />
            </PressableScale>
          ))}
        </View>
        <Input
          multiline
          placeholder={reason === 'autre' ? 'Dis-nous ce qui s’est passé' : 'Ce qui s’est passé (facultatif)'}
          value={comment}
          onChangeText={setComment}
          maxLength={500}
        />
        {inFrance ? (
          <PressableScale onPress={sos} style={styles.danger} accessibilityLabel="En danger maintenant ? Ouvrir les numéros d’urgence">
            <IconTile icon={ShieldAlert} tone="red" size={36} radius={12} />
            <Text variant="small" style={{ flex: 1 }}>
              En danger maintenant ? Appelle le 17 (police).
            </Text>
            <ChevronRight size={18} color={palette.muted} />
          </PressableScale>
        ) : (
          <View style={styles.danger}>
            <IconTile icon={ShieldAlert} tone="red" size={36} radius={12} />
            <Text variant="small" style={{ flex: 1 }}>
              En danger maintenant ? Contacte d’abord la police de ton pays.
            </Text>
          </View>
        )}
        <Button label="Envoyer le signalement" onPress={submit} loading={send.isPending} disabled={!ready} accent={theme.gradient} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  danger: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, padding: 10, borderRadius: radius.lg, backgroundColor: palette.dangerSoft },
});
