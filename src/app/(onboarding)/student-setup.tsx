import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import {
  ArrowRight,
  BellRing,
  BookOpenCheck,
  Briefcase,
  CircleCheckBig,
  FileClock,
  GraduationCap,
  Microscope,
  Sparkles,
  Sprout,
  UserRound,
  ChevronRight,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Screen } from '@/components/layout/Screen';
import { StepHeader } from '@/components/layout/StepHeader';
import { Button } from '@/components/ui/Button';
import { Calendar } from '@/components/ui/Calendar';
import { IconTile } from '@/components/ui/IconTile';
import { OptionCard } from '@/components/ui/OptionCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { CityPicker } from '@/features/profile/components/CityPicker';
import { useProfile } from '@/features/profile/store';
import { concernLabels, type CampusStatus, type Concern, type HousingStatus, type StudyLevel } from '@/features/profile/types';
import { haptics } from '@/lib/haptics';
import { toISODate } from '@/lib/date';
import { gradients, palette, radius, shadow } from '@/theme/tokens';
import { leave, rise } from '@/theme/motion';

const tile = (c: [string, string], icon: ReactNode) => (
  <IconTile size={42} colors={c} radius={13}>
    {icon}
  </IconTile>
);

const QUESTIONS = 6;
const tops = [gradients.peach, gradients.sky, gradients.mint, gradients.lilac, gradients.peach, gradients.sky, gradients.lilac];

