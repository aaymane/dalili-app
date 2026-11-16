import { router } from 'expo-router';
import { ShieldCheck, WifiOff } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Reveal } from '@/components/motion/Reveal';
import { ChevronRight } from '@/components/ui/DirIcons';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import type { MentorRequest } from '@/features/mentors/api';
import { splitMentorAgenda } from '@/features/mentors/appointments';
import { RequestCard } from '@/features/mentors/components/RequestCard';
import { useMentorRequests, useMentorSlots, useMyMentor } from '@/features/mentors/hooks';
import { displayName, useProfile } from '@/features/profile/store';
import { SafetySheet } from '@/features/safety/components/SafetySheet';
import { useT } from '@/i18n';
import { enter, leave, reflow, rise } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

import { ArrivalsBoard } from './mentor/ArrivalsBoard';
import { Showcase } from './mentor/Showcase';
import { ThanksCarousel } from './mentor/ThanksCarousel';

/** L'accueil montre les 3 demandes les plus proches ; l'agenda les montre toutes. */
const HOME_REQUESTS = 3;

/** Chiffres réels, tirés des demandes. */
function impactOf(requests: MentorRequest[]) {
  const month = new Date().toISOString().slice(0, 7);
  const accepted = requests.filter((r) => r.status === 'confirmed' || r.status === 'done');
  return {
    acceptedThisMonth: accepted.filter((r) => r.startsAt.slice(0, 7) === month).length,
    calls: accepted.filter((r) => r.status === 'done' || new Date(r.startsAt).getTime() < Date.now()).length,
  };
}

/** « Bonsoir » à partir de 18 h et jusqu'à 5 h, « Bonjour » le reste du temps. */
const isEvening = () => {
  const h = new Date().getHours();
  return h >= 18 || h < 5;
};

/**
 * Accueil Mentor : « le hall des arrivées » (docs/DIRECTION.md, L'espace Mentor). Le mentor a déjà fait le voyage ;
 * ici, il accueille ceux qui arrivent. Dans l'ordre de lecture :
 * 1. le salut ;
 * 2. le tableau des arrivées (le héros, seul moment nuit) : prochain appel, sinon qui attend, sinon ton mois ;
 *    ta porte (Ouvert / En pause) est dans son coin ;
 * 3. les demandes à traiter (seulement s'il y en a) ;
 * 4. « Ils te disent merci » : les mots des étudiants, avec leur visage ;
 * 5. ta vitrine : ta fiche comme un étudiant la voit, et ses réglages.
 * Seul un mentor validé arrive ici (un compte est étudiant OU mentor, voir useMentorRoleSync).
 */
