import { MapPin, Search, Sparkles, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { IconTile } from '@/components/ui/IconTile';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { cities } from '@/data/cities';
import { palette, radius, shadow } from '@/theme/tokens';

function CityCard({ name, members, color, selected, onPress }: { name: string; members: number; color: string; selected: boolean; onPress: () => void }) {
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
          {members.toLocaleString('fr-FR')} membres
        </Text>
      </Animated.View>
    </PressableScale>
  );
}

/** Choix de ville : « je ne sais pas encore » + recherche + grille. */
export function CityPicker({ value, onChange, allowUnknown = true }: { value: string | null | undefined; onChange: (v: string | null) => void; allowUnknown?: boolean }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => cities.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase())), [q]);
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
      <Animated.View layout={LinearTransition.springify()} style={styles.grid}>
        {list.map((c) => (
          <Animated.View key={c.id} entering={FadeIn} layout={LinearTransition} style={{ width: '31.5%' }}>
            <CityCard name={c.name} members={c.members} color={c.color} selected={value === c.name} onPress={() => onChange(c.name)} />
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
