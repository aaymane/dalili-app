import { router } from 'expo-router';
import { Ban, Flag, ShieldAlert, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { toast } from '@/components/feedback/Toast';
import { Button } from '@/components/ui/Button';
import { ChevronRight } from '@/components/ui/DirIcons';
import { IconTile } from '@/components/ui/IconTile';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { Chip } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import { isInFrance, useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { useRoleTheme } from '@/theme';
import { rise } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius, type Tone } from '@/theme/tokens';
import { track } from '@/lib/analytics';

import { SafetyRefused, type ReportReason, type ReportTarget } from '../api';
import { useBlockUser, useSendReport } from '../hooks';

const REASONS: ReportReason[] = ['harcelement', 'argent', 'donnees', 'faux_profil', 'autre'];

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
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const theme = useRoleTheme();
  const send = useSendReport();
  const block = useBlockUser();
  const [step, setStep] = useState<Step>('choose');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [comment, setComment] = useState('');
  const ready = !!target && !!reason && (reason !== 'autre' || comment.trim().length > 0);
  const failed = (e: Error) => toast(e instanceof SafetyRefused ? t(`safety.refused.${e.kind}`) : t('safety.notSent'), 'info');

  const report = () => {
    if (!target || !reason || send.isPending) return;
    send.mutate(
      { target, reason, comment },
      {
        onSuccess: (result) => {
          haptics.success();
          if (result === 'sent') track('safety_report_sent');
          toast(
            result === 'demo' ? t('safety.thanksDemo') : result === 'already' ? t('safety.already') : t('safety.thanks'),
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
        toast(result === 'demo' ? t('safety.blockedDemo') : t('safety.blocked', { name }));
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
          <Text variant="h2">{t('safety.title', { name })}</Text>
          <Choice
            icon={Flag}
            tone="amber"
            title={t('safety.reportChoice')}
            text={t('safety.reportChoiceText', { name })}
            onPress={() => setStep('report')}
          />
          <Choice
            icon={Ban}
            tone="red"
            title={t('safety.blockChoice', { name })}
            text={t('safety.blockChoiceText')}
            onPress={() => setStep('block')}
          />
          <Danger onClose={onClose} />
        </Animated.View>
      ) : step === 'report' ? (
        <Animated.View key="report" entering={rise()} style={styles.body}>
          <View style={{ gap: 4 }}>
            <Text variant="h2">{t('safety.reportTitle', { name })}</Text>
            <Text variant="small" color={c.subtle}>
              {t('safety.reportText', { name })}
            </Text>
          </View>
          <View style={styles.reasons} accessibilityRole="radiogroup">
            {REASONS.map((r) => (
              <PressableScale
                key={r}
                haptic="select"
                onPress={() => setReason(r)}
                hitSlop={4}
                accessibilityRole="radio"
                accessibilityState={{ selected: reason === r }}>
                <Chip label={t(`safety.reasons.${r}`)} active={reason === r} color={theme.accent} />
              </PressableScale>
            ))}
          </View>
          <Input
            multiline
            placeholder={reason === 'autre' ? t('safety.whatHappened') : t('safety.whatHappenedOptional')}
            value={comment}
            onChangeText={setComment}
            maxLength={500}
          />
          <Danger onClose={onClose} />
          <Button label={t('safety.send')} onPress={report} loading={send.isPending} disabled={!ready} accent={theme.gradient} />
        </Animated.View>
      ) : (
        <Animated.View key="block" entering={rise()} style={styles.body}>
          <Text variant="h2">{t('safety.blockTitle', { name })}</Text>
          <View style={{ gap: 8 }}>
            {[t('safety.blockLine1'), t('safety.blockLine2'), t('safety.blockLine3', { name })].map((line) => (
              <View key={line} style={styles.line}>
                <View style={styles.dot} />
                <Text variant="small" color={c.subtle} style={{ flex: 1 }}>
                  {line}
                </Text>
              </View>
            ))}
          </View>
          <Button label={t('safety.blockChoice', { name })} variant="danger" onPress={confirmBlock} loading={block.isPending} disabled={!target} />
          <PressableScale onPress={() => setStep('report')} hitSlop={6} style={styles.link}>
            <Text variant="smallStrong" color={c.subtle}>
              {t('safety.alsoReport')}
            </Text>
          </PressableScale>
        </Animated.View>
      )}
    </BottomSheet>
  );
}

function Choice({ icon, tone, title, text, onPress }: { icon: LucideIcon; tone: Tone; title: string; text: string; onPress: () => void }) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <PressableScale onPress={onPress} style={styles.choice} accessibilityRole="button" accessibilityLabel={title}>
      <IconTile icon={icon} tone={tone} size={42} radius={14} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="small" color={c.subtle}>
          {text}
        </Text>
      </View>
      <ChevronRight size={18} color={c.muted} />
    </PressableScale>
  );
}

/** En France : le 17 et l'écran SOS. Ailleurs, les numéros français ne marchent pas : la police du pays. */
function Danger({ onClose }: { onClose: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const inFrance = useProfile((s) => isInFrance(s.profile));
  if (!inFrance) {
    return (
      <View style={styles.danger}>
        <IconTile icon={ShieldAlert} tone="red" size={36} radius={12} />
        <Text variant="small" style={{ flex: 1 }}>
          {t('safety.dangerAbroad')}
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
      accessibilityLabel={t('safety.dangerA11y')}>
      <IconTile icon={ShieldAlert} tone="red" size={36} radius={12} />
      <Text variant="small" style={{ flex: 1 }}>
        {t('safety.danger')}
      </Text>
      <ChevronRight size={18} color={c.muted} />
    </PressableScale>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  body: { gap: 14 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, padding: 12, borderRadius: radius.lg, backgroundColor: c.card, ...shadow.sm },
  danger: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, padding: 10, borderRadius: radius.lg, backgroundColor: c.dangerSoft },
  line: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 7, backgroundColor: c.danger },
  link: { alignSelf: 'center', minHeight: 44, justifyContent: 'center' },
}));
