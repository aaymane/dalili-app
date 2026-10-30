import { Calendar, Check, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { toast } from '@/components/feedback/Toast';
import { Screen } from '@/components/layout/Screen';
import { StepHeader } from '@/components/layout/StepHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { enter } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

import { birthYearError, CHARTER, charterItem } from '../charter';
import { useCreateMyMentor } from '../hooks';

type Props = {
  step: number;
  total: number;
  /** Fiche déjà envoyée avant la charte : on accepte seulement, sans renvoyer de fiche. */
  hasSheet?: boolean;
  /** Candidature : la charte n'est que la 1re étape, l'année part avec la fiche, après les documents. */
  onNext?: (birthYear: number) => void;
  onBack: () => void;
  onDone?: () => void;
};

/**
 * Charte du mentor : année de naissance (18 ans au moins) et 6 engagements à cocher.
 * Dans la candidature, on passe ensuite aux documents ; pour une fiche d'avant la charte, on l'accepte seulement.
 */
export function CharterScreen({ step, total, hasSheet, onNext, onBack, onDone }: Props) {
  const { c: colors, tones, gradients } = useTheme();
  const t = useT();
  const styles = useStyles();
  const profile = useProfile((s) => s.profile);
  const create = useCreateMyMentor();
  const [year, setYear] = useState(profile.birthDate?.slice(0, 4) ?? '');
  const [checked, setChecked] = useState<string[]>([]);
  const [showError, setShowError] = useState(false);

  const yearError = birthYearError(year);
  const allChecked = checked.length === CHARTER.length;

  const toggle = (id: string) => setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const submit = () => {
    if (yearError) return setShowError(true);
    if (onNext) return onNext(Number(year));
    create.mutate(
      {
        firstName: profile.firstName,
        lastName: profile.lastName,
        city: profile.mentorCity ?? profile.destinationCity ?? '',
        origin: profile.originCity,
        birthYear: Number(year),
      },
      {
        onSuccess: () => {
          haptics.success();
          onDone?.();
        },
        // Les refus de la base (23514) : moins de 18 ans, ou charte plus à jour.
        onError: (e) =>
          toast(
            (e as { code?: string }).code === '23514' ? t(e.message.includes('18') ? 'mentors.charter.tooYoung' : 'mentors.charter.outdated') : t('mentors.charter.notSent'),
            'info',
          ),
      },
    );
  };

  return (
    <Screen
      top={gradients.mint}
      bg="#fff"
      padded={false}
      keyboard
      header={
        <StepHeader
          overline={total > 1 ? t('mentors.charter.overlineStep', { step: step + 1, total }) : t('mentors.charter.overline')}
          title={t('mentors.charter.title')}
          subtitle={t('mentors.charter.subtitle')}
          step={step}
          total={total}
          accent={colors.mentor}
          onBack={onBack}
        />
      }
      footer={
        <Button
          label={onNext ? t('mentorApply.charterNext') : hasSheet ? t('mentors.charter.accept') : t('mentors.charter.acceptSend')}
          accent={gradients.mentor}
          icon={<ShieldCheck size={18} color="#fff" />}
          loading={create.isPending}
          disabled={!allChecked || year.length < 4}
          onPress={submit}
        />
      }>
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <Animated.View entering={enter(0)} style={{ gap: 6 }}>
          <Input
            label={t('mentors.charter.birthYear')}
            icon={<Calendar size={16} color={colors.mentor} />}
            value={year}
            onChangeText={(text) => {
              setYear(text.replace(/\D/g, '').slice(0, 4));
              setShowError(false);
            }}
            onBlur={() => year.length === 4 && setShowError(true)}
            keyboardType="number-pad"
            placeholder={t('mentors.charter.yearPlaceholder')}
            maxLength={4}
            error={showError ? yearError : null}
          />
          <Text variant="caption" color={colors.muted} style={{ marginStart: 6 }}>
            {t('mentors.charter.yearPrivate')}
          </Text>
        </Animated.View>
        {CHARTER.map((id, i) => {
          const on = checked.includes(id);
          const c = charterItem(id);
          return (
            <Animated.View key={id} entering={enter(i + 1)}>
              <PressableScale
                haptic="select"
                onPress={() => toggle(id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${c.title}. ${c.body}`}
                style={[styles.row, on && styles.rowOn]}>
                <View style={[styles.box, on && styles.boxOn]}>{on ? <Check size={14} color="#fff" strokeWidth={3} /> : null}</View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyStrong" color={on ? tones.green.ink : colors.navy}>
                    {c.title}
                  </Text>
                  <Text variant="small" color={colors.subtle}>
                    {c.body}
                  </Text>
                </View>
              </PressableScale>
            </Animated.View>
          );
        })}
        <Animated.View entering={enter(CHARTER.length + 1)}>
          <Text variant="caption" color={colors.muted} align="center">
            {t('mentors.charter.verifyNote')}
          </Text>
        </Animated.View>
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1.5, borderColor: c.line, ...shadow.sm },
  rowOn: { borderColor: c.mentor, backgroundColor: c.mentorSoft },
  box: { width: 24, height: 24, marginTop: 1, borderRadius: 8, borderWidth: 1.5, borderColor: c.lineStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card },
  boxOn: { backgroundColor: c.mentor, borderColor: c.mentor },
}));
