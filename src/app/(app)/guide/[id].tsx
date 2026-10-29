import { router, useLocalSearchParams } from 'expo-router';
import { Bookmark, Clock, Languages, ThumbsDown, ThumbsUp, WifiOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toast } from '@/components/feedback/Toast';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { ArrowRight, ChevronLeft } from '@/components/ui/DirIcons';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { readMinutes } from '@/data/content';
import { useGuide } from '@/data/hooks';
import { useLocalDb } from '@/data/local-db';
import { categories, categoryLabel, categoryOf, softOf } from '@/features/guides/categories';
import { FaqList, GuideBlockView, KeyFactsCard, SourcesCard } from '@/features/guides/components/GuideParts';
import { useSteps } from '@/features/journey/steps';
import { useCurrentLanguage, useT } from '@/i18n';
import { formatFullDate } from '@/lib/date';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';
import { rise } from '@/theme/motion';
import { track } from '@/lib/analytics';

/** Lecteur de guide : le guide du site, rendu en natif, avec sa source et sa date de mise à jour. */
export default function GuideReader() {
  const { c: colors, scheme } = useTheme();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: g, isLoading, isFallback } = useGuide(id);
  const steps = useSteps();
  const saved = useLocalDb((s) => s.savedGuides.includes(id));
  const toggleSaved = useLocalDb((s) => s.toggleSavedGuide);
  const markRead = useLocalDb((s) => s.markGuideRead);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const t = useT();
  const language = useCurrentLanguage();
  const p = useSharedValue(0);
  const bar = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  useEffect(() => {
    if (id) track('guide_opened', { slug: id });
  }, [id]);
  useEffect(() => {
    const timer = setTimeout(() => id && markRead(id), 8000);
    return () => clearTimeout(timer);
  }, [id, markRead]);

  if (!g) {
    return (
      <Screen>
        <View style={styles.empty}>
          <Text variant="h2" align="center">
            {isLoading ? t('guide.opening') : t('guide.notFound')}
          </Text>
          {!isLoading ? (
            <Text variant="body" color={colors.subtle} align="center">
              {t('guide.notFoundText')}
            </Text>
          ) : null}
        </View>
      </Screen>
    );
  }

  const cat = categoryOf(g.category);
  const c = categories[cat];
  const step = steps.find((s) => s.guides.includes(g.slug));

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const max = Math.max(1, contentSize.height - layoutMeasurement.height);
    p.set(withTiming(Math.min(1, contentOffset.y / max), { duration: 80 }));
    if (contentOffset.y / max > 0.92) markRead(g.slug);
  };

  return (
    <Screen
      top={[softOf(c, scheme), colors.bg]}
      padded={false}
      scrollProps={{ onScroll, scrollEventThrottle: 16 }}
      header={
        <View>
          <View style={styles.header}>
            <PressableScale onPress={() => router.back()} style={styles.round} accessibilityLabel={t('common.back')}>
              <ChevronLeft size={20} color={colors.navy} />
            </PressableScale>
            <PressableScale
              onPress={() => {
                toggleSaved(g.slug);
                toast(saved ? t('guide.unsaved') : t('guide.saved'));
              }}
              style={styles.round}
              accessibilityLabel={saved ? t('guide.unsaveA11y') : t('guide.saveA11y')}>
              <Bookmark size={18} color={saved ? colors.electric : colors.navy} fill={saved ? colors.electric : 'transparent'} />
            </PressableScale>
          </View>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, { backgroundColor: c.color }, bar]} />
          </View>
        </View>
      }>
      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <Animated.View entering={rise()} style={{ gap: 8 }}>
          <Text variant="overline" color={c.color}>
            {categoryLabel(cat)}
          </Text>
          <Text variant="h1">{g.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Clock size={13} color={colors.muted} />
            <Text variant="caption" color={colors.muted}>
              {t('guide.meta', { n: readMinutes(g.readTime), date: formatFullDate(g.updatedDate) })}
            </Text>
          </View>
        </Animated.View>
        {language !== 'fr' ? (
          <View style={styles.offline}>
            <Languages size={16} color={colors.subtle} />
            <Text variant="caption" color={colors.subtle} style={{ flex: 1 }}>
              {t('guide.frenchOnly')}
            </Text>
          </View>
        ) : null}
        {isFallback ? (
          <View style={styles.offline}>
            <WifiOff size={16} color={colors.subtle} />
            <Text variant="caption" color={colors.subtle} style={{ flex: 1 }}>
              {t('guide.offline')}
            </Text>
          </View>
        ) : null}
        <Animated.View entering={rise(60)} style={styles.summary}>
          <Text variant="body">{g.summary}</Text>
        </Animated.View>
        <Animated.View entering={rise(120)}>
          <KeyFactsCard guide={g} />
        </Animated.View>
        {g.blocks.map((b, i) => (
          <GuideBlockView key={i} b={b} />
        ))}
        <FaqList faq={g.faq} />
        <SourcesCard guide={g} />
        <Text variant="caption" color={colors.muted}>
          {t('guide.disclaimer')}
        </Text>
        {step ? (
          <Button
            label={t('guide.goToStep', { title: step.title })}
            icon={<ArrowRight size={18} color="#fff" />}
            onPress={() => router.push({ pathname: '/(app)/etape/[id]', params: { id: step.id } })}
          />
        ) : null}
        <View style={styles.feedback}>
          <Text variant="bodyStrong">{t('guide.helpful')}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PressableScale
              haptic="select"
              accessibilityLabel={t('guide.yesA11y')}
              onPress={() => {
                setFeedback(true);
                toast(t('guide.thanks'));
              }}
              style={[styles.thumb, feedback === true && { backgroundColor: colors.successSoft, borderColor: colors.success }]}>
              <ThumbsUp size={18} color={feedback === true ? colors.success : colors.subtle} />
            </PressableScale>
            <PressableScale
              haptic="select"
              accessibilityLabel={t('guide.noA11y')}
              onPress={() => {
                setFeedback(false);
                toast(t('guide.improve'), 'info');
              }}
              style={[styles.thumb, feedback === false && { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
              <ThumbsDown size={18} color={feedback === false ? colors.danger : colors.subtle} />
            </PressableScale>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8 },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  track: { height: 3, backgroundColor: c.fill, marginHorizontal: 20, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2 },
  body: { paddingHorizontal: 22, gap: 16, paddingTop: 10, maxWidth: 680, width: '100%', alignSelf: 'center' },
  summary: { padding: 16, borderRadius: radius.lg, backgroundColor: c.electricSoft },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: c.surface },
  empty: { flex: 1, paddingTop: 120, gap: 10, paddingHorizontal: 24 },
  feedback: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: radius.xl, backgroundColor: c.surface, ...shadow.sm },
  thumb: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: c.line, alignItems: 'center', justifyContent: 'center' },
}));
