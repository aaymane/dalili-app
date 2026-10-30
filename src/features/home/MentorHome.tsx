import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { CheckCheck, Eye, PenLine, PhoneCall, ShieldCheck, Star, Users, WifiOff, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { StarField } from '@/components/brand/StarField';
import { toast } from '@/components/feedback/Toast';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Reveal } from '@/components/motion/Reveal';
import { ChevronRight } from '@/components/ui/DirIcons';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import type { MentorRequest, MyMentor } from '@/features/mentors/api';
import { splitMentorAgenda } from '@/features/mentors/appointments';
import { Constellation } from '@/features/mentors/components/Constellation';
import { NextCallCard } from '@/features/mentors/components/NextCallCard';
import { RequestCard } from '@/features/mentors/components/RequestCard';
import { useMentorRequests, useMyMentor, useSetAvailability } from '@/features/mentors/hooks';
import { displayName, useProfile } from '@/features/profile/store';
import { SafetySheet } from '@/features/safety/components/SafetySheet';
import { formatDecimal, useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { enter, leave, reflow } from '@/theme/motion';
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
 * Accueil Mentor : ta carte nuit (impact et disponibilité), ton prochain appel, les demandes à traiter, ta fiche.
 * Seul un mentor validé arrive ici (un compte est étudiant OU mentor, voir useMentorRoleSync).
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
  const agenda = splitMentorAgenda(requests.data ?? []);
  const next = agenda.upcoming[0];
  const report = (r: MentorRequest) => {
    setReported(r);
    setReporting(true);
  };

  return (
    <Screen top={gradients.roleTop.mentor} tabBar padded={false} header={<AppHeader />}>
      <View style={{ paddingHorizontal: 20, gap: 22 }}>
        {mine.isError && !mentor ? (
          <Animated.View entering={enter(0)}>
            <OfflineCard onRetry={() => void mine.refetch()} />
          </Animated.View>
        ) : !mentor ? (
          <View style={styles.skeleton} accessibilityLabel={t('mentorHome.loadingA11y')} />
        ) : (
          <>
            {!mentor.charterOk ? (
              <Animated.View entering={enter(0)}>
                <CharterCard />
              </Animated.View>
            ) : null}
            <Animated.View entering={enter(0)}>
              <ImpactCard name={displayName(profile)} mentor={mentor} requests={requests.data ?? []} pending={agenda.toHandle.length} />
            </Animated.View>

            {next ? (
              <Animated.View entering={enter(1)} layout={reflow}>
                <NextCallCard r={next} />
              </Animated.View>
            ) : null}

            <Animated.View entering={enter(2)} layout={reflow}>
              <SectionHeader
                title={t('mentorHome.requests')}
                subtitle={requests.isPending ? t('common.loading') : agenda.toHandle.length ? t('mentorHome.pending', { count: agenda.toHandle.length }) : t('mentorHome.nonePending')}
                action={agenda.toHandle.length > HOME_REQUESTS ? t('mentorHome.seeAll', { count: agenda.toHandle.length }) : undefined}
                onAction={() => router.navigate('/(app)/(tabs)/agenda')}
                accent={tones.green.ink}
              />
              {requests.isError && !requests.data ? (
                <OfflineCard onRetry={() => void requests.refetch()} />
              ) : !requests.isPending && !agenda.toHandle.length ? (
                <View style={[styles.card, styles.clear]}>
                  <IconTile icon={CheckCheck} tone="green" size={44} radius={14} />
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
                    <Animated.View key={r.id} entering={enter(3 + i)} exiting={leave} layout={reflow}>
                      <RequestCard r={r} first={i === 0} onReport={report} />
                    </Animated.View>
                  ))}
                </Animated.View>
              )}
            </Animated.View>

            <Reveal>
              <SectionHeader title={t('mentorHome.sheetTitle')} subtitle={t('mentorHome.sheetSub')} />
              <View style={styles.card}>
                <Shortcut icon={PenLine} label={t('mentorHome.editSheet')} sub={t('mentorHome.editSheetSub')} onPress={() => router.push('/(app)/ma-fiche')} />
                <Shortcut
                  icon={Eye}
                  label={t('mentorHome.publicProfile')}
                  sub={t('mentorHome.publicProfileSub')}
                  onPress={() => router.push({ pathname: '/(app)/mentor/[id]', params: { id: mentor.id } })}
                  separated
                />
              </View>
            </Reveal>
          </>
        )}
      </View>
      <SafetySheet visible={reporting} onClose={() => setReporting(false)} target={reported ? { bookingId: reported.id } : null} name={reported?.student ?? t('mentorHome.thisStudent')} />
    </Screen>
  );
}

