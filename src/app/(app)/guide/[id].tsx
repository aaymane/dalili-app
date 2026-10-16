import { router, useLocalSearchParams } from 'expo-router';
import { AlertTriangle, ArrowRight, Bookmark, ChevronLeft, Clock, Lightbulb, ThumbsDown, ThumbsUp } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toast } from '@/components/feedback/Toast';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useLocalDb } from '@/data/local-db';
import { RichText } from '@/features/guides/components/RichText';
import { categories, guideById, type Block } from '@/features/guides/guides';
import { stepById } from '@/features/journey/steps';
import { palette, radius, shadow } from '@/theme/tokens';

function BlockView({ b }: { b: Block }) {
  switch (b.type) {
    case 'p':
      return <RichText text={b.text} />;
    case 'h':
      return (
        <Text variant="h2" style={{ marginTop: 8 }}>
          {b.text}
        </Text>
      );
    case 'list':
      return (
        <View style={{ gap: 8 }}>
          {b.items.map((it) => (
            <View key={it} style={{ flexDirection: 'row', gap: 10 }}>
              <View style={styles.bullet} />
              <View style={{ flex: 1 }}>
                <RichText text={it} />
              </View>
            </View>
          ))}
        </View>
      );
    case 'steps':
      return (
        <View style={{ gap: 10 }}>
          {b.items.map((s, i) => (
            <View key={s.title} style={styles.stepCard}>
              <View style={styles.num}>
                <Text variant="h3" color="#fff">
                  {i + 1}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong">{s.title}</Text>
                <RichText text={s.text} variant="small" color={palette.subtle} />
              </View>
            </View>
          ))}
        </View>
      );
    case 'tip':
      return (
        <View style={[styles.callout, { backgroundColor: '#FFF8E6' }]}>
          <Lightbulb size={18} color="#D97706" />
          <View style={{ flex: 1 }}>
            <RichText text={b.text} />
          </View>
        </View>
      );
    case 'warning':
      return (
        <View style={[styles.callout, { backgroundColor: palette.dangerSoft }]}>
          <AlertTriangle size={18} color={palette.danger} />
          <View style={{ flex: 1 }}>
            <RichText text={b.text} />
          </View>
        </View>
      );
  }
}

/** Lecteur de guide : barre de progression de lecture, mots cliquables, lien vers l'étape. */
export default function GuideReader() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const g = guideById(id);
  const saved = useLocalDb((s) => s.savedGuides.includes(id));
  const toggleSaved = useLocalDb((s) => s.toggleSavedGuide);
  const markRead = useLocalDb((s) => s.markGuideRead);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const p = useSharedValue(0);
  const bar = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  useEffect(() => {
    const t = setTimeout(() => id && markRead(id), 8000);
    return () => clearTimeout(t);
  }, [id, markRead]);
  if (!g) return null;
  const c = categories[g.category];
  const step = g.stepId ? stepById(g.stepId) : null;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const max = Math.max(1, contentSize.height - layoutMeasurement.height);
    p.value = withTiming(Math.min(1, contentOffset.y / max), { duration: 80 });
    if (contentOffset.y / max > 0.92) markRead(g.id);
  };

  return (
    <Screen
      top={[c.soft, '#F5F7FD']}
      padded={false}
      scrollProps={{ onScroll, scrollEventThrottle: 16 }}
      header={
        <View>
          <View style={styles.header}>
            <PressableScale onPress={() => router.back()} style={styles.round} accessibilityLabel="Retour">
              <ChevronLeft size={20} color={palette.navy} />
            </PressableScale>
            <PressableScale onPress={() => { toggleSaved(g.id); toast(saved ? 'Retiré de tes guides' : 'Guide enregistré'); }} style={styles.round} accessibilityLabel="Enregistrer">
              <Bookmark size={18} color={saved ? palette.electric : palette.navy} fill={saved ? palette.electric : 'transparent'} />
            </PressableScale>
          </View>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, { backgroundColor: c.color }, bar]} />
          </View>
        </View>
      }>
      <View style={{ paddingHorizontal: 22, gap: 16, paddingTop: 10, paddingBottom: insets.bottom, maxWidth: 680, width: '100%', alignSelf: 'center' }}>
        <Animated.View entering={FadeInDown.springify()} style={{ gap: 8 }}>
          <Text style={{ fontSize: 44, lineHeight: 56 }}>{g.emoji}</Text>
          <Text variant="overline" color={c.color}>
            {c.label}
          </Text>
          <Text variant="hero">{g.title}</Text>
          <Text variant="body" color={palette.subtle}>
            {g.subtitle}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Clock size={13} color={palette.muted} />
            <Text variant="caption" color={palette.muted}>
              {g.minutes} min de lecture · mis à jour {g.updated}
            </Text>
          </View>
        </Animated.View>
        {g.blocks.map((b, i) => (
          <Animated.View key={i} entering={FadeInDown.delay(80 + i * 40).springify()}>
            <BlockView b={b} />
          </Animated.View>
        ))}
        <Text variant="caption" color={palette.muted}>
          Les mots soulignés sont cliquables : touche-les pour une définition simple.
        </Text>
        {step ? (
          <Button label={`Aller à l’étape : ${step.title}`} icon={<ArrowRight size={18} color="#fff" />} onPress={() => router.push({ pathname: '/(app)/etape/[id]', params: { id: step.id } })} />
        ) : null}
        <View style={styles.feedback}>
          <Text variant="bodyStrong">Ce guide t’a aidé ?</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PressableScale haptic="select" onPress={() => { setFeedback(true); toast('Merci 💙'); }} style={[styles.thumb, feedback === true && { backgroundColor: palette.successSoft, borderColor: palette.success }]}>
              <ThumbsUp size={18} color={feedback === true ? palette.success : palette.subtle} />
            </PressableScale>
            <PressableScale haptic="select" onPress={() => { setFeedback(false); toast('On va l’améliorer, promis.', 'info'); }} style={[styles.thumb, feedback === false && { backgroundColor: palette.dangerSoft, borderColor: palette.danger }]}>
              <ThumbsDown size={18} color={feedback === false ? palette.danger : palette.subtle} />
            </PressableScale>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8 },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  track: { height: 3, backgroundColor: 'rgba(31,40,80,0.08)', marginHorizontal: 20, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2 },
  bullet: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.electric, marginTop: 8 },
  stepCard: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: '#fff', ...shadow.sm },
  num: { width: 32, height: 32, borderRadius: 10, backgroundColor: palette.electric, alignItems: 'center', justifyContent: 'center' },
  callout: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: radius.lg },
  feedback: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: radius.xl, backgroundColor: '#fff', ...shadow.sm },
  thumb: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' },
});
