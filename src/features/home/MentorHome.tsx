import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Check, ChevronRight, Eye, Hourglass, PhoneCall, ShieldCheck, Star, Users, WifiOff } from 'lucide-react-native';
import { StyleSheet, Switch, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { StarField } from '@/components/brand/StarField';
import { toast } from '@/components/feedback/Toast';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Reveal } from '@/components/motion/Reveal';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import type { MentorRequest, MyMentor } from '@/features/mentors/api';
import { Constellation } from '@/features/mentors/components/Constellation';
import { useAnswerRequest, useMentorRequests, useMyMentor, useSetAvailability } from '@/features/mentors/hooks';
import { displayName, useProfile } from '@/features/profile/store';
import { daysFromToday, formatDayMonth, formatTime, relativeDays } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { enter, leave, pop, reflow } from '@/theme/motion';
import { gradients, palette, radius, shadow } from '@/theme/tokens';

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
  const profile = useProfile((s) => s.profile);
  const mine = useMyMentor();
  const requests = useMentorRequests();
  const availability = useSetAvailability();

  const mentor = mine.data;
  return (
    <Screen top={gradients.roleTop.mentor} tabBar padded={false} header={<AppHeader roleSwitch />}>
      <View style={{ paddingHorizontal: 20, gap: 26 }}>
        {mine.isError ? (
          <Animated.View entering={enter(0)}>
            <OfflineCard onRetry={() => void mine.refetch()} />
          </Animated.View>
        ) : mine.isPending ? (
          <View style={styles.skeleton} accessibilityLabel="Chargement de ton espace mentor" />
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
              <SectionHeader title="Ta disponibilité" subtitle="Tu acceptes selon ce que tu fais sur le moment" />
              <View style={styles.list}>
                <View style={styles.availRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{mentor.availableThisWeek ? 'Je prends des demandes' : 'En pause'}</Text>
                    <Text variant="small" color={palette.subtle}>
                      {mentor.availableThisWeek
                        ? `Les étudiants de ${mentor.city} peuvent te proposer un appel`
                        : 'Personne ne peut te demander d’appel pour le moment'}
                    </Text>
                  </View>
                  <Switch
                    value={mentor.availableThisWeek}
                    onValueChange={(v) => {
                      haptics.select();
                      availability.mutate(v, { onError: () => toast('Pas enregistré. Vérifie ta connexion et réessaie.', 'info') });
                    }}
                    trackColor={{ true: palette.mentor, false: palette.line }}
                    accessibilityLabel="Je prends des demandes"
                  />
                </View>
              </View>
            </Reveal>
            <Reveal>
              <Button
                label="Voir mon profil public"
                variant="secondary"
                iconLeft={<Eye size={18} color={palette.navy} />}
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
  const pending = requests.filter((r) => r.status === 'pending').length;
  const impact = impactOf(requests);
  const sentence = pending
    ? `${pending} étudiant${pending > 1 ? 's attendent' : ' attend'} ta réponse.`
    : impact.acceptedThisMonth
      ? 'Tout le monde a sa réponse. Merci pour eux.'
      : 'Pas encore de demande. Ta fiche est en ligne.';
  return (
    <LinearGradient colors={gradients.night} style={styles.hero}>
      <StarField variant="card" />
      <Constellation helped={impact.acceptedThisMonth} waiting={pending} />
      <View style={{ gap: 6 }}>
        <Text variant="smallStrong" color="rgba(255,255,255,0.6)">
          Bonjour {name}
        </Text>
        <Text variant="h2" color={palette.white}>
          {sentence}
        </Text>
      </View>
      <View style={styles.stats}>
        <Stat icon={<Users size={14} color={palette.mentorGlow} />} value={String(impact.acceptedThisMonth)} label="acceptés ce mois" />
        <View style={styles.statSep} />
        <Stat icon={<PhoneCall size={14} color={palette.mentorGlow} />} value={String(impact.calls)} label="appels" />
        <View style={styles.statSep} />
        {mentor.sessions > 0 ? (
          <Stat icon={<Star size={14} color={palette.mentorGlow} fill={palette.mentorGlow} />} value={mentor.rating.toFixed(1).replace('.', ',')} label="note" />
        ) : (
          <Stat icon={<Star size={14} color={palette.mentorGlow} />} value="Nouveau" label="pas encore noté" />
        )}
      </View>
    </LinearGradient>
  );
}

function Requests({ query }: { query: ReturnType<typeof useMentorRequests> }) {
  const answer = useAnswerRequest();
  const list = visible(query.data ?? []);
  const pending = list.filter((r) => r.status === 'pending').length;

  const reply = (r: MentorRequest, ok: boolean) => {
    if (ok) haptics.success();
    answer.mutate(
      { id: r.id, status: ok ? 'confirmed' : 'cancelled' },
      {
        onSuccess: () => toast(ok ? 'Accepté. L’étudiant voit ta réponse.' : 'Demande déclinée.', ok ? 'success' : 'info'),
        onError: () => toast('Pas enregistré. Vérifie ta connexion et réessaie.', 'info'),
      },
    );
  };

  return (
    <View>
      <SectionHeader title="Demandes d’appel" subtitle={query.isPending ? 'Chargement…' : pending ? `${pending} en attente` : 'Rien en attente'} />
      {query.isError ? (
        <OfflineCard onRetry={() => void query.refetch()} />
      ) : !query.isPending && !list.length ? (
        <View style={[styles.list, styles.empty]}>
          <IconTile icon={Hourglass} tone="green" size={44} radius={14} />
          <Text variant="small" color={palette.subtle} style={{ flex: 1 }}>
            Quand un étudiant te propose un appel, sa demande arrive ici. Tu acceptes selon ce que tu fais à ce moment-là.
          </Text>
        </View>
      ) : (
        <Animated.View layout={reflow} style={styles.list}>
          {list.map((r, i) => (
            <Animated.View key={r.id} layout={reflow} exiting={leave} style={[styles.req, i > 0 && styles.sep]}>
              <View style={styles.reqTop}>
                <Avatar name={r.student ?? 'Étudiant'} size={44} color={avatarTone(r.student ?? r.id)} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{r.student ?? 'Un·e étudiant·e'}</Text>
                  <Text variant="small" color={palette.subtle} numberOfLines={1}>
                    {r.topic}
                  </Text>
                  {r.city ? (
                    <Text variant="caption" color={palette.muted}>
                      Depuis {r.city}
                    </Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="smallStrong">{when(r.startsAt)}</Text>
                  <Text variant="small" color={palette.subtle}>
                    {formatTime(r.startsAt)}
                  </Text>
                </View>
              </View>
              {r.status === 'pending' ? (
                <View style={styles.reqActions}>
                  <PressableScale haptic="press" onPress={() => reply(r, true)} hitSlop={4} style={styles.accept} accessibilityLabel={`Accepter l’appel avec ${r.student ?? 'cet étudiant'}`}>
                    <Check size={16} color={palette.white} strokeWidth={2.6} />
                    <Text variant="smallStrong" color={palette.white}>
                      Accepter
                    </Text>
                  </PressableScale>
                  <PressableScale onPress={() => reply(r, false)} hitSlop={4} style={styles.decline} accessibilityLabel={`Décliner la demande de ${r.student ?? 'cet étudiant'}`}>
                    <Text variant="smallStrong" color={palette.subtle}>
                      Décliner
                    </Text>
                  </PressableScale>
                </View>
              ) : (
                <Animated.View entering={pop()} style={styles.confirmed}>
                  <Check size={14} color={palette.mentor} strokeWidth={2.6} />
                  <Text variant="smallStrong" color={palette.mentor}>
                    Appel confirmé
                  </Text>
                </Animated.View>
              )}
            </Animated.View>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

/** Pas encore de fiche : « Devenir mentor » passe par la charte, qui envoie la fiche à l'équipe. */
function BecomeMentor() {
  const profile = useProfile((s) => s.profile);
  const city = profile.mentorCity ?? profile.destinationCity;
  return (
    <View style={[styles.list, styles.stateCard]}>
      <IconTile icon={Users} tone="green" size={52} radius={17} />
      <Text variant="h2">Deviens mentor</Text>
      <Text variant="body" color={palette.subtle}>
        Tu es passé·e par là. Ta fiche permet aux étudiants qui arrivent à {city ?? 'ta ville'} de te demander un appel gratuit. L’équipe la relit avant de la
        montrer.
      </Text>
      <Button
        label="Lire la charte et envoyer ma fiche"
        accent={gradients.mentor}
        disabled={!city || !profile.firstName.trim()}
        onPress={() => router.push('/(app)/charte-mentor')}
      />
      {!city || !profile.firstName.trim() ? (
        <Text variant="caption" color={palette.muted}>
          {!profile.firstName.trim() ? 'Ajoute d’abord ton prénom dans ton profil : les étudiants le verront.' : 'Choisis d’abord ta ville dans ton profil.'}
        </Text>
      ) : null}
    </View>
  );
}

/** Fiche envoyée avant la charte (ou charte qui a changé) : on la fait accepter, sans rien bloquer d'autre. */
function CharterCard() {
  return (
    <PressableScale onPress={() => router.push('/(app)/charte-mentor')} style={[styles.list, styles.charter]} accessibilityRole="button">
      <IconTile icon={ShieldCheck} tone="green" size={44} radius={14} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">Accepte la charte du mentor</Text>
        <Text variant="small" color={palette.subtle}>
          6 engagements pour protéger les étudiants, et toi aussi. Une minute.
        </Text>
      </View>
      <ChevronRight size={18} color={palette.subtle} />
    </PressableScale>
  );
}

/** Fiche envoyée, pas encore validée : on le dit, sans promettre de délai. */
function PendingCard({ city }: { city: string }) {
  return (
    <View style={[styles.list, styles.stateCard]}>
      <IconTile icon={Hourglass} tone="amber" size={52} radius={17} />
      <Text variant="h2">Ta fiche est en cours de validation</Text>
      <Text variant="body" color={palette.subtle}>
        L’équipe vérifie chaque mentor et relit sa fiche avant de la montrer. Elle peut te contacter par email pour voir ta carte étudiante, ton LinkedIn ou ton
        titre de séjour. Une fois validée, les étudiants de {city} pourront te proposer un appel, et leurs demandes arriveront ici.
      </Text>
    </View>
  );
}

function OfflineCard({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={[styles.list, styles.empty]}>
      <IconTile icon={WifiOff} tone="slate" size={44} radius={14} />
      <Text variant="small" color={palette.subtle} style={{ flex: 1 }}>
        Pas de connexion pour le moment.
      </Text>
      <PressableScale onPress={onRetry} hitSlop={6} accessibilityLabel="Réessayer">
        <Text variant="smallStrong" color={palette.mentor}>
          Réessayer
        </Text>
      </PressableScale>
    </View>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon}
        <Text variant="h3" color={palette.white}>
          {value}
        </Text>
      </View>
      <Text variant="caption" color="rgba(255,255,255,0.6)">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xxl, padding: 20, paddingTop: 8, gap: 14, overflow: 'hidden', ...shadow.md },
  skeleton: { height: 300, borderRadius: radius.xxl, backgroundColor: palette.surface, opacity: 0.6 },
  stats: { flexDirection: 'row', alignItems: 'center', paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.18)' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statSep: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: 'rgba(255,255,255,0.18)' },
  list: { borderRadius: radius.xl, backgroundColor: palette.surface, overflow: 'hidden', ...shadow.sm },
  stateCard: { padding: 20, gap: 12 },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  charter: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1.5, borderColor: palette.mentor },
  req: { padding: 14, gap: 12 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
  reqTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reqActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 56 },
  accept: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: palette.mentor },
  decline: { height: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: radius.pill },
  confirmed: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 56 },
  availRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
});
