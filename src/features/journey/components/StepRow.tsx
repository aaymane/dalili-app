import { router } from 'expo-router';
import { Check, GripVertical } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';

import { celebrate } from '@/components/feedback/Confetti';
import { PressableScale } from '@/components/ui/PressableScale';
import { StatusPill, Tag } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import { daysFromToday, formatDayMonth } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { motion, palette, radius, shadow } from '@/theme/tokens';
import { pop } from '@/theme/motion';

import { useJourneyStore, type JourneyItem } from '../store';

/** Ligne d'étape du Parcours-quête (officielle ou perso), avec validation animée. */
export function StepRow({ item }: { item: JourneyItem }) {
  const toggle = useJourneyStore((s) => s.toggle);
  const toggleCustom = useJourneyStore((s) => s.toggleCustom);
  const done = item.done;
  const isCurrent = item.current;

  const box = useAnimatedStyle(() => ({
    borderColor: withTiming(isCurrent ? palette.electric : '#EEF0F6', { duration: 200 }),
    opacity: withTiming(done || isCurrent ? 1 : 0.92, { duration: 200 }),
  }));
  const check = useAnimatedStyle(() => ({
    backgroundColor: withTiming(done ? palette.success : isCurrent ? palette.electricSoft : '#EEF1F7', { duration: 220 }),
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
  const tags = item.kind === 'official' ? item.step.tags : ['MA TÂCHE'];
  const sub = item.kind === 'official' ? item.step.window : formatDayMonth(item.date);
  const days = daysFromToday(item.date);

  return (
    <PressableScale
      scaleTo={0.985}
      onPress={() => (item.kind === 'official' ? router.push({ pathname: '/(app)/etape/[id]', params: { id: item.step.id } }) : onCheck())}
      style={{ marginBottom: 10 }}>
      <Animated.View style={[styles.row, box, isCurrent && styles.current]}>
        <PressableScale onPress={onCheck} haptic={false} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={`Marquer « ${title} » comme fait`}>
          <Animated.View style={[styles.check, check]}>
            {done ? (
              <Animated.View entering={pop()}>
                <Check size={15} color="#fff" strokeWidth={3.4} />
              </Animated.View>
            ) : isCurrent ? (
              <View style={styles.currentDot} />
            ) : null}
          </Animated.View>
        </PressableScale>
        <View style={{ flex: 1, gap: 5 }}>
          <Text variant="smallStrong" numberOfLines={2} color={done ? palette.navy : isCurrent ? palette.navy : palette.subtle}>
            {title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Tag label={tags.join(' · ')} />
            <Text variant="caption" color={palette.muted}>
              {sub}
            </Text>
          </View>
        </View>
        {done ? (
          <StatusPill status="done" />
        ) : isCurrent ? (
          <StatusPill status="current" />
        ) : days >= 0 && days <= 7 ? (
          <StatusPill status="soon" label={`Dans ${days} j`} />
        ) : (
          <StatusPill status="todo" />
        )}
        {item.kind === 'custom' && <GripVertical size={14} color="#C5CAD9" />}
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingRight: 10, borderRadius: radius.lg, backgroundColor: '#fff', borderWidth: 1.5, ...shadow.sm },
  current: { ...shadow.md, shadowColor: palette.electric, shadowOpacity: 0.16 },
  check: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  currentDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: palette.electric, borderWidth: 3, borderColor: '#BFD0FF' },
});
