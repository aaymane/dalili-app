import { MapPin, Search, Sparkles, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { IconTile } from '@/components/ui/IconTile';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useContent } from '@/data/hooks';
import { palette, radius, shadow } from '@/theme/tokens';
import { reflow } from '@/theme/motion';

/** Accents décoratifs des pastilles de ville (pas une couleur d'action). */
const ACCENTS: Record<string, string> = {
  paris: '#3D78FF',
  lyon: '#A855F7',
  toulouse: '#F43F5E',
  bordeaux: '#22C55E',
  marseille: '#F97316',
  lille: '#6366F1',
  nantes: '#14B8A6',
  montpellier: '#EAB308',
  strasbourg: '#EC4899',
  rennes: '#0EA5E9',
  grenoble: '#84CC16',
  nice: '#06B6D4',
  'clermont-ferrand': '#8B5CF6',
  dijon: '#D946EF',
  caen: '#64748B',
};

function CityCard({ name, budget, color, selected, onPress }: { name: string; budget: string; color: string; selected: boolean; onPress: () => void }) {
  const s = useAnimatedStyle(() => ({ borderColor: withTiming(selected ? palette.electric : '#EEF0F6', { duration: 160 }) }));
  return (
    <PressableScale onPress={onPress} haptic="select">
      <Animated.View style={[styles.city, s, selected && { backgroundColor: '#F6F8FF' }]}>
        <IconTile size={30} colors={[color, color]} radius={10}>
          <MapPin size={15} color="#fff" />
        </IconTile>
        <Text variant="smallStrong" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" color={palette.muted} style={{ fontSize: 10 }}>
          {budget}
        </Text>
      </Animated.View>
    </PressableScale>
  );
}

/** Choix de ville : « je ne sais pas encore » + recherche + grille. */
export function CityPicker({ value, onChange, allowUnknown = true }: { value: string | null | undefined; onChange: (v: string | null) => void; allowUnknown?: boolean }) {
  const [q, setQ] = useState('');
  const { data: cities } = useContent('cities');
  const list = useMemo(() => cities.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase())), [q, cities]);
  return (
    <View style={{ gap: 14 }}>
      {allowUnknown && (
        <PressableScale onPress={() => onChange(null)} haptic="select" style={[styles.unknown, value === null && { borderColor: '#7FA6FF', borderWidth: 2 }]}>
          <IconTile size={44} colors={['#6D7BFF', '#5B3FD9']} radius={22}>
            <Sparkles size={20} color="#fff" />
          </IconTile>
          <View style={{ flex: 1 }}>
            <Text variant="h3" color="#fff">
              Je ne sais pas encore
            </Text>
            <Text variant="small" color="rgba(255,255,255,0.65)">
              Dalili te suggère la meilleure ville selon ton profil
            </Text>
          </View>
          <ChevronRight size={18} color="#fff" />
        </PressableScale>
      )}
      <Input icon={<Search size={16} color={palette.electric} />} placeholder="Rechercher une ville…" value={q} onChangeText={setQ} />
      <Animated.View layout={reflow} style={styles.grid}>
        {list.map((c) => (
          <Animated.View key={c.id} entering={FadeIn} layout={LinearTransition} style={{ width: '31.5%' }}>
            <CityCard
              name={c.name}
              budget={`≈ ${c.monthlyBudget.min}–${c.monthlyBudget.max} €/mois`}
              color={ACCENTS[c.id] ?? palette.electricLight}
              selected={value === c.name}
              onPress={() => onChange(c.name)}
            />
          </Animated.View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  unknown: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.xl, backgroundColor: palette.navyInk, borderWidth: 2, borderColor: 'transparent', ...shadow.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  city: { padding: 10, gap: 6, borderRadius: radius.lg, backgroundColor: '#fff', borderWidth: 1.5, ...shadow.sm, minHeight: 92 },
});
