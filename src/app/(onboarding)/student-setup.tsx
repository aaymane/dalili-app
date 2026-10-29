import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { BellRing, BookOpenCheck, Briefcase, CircleCheckBig, FileClock, GraduationCap, Microscope, Sparkles, Sprout, UserRound, type LucideIcon } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Screen } from '@/components/layout/Screen';
import { StepHeader } from '@/components/layout/StepHeader';
import { Button } from '@/components/ui/Button';
import { Calendar } from '@/components/ui/Calendar';
import { ArrowRight, ChevronRight } from '@/components/ui/DirIcons';
import { IconTile } from '@/components/ui/IconTile';
import { OptionCard } from '@/components/ui/OptionCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { CityPicker } from '@/features/profile/components/CityPicker';
import { useProfile } from '@/features/profile/store';
import { concernEmoji, concernLabel, CONCERNS, studyLevelLabel, type CampusStatus, type Concern, type HousingStatus, type StudyLevel } from '@/features/profile/types';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { toISODate } from '@/lib/date';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius, type Tone } from '@/theme/tokens';
import { leave, rise } from '@/theme/motion';

const tile = (tone: Tone, icon: LucideIcon) => <IconTile icon={icon} tone={tone} size={42} radius={13} />;

const QUESTIONS = 6;
/** Le haut d'écran de chaque question (dégradé pastel du thème en cours). */
const TOPS = ['peach', 'sky', 'mint', 'lilac', 'peach', 'sky', 'lilac'] as const;

