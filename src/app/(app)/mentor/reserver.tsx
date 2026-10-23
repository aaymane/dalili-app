import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Clock } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { SuccessModal } from '@/components/feedback/SuccessModal';
import { toast } from '@/components/feedback/Toast';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Calendar } from '@/components/ui/Calendar';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { remoteCreateBooking } from '@/data/api';
import { useMentor } from '@/data/hooks';
import { useLocalDb } from '@/data/local-db';
import { formatLong } from '@/lib/date';
import { gradients, palette, radius, shadow } from '@/theme/tokens';
import { rise } from '@/theme/motion';

/** Heures que l'étudiant peut proposer. Ce ne sont pas des disponibilités : le mentor accepte selon son moment. */
const TIMES = ['09:00', '10:30', '12:00', '14:00', '16:00', '18:00', '19:30', '21:00'];

const at = (day: Date, time: string) => {
  const [h, min] = time.split(':').map(Number);
  const d = new Date(day);
  d.setHours(h, min, 0, 0);
  return d;
};

/** Demande d'appel à un mentor : un sujet, un jour, une heure. Le mentor accepte ou décline selon son moment. */
export default function Reserve() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: m } = useMentor(id);
  const qc = useQueryClient();
  const addBooking = useLocalDb((s) => s.addBooking);
  const [topic, setTopic] = useState('');
  const [day, setDay] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Aujourd'hui, on ne propose pas une heure déjà passée (ni dans moins d'une heure).
  const [opened] = useState(() => Date.now());
  const past = (t: string) => !!day && at(day, t).getTime() < opened + 3_600_000;

  const send = async () => {
    if (!m || !day || !time) return;
    const startsAt = at(day, time).toISOString();
    const topicText = topic.trim() || 'Question générale';
    setLoading(true);
    try {
      const saved = await remoteCreateBooking({ mentorId: m.id, startsAt, topic: topicText });
      if (saved) void qc.invalidateQueries({ queryKey: ['bookings', 'mine'] });
      else addBooking({ id: `b-${Date.now()}`, mentorId: m.id, startsAt, topic: topicText, status: 'pending' });
      setDone(true);
    } catch {
      toast('Demande pas envoyée. Vérifie ta connexion et réessaie.', 'info');
    } finally {
      setLoading(false);
    }
  };

  if (!m) return null;
  const paused = !m.availableThisWeek;
  return (
    <Screen
      top={gradients.roleTop.student}
      padded={false}
      header={<AppHeader back />}
      footer={paused ? undefined : <Button label="Envoyer ma demande" disabled={!day || !time} loading={loading} onPress={send} />}>
      <View style={{ paddingHorizontal: 20, gap: 18 }}>
        <Animated.View entering={rise()} style={styles.who}>
          <Avatar name={`${m.firstName} ${m.lastName}`} color={m.avatarColor} size={52} />
          <View style={{ flex: 1 }}>
            <Text variant="smallStrong" color={palette.electric}>
              Appel gratuit · 30 min
            </Text>
            <Text variant="h2">Avec {m.firstName}</Text>
            <Text variant="small" color={palette.muted}>
              {m.headline ? `${m.headline} · ` : ''}
              {m.city}
            </Text>
          </View>
        </Animated.View>

        {paused ? (
          <Animated.View entering={rise(60)} style={styles.note}>
            <Text variant="bodyStrong">{m.firstName} est en pause pour le moment</Text>
            <Text variant="small" color={palette.subtle}>
              Les mentors sont des étudiants bénévoles. Un autre mentor peut sûrement t’aider dès maintenant.
            </Text>
            <Button label="Voir les autres mentors" variant="secondary" size="md" onPress={() => router.navigate('/(app)/(tabs)/explorer')} />
          </Animated.View>
        ) : (
          <>
            <Animated.View entering={rise(60)} style={styles.note}>
              <Text variant="small" color={palette.subtle}>
                Propose un moment qui t’arrange. {m.firstName} accepte selon ses disponibilités, et tu vois sa réponse sur ton accueil.
              </Text>
            </Animated.View>

            <View style={{ gap: 8 }}>
              <Text variant="h3">Sujet</Text>
              <Input placeholder="Ex : mon rendez-vous de visa" value={topic} onChangeText={setTopic} maxLength={80} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {m.specialties.map((sp) => (
                  <PressableScale key={sp} haptic="select" onPress={() => setTopic(sp)} style={[styles.suggest, topic === sp && { backgroundColor: palette.electric }]}>
                    <Text variant="smallStrong" color={topic === sp ? palette.white : palette.electric}>
                      {sp}
                    </Text>
                  </PressableScale>
                ))}
              </View>
            </View>

            <Calendar
              selected={day}
              onSelect={(d) => {
                setDay(d);
                setTime(null);
              }}
              minDate={new Date()}
            />

            {day ? (
              <Animated.View entering={FadeIn.duration(250)} style={styles.timesCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Clock size={16} color={palette.electric} />
                  <Text variant="h3" color={palette.electric}>
                    À quelle heure, {formatLong(day)} ?
                  </Text>
                </View>
                <View style={styles.times}>
                  {TIMES.map((t) => {
                    const off = past(t);
                    const on = time === t;
                    return (
                      <PressableScale
                        key={t}
                        disabled={off}
                        haptic="select"
                        onPress={() => setTime(t)}
                        style={[styles.time, on && { backgroundColor: palette.electric, borderColor: palette.electric }, off && { opacity: 0.35 }]}
                        accessibilityState={{ selected: on, disabled: off }}>
                        <Text variant="bodyStrong" color={on ? palette.white : palette.navy}>
                          {t.replace(':', 'h')}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </Animated.View>
            ) : null}
          </>
        )}
      </View>

      <SuccessModal
        visible={done}
        title="Demande envoyée"
        message={`${m.firstName} te répond selon ses disponibilités. Tu verras sa réponse sur ton accueil.`}
        cta="Retour à l’accueil"
        onCta={() => {
          setDone(false);
          router.dismissTo('/(app)/(tabs)');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  who: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.xl, backgroundColor: palette.surface, ...shadow.sm },
  note: { gap: 10, padding: 14, borderRadius: radius.lg, backgroundColor: palette.surface },
  suggest: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: palette.electricSoft },
  timesCard: { gap: 14, padding: 16, borderRadius: radius.xl, backgroundColor: palette.surface, ...shadow.sm },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  time: { width: '23%', height: 44, borderRadius: radius.md, borderWidth: 1.5, borderColor: palette.line, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center' },
});
