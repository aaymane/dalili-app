import { MapPin, Search, Sparkles } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, LinearTransition, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { ChevronRight } from '@/components/ui/DirIcons';
import { IconTile } from '@/components/ui/IconTile';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useContent } from '@/data/hooks';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';
import { reflow } from '@/theme/motion';
import { useT } from '@/i18n';

function CityCard({ name, budget, selected, onPress }: { name: string; budget: string; selected: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const styles = useStyles();
  const s = useAnimatedStyle(() => ({ borderColor: withTiming(selected ? c.electric : c.line, { duration: 160 }) }));
  return (
    <PressableScale onPress={onPress} haptic="select">
      <Animated.View style={[styles.city, s, selected && { backgroundColor: c.cardSelected }]}>
        <IconTile icon={MapPin} tone={selected ? 'blue' : 'slate'} size={30} radius={10} />
        <Text variant="smallStrong" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" color={c.muted} style={{ fontSize: 10 }}>
          {budget}
        </Text>
      </Animated.View>
    </PressableScale>
  );
}

/** Choix de ville : « je ne sais pas encore » + recherche + grille. */
export function CityPicker({ value, onChange, allowUnknown = true }: { value: string | null | undefined; onChange: (v: string | null) => void; allowUnknown?: boolean }) {
  const { c } = useTheme();
  const styles = useStyles();
  const [q, setQ] = useState('');
  const t = useT();
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
              {t('cityPicker.unknown')}
            </Text>
            <Text variant="small" color="rgba(255,255,255,0.65)">
              {t('cityPicker.unknownText')}
            </Text>
          </View>
          <ChevronRight size={18} color="#fff" />
        </PressableScale>
      )}
      <Input icon={<Search size={16} color={c.electric} />} placeholder={t('cityPicker.search')} value={q} onChangeText={setQ} />
      <Animated.View layout={reflow} style={styles.grid}>
        {list.map((c) => (
          <Animated.View key={c.id} entering={FadeIn} layout={LinearTransition} style={{ width: '31.5%' }}>
            <CityCard
              name={c.name}
              budget={t('cityPicker.budget', { min: c.monthlyBudget.min, max: c.monthlyBudget.max })}
              selected={value === c.name}
              onPress={() => onChange(c.name)}
            />
          </Animated.View>
        ))}
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  unknown: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.xl, backgroundColor: c.navyInk, borderWidth: 2, borderColor: 'transparent', ...shadow.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  city: { padding: 10, gap: 6, borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1.5, ...shadow.sm, minHeight: 92 },
}));
