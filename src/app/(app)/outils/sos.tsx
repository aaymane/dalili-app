import { HeartHandshake, Phone } from 'lucide-react-native';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { palette, radius, shadow } from '@/theme/tokens';

const URGENT = [
  { n: '15', l: 'SAMU', d: 'Urgence médicale', c: '#E11D48' },
  { n: '17', l: 'Police', d: 'Danger, agression', c: '#1F56F5' },
  { n: '18', l: 'Pompiers', d: 'Incendie, accident', c: '#EA580C' },
  { n: '112', l: 'Urgence UE', d: 'Depuis n’importe quel téléphone', c: '#16A34A' },
];

const USEFUL = [
  { n: '114', l: 'Urgences par SMS', d: 'Pour les personnes sourdes ou ne pouvant pas parler' },
  { n: '3114', l: 'Prévention du suicide', d: '24h/24, gratuit et confidentiel' },
  { n: '3919', l: 'Violences femmes info', d: 'Écoute et orientation, anonyme' },
  { n: '0800235236', l: 'Fil Santé Jeunes', d: 'Santé, moral, sexualité — anonyme et gratuit', display: '0 800 235 236' },
  { n: '3237', l: 'Pharmacie de garde', d: 'Trouver une pharmacie ouverte' },
];

/** SOS : numéros d'urgence et d'écoute en France, appel en 1 tap. */
export default function Sos() {
  const call = (n: string) => Linking.openURL(`tel:${n}`).catch(() => {});
  return (
    <Screen top={['#FFC9D2', '#FFE9ED', '#F5F7FD']} padded={false} header={<AppHeader back />}>
      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        <Text variant="hero">Urgences & SOS</Text>
        <Text variant="body" color={palette.subtle}>
          En cas d’urgence, appelle directement. Ces numéros sont gratuits, même sans crédit.
        </Text>
        <View style={styles.grid}>
          {URGENT.map((u, i) => (
            <Animated.View key={u.n} entering={FadeInDown.delay(i * 60).springify()} style={{ width: '48%' }}>
              <PressableScale haptic="press" onPress={() => call(u.n)} style={[styles.urgent, { backgroundColor: u.c }]} accessibilityLabel={`Appeler le ${u.n}, ${u.l}`}>
                <Text variant="hero" color="#fff" style={{ fontSize: 40, lineHeight: 46 }}>
                  {u.n}
                </Text>
                <Text variant="h3" color="#fff">
                  {u.l}
                </Text>
                <Text variant="caption" color="rgba(255,255,255,0.8)">
                  {u.d}
                </Text>
              </PressableScale>
            </Animated.View>
          ))}
        </View>
        <Text variant="h2" style={{ marginTop: 6 }}>
          Écoute & aide
        </Text>
        <View style={styles.list}>
          {USEFUL.map((u) => (
            <PressableScale key={u.n} onPress={() => call(u.n)} style={styles.row}>
              <View style={styles.icon}>
                <Phone size={16} color={palette.electric} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">
                  {u.display ?? u.n} · {u.l}
                </Text>
                <Text variant="caption" color={palette.muted}>
                  {u.d}
                </Text>
              </View>
            </PressableScale>
          ))}
        </View>
        <View style={styles.consulate}>
          <HeartHandshake size={20} color={palette.mentor} />
          <Text variant="small" style={{ flex: 1 }}>
            Perte de passeport, problème administratif grave ? Contacte le consulat de ton pays le plus proche — et préviens ton mentor DALILI, il connaît la marche à suivre.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  urgent: { padding: 16, borderRadius: radius.xl, gap: 2, minHeight: 140, ...shadow.md },
  list: { borderRadius: radius.xl, backgroundColor: '#fff', paddingVertical: 4, ...shadow.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.electricSoft, alignItems: 'center', justifyContent: 'center' },
  consulate: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, borderRadius: radius.lg, backgroundColor: palette.mentorSoft },
});
