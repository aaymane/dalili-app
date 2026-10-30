import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Check, Eye, Flag, Hourglass, MessageCircle, PhoneCall, ShieldCheck, Star, Users, Video, WifiOff } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { StarField } from '@/components/brand/StarField';
import { toast } from '@/components/feedback/Toast';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Reveal } from '@/components/motion/Reveal';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ChevronRight } from '@/components/ui/DirIcons';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { callIsOpen } from '@/features/call/window';
import type { MentorRequest, MyMentor } from '@/features/mentors/api';
import { Constellation } from '@/features/mentors/components/Constellation';
import { useAnswerRequest, useMentorRequests, useMyMentor, useSetAvailability } from '@/features/mentors/hooks';
import { useOpenFromBooking } from '@/features/messages/hooks';
import { displayName, useProfile } from '@/features/profile/store';
import { SafetySheet } from '@/features/safety/components/SafetySheet';
import { formatDecimal, useT } from '@/i18n';
import { daysFromToday, formatDayMonth, formatTime, relativeDays } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { enter, leave, pop, reflow } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { palette, radius } from '@/theme/tokens';

const AVATAR_TONES = [palette.electricLight, palette.aiIndigo, palette.mentor, palette.host];
const avatarTone = (name: string) => AVATAR_TONES[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_TONES.length];

/** « demain », « dans 3 jours », puis la date au-delà d'une semaine. */
const when = (iso: string) => (daysFromToday(iso) <= 6 ? relativeDays(iso) : formatDayMonth(iso));

/** Ce que le mentor doit voir : les demandes à traiter, puis les appels acceptés à venir. */
function visible(requests: MentorRequest[]) {
  const now = Date.now() - 2 * 3_600_000;
  return requests
    .filter((r) => r.status === 'pending' || (r.status === 'confirmed' && new Date(r.startsAt).getTime() > now))
    .sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending') || a.startsAt.localeCompare(b.startsAt));
}

/** Chiffres réels, tirés des demandes (60 derniers jours et à venir). */
function impactOf(requests: MentorRequest[]) {
  const month = new Date().toISOString().slice(0, 7);
  const accepted = requests.filter((r) => r.status === 'confirmed' || r.status === 'done');
  return {
    acceptedThisMonth: accepted.filter((r) => r.startsAt.slice(0, 7) === month).length,
    calls: accepted.filter((r) => r.status === 'done' || new Date(r.startsAt).getTime() < Date.now()).length,
  };
}

