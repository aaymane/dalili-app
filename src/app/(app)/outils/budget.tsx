import { Check, Info, TriangleAlert } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { PressableScale } from '@/components/ui/PressableScale';
import { Segmented } from '@/components/ui/Segmented';
import { Chip } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import { computeBudget, type BudgetHousing, type BudgetSituation } from '@/data/content';
import { useContent } from '@/data/hooks';
import { openLink } from '@/features/guides/components/RichText';
import { useProfile } from '@/features/profile/store';
import { makeStyles, useTheme } from '@/theme/scheme';
import { motion, radius } from '@/theme/tokens';

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const { c } = useTheme();
  const styles = useStyles();
  const s = useAnimatedStyle(() => ({ width: withSpring(`${Math.max(4, (Math.abs(value) / max) * 100)}%`, motion.springSoft) }));
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="smallStrong">{label}</Text>
        <Text variant="smallStrong" color={value < 0 ? c.success : c.navy}>
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

const SITUATIONS: { value: BudgetSituation; label: string }[] = [
  { value: 'aucune', label: 'Ni bourse ni job' },
  { value: 'autre_bourse', label: 'Bourse de mon pays, Eiffel…' },
  { value: 'bcs', label: 'Boursier CROUS' },
  { value: 'alternance', label: 'Alternance' },
  { value: 'salarie', label: 'Salarié·e' },
];

/**
 * Simulateur de budget mensuel : même formule et mêmes données que dalili.study/simulateur.
 * L'APL n'est comptée que si ta situation y ouvre droit (réforme du 1er juillet 2026).
 */
export default function Budget() {
  const { c, gradients } = useTheme();
  const styles = useStyles();
  const profile = useProfile((s) => s.profile);
  const { data: tools } = useContent('tools');
  const { data: figures } = useContent('figures');
  const t = tools.budget;
  const [city, setCity] = useState(() => t.cities.find((c) => c.name === profile.destinationCity)?.slug ?? t.cities[0].slug);
  const [housing, setHousing] = useState<BudgetHousing>('crous');
  const [situation, setSituation] = useState<BudgetSituation>('aucune');
  const level = profile.studyLevel === 'master' ? 'master' : profile.studyLevel === 'doctorat' ? 'doctorat' : 'licence';

  const b = useMemo(() => computeBudget({ city, housing, level, monthlyTuition: false, situation }, t), [city, housing, level, situation, t]);
  const resources = figures.verified.compteBloqueMensuel;
  if (!b) return null;
  const cityName = t.cities.find((c) => c.slug === city)?.name ?? '';
  const max = Math.max(b.housing, b.food, 100);
  const savings = b.gross - b.net;
  const resourcesValue = resources?.current.value ?? 0;

  return (
    <Screen top={gradients.mint} padded={false} header={<AppHeader back />}>
      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        <Text variant="hero">Simulateur{'\n'}de budget</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
          {t.cities.map((x) => (
            <PressableScale key={x.slug} haptic="select" onPress={() => setCity(x.slug)}>
              <Chip label={x.name} active={city === x.slug} color={c.success} />
            </PressableScale>
          ))}
        </ScrollView>
        <Segmented
          kind="track"
          value={housing}
          onChange={setHousing}
          options={[
            { value: 'crous', label: 'CROUS' },
            { value: 'coloc', label: 'Coloc' },
            { value: 'studio', label: 'Studio' },
            { value: 'habitant', label: 'Habitant' },
          ]}
        />
        <View style={{ gap: 8 }}>
          <Text variant="smallStrong">Ta situation (elle décide de ton droit à l’APL)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SITUATIONS.map((s) => (
              <PressableScale key={s.value} haptic="select" onPress={() => setSituation(s.value)}>
                <Chip label={s.label} active={situation === s.value} color={c.success} />
              </PressableScale>
            ))}
          </View>
        </View>

        <Animated.View key={`${city}-${housing}-${situation}`} entering={FadeIn.duration(250)} style={styles.total}>
          <Text variant="overline" color="rgba(255,255,255,0.65)">
            Ton budget mensuel à {cityName}
          </Text>
          <Text variant="hero" color="#fff" style={{ fontSize: 44, lineHeight: 50 }}>
            ≈ {b.net} €
          </Text>
          <Text variant="small" color="rgba(255,255,255,0.8)">
            ≈ {b.gross} € avant les économies étudiantes ({savings} € en moins par mois).
          </Text>
        </Animated.View>

        <View style={styles.card}>
          <Bar label="Loyer" value={b.housing} max={max} color="#3D78FF" />
          <Bar label="Courses & repas" value={b.food} max={max} color="#F97316" />
          <Bar label="Transport" value={b.transport} max={max} color="#A855F7" />
          <Bar label="Téléphone, santé, loisirs" value={b.fixed} max={max} color="#0EA5E9" />
          <Bar label="Repas au resto U, transport réduit, CSS" value={-(savings - b.aplMid)} max={max} color="#16A34A" />
          {b.aplEligible ? <Bar label="APL (estimation)" value={-b.aplMid} max={max} color="#16A34A" /> : null}
        </View>

        <View style={[styles.note, { backgroundColor: b.aplEligible ? c.successSoft : c.warningSoft }]}>
          {b.aplEligible ? <Check size={18} color={c.success} /> : <TriangleAlert size={18} color={c.warningInk} />}
          <Text variant="small" style={{ flex: 1 }} color={b.aplEligible ? c.navy : c.warningInk}>
            {b.aplEligible
              ? `Ta situation peut t’ouvrir l’APL : environ ${b.aplMin} à ${b.aplMax} € par mois. Le montant réel se calcule sur caf.fr.`
              : 'Depuis le 1er juillet 2026, ta situation n’ouvre plus droit à l’APL. Ce budget n’en compte donc aucune.'}
          </Text>
        </View>

        {resources ? (
          <View style={[styles.note, { backgroundColor: c.electricSoft }]}>
            <Info size={18} color={c.electric} />
            <Text variant="small" style={{ flex: 1 }}>
              Pour le visa, tu dois prouver <Text variant="smallStrong">{resources.display}</Text>. Ici, prévois plutôt{' '}
              <Text variant="smallStrong">≈ {Math.max(Math.round(resourcesValue), b.gross)} €</Text> pour vivre sereinement.{' '}
              <Text variant="caption" color={c.electric} onPress={() => openLink(resources.current.source)} accessibilityRole="link">
                Source : {resources.current.sourceLabel}
              </Text>
            </Text>
          </View>
        ) : null}

        <View style={styles.note}>
          <Info size={16} color={c.muted} />
          <Text variant="caption" color={c.muted} style={{ flex: 1 }}>
            Même calcul que le simulateur de dalili.study. Frais d’inscription en plus : ≈ {b.tuitionAnnual} € par an + CVEC ≈ {b.cvec} €.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  total: { gap: 6, padding: 20, borderRadius: radius.xxl, backgroundColor: '#0F3B2E', ...shadow.md },
  card: { gap: 14, padding: 18, borderRadius: radius.xl, backgroundColor: c.surface, ...shadow.sm },
  track: { height: 8, borderRadius: 4, backgroundColor: c.fill, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  note: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, borderRadius: radius.lg },
}));
