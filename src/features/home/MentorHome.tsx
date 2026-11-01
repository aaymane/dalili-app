import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { CalendarClock, CheckCheck, Eye, PenLine, PhoneCall, ShieldCheck, Star, Users, WifiOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { StarField } from '@/components/brand/StarField';
import { toast } from '@/components/feedback/Toast';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Reveal } from '@/components/motion/Reveal';
import { ChevronRight } from '@/components/ui/DirIcons';
import { ListIcon, ListRow, ListSection } from '@/components/ui/ListRow';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import type { MentorRequest, MyMentor } from '@/features/mentors/api';
import { splitMentorAgenda } from '@/features/mentors/appointments';
import { Constellation } from '@/features/mentors/components/Constellation';
import { NextCallCard } from '@/features/mentors/components/NextCallCard';
import { RequestCard } from '@/features/mentors/components/RequestCard';
import { useMentorRequests, useMentorSlots, useMyMentor, useSetAvailability } from '@/features/mentors/hooks';
import { displayName, useProfile } from '@/features/profile/store';
import { SafetySheet } from '@/features/safety/components/SafetySheet';
import { formatDecimal, useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { EASE_OUT, enter, leave, reflow, rise } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

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

/**
 * Accueil Mentor : bonjour et la phrase du moment, « Je prends des demandes », ton prochain appel, les demandes à
 * traiter, ton impact du mois (la constellation), ta fiche. Seul un mentor validé arrive ici (un compte est
 * étudiant OU mentor, voir useMentorRoleSync).
 */
export function MentorHome() {
  const { c, gradients, tones } = useTheme();
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
  const pending = agenda.toHandle.length;
  const report = (r: MentorRequest) => {
    setReported(r);
    setReporting(true);
  };

  return (
    <Screen top={gradients.roleTop.mentor} tabBar padded={false} header={<AppHeader />}>
      <View style={{ paddingHorizontal: 20, gap: 26 }}>
        {mine.isError && !mentor ? (
          <Animated.View entering={enter(0)}>
            <OfflineCard onRetry={() => void mine.refetch()} />
          </Animated.View>
        ) : !mentor ? (
          <View style={styles.skeleton} accessibilityLabel={t('mentorHome.loadingA11y')} />
        ) : (
          <>
            {/* Le salut, sans carte : qui attend ta réponse, en une phrase. */}
            <Animated.View entering={rise()} style={{ gap: 4 }}>
              <Text variant="hero" accessibilityRole="header">
                {t('mentorHome.hello', { name: displayName(profile) })}
              </Text>
              <Text variant="body" color={c.subtle}>
                {pending ? t('mentorHome.waiting', { count: pending }) : impact.acceptedThisMonth ? t('mentorHome.allAnswered') : t('mentorHome.noRequest')}
              </Text>
            </Animated.View>

            <Animated.View entering={rise(60)}>
              <Availability mentor={mentor} />
            </Animated.View>

            {!mentor.charterOk ? (
              <Animated.View entering={enter(1)}>
                <CharterCard />
              </Animated.View>
            ) : null}

            {next ? (
              <Animated.View entering={enter(2)} layout={reflow}>
                <NextCallCard r={next} />
              </Animated.View>
            ) : null}

            <Animated.View entering={enter(3)} layout={reflow}>
              <SectionHeader
                title={t('mentorHome.requests')}
                subtitle={requests.isPending ? t('common.loading') : pending ? t('mentorHome.pending', { count: pending }) : t('mentorHome.nonePending')}
                action={pending > HOME_REQUESTS ? t('mentorHome.seeAll', { count: pending }) : undefined}
                onAction={() => router.navigate('/(app)/(tabs)/agenda')}
                accent={tones.green.ink}
              />
              {requests.isError && !requests.data ? (
                <OfflineCard onRetry={() => void requests.refetch()} />
              ) : !requests.isPending && !pending ? (
                <View style={[styles.card, styles.clear]}>
                  <ListIcon icon={CheckCheck} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyStrong">{t('mentorHome.clearTitle')}</Text>
                    <Text variant="small" color={c.subtle}>
                      {mentor.availableThisWeek ? t('mentorHome.clearText') : t('mentorHome.clearPaused')}
                    </Text>
                  </View>
                </View>
              ) : (
                <Animated.View layout={reflow} style={styles.card}>
                  {agenda.toHandle.slice(0, HOME_REQUESTS).map((r, i) => (
                    <Animated.View key={r.id} entering={enter(4 + i)} exiting={leave} layout={reflow}>
                      <RequestCard r={r} first={i === 0} onReport={report} />
                    </Animated.View>
                  ))}
                </Animated.View>
              )}
            </Animated.View>

            <Reveal>
              <ImpactCard mentor={mentor} helped={impact.acceptedThisMonth} calls={impact.calls} waiting={pending} />
            </Reveal>

            <ListSection title={t('mentorHome.sheetTitle')}>
              <ListRow
                icon={CalendarClock}
                label={t('mentorHome.slots')}
                sub={slots.length ? t('mentorHome.slotsCount', { count: slots.length }) : t('mentorHome.slotsNone')}
                onPress={() => router.push('/(app)/creneaux')}
              />
              <ListRow icon={PenLine} label={t('mentorHome.editSheet')} sub={t('mentorHome.editSheetSub')} onPress={() => router.push('/(app)/ma-fiche')} />
              <ListRow icon={Eye} label={t('mentorHome.publicProfile')} sub={t('mentorHome.publicProfileSub')} onPress={() => router.push({ pathname: '/(app)/mentor/[id]', params: { id: mentor.id } })} />
            </ListSection>
          </>
        )}
      </View>
      <SafetySheet visible={reporting} onClose={() => setReporting(false)} target={reported ? { bookingId: reported.id } : null} name={reported?.student ?? t('mentorHome.thisStudent')} />
    </Screen>
  );
}

/** Le point de disponibilité : en ligne, une onde verte s'en échappe en boucle (immobile si le mouvement est réduit). */
function LiveDot({ on }: { on: boolean }) {
  const { c } = useTheme();
  const styles = useStyles();
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(on && !reduce ? withRepeat(withTiming(1, { duration: 1800, easing: EASE_OUT }), -1, false) : 0);
  }, [on, reduce, p]);
  const ring = useAnimatedStyle(() => ({ opacity: on ? 0.55 * (1 - p.get()) : 0, transform: [{ scale: 1 + p.get() * 1.8 }] }));
  return (
    <View style={styles.dotWrap}>
      <Animated.View style={[styles.dotRing, { backgroundColor: c.mentor }, ring]} />
      <View style={[styles.dot, { backgroundColor: on ? c.mentor : c.lineStrong }]} />
    </View>
  );
}