/** Accueil Mentor : ta carte nuit, les demandes à traiter, ta disponibilité. */
export function MentorHome() {
  const { c, gradients } = useTheme();
  const styles = useStyles();
  const profile = useProfile((s) => s.profile);
  const mine = useMyMentor();
  const requests = useMentorRequests();
  const availability = useSetAvailability();
  const t = useT();

  const mentor = mine.data;
  return (
    <Screen top={gradients.roleTop.mentor} tabBar padded={false} header={<AppHeader />}>
      <View style={{ paddingHorizontal: 20, gap: 26 }}>
        {mine.isError ? (
          <Animated.View entering={enter(0)}>
            <OfflineCard onRetry={() => void mine.refetch()} />
          </Animated.View>
        ) : mine.isPending ? (
          <View style={styles.skeleton} accessibilityLabel={t('mentorHome.loadingA11y')} />
        ) : !mentor ? (
          <Animated.View entering={enter(0)}>
            <BecomeMentor />
          </Animated.View>
        ) : !mentor.isActive ? (
          <>
            {!mentor.charterOk ? (
              <Animated.View entering={enter(0)}>
                <CharterCard />
              </Animated.View>
            ) : null}
            <Animated.View entering={enter(1)}>
              <PendingCard city={mentor.city} />
            </Animated.View>
          </>
        ) : (
          <>
            {!mentor.charterOk ? (
              <Animated.View entering={enter(0)}>
                <CharterCard />
              </Animated.View>
            ) : null}
            <Animated.View entering={enter(0)}>
              <ImpactCard name={displayName(profile)} mentor={mentor} requests={requests.data ?? []} />
            </Animated.View>
            <Animated.View entering={enter(1)}>
              <Requests query={requests} />
            </Animated.View>
            <Reveal>
              <SectionHeader title={t('mentorHome.availability')} subtitle={t('mentorHome.availabilitySub')} />
              <View style={styles.list}>
                <View style={styles.availRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{mentor.availableThisWeek ? t('mentorHome.taking') : t('mentorHome.paused')}</Text>
                    <Text variant="small" color={c.subtle}>
                      {mentor.availableThisWeek
                        ? t('mentorHome.takingText', { city: mentor.city })
                        : t('mentorHome.pausedText')}
                    </Text>
                  </View>
                  <Switch
                    value={mentor.availableThisWeek}
                    onValueChange={(v) => {
                      haptics.select();
                      availability.mutate(v, { onError: () => toast(t('common.notSaved'), 'info') });
                    }}
                    trackColor={{ true: c.mentor, false: c.line }}
                    accessibilityLabel={t('mentorHome.taking')}
                  />
                </View>
              </View>
            </Reveal>
            <Reveal>
              <Button
                label={t('mentorHome.publicProfile')}
                variant="secondary"
                iconLeft={<Eye size={18} color={c.navy} />}
                onPress={() => router.push({ pathname: '/(app)/mentor/[id]', params: { id: mentor.id } })}
              />
            </Reveal>
          </>
        )}
      </View>
    </Screen>
  );
}

function ImpactCard({ name, mentor, requests }: { name: string; mentor: MyMentor; requests: MentorRequest[] }) {
  const { c, gradients } = useTheme();
  const styles = useStyles();
  const pending = requests.filter((r) => r.status === 'pending').length;
  const impact = impactOf(requests);
  const t = useT();
  const sentence = pending ? t('mentorHome.waiting', { count: pending }) : impact.acceptedThisMonth ? t('mentorHome.allAnswered') : t('mentorHome.noRequest');
  return (
    <LinearGradient colors={gradients.night} style={styles.hero}>
      <StarField variant="card" />
      <Constellation helped={impact.acceptedThisMonth} waiting={pending} />
      <View style={{ gap: 6 }}>
        <Text variant="smallStrong" color="rgba(255,255,255,0.6)">
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
    </LinearGradient>
  );
}

function Requests({ query }: { query: ReturnType<typeof useMentorRequests> }) {
  const { c } = useTheme();
  const styles = useStyles();
  const answer = useAnswerRequest();
  const t = useT();
  const nameOf = (r: MentorRequest) => r.student ?? t('mentorHome.thisStudent');
  const list = visible(query.data ?? []);
  const pending = list.filter((r) => r.status === 'pending').length;
  // La dernière demande signalée reste affichée pendant que la feuille se ferme.
  const [reported, setReported] = useState<MentorRequest | null>(null);
  const [reporting, setReporting] = useState(false);
  const report = (r: MentorRequest) => {
    setReported(r);
    setReporting(true);
  };
  const open = useOpenFromBooking();
  const write = (r: MentorRequest) =>
    open.mutate(
      { bookingId: r.id, role: 'mentor' },
      {
        onSuccess: (id) => (id ? router.push({ pathname: '/(app)/messages/[id]', params: { id } }) : toast(t('mentorHome.convoSoon'), 'info')),
        onError: () => toast(t('common.offlineRetry'), 'info'),
      },
    );

  const reply = (r: MentorRequest, ok: boolean) => {
    if (ok) haptics.success();
    answer.mutate(
      { id: r.id, status: ok ? 'confirmed' : 'cancelled' },
      {
        onSuccess: () => toast(ok ? t('mentorHome.accepted') : t('mentorHome.declined'), ok ? 'success' : 'info'),
        onError: () => toast(t('common.notSaved'), 'info'),
      },
    );
  };

  return (
    <View>
      <SectionHeader
        title={t('mentorHome.requests')}
        subtitle={query.isPending ? t('common.loading') : pending ? t('mentorHome.pending', { count: pending }) : t('mentorHome.nonePending')}
      />
      {query.isError ? (
        <OfflineCard onRetry={() => void query.refetch()} />
      ) : !query.isPending && !list.length ? (
        <View style={[styles.list, styles.empty]}>
          <IconTile icon={Hourglass} tone="green" size={44} radius={14} />
          <Text variant="small" color={c.subtle} style={{ flex: 1 }}>
            {t('mentorHome.empty')}
          </Text>
        </View>
      ) : (
        <Animated.View layout={reflow} style={styles.list}>
          {list.map((r, i) => (
            <Animated.View key={r.id} layout={reflow} exiting={leave} style={[styles.req, i > 0 && styles.sep]}>
              <View style={styles.reqTop}>
                <Avatar name={r.student ?? t('mentorHome.student')} size={44} color={avatarTone(r.student ?? r.id)} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{r.student ?? t('mentorHome.aStudent')}</Text>
                  <Text variant="small" color={c.subtle} numberOfLines={1}>
                    {r.topic}
                  </Text>
                  {r.city ? (
                    <Text variant="caption" color={c.muted}>
                      {t('mentorHome.from', { city: r.city })}
                    </Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="smallStrong">{when(r.startsAt)}</Text>
                  <Text variant="small" color={c.subtle}>
                    {formatTime(r.startsAt)}
                  </Text>
                </View>
              </View>
              {r.status === 'pending' ? (
                <View style={styles.reqActions}>
                  <PressableScale haptic="press" onPress={() => reply(r, true)} hitSlop={4} style={styles.accept} accessibilityLabel={t('mentorHome.acceptA11y', { name: nameOf(r) })}>
                    <Check size={16} color={c.white} strokeWidth={2.6} />
                    <Text variant="smallStrong" color={c.white}>
                      {t('mentorHome.accept')}
                    </Text>
                  </PressableScale>
                  <PressableScale onPress={() => reply(r, false)} hitSlop={4} style={styles.decline} accessibilityLabel={t('mentorHome.declineA11y', { name: nameOf(r) })}>
                    <Text variant="smallStrong" color={c.subtle}>
                      {t('mentorHome.decline')}
                    </Text>
                  </PressableScale>
                  <ReportButton r={r} onPress={() => report(r)} />
                </View>
              ) : (
                <View style={styles.reqActions}>
                  {callIsOpen(r.startsAt) ? (
                    <PressableScale
                      haptic="press"
                      onPress={() => router.push({ pathname: '/(app)/appel/[id]', params: { id: r.id } })}
                      hitSlop={4}
                      style={styles.accept}
                      accessibilityLabel={t('mentorHome.joinA11y', { name: nameOf(r) })}>
                      <Video size={16} color={c.white} />
                      <Text variant="smallStrong" color={c.white}>
                        {t('mentorHome.join')}
                      </Text>
                    </PressableScale>
                  ) : (
                    <Animated.View entering={pop()} style={styles.confirmed}>
                      <Check size={14} color={c.mentor} strokeWidth={2.6} />
                      <Text variant="smallStrong" color={c.mentor}>
                        {t('mentorHome.confirmed')}
                      </Text>
                    </Animated.View>
                  )}
                  <PressableScale onPress={() => write(r)} disabled={open.isPending} hitSlop={4} style={styles.write} accessibilityLabel={t('mentorHome.writeA11y', { name: nameOf(r) })}>
                    <MessageCircle size={15} color={c.mentor} />
                    <Text variant="smallStrong" color={c.mentor}>
                      {t('mentorHome.write')}
                    </Text>
                  </PressableScale>
                  <ReportButton r={r} onPress={() => report(r)} />
                </View>
              )}
            </Animated.View>
          ))}
        </Animated.View>
      )}
      <SafetySheet
        visible={reporting}
        onClose={() => setReporting(false)}
        target={reported ? { bookingId: reported.id } : null}
        name={reported?.student ?? t('mentorHome.thisStudent')}
      />
    </View>
  );
}

function ReportButton({ r, onPress }: { r: MentorRequest; onPress: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  return (
    <PressableScale onPress={onPress} style={styles.flag} accessibilityLabel={t('mentorHome.reportA11y', { name: r.student ?? t('mentorHome.thisStudent') })}>
      <Flag size={16} color={c.muted} />
    </PressableScale>
  );
}

/** Pas encore de fiche : « Devenir mentor » passe par la charte, qui envoie la fiche à l'équipe. */
function BecomeMentor() {
  const { c, gradients } = useTheme();
  const styles = useStyles();
  const profile = useProfile((s) => s.profile);
  const city = profile.mentorCity ?? profile.destinationCity;
  const t = useT();
  return (
    <View style={[styles.list, styles.stateCard]}>
      <IconTile icon={Users} tone="green" size={52} radius={17} />
      <Text variant="h2">{t('mentorHome.become')}</Text>
      <Text variant="body" color={c.subtle}>
        {t('mentorHome.becomeText', { city: city ?? t('mentorHome.yourCity') })}
      </Text>
      <Button
        label={t('mentorHome.becomeCta')}
        accent={gradients.mentor}
        disabled={!city || !profile.firstName.trim()}
        onPress={() => router.push('/(app)/charte-mentor')}
      />
      {!city || !profile.firstName.trim() ? (
        <Text variant="caption" color={c.muted}>
          {!profile.firstName.trim() ? t('mentorHome.needName') : t('mentorHome.needCity')}
        </Text>
      ) : null}
    </View>
  );
}

/** Fiche envoyée avant la charte (ou charte qui a changé) : on la fait accepter, sans rien bloquer d'autre. */
function CharterCard() {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  return (
    <PressableScale onPress={() => router.push('/(app)/charte-mentor')} style={[styles.list, styles.charter]} accessibilityRole="button">
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

/** Fiche envoyée, pas encore validée : on le dit, sans promettre de délai. */
function PendingCard({ city }: { city: string }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  return (
    <View style={[styles.list, styles.stateCard]}>
      <IconTile icon={Hourglass} tone="amber" size={52} radius={17} />
      <Text variant="h2">{t('mentorHome.pendingTitle')}</Text>
      <Text variant="body" color={c.subtle}>
        {t('mentorHome.pendingText', { city })}
      </Text>
    </View>
  );
}

function OfflineCard({ onRetry }: { onRetry: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  return (
    <View style={[styles.list, styles.empty]}>
      <IconTile icon={WifiOff} tone="slate" size={44} radius={14} />
      <Text variant="small" color={c.subtle} style={{ flex: 1 }}>
        {t('common.offline')}
      </Text>
      <PressableScale onPress={onRetry} hitSlop={6} accessibilityLabel={t('common.retry')}>
        <Text variant="smallStrong" color={c.mentor}>
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
      <Text variant="caption" color="rgba(255,255,255,0.6)">
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  hero: { borderRadius: radius.xxl, padding: 20, paddingTop: 8, gap: 14, overflow: 'hidden', ...shadow.md },
  skeleton: { height: 300, borderRadius: radius.xxl, backgroundColor: c.surface, opacity: 0.6 },
  stats: { flexDirection: 'row', alignItems: 'center', paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.18)' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statSep: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: 'rgba(255,255,255,0.18)' },
  list: { borderRadius: radius.xl, backgroundColor: c.surface, overflow: 'hidden', ...shadow.sm },
  stateCard: { padding: 20, gap: 12 },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  charter: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1.5, borderColor: c.mentor },
  req: { padding: 14, gap: 12 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
  reqTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reqActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 56 },
  accept: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: c.mentor },
  decline: { height: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: radius.pill },
  confirmed: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  write: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: c.mentorSoft },
  flag: { width: 44, height: 44, marginLeft: 'auto', alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  availRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
}));