/** Questions d'onboarding Étudiant : chaque réponse personnalise le parcours, les mentors et l'IA. */
export default function StudentQuestions() {
  const { c: colors, gradients } = useTheme();
  const styles = useStyles();
  const profile = useProfile((s) => s.profile);
  const update = useProfile((s) => s.update);
  const [i, setI] = useState(0);
  const [unknownDate, setUnknownDate] = useState(false);
  const t = useT();

  const next = () => {
    haptics.press();
    if (i < QUESTIONS) setI(i + 1);
  };
  const back = () => (i ? setI(i - 1) : router.back());

  const finish = async (enableNotifs: boolean) => {
    if (enableNotifs && Platform.OS !== 'web') {
      try {
        const res = await Notifications.requestPermissionsAsync();
        update({ notificationsEnabled: res.granted });
      } catch {
        update({ notificationsEnabled: false });
      }
    }
    router.replace({ pathname: '/(onboarding)/loading', params: { role: 'student' } });
  };

  const q = Math.min(i, QUESTIONS) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const header = { title: t(`onboarding.student.q${q}`), subtitle: t(`onboarding.student.q${q}Text`) };

  const canContinue =
    (i === 0 && !!profile.studyLevel) ||
    (i === 1 && !!profile.campusStatus) ||
    i === 2 ||
    (i === 3 && (!!profile.arrivalDate || unknownDate)) ||
    (i === 4 && !!profile.housing) ||
    (i === 5 && profile.concerns.length > 0);

  const toggleConcern = (c: Concern) =>
    update({ concerns: profile.concerns.includes(c) ? profile.concerns.filter((x) => x !== c) : [...profile.concerns, c] });

  return (
    <Screen
      top={gradients[TOPS[i]]}
      bg="#fff"
      padded={false}
      header={
        <StepHeader
          animKey={i}
          overline={i < QUESTIONS ? t('onboarding.step', { n: i + 1, total: QUESTIONS }) : t('onboarding.lastStep')}
          title={header.title}
          subtitle={header.subtitle}
          step={Math.min(i, QUESTIONS - 1)}
          total={QUESTIONS}
          onBack={back}
        />
      }
      footer={
        i < QUESTIONS ? (
          <Button
            label={i === QUESTIONS - 1 ? t('onboarding.student.setup') : t('common.continue')}
            icon={i === QUESTIONS - 1 ? <Sparkles size={18} color="#fff" /> : <ArrowRight size={18} color="#fff" />}
            disabled={!canContinue}
            onPress={next}
          />
        ) : (
          <View style={{ gap: 4 }}>
            <Button label={t('onboarding.student.enableReminders')} icon={<BellRing size={18} color="#fff" />} onPress={() => finish(true)} />
            <Button label={t('onboarding.student.later')} variant="ghost" onPress={() => finish(false)} />
          </View>
        )
      }>
      <Animated.View key={i} entering={rise(80)} exiting={leave} style={{ paddingHorizontal: 20, gap: 12 }}>
        {i === 0 &&
          (
            [
              ['bac', t('onboarding.student.bac'), t('onboarding.student.bacText'), tile('amber', Sprout)],
              ['licence', studyLevelLabel('licence'), t('onboarding.student.licenceText'), tile('blue', BookOpenCheck)],
              ['master', studyLevelLabel('master'), t('onboarding.student.masterText'), tile('violet', Briefcase)],
              ['doctorat', studyLevelLabel('doctorat'), t('onboarding.student.doctoratText'), tile('green', Microscope)],
            ] as [StudyLevel, string, string, ReactNode][]
          ).map(([v, title, s, icon]) => (
            <OptionCard key={v} title={title} subtitle={s} icon={icon} selected={profile.studyLevel === v} onPress={() => update({ studyLevel: v })} />
          ))}

        {i === 1 &&
          (
            [
              ['not_started', t('onboarding.student.notStarted'), t('onboarding.student.notStartedText'), tile('blue', UserRound)],
              ['in_progress', t('campusStatus.in_progress'), t('onboarding.student.inProgressText'), tile('violet', FileClock)],
              ['accepted', t('campusStatus.accepted'), t('onboarding.student.acceptedText'), tile('green', Sparkles)],
              ['enrolled', t('onboarding.student.enrolled'), t('onboarding.student.enrolledText'), tile('amber', GraduationCap)],
            ] as [CampusStatus, string, string, ReactNode][]
          ).map(([v, title, s, icon]) => (
            <OptionCard key={v} title={title} subtitle={s} icon={icon} selected={profile.campusStatus === v} onPress={() => update({ campusStatus: v })} />
          ))}

        {i === 2 && <CityPicker value={profile.destinationCity} onChange={(c) => update({ destinationCity: c })} />}

        {i === 3 && (
          <>
            <PressableScale
              onPress={() => {
                setUnknownDate(true);
                update({ arrivalDate: null });
              }}
              haptic="select"
              style={[styles.unknown, unknownDate && { borderColor: '#7FA6FF' }]}>
              <IconTile size={44} colors={['#6D7BFF', '#5B3FD9']} radius={22}>
                <Sparkles size={20} color="#fff" />
              </IconTile>
              <View style={{ flex: 1 }}>
                <Text variant="h3" color="#fff">
                  {t('cityPicker.unknown')}
                </Text>
                <Text variant="small" color="rgba(255,255,255,0.65)">
                  {t('onboarding.student.unknownDateText')}
                </Text>
              </View>
              <ChevronRight size={18} color="#fff" />
            </PressableScale>
            <Calendar
              selected={profile.arrivalDate ? new Date(profile.arrivalDate) : null}
              initialMonth={profile.arrivalDate ? new Date(profile.arrivalDate) : new Date(new Date().getFullYear() + (new Date().getMonth() >= 8 ? 1 : 0), 8, 1)}
              minDate={new Date()}
              onSelect={(d) => {
                setUnknownDate(false);
                update({ arrivalDate: toISODate(d) });
              }}
            />
          </>
        )}

        {i === 4 &&
          (
            [
              ['none', t('housingStatus.none'), t('onboarding.student.noneText'), tile('amber', Sprout)],
              ['searching', t('housingStatus.searching'), t('onboarding.student.searchingText'), tile('blue', FileClock)],
              ['found', t('onboarding.student.found'), t('onboarding.student.foundText'), tile('green', CircleCheckBig)],
            ] as [HousingStatus, string, string, ReactNode][]
          ).map(([v, title, s, icon]) => (
            <OptionCard key={v} title={title} subtitle={s} icon={icon} selected={profile.housing === v} onPress={() => update({ housing: v })} />
          ))}

        {i === 5 && (
          <View style={styles.concerns}>
            {CONCERNS.map((c) => {
              const on = profile.concerns.includes(c);
              return (
                <PressableScale key={c} onPress={() => toggleConcern(c)} haptic="select" style={[styles.concern, on && styles.concernOn]}>
                  <Text style={{ fontSize: 22 }}>{concernEmoji[c]}</Text>
                  <Text variant="smallStrong" color={on ? colors.electric : colors.navy} align="center">
                    {concernLabel(c)}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        )}

        {i === 6 && (
          <View style={styles.notifCard}>
            {[
              { d: t('onboarding.student.notif1Due'), t: t('onboarding.student.notif1'), s: 'VISA · VLS-TS' },
              { d: t('onboarding.student.notif2Due'), t: t('onboarding.student.notif2'), s: 'CVEC' },
              { d: t('onboarding.student.notif3Due'), t: t('onboarding.student.notif3'), s: 'CAF · APL' },
            ].map((n, k) => (
              <View key={k} style={styles.notif}>
                <IconTile icon={BellRing} tone="blue" size={36} radius={11} />
                <View style={{ flex: 1 }}>
                  <Text variant="smallStrong">{n.t}</Text>
                  <Text variant="caption" color={colors.muted}>
                    {n.s}
                  </Text>
                </View>
                <View style={styles.due}>
                  <Text variant="caption" color={colors.danger}>
                    {n.d}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </Animated.View>
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  unknown: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.xl, backgroundColor: c.navyInk, borderWidth: 2, borderColor: 'transparent', ...shadow.md },
  concerns: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  concern: { width: '48%', minHeight: 92, padding: 12, borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1.5, borderColor: c.line, alignItems: 'center', justifyContent: 'center', gap: 6, ...shadow.sm },
  concernOn: { borderColor: c.electric, backgroundColor: c.cardSelected },
  notifCard: { gap: 10, padding: 14, borderRadius: radius.xl, backgroundColor: c.card, ...shadow.md },
  notif: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: radius.md, backgroundColor: c.fill },
  due: { backgroundColor: c.dangerSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
}));
