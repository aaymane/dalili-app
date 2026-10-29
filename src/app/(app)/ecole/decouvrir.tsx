import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { RotateCcw, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { CountUp, KenBurns } from '@/features/schools/components/Motion';
import { useSchool } from '@/features/schools/hooks';
import { slidesOf, useStoryCta } from '@/features/schools/story';
import { haptics } from '@/lib/haptics';
import { pop, rise } from '@/theme/motion';
import { palette, radius } from '@/theme/tokens';

/** Durée d'une page. */
const PAGE_MS = 5200;

function Segment({ i, index, progress }: { i: number; index: number; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ width: `${(i < index ? 1 : i > index ? 0 : progress.value) * 100}%` }));
  return (
    <View style={styles.segment}>
      <Animated.View style={[styles.segmentFill, style]} />
    </View>
  );
}

/**
 * « Découvrir en 30 secondes » : la présentation d'une école en pages plein écran, comme des stories.
 * Photos en lent zoom, chiffres qui comptent, barres de progression ; toucher à droite = suivante,
 * à gauche = précédente, appuyer longtemps = pause.
 */
export default function Discover() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const { data: school } = useSchool(slug);
  const requestCta = useStoryCta((s) => s.request);
  const slides = school ? slidesOf(school) : [];
  const [index, setIndex] = useState(0);
  const progress = useSharedValue(0);
  const last = index === slides.length - 1;

  const go = (to: number) => {
    if (to < 0 || to >= slides.length) return;
    haptics.select();
    setIndex(to);
  };

  // Chaque page remplit sa barre, puis passe à la suivante. La dernière attend : c'est elle qui propose d'agir.
  const run = (from: number) => {
    progress.set(
      withTiming(1, { duration: PAGE_MS * (1 - from), easing: Easing.linear }, (done) => {
        if (done) scheduleOnRN(advance);
      }),
    );
  };
  const advance = () => setIndex((i) => (i < slides.length - 1 ? i + 1 : i));

  useEffect(() => {
    if (!slides.length) return;
    progress.set(0);
    if (index === slides.length - 1) {
      haptics.success();
      progress.set(withTiming(1, { duration: 600 }));
      return;
    }
    run(0);
    return () => cancelAnimation(progress);
    // `run` relit la barre à chaque page ; pas besoin de la suivre comme dépendance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, slides.length]);

  if (!school || !slides.length) return <View style={styles.root} />;
  const slide = slides[index];

  const pause = () => cancelAnimation(progress);
  const resume = () => {
    if (!last) run(progress.value);
  };

  const interested = () => {
    requestCta(school.slug);
    router.back();
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {/* Photo de la page, en fondu enchaîné. */}
      <Animated.View key={`photo-${index}`} entering={FadeIn.duration(650)} exiting={FadeOut.duration(450)} style={StyleSheet.absoluteFill}>
        {slide.photo ? (
          <KenBurns uri={slide.photo} duration={PAGE_MS + 1500} drift={index % 2 ? 1 : -1} />
        ) : (
          <LinearGradient colors={['#1B2470', '#014DF8', '#0B1233']} style={StyleSheet.absoluteFill} />
        )}
      </Animated.View>
      <LinearGradient colors={['rgba(11,18,51,0.75)', 'rgba(11,18,51,0)']} style={[styles.shade, { top: 0, height: insets.top + 140 }]} pointerEvents="none" />
      <LinearGradient colors={['rgba(11,18,51,0)', 'rgba(11,18,51,0.92)']} style={[styles.shade, { bottom: 0, height: '62%' }]} pointerEvents="none" />

      {/* Surface de navigation (pas un bouton) : gauche = précédente, droite = suivante, appui long = pause. */}
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <Pressable style={{ flex: 3 }} onPress={() => go(index - 1)} onLongPress={pause} onPressOut={resume} delayLongPress={180} accessibilityLabel="Page précédente" />
          <Pressable style={{ flex: 7 }} onPress={() => go(index + 1)} onLongPress={pause} onPressOut={resume} delayLongPress={180} accessibilityLabel="Page suivante" />
        </View>
      </View>

      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.bars}>
          {slides.map((_, i) => (
            <Segment key={i} i={i} index={index} progress={progress} />
          ))}
        </View>
        <View style={styles.head}>
          <View style={styles.brand}>
            {school.logoUrl ? (
              <Image source={{ uri: school.logoUrl }} style={styles.logo} contentFit="contain" />
            ) : (
              <Text variant="smallStrong" color={palette.white}>
                {school.name}
              </Text>
            )}
          </View>
          <PressableScale onPress={() => router.back()} style={styles.close} accessibilityLabel="Fermer la présentation">
            <X size={20} color={palette.white} />
          </PressableScale>
        </View>
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom + 24 }]} pointerEvents="box-none">
        <View key={`text-${index}`} style={{ gap: 10 }} pointerEvents="box-none">
          <Animated.View entering={rise(120)}>
            <Text variant="overline" color="rgba(255,255,255,0.75)">
              {slide.kicker}
            </Text>
          </Animated.View>
          {slide.big ? (
            <Animated.View entering={pop(180)}>
              <CountUp value={slide.big} variant="hero" color={palette.white} style={styles.big} delay={200} />
            </Animated.View>
          ) : null}
          {slide.title ? (
            <Animated.View entering={rise(200)}>
              <Text variant="hero" color={palette.white}>
                {slide.title}
              </Text>
            </Animated.View>
          ) : null}
          {slide.text ? (
            <Animated.View entering={rise(300)}>
              <Text variant="body" color="rgba(255,255,255,0.88)">
                {slide.text}
              </Text>
            </Animated.View>
          ) : null}
          {slide.chips ? (
            <View style={styles.chips} pointerEvents="none">
              {slide.chips.map((c, k) => (
                <Animated.View key={c} entering={rise(300 + k * 70)} style={styles.chip}>
                  <Text variant="smallStrong" color={palette.white}>
                    {c}
                  </Text>
                </Animated.View>
              ))}
            </View>
          ) : null}
          {slide.cta ? (
            <Animated.View entering={rise(420)} style={{ gap: 10, marginTop: 8 }}>
              <Button label="Je suis intéressé·e" variant="white" onPress={interested} />
              <PressableScale onPress={() => go(0)} hitSlop={6} style={styles.replay} accessibilityLabel="Revoir la présentation">
                <RotateCcw size={14} color="rgba(255,255,255,0.8)" />
                <Text variant="smallStrong" color="rgba(255,255,255,0.8)">
                  Revoir
                </Text>
              </PressableScale>
            </Animated.View>
          ) : null}
        </View>
        {school.photoCredit ? (
          <Text variant="caption" color="rgba(255,255,255,0.45)" style={{ marginTop: 18 }}>
            {school.photoCredit}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.navyDeep },
  shade: { position: 'absolute', left: 0, right: 0 },
  top: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: 12, gap: 12 },
  bars: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  segmentFill: { height: 3, borderRadius: 2, backgroundColor: palette.white },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  brand: { height: 32, justifyContent: 'center' },
  logo: { width: 96, height: 32 },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  content: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 24 },
  big: { fontSize: 72, lineHeight: 78, letterSpacing: -2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  replay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 },
});
