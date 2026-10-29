import { Earth, Flame, HandHeart, HeartHandshake, HeartPulse, Landmark, MessageSquareText, Phone, Pill, ShieldAlert, Stethoscope, type LucideIcon } from 'lucide-react-native';
import { Linking, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius, type Tone } from '@/theme/tokens';
import { rise } from '@/theme/motion';

const URGENT: { n: string; l: string; d: string; icon: LucideIcon; tone: Tone }[] = [
  { n: '15', l: 'SAMU', d: 'Urgence médicale', icon: HeartPulse, tone: 'red' },
  { n: '17', l: 'Police', d: 'Danger, agression', icon: ShieldAlert, tone: 'blue' },
  { n: '18', l: 'Pompiers', d: 'Incendie, accident', icon: Flame, tone: 'orange' },
  { n: '112', l: 'Urgence UE', d: 'Depuis n’importe quel téléphone', icon: Earth, tone: 'violet' },
];

const USEFUL: { n: string; l: string; d: string; display?: string; icon: LucideIcon; tone: Tone }[] = [
  { n: '114', l: 'Urgences par SMS', d: 'Pour les personnes sourdes ou ne pouvant pas parler', icon: MessageSquareText, tone: 'blue' },
  { n: '3114', l: 'Prévention du suicide', d: '24h/24, gratuit et confidentiel', icon: HeartHandshake, tone: 'violet' },
  { n: '3919', l: 'Violences femmes info', d: 'Écoute et orientation, anonyme', icon: HandHeart, tone: 'red' },
  { n: '0800235236', l: 'Fil Santé Jeunes', d: 'Santé, moral, sexualité, anonyme et gratuit', display: '0 800 235 236', icon: Stethoscope, tone: 'green' },
  { n: '3237', l: 'Pharmacie de garde', d: 'Trouver une pharmacie ouverte', icon: Pill, tone: 'amber' },
];

/** SOS : numéros d'urgence et d'écoute en France, appel en 1 tap. */
export default function Sos() {
  const { c, tones, gradients } = useTheme();
  const styles = useStyles();
  const call = (n: string) => Linking.openURL(`tel:${n}`).catch(() => {});
  return (
    <Screen top={gradients.sosTop} padded={false} header={<AppHeader back />}>
      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        <Text variant="hero">Urgences & SOS</Text>
        <Text variant="body" color={c.subtle}>
          En cas d’urgence, appelle directement. Ces numéros sont gratuits, même sans crédit.
        </Text>
        <View style={styles.grid}>
          {URGENT.map((u, i) => (
            <Animated.View key={u.n} entering={rise(i * 60)} style={{ width: '48%' }}>
              <PressableScale haptic="press" onPress={() => call(u.n)} style={styles.urgent} accessibilityLabel={`Appeler le ${u.n}, ${u.l}`}>
                <View style={styles.urgentTop}>
                  <IconTile icon={u.icon} tone={u.tone} size={40} radius={13} />
                  <View style={[styles.callDot, { backgroundColor: tones[u.tone].ink }]}>
                    <Phone size={14} color={c.white} fill={c.white} />
                  </View>
                </View>
                <Text variant="hero" color={tones[u.tone].ink} style={{ fontSize: 38, lineHeight: 44, marginTop: 10 }}>
                  {u.n}
                </Text>
                <Text variant="h3">{u.l}</Text>
                <Text variant="caption" color={c.subtle}>
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
          {USEFUL.map((u, i) => (
            <PressableScale key={u.n} onPress={() => call(u.n)} style={[styles.row, i > 0 && styles.sep]} accessibilityLabel={`Appeler le ${u.display ?? u.n}, ${u.l}`}>
              <IconTile icon={u.icon} tone={u.tone} size={40} radius={13} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">
                  {u.display ?? u.n} · {u.l}
                </Text>
                <Text variant="caption" color={c.muted}>
                  {u.d}
                </Text>
              </View>
              <Phone size={16} color={c.muted} />
            </PressableScale>
          ))}
        </View>
        <View style={styles.consulate}>
          <IconTile icon={Landmark} tone="green" size={40} radius={13} />
          <Text variant="small" style={{ flex: 1 }}>
            Perte de passeport, problème administratif grave ? Contacte le consulat de ton pays le plus proche — et préviens ton mentor DALILI, il connaît la marche à suivre.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  urgent: { padding: 14, borderRadius: radius.xl, gap: 2, minHeight: 150, backgroundColor: c.surface, ...shadow.sm },
  urgentTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  callDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  list: { borderRadius: radius.xl, backgroundColor: c.card, paddingVertical: 4, ...shadow.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
  consulate: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderRadius: radius.xl, backgroundColor: c.surface, ...shadow.sm },
}));
