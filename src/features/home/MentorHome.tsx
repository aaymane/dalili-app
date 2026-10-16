import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Check, Clock, Eye, Star, Users, X } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { toast } from '@/components/feedback/Toast';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Tag } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import { demoMentorRequests } from '@/data/demo';
import { displayName, useProfile } from '@/features/profile/store';
import { formatLong, formatTime } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { gradients, palette, radius, shadow } from '@/theme/tokens';

import { ModePill } from './StudentHome';

const SLOTS = ['Lun 18h', 'Mar 12h', 'Mer 18h', 'Jeu 20h', 'Sam 10h', 'Dim 15h'];

/** Accueil Mentor : impact, demandes entrantes, disponibilités. */
export function MentorHome() {
  const profile = useProfile((s) => s.profile);
  const [requests, setRequests] = useState(demoMentorRequests);
  const [slots, setSlots] = useState<string[]>(['Mar 12h', 'Jeu 20h', 'Sam 10h']);
  const [available, setAvailable] = useState(true);
  const pending = requests.filter((r) => r.status === 'pending');

  const answer = (id: string, ok: boolean) => {
    if (ok) haptics.success();
    else haptics.tap();
    setRequests((rs) => (ok ? rs.map((r) => (r.id === id ? { ...r, status: 'accepted' as const } : r)) : rs.filter((r) => r.id !== id)));
    toast(ok ? 'Demande acceptée — l’étudiant est prévenu.' : 'Demande déclinée.', ok ? 'success' : 'info');
  };

  return (
    <Screen top={gradients.roleTop.mentor} tabBar padded={false} header={<AppHeader />}>
      <View style={{ paddingHorizontal: 20, gap: 22 }}>
        <Animated.View entering={FadeInDown.springify()}>
          <ModePill />
          <Text variant="hero" style={{ marginTop: 14 }}>
            Bonjour <Text variant="hero" color={palette.mentor}>{displayName(profile).toUpperCase()}.</Text>
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <LinearGradient colors={['#0F3B2E', '#0B2A22']} style={styles.hero}>
            <Text variant="overline" color="rgba(255,255,255,0.6)" style={{ fontSize: 9.5 }}>
              Ton impact · ce mois-ci
            </Text>
            <Text variant="h1" color="#fff" style={{ marginTop: 6 }}>
              Tu aides 3 étudiants 💚
            </Text>
            <View style={styles.stats}>
              {[
                { v: '10', l: 'Sessions', icon: <Users size={14} color="#7DE3B9" /> },
                { v: '5.0', l: 'Note', icon: <Star size={14} color="#FCD34D" fill="#FCD34D" /> },
                { v: '24h', l: 'Réponse', icon: <Clock size={14} color="#7DE3B9" /> },
              ].map((s) => (
                <View key={s.l} style={styles.stat}>
                  {s.icon}
                  <Text variant="h2" color="#fff">
                    {s.v}
                  </Text>
                  <Text variant="caption" color="rgba(255,255,255,0.55)">
                    {s.l}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.availRow}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" color="#fff">
                  Disponible cette semaine
                </Text>
                <Text variant="caption" color="rgba(255,255,255,0.55)">
                  Les étudiants de {profile.mentorCity ?? 'ta ville'} peuvent te réserver
                </Text>
              </View>
              <Switch
                value={available}
                onValueChange={(v) => {
                  haptics.select();
                  setAvailable(v);
                }}
                trackColor={{ true: palette.mentor, false: 'rgba(255,255,255,0.2)' }}
                thumbColor="#fff"
              />
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).springify()}>
          <SectionHeader title="Demandes d’appel" subtitle={`${pending.length} en attente`} accent={palette.mentor} />
          <Animated.View layout={LinearTransition.springify()} style={{ gap: 10 }}>
            {requests.map((r) => (
              <Animated.View key={r.id} layout={LinearTransition.springify()} exiting={FadeOut} style={styles.req}>
                <Avatar name={r.student} size={46} color="#3D78FF" />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text variant="bodyStrong">{r.student}</Text>
                  <Text variant="caption" color={palette.muted}>
                    Depuis {r.origin} · {formatLong(r.when)} · {formatTime(r.when)}
                  </Text>
                  <Tag label={r.topic} color={palette.mentor} bg={palette.mentorSoft} />
                </View>
                {r.status === 'pending' ? (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <PressableScale onPress={() => answer(r.id, false)} style={[styles.round, { backgroundColor: '#F1F3F9' }]} accessibilityLabel="Décliner">
                      <X size={16} color={palette.subtle} />
                    </PressableScale>
                    <PressableScale onPress={() => answer(r.id, true)} style={[styles.round, { backgroundColor: palette.mentor }]} accessibilityLabel="Accepter">
                      <Check size={16} color="#fff" strokeWidth={3} />
                    </PressableScale>
                  </View>
                ) : (
                  <View style={styles.accepted}>
                    <Text variant="caption" color={palette.mentor}>
                      Confirmé
                    </Text>
                  </View>
                )}
              </Animated.View>
            ))}
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <SectionHeader title="Mes créneaux" subtitle="Touche pour activer / désactiver" accent={palette.mentor} />
          <View style={styles.slots}>
            {SLOTS.map((s) => {
              const on = slots.includes(s);
              return (
                <PressableScale key={s} haptic="select" onPress={() => setSlots((x) => (on ? x.filter((y) => y !== s) : [...x, s]))} style={[styles.slot, on && { backgroundColor: palette.mentor, borderColor: palette.mentor }]}>
                  <Text variant="smallStrong" color={on ? '#fff' : palette.navy}>
                    {s}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </Animated.View>

        <Button label="Voir mon profil public" variant="secondary" iconLeft={<Eye size={18} color={palette.navy} />} onPress={() => router.push({ pathname: '/(app)/mentor/[id]', params: { id: 'm-adnane' } })} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xxl, padding: 18, ...shadow.md },
  stats: { flexDirection: 'row', gap: 10, marginTop: 16 },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 12, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.07)' },
  availRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  req: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.xl, backgroundColor: '#fff', ...shadow.sm },
  round: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  accepted: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: palette.mentorSoft },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { paddingHorizontal: 16, height: 42, borderRadius: radius.md, borderWidth: 1.5, borderColor: palette.line, backgroundColor: '#fff', justifyContent: 'center' },
});
