import { BlurView } from 'expo-blur';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Segmented } from '@/components/ui/Segmented';
import { PisteBillet } from '@/features/home/pistes/PisteBillet';
import { PisteChemin } from '@/features/home/pistes/PisteChemin';
import { PisteFocus } from '@/features/home/pistes/PisteFocus';
import { radius, shadow } from '@/theme/tokens';

type Piste = 'billet' | 'chemin' | 'focus';
const options: { value: Piste; label: string }[] = [
  { value: 'billet', label: 'A · Billet' },
  { value: 'chemin', label: 'B · Chemin' },
  { value: 'focus', label: 'C · Focus' },
];

/** ⚠️ Écran TEMPORAIRE : comparaison des 3 pistes d'accueil (docs/DIRECTION.md §7). À supprimer après le choix. */
export default function Pistes() {
  const { p } = useLocalSearchParams<{ p?: Piste }>();
  const piste: Piste = p === 'chemin' || p === 'focus' ? p : 'billet';
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      {piste === 'billet' ? <PisteBillet key="a" /> : piste === 'chemin' ? <PisteChemin key="b" /> : <PisteFocus key="c" />}
      <View style={[styles.switcher, { bottom: Math.max(insets.bottom, 12) }]}>
        <BlurView intensity={40} tint="light" style={styles.blur}>
          <Segmented kind="track" options={options} value={piste} onChange={(v) => router.setParams({ p: v })} />
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  switcher: { position: 'absolute', left: 16, right: 16, borderRadius: radius.xl, ...shadow.md },
  blur: { borderRadius: radius.xl, overflow: 'hidden', padding: 6, backgroundColor: 'rgba(255,255,255,0.85)' },
});
