import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';

import { celebrate } from '@/components/feedback/Confetti';
import { ChevronRight } from '@/components/ui/DirIcons';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n';
import { daysFromToday, formatDayMonth } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { makeStyles, useTheme } from '@/theme/scheme';
import { motion } from '@/theme/tokens';
import { pop } from '@/theme/motion';

import { useJourneyStore, type JourneyItem } from '../store';

/**
 * Où en est l'étape, en quelques mots à droite de la ligne : à toi de jouer, en retard, bientôt.
 * Rien à dire (faite ou lointaine) : une flèche si la ligne ouvre une fiche.
 */
export function StepStatus({ item }: { item: JourneyItem }) {
  const { c } = useTheme();
  const t = useT();
  const days = daysFromToday(item.date);
  if (!item.done && item.current)
    return (
      <Text variant="caption" color={c.electric}>
        {t('status.current')}
      </Text>
    );
  if (!item.done && days < 0)
    return (
      <Text variant="caption" color={c.warningInk}>
        {t('status.late')}
      </Text>
    );
  if (!item.done && days <= 7)
    return (
      <Text variant="caption" color={c.warningInk}>
        {t('dates.inDaysShort', { count: days })}
      </Text>
    );
  return item.kind === 'official' ? <ChevronRight size={16} color={c.muted} /> : null;
}

/** Ligne d'étape du Parcours-quête (officielle ou perso), dans la liste de sa phase, avec validation animée. */
export function StepRow({ item }: { item: JourneyItem }) {
  const { c } = useTheme();
  const styles = useStyles();
  const toggle = useJourneyStore((s) => s.toggle);
  const toggleCustom = useJourneyStore((s) => s.toggleCustom);
  const t = useT();
  const done = item.done;
  const isCurrent = item.current;

  const check = useAnimatedStyle(() => ({
    backgroundColor: withTiming(done ? c.success : 'transparent', { duration: 220 }),
    borderColor: withTiming(done ? c.success : isCurrent ? c.electric : c.line, { duration: 220 }),
    transform: [{ scale: withSpring(done ? 1 : 0.94, motion.springBouncy) }],
  }));

  const onCheck = () => {
    if (item.kind === 'official') toggle(item.step.id, !done);
    else toggleCustom(item.custom.id);
    if (!done) {
      haptics.success();
      if (isCurrent) celebrate();
    } else haptics.tap();
  };

  const title = item.kind === 'official' ? item.step.title : item.custom.title;
  const meta = item.kind === 'official' ? item.step.window : `${t('journey.myTask')} · ${formatDayMonth(item.date)}`;

  return (
    <PressableScale
      scaleTo={0.985}
      onPress={() => (item.kind === 'official' ? router.push({ pathname: '/(app)/etape/[id]', params: { id: item.step.id } }) : onCheck())}
      style={[styles.row, isCurrent && !done && styles.current]}>
      <PressableScale onPress={onCheck} haptic={false} hitSlop={10} accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={t('journey.markDoneA11y', { title })}>
        <Animated.View style={[styles.check, check]}>
          {done ? (
            <Animated.View entering={pop()}>
              <Check size={14} color={c.white} strokeWidth={3.4} />
            </Animated.View>
          ) : isCurrent ? (
            <View style={styles.currentDot} />
          ) : null}
        </Animated.View>
      </PressableScale>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="smallStrong" numberOfLines={2} color={done ? c.muted : c.navy}>
          {title}
        </Text>
        <Text variant="caption" color={c.muted} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <StepStatus item={item} />
    </PressableScale>
  );
}

const useStyles = makeStyles(({ c }) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14, minHeight: 64 },
  current: { backgroundColor: c.electricSoft },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  currentDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.electric },
}));
