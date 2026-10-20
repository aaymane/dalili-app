import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, Bookmark, ChevronLeft, Clock, ThumbsDown, ThumbsUp, WifiOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toast } from '@/components/feedback/Toast';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { readMinutes } from '@/data/content';
import { useGuide } from '@/data/hooks';
import { useLocalDb } from '@/data/local-db';
import { categories, categoryOf } from '@/features/guides/categories';
import { FaqList, GuideBlockView, KeyFactsCard, SourcesCard } from '@/features/guides/components/GuideParts';
import { useSteps } from '@/features/journey/steps';
import { formatFullDate } from '@/lib/date';
import { palette, radius, shadow } from '@/theme/tokens';

/** Lecteur de guide : le guide du site, rendu en natif, avec sa source et sa date de mise à jour. */
export default function GuideReader() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: g, isLoading, isFallback } = useGuide(id);
  const steps = useSteps();
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

  if (!g) {
    return (
      <Screen>
        <View style={styles.empty}>
          <Text variant="h2" align="center">
            {isLoading ? 'Ouverture du guide…' : 'Guide introuvable'}
          </Text>
          {!isLoading ? (
            <Text variant="body" color={palette.subtle} align="center">
              Il a peut-être été renommé. Retrouve tous les guides dans l’onglet Explorer.
            </Text>
          ) : null}
        </View>
      </Screen>
    );
  }

  const c = categories[categoryOf(g.category)];
  const step = steps.find((s) => s.guides.includes(g.slug));

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const max = Math.max(1, contentSize.height - layoutMeasurement.height);
    p.set(withTiming(Math.min(1, contentOffset.y / max), { duration: 80 }));
    if (contentOffset.y / max > 0.92) markRead(g.slug);
  };

  return (
    <Screen
      top={[c.soft, palette.bg]}
      padded={false}
      scrollProps={{ onScroll, scrollEventThrottle: 16 }}
      header={
        <View>
          <View style={styles.header}>
            <PressableScale onPress={() => router.back()} style={styles.round} accessibilityLabel="Retour">
              <ChevronLeft size={20} color={palette.navy} />
            </PressableScale>
            <PressableScale
              onPress={() => {
                toggleSaved(g.slug);
                toast(saved ? 'Retiré de tes guides' : 'Guide enregistré');
              }}
              style={styles.round}
              accessibilityLabel={saved ? 'Retirer des guides enregistrés' : 'Enregistrer le guide'}>
              <Bookmark size={18} color={saved ? palette.electric : palette.navy} fill={saved ? palette.electric : 'transparent'} />
            </PressableScale>
          </View>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, { backgroundColor: c.color }, bar]} />
          </View>
        </View>
      }>
      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <Animated.View entering={FadeInDown.springify()} style={{ gap: 8 }}>
          <Text variant="overline" color={c.color}>
            {c.label}
          </Text>
          <Text variant="h1">{g.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Clock size={13} color={palette.muted} />
            <Text variant="caption" color={palette.muted}>
              {readMinutes(g.readTime)} min · mis à jour le {formatFullDate(g.updatedDate)}
            </Text>
          </View>
        </Animated.View>
        {isFallback ? (
          <View style={styles.offline}>
            <WifiOff size={16} color={palette.subtle} />
            <Text variant="caption" color={palette.subtle} style={{ flex: 1 }}>
              Tu lis la version enregistrée dans l’app. On la met à jour dès que dalili.study répond.
            </Text>
          </View>
        ) : null}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.summary}>
          <Text variant="body">{g.summary}</Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(120).springify()}>
          <KeyFactsCard guide={g} />
        </Animated.View>
        {g.blocks.map((b, i) => (
          <GuideBlockView key={i} b={b} />
        ))}
        <FaqList faq={g.faq} />
        <SourcesCard guide={g} />
        <Text variant="caption" color={palette.muted}>
          Ce guide donne des informations générales. Ce n’est pas un conseil juridique : pour un cas particulier, parle à un mentor ou au service concerné.
        </Text>
        {step ? (
          <Button
            label={`Aller à l’étape : ${step.title}`}
            icon={<ArrowRight size={18} color="#fff" />}
            onPress={() => router.push({ pathname: '/(app)/etape/[id]', params: { id: step.id } })}
          />
        ) : null}
        <View style={styles.feedback}>
          <Text variant="bodyStrong">Ce guide t’a aidé ?</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PressableScale
              haptic="select"
              accessibilityLabel="Oui, il m’a aidé"
              onPress={() => {
                setFeedback(true);
                toast('Merci 💙');
              }}
              style={[styles.thumb, feedback === true && { backgroundColor: palette.successSoft, borderColor: palette.success }]}>
              <ThumbsUp size={18} color={feedback === true ? palette.success : palette.subtle} />
            </PressableScale>
            <PressableScale
              haptic="select"
              accessibilityLabel="Non, il ne m’a pas aidé"
              onPress={() => {
                setFeedback(false);
                toast('On va l’améliorer, promis.', 'info');
              }}
              style={[styles.thumb, feedback === false && { backgroundColor: palette.dangerSoft, borderColor: palette.danger }]}>
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
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  track: { height: 3, backgroundColor: 'rgba(31,40,80,0.08)', marginHorizontal: 20, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2 },
  body: { paddingHorizontal: 22, gap: 16, paddingTop: 10, maxWidth: 680, width: '100%', alignSelf: 'center' },
  summary: { padding: 16, borderRadius: radius.lg, backgroundColor: palette.electricSoft },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: palette.surface },
  empty: { flex: 1, paddingTop: 120, gap: 10, paddingHorizontal: 24 },
  feedback: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: radius.xl, backgroundColor: palette.surface, ...shadow.sm },
  thumb: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' },
});
