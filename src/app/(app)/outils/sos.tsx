import { Earth, Flame, HandHeart, HeartHandshake, HeartPulse, Landmark, MessageSquareText, Phone, Pill, ShieldAlert, Stethoscope, type LucideIcon } from 'lucide-react-native';
import { Linking, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius, type Tone } from '@/theme/tokens';
import { rise } from '@/theme/motion';

// `key` : le nom et la description dans `tools.sos` (i18n).
type Line = { n: string; key: 'n15' | 'n17' | 'n18' | 'n112' | 'n114' | 'n3114' | 'n3919' | 'n0800' | 'n3237'; display?: string; icon: LucideIcon; tone: Tone };

const URGENT: Line[] = [
  { n: '15', key: 'n15', icon: HeartPulse, tone: 'red' },
  { n: '17', key: 'n17', icon: ShieldAlert, tone: 'blue' },
  { n: '18', key: 'n18', icon: Flame, tone: 'orange' },
  { n: '112', key: 'n112', icon: Earth, tone: 'violet' },
];

const USEFUL: Line[] = [
  { n: '114', key: 'n114', icon: MessageSquareText, tone: 'blue' },
  { n: '3114', key: 'n3114', icon: HeartHandshake, tone: 'violet' },
  { n: '3919', key: 'n3919', icon: HandHeart, tone: 'red' },
  { n: '0800235236', key: 'n0800', display: '0 800 235 236', icon: Stethoscope, tone: 'green' },
  { n: '3237', key: 'n3237', icon: Pill, tone: 'amber' },
];

/** SOS : numéros d'urgence et d'écoute en France, appel en 1 tap. */
export default function Sos() {
  const { c, tones, gradients } = useTheme();
  const t = useT();
  const styles = useStyles();
  const call = (n: string) => Linking.openURL(`tel:${n}`).catch(() => {});
  return (
    <Screen top={gradients.sosTop} padded={false} header={<AppHeader back />}>
      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        <Text variant="hero">{t('tools.sos.title')}</Text>
        <Text variant="body" color={c.subtle}>
          {t('tools.sos.intro')}
        </Text>
        <View style={styles.grid}>
          {URGENT.map((u, i) => (
            <Animated.View key={u.n} entering={rise(i * 60)} style={{ width: '48%' }}>
              <PressableScale haptic="press" onPress={() => call(u.n)} style={styles.urgent} accessibilityLabel={t('tools.sos.callA11y', { number: u.n, name: t(`tools.sos.${u.key}.name`) })}>
                <View style={styles.urgentTop}>
                  <IconTile icon={u.icon} tone={u.tone} size={40} radius={13} />
                  <View style={[styles.callDot, { backgroundColor: tones[u.tone].ink }]}>
                    <Phone size={14} color={c.white} fill={c.white} />
                  </View>
                </View>
                <Text variant="hero" color={tones[u.tone].ink} style={{ fontSize: 38, lineHeight: 44, marginTop: 10 }}>
                  {u.n}
                </Text>
                <Text variant="h3">{t(`tools.sos.${u.key}.name`)}</Text>
                <Text variant="caption" color={c.subtle}>
                  {t(`tools.sos.${u.key}.desc`)}
                </Text>
              </PressableScale>
            </Animated.View>
          ))}
        </View>
        <Text variant="h2" style={{ marginTop: 6 }}>
          {t('tools.sos.listen')}
        </Text>
        <View style={styles.list}>
          {USEFUL.map((u, i) => (
            <PressableScale key={u.n} onPress={() => call(u.n)} style={[styles.row, i > 0 && styles.sep]} accessibilityLabel={t('tools.sos.callA11y', { number: u.display ?? u.n, name: t(`tools.sos.${u.key}.name`) })}>
              <IconTile icon={u.icon} tone={u.tone} size={40} radius={13} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">
                  {u.display ?? u.n} · {t(`tools.sos.${u.key}.name`)}
                </Text>
                <Text variant="caption" color={c.muted}>
                  {t(`tools.sos.${u.key}.desc`)}
                </Text>
              </View>
              <Phone size={16} color={c.muted} />
            </PressableScale>
          ))}
        </View>
        <View style={styles.consulate}>
          <IconTile icon={Landmark} tone="green" size={40} radius={13} />
          <Text variant="small" style={{ flex: 1 }}>
            {t('tools.sos.consulate')}
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
