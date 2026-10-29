import { router } from 'expo-router';
import { BrainCircuit, Pencil, ShieldCheck, Sparkles } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { LogoOrb } from '@/components/brand/LogoOrb';
import { BottomSheet } from '@/components/feedback/BottomSheet';
import { toast } from '@/components/feedback/Toast';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { OptionCard } from '@/components/ui/OptionCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { ArrivalSheet } from '@/features/journey/components/ArrivalSheet';
import { useJourney } from '@/features/journey/store';
import { CityPicker } from '@/features/profile/components/CityPicker';
import { useProfile } from '@/features/profile/store';
import {
  CAMPUS_STATUSES,
  campusStatusLabel,
  concernEmoji,
  concernLabel,
  CONCERNS,
  HOUSING_STATUSES,
  housingLabel,
  STUDY_LEVELS,
  studyLevelLabel,
} from '@/features/profile/types';
import { useT } from '@/i18n';
import { formatLong, relativeDays } from '@/lib/date';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';
import { rise } from '@/theme/motion';

type Field = 'city' | 'level' | 'campus' | 'housing' | 'concerns' | null;

function Fact({ label, value, onEdit, delay }: { label: string; value: ReactNode; onEdit: () => void; delay: number }) {
  const { c: colors } = useTheme();
  const styles = useStyles();
  return (
    <Animated.View entering={rise(delay)}>
      <PressableScale onPress={onEdit} scaleTo={0.985} style={styles.fact}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text variant="overline" color={colors.muted} style={{ fontSize: 9.5 }}>
            {label}
          </Text>
          {typeof value === 'string' ? <Text variant="bodyStrong">{value}</Text> : value}
        </View>
        <View style={styles.edit}>
          <Pencil size={14} color={colors.aiIndigo} />
        </View>
      </PressableScale>
    </Animated.View>
  );
}

/** Profil IA : transparence totale sur ce que Dalili utilise pour personnaliser — et tout est modifiable. */
export default function ProfilIA() {
  const { c: colors, gradients } = useTheme();
  const styles = useStyles();
  const profile = useProfile((s) => s.profile);
  const update = useProfile((s) => s.update);
  const j = useJourney();
  const [field, setField] = useState<Field>(null);
  const [arrival, setArrival] = useState(false);
  const t = useT();

  const summary = [
    t('aiProfile.summary', {
      who: t(`aiProfile.who.${profile.studyLevel ?? 'default'}`),
      from: profile.originCity || t('aiProfile.fromHome'),
      to: profile.destinationCity ?? t('aiProfile.toUnknown'),
      when: relativeDays(j.arrival),
    }),
    j.current ? t('aiProfile.priority', { step: j.current.step.title }) : t('aiProfile.allDone'),
    profile.concerns.length ? t('aiProfile.worries', { list: profile.concerns.map((c) => concernLabel(c).toLowerCase()).join(t('common.listSep')) }) : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Screen top={gradients.aiTop} padded={false} header={<AppHeader back />}>
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        <View style={{ alignItems: 'center' }}>
          <LogoOrb size={84} />
          <Text variant="hero" align="center">
            {t('aiProfile.title')}
          </Text>
          <Text variant="small" color={colors.subtle} align="center" style={{ marginTop: 6, maxWidth: 320 }}>
            {t('aiProfile.text')}
          </Text>
        </View>

        <Animated.View entering={rise()} style={styles.summary}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BrainCircuit size={18} color="#fff" />
            <Text variant="overline" color="rgba(255,255,255,0.75)">
              {t('aiProfile.summaryTitle')}
            </Text>
          </View>
          <Text variant="body" color="#fff">
            {summary}
          </Text>
        </Animated.View>

        <Fact delay={40} label={t('aiProfile.destination')} value={profile.destinationCity ?? t('cityPicker.unknown')} onEdit={() => setField('city')} />
        <Fact delay={70} label={t('aiProfile.arrival')} value={`${formatLong(j.arrival)} · ${relativeDays(j.arrival)}`} onEdit={() => setArrival(true)} />
        <Fact delay={100} label={t('aiProfile.level')} value={profile.studyLevel ? studyLevelLabel(profile.studyLevel) : '—'} onEdit={() => setField('level')} />
        <Fact delay={130} label={t('aiProfile.campus')} value={profile.campusStatus ? campusStatusLabel(profile.campusStatus) : '—'} onEdit={() => setField('campus')} />
        <Fact delay={160} label={t('aiProfile.housing')} value={profile.housing ? housingLabel(profile.housing) : '—'} onEdit={() => setField('housing')} />
        <Fact
          delay={190}
          label={t('aiProfile.concerns')}
          value={
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
              {profile.concerns.length ? (
                profile.concerns.map((c) => (
                  <View key={c} style={styles.chip}>
                    <Text variant="smallStrong" color={colors.aiIndigo}>
                      {concernEmoji[c]} {concernLabel(c)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text variant="bodyStrong">—</Text>
              )}
            </View>
          }
          onEdit={() => setField('concerns')}
        />

        <View style={styles.privacy}>
          <ShieldCheck size={18} color={colors.success} />
          <Text variant="small" color={colors.subtle} style={{ flex: 1 }}>
            {t('aiProfile.privacy')}
          </Text>
        </View>
        <Button label={t('aiProfile.ask')} iconLeft={<Sparkles size={18} color="#fff" />} accent={['#4D6BFF', '#7A5AF8']} onPress={() => router.navigate('/(app)/(tabs)/ia')} />
      </View>

      <BottomSheet visible={!!field} onClose={() => setField(null)} scroll>
        <View style={{ gap: 10 }}>
          {field === 'city' && <CityPicker value={profile.destinationCity} onChange={(c) => { update({ destinationCity: c }); toast(t('common.updated')); setField(null); }} />}
          {field === 'level' &&
            STUDY_LEVELS.map((k) => (
              <OptionCard key={k} title={studyLevelLabel(k)} selected={profile.studyLevel === k} onPress={() => { update({ studyLevel: k }); setField(null); }} />
            ))}
          {field === 'campus' &&
            CAMPUS_STATUSES.map((k) => (
              <OptionCard key={k} title={campusStatusLabel(k)} selected={profile.campusStatus === k} onPress={() => { update({ campusStatus: k }); setField(null); }} />
            ))}
          {field === 'housing' &&
            HOUSING_STATUSES.map((k) => (
              <OptionCard key={k} title={housingLabel(k)} selected={profile.housing === k} onPress={() => { update({ housing: k }); setField(null); }} />
            ))}
          {field === 'concerns' && (
            <>
              {CONCERNS.map((k) => (
                <OptionCard
                  key={k}
                  kind="check"
                  title={`${concernEmoji[k]}  ${concernLabel(k)}`}
                  selected={profile.concerns.includes(k)}
                  onPress={() => update({ concerns: profile.concerns.includes(k) ? profile.concerns.filter((c) => c !== k) : [...profile.concerns, k] })}
                />
              ))}
              <Button label={t('common.validate')} onPress={() => setField(null)} />
            </>
          )}
        </View>
      </BottomSheet>
      <ArrivalSheet visible={arrival} onClose={() => setArrival(false)} />
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  summary: { gap: 10, padding: 18, borderRadius: radius.xl, backgroundColor: '#5B5CF0', ...shadow.glow, shadowColor: '#5B5CF0' },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: c.card, ...shadow.sm },
  edit: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.aiSoft, alignItems: 'center', justifyContent: 'center' },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: c.aiSoft },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.lg, backgroundColor: c.successSoft },
}));