export function MentorHome() {
  const { gradients, tones } = useTheme();
  const styles = useStyles();
  const t = useT();
  const profile = useProfile((s) => s.profile);
  const mine = useMyMentor();
  const requests = useMentorRequests();
  const [reported, setReported] = useState<MentorRequest | null>(null);
  const [reporting, setReporting] = useState(false);
  const mentor = mine.data;
  const slots = useMentorSlots(mentor?.id).data ?? [];
  const agenda = splitMentorAgenda(requests.data ?? []);
  const impact = impactOf(requests.data ?? []);
  const next = agenda.upcoming[0];
  const pending = agenda.toHandle;
  const report = (r: MentorRequest) => {
    setReported(r);
    setReporting(true);
  };
  const reviews = mentor?.reviews ?? [];

  return (
    <Screen top={gradients.roleTop.mentor} tabBar padded={false} header={<AppHeader />}>
      <View style={{ paddingHorizontal: 20, gap: 24 }}>
        {mine.isError && !mentor ? (
          <Animated.View entering={enter(0)}>
            <OfflineCard onRetry={() => void mine.refetch()} />
          </Animated.View>
        ) : !mentor ? (
          <View style={styles.skeleton} accessibilityLabel={t('mentorHome.loadingA11y')} />
        ) : (
          <>
            <Animated.View entering={rise()}>
              <Text variant="hero" accessibilityRole="header">
                {t(isEvening() ? 'mentorHome.helloEvening' : 'mentorHome.hello', { name: displayName(profile) })}
              </Text>
            </Animated.View>

            <Animated.View entering={enter(1)} layout={reflow}>
              <ArrivalsBoard mentor={mentor} next={next} pending={pending} helped={impact.acceptedThisMonth} calls={impact.calls} />
            </Animated.View>

            {!mentor.charterOk ? (
              <Animated.View entering={enter(2)} layout={reflow}>
                <CharterCard />
              </Animated.View>
            ) : null}

            {/* Les demandes n'ont leur section que s'il y en a : « tout est à jour » est déjà dit par le tableau. */}
            {requests.isError && !requests.data ? (
              <Animated.View entering={enter(3)}>
                <OfflineCard onRetry={() => void requests.refetch()} />
              </Animated.View>
            ) : pending.length ? (
              <Animated.View entering={enter(3)} exiting={leave} layout={reflow}>
                <SectionHeader
                  title={t('mentorHome.requests')}
                  subtitle={t('mentorHome.pending', { count: pending.length })}
                  action={pending.length > HOME_REQUESTS ? t('mentorHome.seeAll', { count: pending.length }) : undefined}
                  onAction={() => router.navigate('/(app)/(tabs)/agenda')}
                  accent={tones.green.ink}
                />
                <Animated.View layout={reflow} style={styles.surface}>
                  {pending.slice(0, HOME_REQUESTS).map((r, i) => (
                    <Animated.View key={r.id} entering={enter(4 + i)} exiting={leave} layout={reflow}>
                      <RequestCard r={r} first={i === 0} onReport={report} />
                    </Animated.View>
                  ))}
                </Animated.View>
              </Animated.View>
            ) : null}

            <Reveal>
              <SectionHeader
                title={t('mentorHome.thanks.title')}
                subtitle={reviews.length ? t('mentorHome.thanks.sub', { count: reviews.length }) : undefined}
                accent={tones.green.ink}
              />
              <ThanksCarousel reviews={reviews} />
            </Reveal>

            <Reveal>
              <SectionHeader title={t('mentorHome.showcase.title')} subtitle={t('mentorHome.sheetSub')} accent={tones.green.ink} />
              <Showcase mentor={mentor} slots={slots.length} />
            </Reveal>
          </>
        )}
      </View>
      <SafetySheet visible={reporting} onClose={() => setReporting(false)} target={reported ? { bookingId: reported.id } : null} name={reported?.student ?? t('mentorHome.thisStudent')} />
    </Screen>
  );
}

/** Fiche envoyée avant la charte (ou charte qui a changé) : on la fait accepter, sans rien bloquer d'autre. */
function CharterCard() {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  return (
    <PressableScale onPress={() => router.push('/(app)/charte-mentor')} style={[styles.surface, styles.charter]} accessibilityRole="button">
      <IconTile icon={ShieldCheck} tone="green" size={44} radius={14} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{t('mentorHome.charter')}</Text>
        <Text variant="small" color={c.subtle}>
          {t('mentorHome.charterText')}
        </Text>
      </View>
      <ChevronRight size={18} color={c.subtle} />
    </PressableScale>
  );
}

function OfflineCard({ onRetry }: { onRetry: () => void }) {
  const { c, tones } = useTheme();
  const t = useT();
  const styles = useStyles();
  return (
    <View style={[styles.surface, styles.row]}>
      <IconTile icon={WifiOff} tone="slate" size={44} radius={14} />
      <Text variant="small" color={c.subtle} style={{ flex: 1 }}>
        {t('common.offline')}
      </Text>
      <PressableScale onPress={onRetry} hitSlop={6} style={styles.retry} accessibilityLabel={t('common.retry')}>
        <Text variant="smallStrong" color={tones.green.ink}>
          {t('common.retry')}
        </Text>
      </PressableScale>
    </View>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  skeleton: { height: 360, borderRadius: radius.xxl, backgroundColor: c.surface, opacity: 0.6 },
  surface: { borderRadius: radius.xl, backgroundColor: c.surface, overflow: 'hidden', ...shadow.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  charter: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1.5, borderColor: c.mentor },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
}));
