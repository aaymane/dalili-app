import { router } from 'expo-router';
import { Briefcase, GraduationCap, Quote, Save } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { toast } from '@/components/feedback/Toast';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { concernEmoji } from '@/features/profile/types';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { enter, reflow } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

import type { MyMentor } from '../api';
import { useUpdateMyMentor } from '../hooks';
import { MENTOR_LANGUAGES, SPECIALTIES, specialtyLabel, type MentorLanguage } from '../specialties';
import { MentorRow } from './MentorCard';

/** Au plus 4 spécialités : une fiche claire aide l'étudiant à choisir. */
const MAX_SPECIALTIES = 4;

/** Ma fiche publique : ce que les étudiants voient dans Explorer, avec l'aperçu qui change pendant la saisie. */
export function SheetEditor({ mentor }: { mentor: MyMentor }) {
  const { c, gradients, tones } = useTheme();
  const t = useT();
  const styles = useStyles();
  const update = useUpdateMyMentor();
  const [headline, setHeadline] = useState(mentor.headline);
  const [study, setStudy] = useState(mentor.study);
  const [quote, setQuote] = useState(mentor.quote);
  const [specialties, setSpecialties] = useState<string[]>(mentor.specialties);
  const [languages, setLanguages] = useState<MentorLanguage[]>(mentor.languages as MentorLanguage[]);

  // Spécialités d'une fiche plus ancienne (texte libre) : affichées cochées en premier, pour pouvoir les retirer.
  const [legacy] = useState(() => mentor.specialties.filter((s) => !(SPECIALTIES as string[]).includes(s)));
  const choices: string[] = [...legacy, ...SPECIALTIES];

  const draft = { headline: headline.trim(), study: study.trim(), quote: quote.trim(), specialties, languages };
  const changed =
    draft.headline !== mentor.headline ||
    draft.study !== mentor.study ||
    draft.quote !== mentor.quote ||
    specialties.join() !== mentor.specialties.join() ||
    languages.join() !== mentor.languages.join();

  const toggleSpecialty = (s: string) => {
    if (specialties.includes(s)) return setSpecialties(specialties.filter((x) => x !== s));
    if (specialties.length >= MAX_SPECIALTIES) {
      haptics.warning();
      return toast(t('sheet.maxSpecialties', { count: MAX_SPECIALTIES }), 'info');
    }
    setSpecialties([...specialties, s]);
  };
  // Au moins une langue : sinon personne ne sait comment te parler.
  const toggleLanguage = (l: MentorLanguage) => setLanguages(languages.includes(l) ? (languages.length > 1 ? languages.filter((x) => x !== l) : languages) : [...languages, l]);

  const save = () =>
    update.mutate(draft, {
      onSuccess: () => {
        haptics.success();
        toast(t('sheet.saved'));
        router.back();
      },
      onError: () => toast(t('common.notSaved'), 'info'),
    });

  return (
    <Screen
      top={gradients.roleTop.mentor}
      padded={false}
      keyboard
      header={<AppHeader back hideActions />}
      footer={<Button label={t('sheet.save')} accent={gradients.mentor} icon={<Save size={17} color="#fff" />} loading={update.isPending} disabled={!changed} onPress={save} />}>
      <View style={{ paddingHorizontal: 20, gap: 18 }}>
        <Animated.View entering={enter(0)} style={{ gap: 6 }}>
          <Text variant="hero">{t('sheet.title')}</Text>
          <Text variant="body" color={c.subtle}>
            {t('sheet.intro')}
          </Text>
        </Animated.View>

        <Animated.View entering={enter(1)} layout={reflow} style={{ gap: 8 }}>
          <Text variant="overline" color={tones.green.ink}>
            {t('sheet.preview')}
          </Text>
          <MentorRow m={{ ...mentor, ...draft }} />
        </Animated.View>

        <Animated.View entering={enter(2)} style={{ gap: 12 }}>
          <Input label={t('sheet.headline')} icon={<Briefcase size={16} color={tones.green.ink} />} value={headline} onChangeText={setHeadline} placeholder={t('sheet.headlinePh')} maxLength={60} />
          <Input label={t('sheet.study')} icon={<GraduationCap size={16} color={tones.green.ink} />} value={study} onChangeText={setStudy} placeholder={t('sheet.studyPh')} maxLength={60} />
          <Input label={t('sheet.quote')} icon={<Quote size={16} color={tones.green.ink} />} value={quote} onChangeText={setQuote} placeholder={t('sheet.quotePh')} maxLength={160} multiline />
        </Animated.View>

        <Animated.View entering={enter(3)} style={{ gap: 10 }}>
          <View style={styles.labelRow}>
            <Text variant="h3">{t('sheet.specialties')}</Text>
            <Text variant="caption" color={c.muted}>
              {specialties.length} / {MAX_SPECIALTIES}
            </Text>
          </View>
          <View style={styles.chips}>
            {choices.map((s) => {
              const on = specialties.includes(s);
              return (
                <PressableScale
                  key={s}
                  haptic="select"
                  onPress={() => toggleSpecialty(s)}
                  style={[styles.chip, on && { backgroundColor: tones.green.ink, borderColor: tones.green.ink }]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}>
                  <Text variant="smallStrong" color={on ? c.bg : c.navy}>
                    {s in concernEmoji ? `${concernEmoji[s as keyof typeof concernEmoji]} ` : ''}
                    {specialtyLabel(s)}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={enter(4)} style={{ gap: 10 }}>
          <Text variant="h3">{t('sheet.languages')}</Text>
          <View style={styles.chips}>
            {MENTOR_LANGUAGES.map((l) => {
              const on = languages.includes(l);
              return (
                <PressableScale
                  key={l}
                  haptic="select"
                  onPress={() => toggleLanguage(l)}
                  style={[styles.chip, on && { backgroundColor: tones.green.ink, borderColor: tones.green.ink }]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}>
                  <Text variant="smallStrong" color={on ? c.bg : c.navy}>
                    {t(`mentors.lang.${l}`)}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(({ c }) => ({
  labelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: c.line, backgroundColor: c.surface },
}));
