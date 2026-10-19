import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NightBackground } from '@/components/layout/NightBackground';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { Ame, type AmeState } from '@/features/ame/Ame';
import { palette } from '@/theme/tokens';

const states: { value: AmeState; label: string }[] = [
  { value: 'rest', label: 'Repos' },
  { value: 'listen', label: 'Écoute' },
  { value: 'think', label: 'Réflexion' },
  { value: 'answer', label: 'Réponse' },
  { value: 'success', label: 'Succès' },
];

/** ⚠️ Écran TEMPORAIRE : comparaison des 2 variantes de l'Âme (docs/VISION.md §5.1). À supprimer après le choix. */
export default function AmeLab() {
  const { s } = useLocalSearchParams<{ s?: AmeState }>();
  const state: AmeState = states.some((x) => x.value === s) ? (s as AmeState) : 'rest';
  const insets = useSafeAreaInsets();
  const [signal, setSignal] = useState(0);

  // Simule les frappes (écoute) et les paquets reçus (réponse).
  useEffect(() => {
    if (state !== 'listen' && state !== 'answer') return;
    const id = setInterval(() => setSignal((n) => n + 1), state === 'listen' ? 180 : 260);
    return () => clearInterval(id);
  }, [state]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <NightBackground />
      {(['perle', 'aurore'] as const).map((v) => (
        <View key={v} style={styles.block}>
          <Ame size={200} variant={v} state={state} signal={signal} />
          <View style={styles.row}>
            <Ame size={44} variant={v} state={state} signal={signal} />
            <Text variant="bodyStrong" color={palette.white}>
              {v === 'perle' ? 'A · Perle liquide' : 'B · Aurore'}
            </Text>
          </View>
        </View>
      ))}
      <Segmented kind="track" options={states} value={state} onChange={(v) => router.setParams({ s: v })} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16, justifyContent: 'space-between' },
  block: { alignItems: 'center', gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
