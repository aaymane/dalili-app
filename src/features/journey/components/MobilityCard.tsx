import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowRight, Pencil, Plane } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Text } from '@/components/ui/Text';
import { useProfile } from '@/features/profile/store';
import { formatDayMonth, relativeDays } from '@/lib/date';
import { gradients, radius, shadow } from '@/theme/tokens';

import { useJourney } from '../store';

/** Carte sombre « TA MOBILITÉ » : trajet, progression, compte à rebours. */
export function MobilityCard({ onEditArrival, compact }: { onEditArrival?: () => void; compact?: boolean }) {
  const profile = useProfile((s) => s.profile);
  const j = useJourney();
  const pct = Math.round(j.progress * 100);
  const to = profile.destinationCity ?? 'la France';
  return (
    <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <LinearGradient colors={gradients.heroGlow} start={{ x: 1, y: 0 }} end={{ x: 0.2, y: 0.8 }} style={styles.glow} />
      <Text variant="overline" color="rgba(255,255,255,0.6)" style={{ fontSize: 9.5 }}>
        Ta mobilité · personnalisée pour toi
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <Text variant="h1" color="#fff" style={{ fontSize: 22 }}>
          {profile.originCity || 'Chez toi'} → {to}
        </Text>
        <Plane size={18} color="#9DB6FF" />
      </View>
      <View style={styles.progressRow}>
        <ProgressRing progress={j.progress} size={compact ? 52 : 58} />
        <View style={{ flex: 1, gap: 6 }}>
          <Text variant="small" color="rgba(255,255,255,0.85)">
            Tu es prêt·e à {pct}% pour ton départ.
          </Text>
          <PressableScale onPress={() => router.push('/(app)/parcours')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} hitSlop={8}>
            <Text variant="smallStrong" color="#7FA6FF">
              Ouvrir ma checklist
            </Text>
            <ArrowRight size={14} color="#7FA6FF" />
          </PressableScale>
        </View>
      </View>
      <View style={styles.divider} />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text variant="overline" color="rgba(255,255,255,0.5)" style={{ fontSize: 9 }}>
            Arrivée prévue
          </Text>
          <Text variant="bodyStrong" color="#fff">
            {formatDayMonth(j.arrival)}
            <Text variant="small" color="rgba(255,255,255,0.65)"> · {relativeDays(j.arrival)}</Text>
          </Text>
        </View>
        {onEditArrival ? (
          <PressableScale onPress={onEditArrival} style={styles.edit} accessibilityLabel="Modifier la date d'arrivée">
            <Pencil size={15} color="#fff" />
          </PressableScale>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xxl, padding: 18, overflow: 'hidden', ...shadow.md },
  glow: { position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: 110, opacity: 0.6 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 14 },
  edit: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
});