/** « Je prends des demandes » : l'interrupteur qui ouvre ou ferme ta fiche aux étudiants de ta ville. */
function Availability({ mentor }: { mentor: MyMentor }) {
  const { c } = useTheme();
  const styles = useStyles();
  const t = useT();
  const availability = useSetAvailability();
  const on = mentor.availableThisWeek;
  return (
    <View style={[styles.card, styles.avail]}>
      <LiveDot on={on} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{on ? t('mentorHome.taking') : t('mentorHome.paused')}</Text>
        <Text variant="caption" color={c.muted}>
          {on ? t('mentorHome.takingText', { city: mentor.city }) : t('mentorHome.pausedText')}
        </Text>
      </View>
      <Switch
        value={on}
        onValueChange={(v) => {
          haptics.select();
          availability.mutate(v, { onError: () => toast(t('common.notSaved'), 'info') });
        }}
        trackColor={{ true: c.mentor, false: c.lineStrong }}
        thumbColor={c.white}
        accessibilityLabel={t('mentorHome.taking')}
      />
    </View>
  );
}

/**
 * Ton impact du mois, sur la carte nuit : la constellation (toi au centre, les étudiants que tu aides, ceux qui
 * attendent), puis trois chiffres réels. Le seul moment fort de l'écran.
 */
function ImpactCard({ mentor, helped, calls, waiting }: { mentor: MyMentor; helped: number; calls: number; waiting: number }) {
  const { c, gradients } = useTheme();
  const styles = useStyles();
  const t = useT();
  return (
    <View style={styles.heroShadow}>
      {/* Le dégradé en fond, pas en conteneur : dedans, la constellation (Skia) ne se dessinait pas. */}
      <View style={styles.hero}>
        <LinearGradient colors={gradients.night} style={StyleSheet.absoluteFill} />
        <StarField variant="card" />
        <Text variant="smallStrong" color="rgba(255,255,255,0.75)">
          {t('mentorHome.impactTitle')}
        </Text>
        <Constellation helped={helped} waiting={waiting} />
        <View style={styles.stats}>
          <Stat icon={<Users size={14} color={c.mentorGlow} />} value={String(helped)} label={t('mentorHome.acceptedMonth')} />
          <View style={styles.statSep} />
          <Stat icon={<PhoneCall size={14} color={c.mentorGlow} />} value={String(calls)} label={t('mentorHome.calls')} />
          <View style={styles.statSep} />
          {mentor.sessions > 0 ? (
            <Stat icon={<Star size={14} color={c.mentorGlow} fill={c.mentorGlow} />} value={formatDecimal(mentor.rating)} label={t('mentorHome.rating')} />
          ) : (
            <Stat icon={<Star size={14} color={c.mentorGlow} />} value={t('mentorHome.new')} label={t('mentorHome.notRated')} />
          )}
        </View>
      </View>
    </View>
  );
}

/** Fiche envoyée avant la charte (ou charte qui a changé) : on la fait accepter, sans rien bloquer d'autre. */
function CharterCard() {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  return (
    <PressableScale onPress={() => router.push('/(app)/charte-mentor')} style={[styles.card, styles.charter]} accessibilityRole="button">
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
    <View style={[styles.card, styles.clear]}>
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

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon}
        <Text variant="h3" color={c.white}>
          {value}
        </Text>
      </View>
      <Text variant="caption" color="rgba(255,255,255,0.7)">
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  // L'ombre sur l'enveloppe, le dégradé coupé dans l'arrondi (iOS le dessine parfois en carré sans `overflow`).
  heroShadow: { borderRadius: radius.xxl, ...shadow.md },
  hero: { borderRadius: radius.xxl, padding: 20, gap: 10, overflow: 'hidden' },
  skeleton: { height: 320, borderRadius: radius.xxl, backgroundColor: c.surface, opacity: 0.6 },
  stats: { flexDirection: 'row', alignItems: 'center', paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.18)' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statSep: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: 'rgba(255,255,255,0.18)' },
  avail: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, paddingStart: 16 },
  dotWrap: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  dotRing: { position: 'absolute', width: 12, height: 12, borderRadius: 6 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  card: { borderRadius: radius.xl, backgroundColor: c.surface, overflow: 'hidden', ...shadow.sm },
  clear: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  charter: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1.5, borderColor: c.mentor },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
}));