/** Questions d'onboarding Étudiant : chaque réponse personnalise le parcours, les mentors et l'IA. */
export default function StudentQuestions() {
  const profile = useProfile((s) => s.profile);
  const update = useProfile((s) => s.update);
  const [i, setI] = useState(0);
  const [unknownDate, setUnknownDate] = useState(false);

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

  const header: Record<number, { title: string; subtitle: string }> = {
    0: { title: 'Où en es-tu\ndans tes études ?', subtitle: 'On adapte les démarches, les mentors et les conseils selon ton niveau.' },
    1: { title: 'Et avec Campus France,\nça en est où ?', subtitle: 'Pas de panique, on t’aide à chaque étape, même si tu n’as rien commencé.' },
    2: { title: 'Où vas-tu poser\ntes valises ?', subtitle: 'On te connecte aux étudiants et mentors de ta future ville.' },
    3: { title: 'Quand arrives-tu\nen France ?', subtitle: 'On calcule toutes tes échéances à partir de cette date.' },
    4: { title: 'As-tu déjà\nun logement ?', subtitle: 'C’est souvent la démarche la plus stressante. On s’en occupe ensemble.' },
    5: { title: 'Qu’est-ce qui t’inquiète\nle plus ?', subtitle: 'Choisis tout ce qui compte. Dalili mettra l’accent dessus.' },
    6: { title: 'Ne rate aucune\néchéance.', subtitle: 'On te prévient avant chaque date importante : visa, CAF, CVEC…' },
  };

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
      top={tops[i]}
      bg="#fff"
      padded={false}
      header={
        <StepHeader
          animKey={i}
          overline={i < QUESTIONS ? `Étape ${i + 1} / ${QUESTIONS} · DALILI` : 'Dernière étape · DALILI'}
          title={header[i].title}
          subtitle={header[i].subtitle}
          step={Math.min(i, QUESTIONS - 1)}
          total={QUESTIONS}
          onBack={back}
        />
      }
      footer={
        i < QUESTIONS ? (
          <Button
            label={i === QUESTIONS - 1 ? 'Configurer DALILI' : 'Continuer'}
            icon={i === QUESTIONS - 1 ? <Sparkles size={18} color="#fff" /> : <ArrowRight size={18} color="#fff" />}
            disabled={!canContinue}
            onPress={next}
          />
        ) : (
          <View style={{ gap: 4 }}>
            <Button label="Activer les rappels" icon={<BellRing size={18} color="#fff" />} onPress={() => finish(true)} />
            <Button label="Plus tard" variant="ghost" onPress={() => finish(false)} />
          </View>
        )
      }>
      <Animated.View key={i} entering={rise(80)} exiting={leave} style={{ paddingHorizontal: 20, gap: 12 }}>
        {i === 0 &&
          (
            [
              ['bac', 'Je viens d’avoir le BAC', 'Première année en France', tile(['#FDBA74', '#F97316'], <Sprout size={20} color="#fff" />)],
              ['licence', 'Licence (L1 · L2 · L3)', 'Étudiant·e actuel·le', tile(['#7FA6FF', '#3D78FF'], <BookOpenCheck size={20} color="#fff" />)],
              ['master', 'Master (M1 · M2)', 'Diplôme + spécialisation', tile(['#C084FC', '#9333EA'], <Briefcase size={20} color="#fff" />)],
              ['doctorat', 'Doctorat / Recherche', 'PhD, post-doc', tile(['#4ADE80', '#16A34A'], <Microscope size={20} color="#fff" />)],
            ] as [StudyLevel, string, string, ReactNode][]
          ).map(([v, t, s, icon]) => (
            <OptionCard key={v} title={t} subtitle={s} icon={icon} selected={profile.studyLevel === v} onPress={() => update({ studyLevel: v })} />
          ))}

        {i === 1 &&
          (
            [
              ['not_started', 'J’ai même pas commencé', 'On t’accompagne de A à Z', tile(['#7FA6FF', '#3D78FF'], <UserRound size={20} color="#fff" />)],
              ['in_progress', 'Dossier en cours', 'On t’aide à finaliser ton dossier', tile(['#C084FC', '#9333EA'], <FileClock size={20} color="#fff" />)],
              ['accepted', 'Dossier accepté', 'Bravo ! On prépare ton visa', tile(['#4ADE80', '#16A34A'], <Sparkles size={20} color="#fff" />)],
              ['enrolled', 'Inscrit·e à l’université', 'On t’installe confortablement', tile(['#FDBA74', '#F97316'], <GraduationCap size={20} color="#fff" />)],
            ] as [CampusStatus, string, string, ReactNode][]
          ).map(([v, t, s, icon]) => (
            <OptionCard key={v} title={t} subtitle={s} icon={icon} selected={profile.campusStatus === v} onPress={() => update({ campusStatus: v })} />
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
                  Je ne sais pas encore
                </Text>
                <Text variant="small" color="rgba(255,255,255,0.65)">
                  Laisse Dalili te guider selon les périodes de rentrée.
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
              ['none', 'Pas encore cherché', 'On commence ensemble, étape par étape', tile(['#FDBA74', '#F97316'], <Sprout size={20} color="#fff" />)],
              ['searching', 'Je cherche', 'CROUS, coloc, résidence… on t’aide à trier', tile(['#7FA6FF', '#3D78FF'], <FileClock size={20} color="#fff" />)],
              ['found', 'C’est réglé !', 'Bravo, on passe à la suite', tile(['#4ADE80', '#16A34A'], <CircleCheckBig size={20} color="#fff" />)],
            ] as [HousingStatus, string, string, ReactNode][]
          ).map(([v, t, s, icon]) => (
            <OptionCard key={v} title={t} subtitle={s} icon={icon} selected={profile.housing === v} onPress={() => update({ housing: v })} />
          ))}

        {i === 5 && (
          <View style={styles.concerns}>
            {(Object.keys(concernLabels) as Concern[]).map((c) => {
              const on = profile.concerns.includes(c);
              return (
                <PressableScale key={c} onPress={() => toggleConcern(c)} haptic="select" style={[styles.concern, on && styles.concernOn]}>
                  <Text style={{ fontSize: 22 }}>{concernLabels[c].emoji}</Text>
                  <Text variant="smallStrong" color={on ? palette.electric : palette.navy} align="center">
                    {concernLabels[c].label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        )}

        {i === 6 && (
          <View style={styles.notifCard}>
            {[
              { d: 'Dans 4 j', t: 'Ton autorisation d’entrer en France', s: 'VISA · VLS-TS' },
              { d: 'Dans 13 j', t: 'Ta cotisation vie étudiante', s: 'CVEC' },
              { d: 'Dans 18 j', t: 'Ton aide au loyer', s: 'CAF · APL' },
            ].map((n, k) => (
              <View key={k} style={styles.notif}>
                <IconTile size={36} bg={palette.electricSoft} radius={11}>
                  <BellRing size={16} color={palette.electric} />
                </IconTile>
                <View style={{ flex: 1 }}>
                  <Text variant="smallStrong">{n.t}</Text>
                  <Text variant="caption" color={palette.muted}>
                    {n.s}
                  </Text>
                </View>
                <View style={styles.due}>
                  <Text variant="caption" color={palette.danger}>
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

const styles = StyleSheet.create({
  unknown: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.xl, backgroundColor: palette.navyInk, borderWidth: 2, borderColor: 'transparent', ...shadow.md },
  concerns: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  concern: { width: '48%', minHeight: 92, padding: 12, borderRadius: radius.lg, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#EDF0F7', alignItems: 'center', justifyContent: 'center', gap: 6, ...shadow.sm },
  concernOn: { borderColor: palette.electric, backgroundColor: '#F6F8FF' },
  notifCard: { gap: 10, padding: 14, borderRadius: radius.xl, backgroundColor: '#fff', ...shadow.md },
  notif: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: radius.md, backgroundColor: '#F7F8FC' },
  due: { backgroundColor: palette.dangerSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
});
