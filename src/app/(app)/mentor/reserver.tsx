import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-image-picker';
import { CameraIcon, Clock, FileCheck2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
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
import { haptics } from '@/lib/haptics';
import { gradients, palette, radius, shadow } from '@/theme/tokens';
import { rise } from '@/theme/motion';

const SLOTS = ['10:30', '14:30', '18:30', '20:30'];

/** Réservation d'un appel mentor : sujet, jour, créneau, documents. */
export default function Reserve() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: m } = useMentor(id);
  const addBooking = useLocalDb((s) => s.addBooking);
  const [topic, setTopic] = useState('');
  const [day, setDay] = useState<Date | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [docs, setDocs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Créneau 20:30 indisponible un jour sur deux (démo).
  const unavailable = useMemo(() => (day && day.getDate() % 2 === 0 ? ['20:30'] : []), [day]);

  const confirm = async () => {
    if (!m || !day || !slot) return;
    const [h, min] = slot.split(':').map(Number);
    const starts = new Date(day);
    starts.setHours(h, min, 0, 0);
    setLoading(true);
    try {
      await remoteCreateBooking({ mentorId: m.id, startsAt: starts.toISOString(), topic: topic || 'Question générale' });
      addBooking({ id: `b-${Date.now()}`, mentorId: m.id, startsAt: starts.toISOString(), topic: topic || 'Question générale', status: 'confirmed' });
      setDone(true);
    } catch {
      toast('Réservation impossible. Réessaie.', 'info');
    } finally {
      setLoading(false);
    }
  };

  const addDoc = async () => {
    const res = await DocumentPicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 }).catch(() => null);
    if (res && !res.canceled) {
      setDocs((d) => [...d, res.assets[0].fileName ?? `document-${d.length + 1}`]);
      haptics.success();
    }
  };

  if (!m) return null;
  return (
    <Screen
      top={gradients.roleTop.student}
      padded={false}
      header={<AppHeader back />}
      footer={<Button label="Confirmer le rendez-vous" disabled={!day || !slot} loading={loading} onPress={confirm} />}>
      <View style={{ paddingHorizontal: 20, gap: 18 }}>
        <Animated.View entering={rise()} style={styles.who}>
          <Avatar name={`${m.firstName} ${m.lastName}`} color={m.avatarColor} size={52} />
          <View style={{ flex: 1 }}>
            <Text variant="overline" color={palette.electric}>
              Appel gratuit · 30 min
            </Text>
            <Text variant="h2">Avec {m.firstName}</Text>
            <Text variant="small" color={palette.muted}>
              {m.headline} · {m.city}
            </Text>
          </View>
        </Animated.View>

        <View style={{ gap: 8 }}>
          <Text variant="h3">Sujet</Text>
          <Input placeholder="Ex : VISA / TLS" value={topic} onChangeText={setTopic} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {m.specialties.map((s) => (
              <PressableScale key={s} haptic="select" onPress={() => setTopic(s)} style={[styles.suggest, topic === s && { backgroundColor: palette.electric }]}>
                <Text variant="smallStrong" color={topic === s ? '#fff' : palette.electric}>
                  {s}
                </Text>
              </PressableScale>
            ))}
          </View>
        </View>

        <Calendar selected={day} onSelect={(d) => {
          setDay(d);
          setSlot(null);
        }} minDate={new Date()} />

        {day ? (
          <Animated.View entering={FadeIn.duration(250)} style={styles.slotsCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Clock size={16} color={palette.electric} />
              <Text variant="h3" color={palette.electric}>
                Créneaux disponibles · {formatLong(day)}
              </Text>
            </View>
            <View style={styles.slots}>
              {SLOTS.map((s) => {
                const off = unavailable.includes(s);
                const on = slot === s;
                return (
                  <PressableScale key={s} disabled={off} haptic="select" onPress={() => setSlot(s)} style={[styles.slot, on && { backgroundColor: palette.electric, borderColor: palette.electric }, off && { borderColor: '#FBD5D5', backgroundColor: '#FFF7F7' }]}>
                    <Text variant="bodyStrong" color={on ? '#fff' : off ? '#F3A6A6' : palette.navy} style={off && { textDecorationLine: 'line-through' }}>
                      {s}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </Animated.View>
        ) : null}

        <PressableScale onPress={addDoc} style={styles.docs}>
          {docs.length ? (
            <View style={{ gap: 8, width: '100%' }}>
              {docs.map((d) => (
                <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <FileCheck2 size={16} color={palette.success} />
                  <Text variant="small" numberOfLines={1} style={{ flex: 1 }}>
                    {d}
                  </Text>
                </View>
              ))}
              <Text variant="smallStrong" color={palette.electric} align="center">
                + Ajouter un autre document
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.docIcon}>
                <CameraIcon size={18} color={palette.electric} />
              </View>
              <Text variant="smallStrong">Ajouter des documents</Text>
              <Text variant="caption" color={palette.muted}>
                Optionnel — ton mentor pourra préparer l’appel
              </Text>
            </>
          )}
        </PressableScale>
      </View>

      <SuccessModal
        visible={done}
        title="Rendez-vous confirmé !"
        message={`Félicitations ! Ton créneau avec ${m.firstName} a été réservé avec succès. Tu retrouveras tous les détails directement sur ton écran d’accueil.`}
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
  who: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.xl, backgroundColor: '#fff', ...shadow.sm },
  suggest: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: palette.electricSoft },
  slotsCard: { gap: 14, padding: 16, borderRadius: radius.xl, borderWidth: 2, borderStyle: 'dashed', borderColor: '#9DB6FF', backgroundColor: '#FAFBFF' },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: { width: '47%', height: 48, borderRadius: radius.md, borderWidth: 1.5, borderColor: palette.line, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  docs: { alignItems: 'center', gap: 6, padding: 22, borderRadius: radius.xl, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#D5DAE7', backgroundColor: '#fff' },
  docIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.electricSoft, alignItems: 'center', justifyContent: 'center' },
});
