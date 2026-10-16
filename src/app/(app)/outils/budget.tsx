import { Check, Info, TriangleAlert } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { PressableScale } from '@/components/ui/PressableScale';
import { Segmented } from '@/components/ui/Segmented';
import { Chip } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import { cities, cityByName } from '@/data/cities';
import { useProfile } from '@/features/profile/store';
import { gradients, motion, palette, radius, shadow } from '@/theme/tokens';

type Housing = 'crous' | 'coloc' | 'studio';
const VISA_MIN = 615;

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const s = useAnimatedStyle(() => ({ width: withSpring(`${Math.max(4, (value / max) * 100)}%`, motion.springSoft) }));
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="smallStrong">{label}</Text>
        <Text variant="smallStrong" color={value < 0 ? palette.success : palette.navy}>
          {value < 0 ? '−' : ''}
          {Math.abs(value)} €
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, s]} />
      </View>
    </View>
  );
}

/** Simulateur de budget mensuel par ville, avec estimation APL (brut / net). */
export default function Budget() {
  const profile = useProfile((s) => s.profile);
  const [city, setCity] = useState(cityByName(profile.destinationCity)?.name ?? 'Paris');
  const [housing, setHousing] = useState<Housing>('crous');
  const [net, setNet] = useState(true);
  const c = cityByName(city)!;

  const b = useMemo(() => {
    const rent = c.rent[housing];
    const apl = Math.round((housing === 'crous' ? 0.3 : housing === 'coloc' ? 0.28 : 0.25) * rent);
    const phone = 10;
    const insurance = 12;
    const leisure = 80;
    const gross = rent + c.food + c.transport + phone + insurance + leisure;
    return { rent, apl, phone, insurance, leisure, gross, net: gross - apl };
  }, [c, housing]);

  const total = net ? b.net : b.gross;
  const max = Math.max(b.rent, c.food, 100);

  return (
    <Screen top={gradients.mint} padded={false} header={<AppHeader back />}>
      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        <Text variant="hero">Simulateur{'\n'}de budget</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
          {cities.map((x) => (
            <PressableScale key={x.id} haptic="select" onPress={() => setCity(x.name)}>
              <Chip label={x.name} active={city === x.name} color={palette.success} />
            </PressableScale>
          ))}
        </ScrollView>
        <Segmented
          kind="track"
          value={housing}
          onChange={setHousing}
          options={[
            { value: 'crous', label: 'CROUS' },
            { value: 'coloc', label: 'Colocation' },
            { value: 'studio', label: 'Studio' },
          ]}
        />
        <Animated.View key={`${city}-${housing}-${net}`} entering={FadeIn.duration(250)} style={styles.total}>
          <Text variant="overline" color="rgba(255,255,255,0.65)">
            Ton budget mensuel à {city}
          </Text>
          <Text variant="hero" color="#fff" style={{ fontSize: 44, lineHeight: 50 }}>
            ≈ {total} €
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text variant="small" color="rgba(255,255,255,0.8)" style={{ flex: 1 }}>
              {net ? 'Après aides (APL estimée)' : 'Avant aides'}
            </Text>
            <Text variant="smallStrong" color="#fff">
              Net
            </Text>
            <Switch value={net} onValueChange={setNet} trackColor={{ true: '#34D399', false: 'rgba(255,255,255,0.3)' }} thumbColor="#fff" />
          </View>
        </Animated.View>
        <View style={styles.card}>
          <Bar label="Loyer" value={b.rent} max={max} color="#3D78FF" />
          {net && <Bar label="APL (estimation)" value={-b.apl} max={max} color="#16A34A" />}
          <Bar label="Courses & repas" value={c.food} max={max} color="#F97316" />
          <Bar label="Transport (tarif jeune)" value={c.transport} max={max} color="#A855F7" />
          <Bar label="Téléphone" value={b.phone} max={max} color="#0EA5E9" />
          <Bar label="Assurance & mutuelle" value={b.insurance} max={max} color="#E11D48" />
          <Bar label="Sorties & imprévus" value={b.leisure} max={max} color="#EAB308" />
        </View>
        <View style={[styles.note, { backgroundColor: palette.electricSoft }]}>
          {b.gross <= VISA_MIN * 1.6 ? <Check size={18} color={palette.electric} /> : <TriangleAlert size={18} color={palette.warning} />}
          <Text variant="small" style={{ flex: 1 }}>
            Pour le visa, tu dois justifier au moins <Text variant="smallStrong">{VISA_MIN} € par mois</Text>. Ici, prévois plutôt{' '}
            <Text variant="smallStrong">{Math.max(VISA_MIN, b.gross)} €</Text> pour vivre sereinement.
          </Text>
        </View>
        <View style={styles.note}>
          <Info size={16} color={palette.muted} />
          <Text variant="caption" color={palette.muted} style={{ flex: 1 }}>
            Estimations indicatives. L’APL réelle dépend de tes ressources et de ton logement : fais ta simulation officielle sur caf.fr.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  total: { gap: 6, padding: 20, borderRadius: radius.xxl, backgroundColor: '#0F3B2E', ...shadow.md },
  card: { gap: 14, padding: 18, borderRadius: radius.xl, backgroundColor: '#fff', ...shadow.sm },
  track: { height: 8, borderRadius: 4, backgroundColor: '#EEF1F7', overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  note: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, borderRadius: radius.lg },
});
