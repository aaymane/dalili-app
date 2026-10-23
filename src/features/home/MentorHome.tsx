import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Check, Eye, PhoneCall, Star, Users } from 'lucide-react-native';
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
import { PressableScale } from '@/components/ui/PressableScale';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { demoMentorRequests } from '@/data/demo';
import { Constellation } from '@/features/mentors/components/Constellation';
import { displayName, useProfile } from '@/features/profile/store';
import { formatDayMonth, formatTime, relativeDays, daysFromToday } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { enter, leave, pop, reflow } from '@/theme/motion';
import { gradients, palette, radius, shadow } from '@/theme/tokens';

const SLOTS = [
  { id: 'Lun 18h', day: 'Lun', time: '18h' },
  { id: 'Mar 12h', day: 'Mar', time: '12h' },
  { id: 'Mer 18h', day: 'Mer', time: '18h' },
  { id: 'Jeu 20h', day: 'Jeu', time: '20h' },
  { id: 'Sam 10h', day: 'Sam', time: '10h' },
  { id: 'Dim 15h', day: 'Dim', time: '15h' },
];

// Chiffres de démonstration, en attendant les appels réels du mentor.
const IMPACT = { helped: 3, calls: 10, rating: '5,0' };

const AVATAR_TONES = [palette.electricLight, palette.aiIndigo, palette.mentor, palette.host];
const avatarTone = (name: string) => AVATAR_TONES[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_TONES.length];

/** « demain », « dans 3 jours », puis la date au-delà d'une semaine. */
const when = (iso: string) => (daysFromToday(iso) <= 6 ? relativeDays(iso) : formatDayMonth(iso));

