import { Check, Cloud } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, withSpring, ZoomIn } from 'react-native-reanimated';

import { celebrate } from '@/components/feedback/Confetti';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useLocalDb } from '@/data/local-db';
import { haptics } from '@/lib/haptics';
import { gradients, motion, palette, radius, shadow } from '@/theme/tokens';

const GROUPS: { title: string; emoji: string; items: { id: string; label: string; hint?: string }[] }[] = [
  {
    title: 'Identité',
    emoji: '🪪',
    items: [
      { id: 'passport', label: 'Passeport valide', hint: 'Valable pendant tout ton séjour' },
      { id: 'photos', label: 'Photos d’identité', hint: 'Format officiel, fond clair' },
      { id: 'birth', label: 'Acte de naissance', hint: 'Copie intégrale + traduction si besoin' },
    ],
  },
  {
    title: 'Études',
    emoji: '🎓',
    items: [
      { id: 'diplomas', label: 'Diplômes & relevés de notes' },
      { id: 'tcf', label: 'Attestation TCF / DELF' },
      { id: 'admission', label: 'Attestation d’admission' },
      { id: 'cvec', label: 'Attestation CVEC' },
    ],
  },
  {
    title: 'Logement',
    emoji: '🏠',
    items: [
      { id: 'lease', label: 'Bail ou attestation d’hébergement' },
      { id: 'visale', label: 'Visa Visale (garant)' },
      { id: 'home-insurance', label: 'Attestation d’assurance habitation' },
    ],
  },
  {
    title: 'Argent',
    emoji: '💶',
    items: [
      { id: 'resources', label: 'Justificatif de ressources', hint: 'Au moins 615 € / mois' },
      { id: 'rib', label: 'RIB français' },
    ],
  },
];

function DocRow({ id, label, hint }: { id: string; label: string; hint?: string }) {
  const on = useLocalDb((s) => !!s.documents[id]);
  const toggle = useLocalDb((s) => s.toggleDocument);
  const box = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(on ? 1 : 0.92, motion.springBouncy) }], backgroundColor: on ? palette.success : '#EEF1F7' }));
  return (
    <PressableScale
      haptic={false}
      onPress={() => {
        on ? haptics.tap() : haptics.success();
        toggle(id);
      }}
      style={styles.row}>
      <Animated.View style={[styles.box, box]}>
        {on && (
          <Animated.View entering={ZoomIn.springify().damping(9)}>
            <Check size={14} color="#fff" strokeWidth={3.4} />
          </Animated.View>
        )}
      </Animated.View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" color={on ? palette.subtle : palette.navy} style={on && { textDecorationLine: 'line-through' }}>
          {label}
        </Text>
        {hint ? (
          <Text variant="caption" color={palette.muted}>
            {hint}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}

/** Checklist « Mes documents » — tout ce qu'il faut avoir sous la main. */
export default function Documents() {
  const docs = useLocalDb((s) => s.documents);
  const total = GROUPS.reduce((a, g) => a + g.items.length, 0);
  const done = Object.values(docs).filter(Boolean).length;
  const pct = done / total;
  const bar = useAnimatedStyle(() => ({ width: withSpring(`${pct * 100}%`, motion.springSoft) }));
  const wasComplete = useRef(done === total);
  useEffect(() => {
    if (done === total && !wasComplete.current) celebrate();
    wasComplete.current = done === total;
  }, [done, total]);

  return (
    <Screen top={gradients.peach} padded={false} header={<AppHeader back />}>
      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        <Text variant="hero">Mes documents</Text>
        <View style={styles.progress}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="bodyStrong">
              {done}/{total} prêts
            </Text>
            <Text variant="smallStrong" color={palette.success}>
              {Math.round(pct * 100)}%
            </Text>
          </View>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, bar]} />
          </View>
        </View>
        {GROUPS.map((g, gi) => (
          <Animated.View key={g.title} entering={FadeInDown.delay(gi * 70).springify()} style={{ gap: 8 }}>
            <Text variant="h2">
              {g.emoji} {g.title}
            </Text>
            <View style={styles.group}>
              {g.items.map((it) => (
                <DocRow key={it.id} {...it} />
              ))}
            </View>
          </Animated.View>
        ))}
        <View style={styles.tip}>
          <Cloud size={18} color={palette.electric} />
          <Text variant="small" style={{ flex: 1 }}>
            Astuce : scanne tous tes papiers dans un dossier en ligne. Le jour où on te les demande, tu es prêt·e en 10 secondes.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { gap: 10, padding: 16, borderRadius: radius.xl, backgroundColor: '#fff', ...shadow.sm },
  track: { height: 10, borderRadius: 5, backgroundColor: '#EEF1F7', overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: palette.success },
  group: { borderRadius: radius.xl, backgroundColor: '#fff', paddingVertical: 4, ...shadow.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  box: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tip: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, borderRadius: radius.lg, backgroundColor: palette.electricSoft },
});
