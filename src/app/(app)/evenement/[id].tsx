import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ArrowRight, ArrowUpRight, CalendarDays, ChevronLeft, Link2, MapPin, Tag as TagIcon } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { SuccessModal } from '@/components/feedback/SuccessModal';
import { toast } from '@/components/feedback/Toast';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { remoteJoinEvent } from '@/data/api';
import { useEvent } from '@/data/hooks';
import { useLocalDb } from '@/data/local-db';
import { Cover } from '@/features/community/components/Cover';
import { useJourneyStore } from '@/features/journey/store';
import { formatLong, formatTime, toISODate } from '@/lib/date';
import { palette, radius, shadow } from '@/theme/tokens';
import { rise } from '@/theme/motion';

/** Détail d'un événement + inscription (ajoutée au calendrier du Parcours). */
export default function EventPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: e } = useEvent(id);
  const toggle = useLocalDb((s) => s.toggleEvent);
  const addCustom = useJourneyStore((s) => s.addCustom);
  const [done, setDone] = useState(false);
  if (!e) return null;
  const full = e.attendees >= e.capacity && !e.isGoing;

  const participate = () => {
    toggle(e.id);
    remoteJoinEvent(e.id, !e.isGoing).catch(() => {});
    if (!e.isGoing) {
      addCustom(`${e.title} · ${e.place}`, toISODate(new Date(e.startsAt)));
      setDone(true);
    } else toast('Inscription annulée.', 'info');
  };

  return (
    <Screen
      padded={false}
      footer={<Button label={e.isGoing ? 'Se désinscrire' : full ? 'Complet' : 'Participer à l’événement'} variant={e.isGoing ? 'secondary' : 'primary'} disabled={full} icon={!e.isGoing ? <ArrowRight size={18} color="#fff" /> : undefined} onPress={participate} />}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <Cover colors={e.cover} emoji={e.emoji} height={190} radius={26}>
          <PressableScale onPress={() => router.back()} style={styles.back} accessibilityLabel="Retour">
            <ChevronLeft size={20} color="#fff" />
          </PressableScale>
        </Cover>
      </View>
      <View style={{ paddingHorizontal: 20, gap: 16, marginTop: 16 }}>
        <Animated.View entering={rise()} style={{ gap: 6 }}>
          <Text variant="hero">{e.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <CalendarDays size={15} color={palette.electric} />
            <Text variant="body" color={palette.subtle}>
              {formatLong(e.startsAt)} · {formatTime(e.startsAt)}
            </Text>
          </View>
        </Animated.View>
        <Text variant="h2">À propos</Text>
        <View style={styles.card}>
          <Text variant="body">{e.description}</Text>
        </View>
        <View style={[styles.card, { backgroundColor: palette.electric, gap: 10 }]}>
          <Text variant="bodyStrong" color="#fff">
            {e.place}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MapPin size={14} color="#fff" />
            <Text variant="small" color="#fff">
              {e.address}
            </Text>
          </View>
          <View style={styles.map}>
            <View style={styles.pin}>
              <MapPin size={22} color="#fff" fill={palette.electric} />
            </View>
            <View style={[styles.road, { top: 30, transform: [{ rotate: '-8deg' }] }]} />
            <View style={[styles.road, { top: 70, transform: [{ rotate: '12deg' }] }]} />
          </View>
        </View>
        <View style={[styles.card, styles.row]}>
          <View style={{ flexDirection: 'row' }}>
            {['Kalili', 'Zakaria', 'Sara'].map((n, i) => (
              <View key={n} style={{ marginLeft: i ? -10 : 0 }}>
                <Avatar name={n} size={34} ring="#fff" color={['#3D78FF', '#F97316', '#14B8A6'][i]} />
              </View>
            ))}
          </View>
          <Text variant="small" style={{ flex: 1 }}>
            Rejoint par Kalili, Zakaria et {Math.max(0, e.attendees - 2)} autres
          </Text>
        </View>
        <View style={[styles.card, styles.row]}>
          <TagIcon size={18} color={palette.electric} />
          <View>
            <Text variant="caption" color={palette.muted}>
              Tarif
            </Text>
            <Text variant="bodyStrong" color={palette.electric}>
              {e.price === 'free' ? 'Gratuit pour les membres Dalili' : 'Payant — infos sur place'}
            </Text>
          </View>
        </View>
        {e.link ? (
          <PressableScale onPress={() => WebBrowser.openBrowserAsync(e.link!)} style={[styles.card, styles.row, { borderWidth: 2, borderColor: '#A7E8CC' }]}>
            <View style={styles.linkIcon}>
              <Link2 size={16} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{e.link.replace(/^https?:\/\//, '')}</Text>
              <Text variant="caption" color={palette.muted}>
                Pour plus d’informations
              </Text>
            </View>
            <ArrowUpRight size={18} color={palette.mentor} />
          </PressableScale>
        ) : null}
      </View>
      <SuccessModal
        visible={done}
        title="Tu y es inscrit !"
        message="Félicitations ! Ta place pour cet événement est réservée avec succès. Retrouve tous les détails et l’adresse dans ton calendrier."
        cta="Voir mon calendrier"
        onCta={() => {
          setDone(false);
          router.push({ pathname: '/(app)/parcours', params: { view: 'calendar' } });
        }}
        onClose={() => setDone(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', top: 12, left: 12, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  card: { padding: 16, borderRadius: radius.xl, backgroundColor: '#fff', ...shadow.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  map: { height: 110, borderRadius: radius.md, backgroundColor: '#E8EEF8', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  road: { position: 'absolute', left: -20, right: -20, height: 10, backgroundColor: '#fff' },
  pin: { zIndex: 2 },
  linkIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: palette.mentor, alignItems: 'center', justifyContent: 'center' },
});