/** Accueil Mentor : la carte nuit (ton impact), les demandes à traiter, tes créneaux. */
export function MentorHome() {
  const profile = useProfile((s) => s.profile);
  const [requests, setRequests] = useState(demoMentorRequests);
  const [slots, setSlots] = useState<string[]>(['Mar 12h', 'Jeu 20h', 'Sam 10h']);
  const [available, setAvailable] = useState(true);
  const pending = requests.filter((r) => r.status === 'pending').length;

  const answer = (id: string, ok: boolean) => {
    if (ok) haptics.success();
    setRequests((rs) => (ok ? rs.map((r) => (r.id === id ? { ...r, status: 'accepted' as const } : r)) : rs.filter((r) => r.id !== id)));
    toast(ok ? 'Accepté. L’étudiant est prévenu.' : 'Demande déclinée.', ok ? 'success' : 'info');
  };

  const sentence = pending
    ? `${pending} étudiant${pending > 1 ? 's attendent' : ' attend'} ta réponse.`
    : 'Tout le monde a sa réponse. Merci pour eux.';

  return (
    <Screen top={gradients.roleTop.mentor} tabBar padded={false} header={<AppHeader roleSwitch />}>
      <View style={{ paddingHorizontal: 20, gap: 26 }}>
        <Animated.View entering={enter(0)}>
          <LinearGradient colors={gradients.night} style={styles.hero}>
            <StarField variant="card" />
            <Constellation helped={IMPACT.helped} waiting={pending} />
            <View style={{ gap: 6 }}>
              <Text variant="smallStrong" color="rgba(255,255,255,0.6)">
                Bonjour {displayName(profile)}
              </Text>
              <Text variant="h2" color={palette.white}>
                {sentence}
              </Text>
            </View>
            <View style={styles.stats}>
              <Stat icon={<Users size={14} color={palette.mentorGlow} />} value={String(IMPACT.helped)} label="aidés ce mois" />
              <View style={styles.statSep} />
              <Stat icon={<PhoneCall size={14} color={palette.mentorGlow} />} value={String(IMPACT.calls)} label="appels" />
              <View style={styles.statSep} />
              <Stat icon={<Star size={14} color={palette.mentorGlow} fill={palette.mentorGlow} />} value={IMPACT.rating} label="note" />
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={enter(1)}>
          <SectionHeader title="Demandes d’appel" subtitle={pending ? `${pending} en attente` : 'Rien en attente'} />
          <Animated.View layout={reflow} style={styles.list}>
            {requests.map((r, i) => (
              <Animated.View key={r.id} layout={reflow} exiting={leave} style={[styles.req, i > 0 && styles.sep]}>
                <View style={styles.reqTop}>
                  <Avatar name={r.student} size={44} color={avatarTone(r.student)} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{r.student}</Text>
                    <Text variant="small" color={palette.subtle} numberOfLines={1}>
                      {r.topic}
                    </Text>
                    <Text variant="caption" color={palette.muted}>
                      Depuis {r.origin}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text variant="smallStrong">{when(r.when)}</Text>
                    <Text variant="small" color={palette.subtle}>
                      {formatTime(r.when)}
                    </Text>
                  </View>
                </View>
                {r.status === 'pending' ? (
                  <View style={styles.reqActions}>
                    <PressableScale
                      haptic="press"
                      onPress={() => answer(r.id, true)}
                      hitSlop={4}
                      style={styles.accept}
                      accessibilityLabel={`Accepter l’appel avec ${r.student}`}>
                      <Check size={16} color={palette.white} strokeWidth={2.6} />
                      <Text variant="smallStrong" color={palette.white}>
                        Accepter
                      </Text>
                    </PressableScale>
                    <PressableScale onPress={() => answer(r.id, false)} hitSlop={4} style={styles.decline} accessibilityLabel={`Décliner la demande de ${r.student}`}>
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
        </Animated.View>

        <Reveal>
          <SectionHeader title="Tes créneaux" subtitle="Les moments où on peut te réserver" />
          <View style={styles.list}>
            <View style={styles.availRow}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{available ? 'Disponible cette semaine' : 'En pause cette semaine'}</Text>
                <Text variant="small" color={palette.subtle}>
                  {available ? `Les étudiants de ${profile.mentorCity ?? 'ta ville'} peuvent te réserver` : 'Personne ne peut te réserver'}
                </Text>
              </View>
              <Switch
                value={available}
                onValueChange={(v) => {
                  haptics.select();
                  setAvailable(v);
                }}
                trackColor={{ true: palette.mentor, false: palette.line }}
                accessibilityLabel="Disponible cette semaine"
              />
            </View>
            <View style={[styles.slots, !available && { opacity: 0.4 }]} pointerEvents={available ? 'auto' : 'none'}>
              {SLOTS.map((s) => {
                const on = slots.includes(s.id);
                return (
                  <PressableScale
                    key={s.id}
                    haptic="select"
                    onPress={() => setSlots((x) => (on ? x.filter((y) => y !== s.id) : [...x, s.id]))}
                    style={[styles.slot, on && styles.slotOn]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`${s.day} ${s.time}`}>
                    <Text variant="caption" color={on ? palette.mentor : palette.muted}>
                      {s.day}
                    </Text>
                    <Text variant="h3" color={on ? palette.mentor : palette.navy}>
                      {s.time}
                    </Text>
                    {on ? (
                      <Animated.View entering={pop()} style={styles.slotCheck}>
                        <Check size={10} color={palette.white} strokeWidth={3} />
                      </Animated.View>
                    ) : null}
                  </PressableScale>
                );
              })}
            </View>
          </View>
        </Reveal>

        <Reveal>
          <Button
            label="Voir mon profil public"
            variant="secondary"
            iconLeft={<Eye size={18} color={palette.navy} />}
            onPress={() => router.push({ pathname: '/(app)/mentor/[id]', params: { id: 'm-adnane' } })}
          />
        </Reveal>
      </View>
    </Screen>
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
  stats: { flexDirection: 'row', alignItems: 'center', paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.18)' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statSep: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: 'rgba(255,255,255,0.18)' },
  list: { borderRadius: radius.xl, backgroundColor: palette.surface, overflow: 'hidden', ...shadow.sm },
  req: { padding: 14, gap: 12 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
  reqTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reqActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 56 },
  accept: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: palette.mentor },
  decline: { height: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: radius.pill },
  confirmed: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 56 },
  availRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
  slot: { width: '31.5%', paddingVertical: 10, alignItems: 'center', borderRadius: radius.md, borderWidth: 1.5, borderColor: palette.line, backgroundColor: palette.surface },
  slotOn: { borderColor: palette.mentor, backgroundColor: palette.mentorSoft },
  slotCheck: { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, backgroundColor: palette.mentor, alignItems: 'center', justifyContent: 'center' },
});
