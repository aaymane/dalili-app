import { router } from 'expo-router';
import { Ban, ChevronRight, Flag, ShieldAlert, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

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
import { rise } from '@/theme/motion';
import { palette, radius, shadow, type Tone } from '@/theme/tokens';

import { SafetyRefused, type ReportReason, type ReportTarget } from '../api';
import { useBlockUser, useSendReport } from '../hooks';

const REASONS: { id: ReportReason; label: string }[] = [
  { id: 'harcelement', label: 'Propos ou gestes déplacés' },
  { id: 'argent', label: 'Me demande de l’argent' },
  { id: 'donnees', label: 'Veut mon numéro ou mes réseaux' },
  { id: 'faux_profil', label: 'Faux profil' },
  { id: 'autre', label: 'Autre chose' },
];

type Step = 'choose' | 'report' | 'block';

/**
 * « Un souci avec … ? » : signaler à l'équipe (un motif, un mot, obligatoire pour « Autre chose »)
 * ou bloquer (après confirmation). Les numéros d'urgence restent à portée de main.
 * La personne n'est jamais prévenue. `onBlocked` : par exemple quitter une fiche qui va disparaître.
 */
export function SafetySheet({
  visible,
  onClose,
  target,
  name,
  onBlocked,
}: {
  visible: boolean;
  onClose: () => void;
  target: ReportTarget | null;
  name: string;
  onBlocked?: () => void;
}) {
  const theme = useRoleTheme();
  const send = useSendReport();
  const block = useBlockUser();
  const [step, setStep] = useState<Step>('choose');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [comment, setComment] = useState('');
  const ready = !!target && !!reason && (reason !== 'autre' || comment.trim().length > 0);
  const failed = (e: Error) => toast(e instanceof SafetyRefused ? e.message : 'Pas envoyé. Vérifie ta connexion et réessaie.', 'info');

  const report = () => {
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
        onError: failed,
      },
    );
  };

  const confirmBlock = () => {
    if (!target || block.isPending) return;
    block.mutate(target, {
      onSuccess: (result) => {
        haptics.success();
        toast(result === 'demo' ? 'En mode démo, rien n’est enregistré.' : `${name} est bloqué·e.`);
        onClose();
        if (result === 'blocked') onBlocked?.();
      },
      onError: failed,
    });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      scroll
      onClosed={() => {
        setStep('choose');
        setReason(null);
        setComment('');
      }}>
      {step === 'choose' ? (
        <Animated.View key="choose" entering={rise()} style={styles.body}>
          <Text variant="h2">Un souci avec {name} ?</Text>
          <Choice
            icon={Flag}
            tone="amber"
            title="Signaler à l’équipe"
            text={`On lit chaque signalement. ${name} n’est pas prévenu·e.`}
            onPress={() => setStep('report')}
          />
          <Choice
            icon={Ban}
            tone="red"
            title={`Bloquer ${name}`}
            text="Vous ne vous voyez plus, et vos demandes en cours sont annulées."
            onPress={() => setStep('block')}
          />
          <Danger onClose={onClose} />
        </Animated.View>
      ) : step === 'report' ? (
        <Animated.View key="report" entering={rise()} style={styles.body}>
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
          <Danger onClose={onClose} />
          <Button label="Envoyer le signalement" onPress={report} loading={send.isPending} disabled={!ready} accent={theme.gradient} />
        </Animated.View>
      ) : (
        <Animated.View key="block" entering={rise()} style={styles.body}>
          <Text variant="h2">Bloquer {name} ?</Text>
          <View style={{ gap: 8 }}>
            {[
              'Vous ne vous voyez plus dans DALILI, et aucune demande d’appel ne passe entre vous.',
              'Vos demandes en cours sont annulées.',
              `${name} n’est pas prévenu·e. Tu peux débloquer quand tu veux, dans Profil › Personnes bloquées.`,
            ].map((line) => (
              <View key={line} style={styles.line}>
                <View style={styles.dot} />
                <Text variant="small" color={palette.subtle} style={{ flex: 1 }}>
                  {line}
                </Text>
              </View>
            ))}
          </View>
          <Button label={`Bloquer ${name}`} variant="danger" onPress={confirmBlock} loading={block.isPending} disabled={!target} />
          <PressableScale onPress={() => setStep('report')} hitSlop={6} style={styles.link}>
            <Text variant="smallStrong" color={palette.subtle}>
              Il s’est passé quelque chose ? Signale-le aussi
            </Text>
          </PressableScale>
        </Animated.View>
      )}
    </BottomSheet>
  );
}

function Choice({ icon, tone, title, text, onPress }: { icon: LucideIcon; tone: Tone; title: string; text: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={styles.choice} accessibilityRole="button" accessibilityLabel={title}>
      <IconTile icon={icon} tone={tone} size={42} radius={14} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="small" color={palette.subtle}>
          {text}
        </Text>
      </View>
      <ChevronRight size={18} color={palette.muted} />
    </PressableScale>
  );
}

/** En France : le 17 et l'écran SOS. Ailleurs, les numéros français ne marchent pas : la police du pays. */
function Danger({ onClose }: { onClose: () => void }) {
  const inFrance = useProfile((s) => isInFrance(s.profile));
  if (!inFrance) {
    return (
      <View style={styles.danger}>
        <IconTile icon={ShieldAlert} tone="red" size={36} radius={12} />
        <Text variant="small" style={{ flex: 1 }}>
          En danger maintenant ? Contacte d’abord la police de ton pays.
        </Text>
      </View>
    );
  }
  return (
    <PressableScale
      onPress={() => {
        onClose();
        router.push('/(app)/outils/sos');
      }}
      style={styles.danger}
      accessibilityLabel="En danger maintenant ? Ouvrir les numéros d’urgence">
      <IconTile icon={ShieldAlert} tone="red" size={36} radius={12} />
      <Text variant="small" style={{ flex: 1 }}>
        En danger maintenant ? Appelle le 17 (police).
      </Text>
      <ChevronRight size={18} color={palette.muted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  body: { gap: 14 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, padding: 12, borderRadius: radius.lg, backgroundColor: palette.white, ...shadow.sm },
  danger: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, padding: 10, borderRadius: radius.lg, backgroundColor: palette.dangerSoft },
  line: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 7, backgroundColor: palette.danger },
  link: { alignSelf: 'center', minHeight: 44, justifyContent: 'center' },
});
