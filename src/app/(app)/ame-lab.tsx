import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFrameCallback } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { NightBackground } from '@/components/layout/NightBackground';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { Ame, type AmeState } from '@/features/ame/Ame';
import { palette, radius } from '@/theme/tokens';

const states: { value: AmeState; label: string }[] = [
  { value: 'rest', label: 'Repos' },
  { value: 'listen', label: 'Écoute' },
  { value: 'think', label: 'Réflexion' },
  { value: 'answer', label: 'Réponse' },
  { value: 'success', label: 'Succès' },
];

/** Compteur d'images par seconde (thread UI), moyenné sur ~1 s. */
function useFps() {
  const [fps, setFps] = useState(0);
  useFrameCallback((f) => {
    'worklet';
    const dt = f.timeSincePreviousFrame ?? 16.7;
    if (f.timeSinceFirstFrame % 1000 < dt) scheduleOnRN(setFps, Math.round(1000 / Math.max(dt, 1)));
  });
  return fps;
}

/** ⚠️ Écran TEMPORAIRE : réglage de l'Âme (docs/VISION.md §5). À supprimer au début de M1. */
export default function AmeLab() {
  const { s } = useLocalSearchParams<{ s?: AmeState }>();
  const state: AmeState = states.some((x) => x.value === s) ? (s as AmeState) : 'rest';
  const insets = useSafeAreaInsets();
  const [signal, setSignal] = useState(0);
  const fps = useFps();

  // Simule les frappes (écoute) et les paquets reçus (réponse).
  useEffect(() => {
    if (state !== 'listen' && state !== 'answer') return;
    const id = setInterval(() => setSignal((n) => n + 1), state === 'listen' ? 180 : 260);
    return () => clearInterval(id);
  }, [state]);

  return (
    <View style={styles.root}>
      <View style={[styles.dark, { paddingTop: insets.top }]}>
        <NightBackground />
        <Ame size={160} state={state} signal={signal} surface="dark" />
        <Text variant="caption" color={palette.white}>
          Fond sombre · 160 px · {fps} img/s
        </Text>
      </View>
      <View style={styles.light}>
        <Ame size={160} state={state} signal={signal} surface="light" />
        <Text variant="caption" color={palette.subtle}>
          Fond clair de l’accueil · 160 px
        </Text>
      </View>
      <View style={[styles.chat, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.bubbleRow}>
          <Ame size={44} state={state} signal={signal} surface="light" />
          <View style={styles.bubble}>
            <Text variant="small">Je regarde dans nos guides…</Text>
          </View>
        </View>
        <Segmented kind="track" options={states} value={state} onChange={(v) => router.setParams({ s: v })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  dark: { flex: 1.1, alignItems: 'center', justifyContent: 'center', gap: 4, overflow: 'hidden' },
  light: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  chat: { paddingHorizontal: 16, gap: 14 },
  bubbleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bubble: { backgroundColor: palette.surface, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
});