/** Carte nuit : bonjour, la phrase du moment, tes chiffres, et l'interrupteur « Je prends des demandes ». */
function ImpactCard({ name, mentor, requests, pending }: { name: string; mentor: MyMentor; requests: MentorRequest[]; pending: number }) {
  const { c, gradients } = useTheme();
  const styles = useStyles();
  const t = useT();
  const availability = useSetAvailability();
  const impact = impactOf(requests);
  const sentence = pending ? t('mentorHome.waiting', { count: pending }) : impact.acceptedThisMonth ? t('mentorHome.allAnswered') : t('mentorHome.noRequest');
  return (
    <LinearGradient colors={gradients.night} style={styles.hero}>
      <StarField variant="card" />
      <Constellation helped={impact.acceptedThisMonth} waiting={pending} />
      <View style={{ gap: 6 }}>
        <Text variant="smallStrong" color="rgba(255,255,255,0.7)">
          {t('mentorHome.hello', { name })}
        </Text>
        <Text variant="h2" color={c.white}>
          {sentence}
        </Text>
      </View>
      <View style={styles.stats}>
        <Stat icon={<Users size={14} color={c.mentorGlow} />} value={String(impact.acceptedThisMonth)} label={t('mentorHome.acceptedMonth')} />
        <View style={styles.statSep} />
        <Stat icon={<PhoneCall size={14} color={c.mentorGlow} />} value={String(impact.calls)} label={t('mentorHome.calls')} />
        <View style={styles.statSep} />
        {mentor.sessions > 0 ? (
          <Stat icon={<Star size={14} color={c.mentorGlow} fill={c.mentorGlow} />} value={formatDecimal(mentor.rating)} label={t('mentorHome.rating')} />
        ) : (
          <Stat icon={<Star size={14} color={c.mentorGlow} />} value={t('mentorHome.new')} label={t('mentorHome.notRated')} />
        )}
      </View>
      <View style={styles.avail}>
        <View style={[styles.availDot, { backgroundColor: mentor.availableThisWeek ? c.mentorGlow : 'rgba(255,255,255,0.35)' }]} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" color={c.white}>
            {mentor.availableThisWeek ? t('mentorHome.taking') : t('mentorHome.paused')}
          </Text>
          <Text variant="caption" color="rgba(255,255,255,0.7)">
            {mentor.availableThisWeek ? t('mentorHome.takingText', { city: mentor.city }) : t('mentorHome.pausedText')}
          </Text>
        </View>
        <Switch
          value={mentor.availableThisWeek}
          onValueChange={(v) => {
            haptics.select();
            availability.mutate(v, { onError: () => toast(t('common.notSaved'), 'info') });
          }}
          trackColor={{ true: c.mentor, false: 'rgba(255,255,255,0.25)' }}
          accessibilityLabel={t('mentorHome.taking')}
        />
      </View>
    </LinearGradient>
  );
}

function Shortcut({ icon, label, sub, onPress, separated }: { icon: LucideIcon; label: string; sub: string; onPress: () => void; separated?: boolean }) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <PressableScale onPress={onPress} scaleTo={0.985} style={[styles.shortcut, separated && styles.sep]} accessibilityRole="button" accessibilityLabel={label}>
      <IconTile icon={icon} tone="green" size={44} radius={14} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{label}</Text>
        <Text variant="small" color={c.subtle}>
          {sub}
        </Text>
      </View>
      <ChevronRight size={18} color={c.subtle} />
    </PressableScale>
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
  hero: { borderRadius: radius.xxl, padding: 20, paddingTop: 8, gap: 14, overflow: 'hidden', ...shadow.md },
  skeleton: { height: 320, borderRadius: radius.xxl, backgroundColor: c.surface, opacity: 0.6 },
  stats: { flexDirection: 'row', alignItems: 'center', paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.18)' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statSep: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: 'rgba(255,255,255,0.18)' },
  avail: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.08)' },
  availDot: { width: 10, height: 10, borderRadius: 5 },
  card: { borderRadius: radius.xl, backgroundColor: c.surface, overflow: 'hidden', ...shadow.sm },
  clear: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  charter: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1.5, borderColor: c.mentor },
  shortcut: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 72 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
}));
