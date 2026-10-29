import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { BookOpen } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, { Extrapolation, FadeIn, interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { useScrollY } from '@/components/motion/scroll';

import { StarField } from '@/components/brand/StarField';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { Ame, type AmeState } from '@/features/ame/Ame';
import { useJourney } from '@/features/journey/store';
import { useT } from '@/i18n';
import { makeStyles, useTheme } from '@/theme/scheme';
import { depth, radius } from '@/theme/tokens';

import { useBrief } from './brief';

const WORD_DELAY = 45;
const MAX_DELAY = 1200;
// Mot par mot au premier affichage de la session seulement : ensuite, la phrase est là d'emblée.
let revealedOnce = false;

function Words({ text, animate }: { text: string; animate: boolean }) {
  const styles = useStyles();
  const words = text.split(' ');
  if (!animate) {
    return (
      <Text variant="h2" color="#fff">
        {text}
      </Text>
    );
  }
  return (
    <View style={styles.words} accessible accessibilityLabel={text}>
      {words.map((w, i) => (
        <Animated.View key={`${i}-${w}`} entering={FadeIn.delay(Math.min(i * WORD_DELAY, MAX_DELAY)).duration(260)}>
          <Text variant="h2" color="#fff">
            {w}{' '}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
}

/** Haut de l'accueil : l'Âme, le salut, la phrase du jour et sa source. */
export function BriefHero() {
  const { gradients } = useTheme();
  const styles = useStyles();
  const brief = useBrief();
  const t = useT();
  const j = useJourney();
  const [animate] = useState(() => !revealedOnce);
  const [state, setState] = useState<AmeState>('rest');
  const seenDone = useRef(j.doneCount);
  // Petits écrans (iPhone SE) : l'Âme rétrécit pour que l'action du jour reste visible sans défiler.
  const { height } = useWindowDimensions();
  const ameSize = height < 740 ? 104 : 150;
  // Parallaxe : au défilement, l'Âme recule un peu moins vite que sa carte (12 px max) et s'efface ;
  // en tirant vers le bas, elle grossit légèrement, comme si on s'en approchait.
  const scrollY = useScrollY();
  const ameDepth = useAnimatedStyle(() => {
    const y = scrollY?.get() ?? 0;
    return {
      opacity: interpolate(y, [0, 220], [1, 0.35], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(y, [0, 220], [0, depth.parallax], Extrapolation.CLAMP) },
        { scale: interpolate(y, [-120, 0, 220], [1.12, 1, 0.92], Extrapolation.CLAMP) },
      ],
    };
  });

  useEffect(() => {
    revealedOnce = true;
  }, []);

  // Une étape vient d'être cochée : l'Âme se reverrouille avec un éclat.
  useEffect(() => {
    if (j.doneCount > seenDone.current) {
      setState('success');
      const t = setTimeout(() => setState('rest'), 1600);
      seenDone.current = j.doneCount;
      return () => clearTimeout(t);
    }
    seenDone.current = j.doneCount;
  }, [j.doneCount]);

  return (
    <LinearGradient colors={gradients.night} style={styles.card}>
      <StarField variant="card" origin={{ x: 0.5, y: 0.25 }} />
      <Animated.View style={[styles.ame, ameDepth]}>
        <Ame size={ameSize} state={state} surface="dark" />
      </Animated.View>
      <View style={{ gap: 8 }}>
        <Text variant="overline" color="rgba(255,255,255,0.6)">
          {brief.hello} {brief.lead}
        </Text>
        <Words text={brief.sentence} animate={animate} />
      </View>
      {brief.source ? (
        <PressableScale
          onPress={() => router.push({ pathname: '/(app)/guide/[id]', params: { id: brief.source!.slug } })}
          style={styles.source}
          accessibilityRole="link"
          accessibilityLabel={t('home.fromGuideA11y', { title: brief.source.title })}>
          <BookOpen size={14} color="#9DB6FF" />
          <Text variant="caption" color="rgba(255,255,255,0.75)" style={{ flex: 1 }} numberOfLines={1}>
            {t('home.fromGuide', { title: brief.source.title })}
          </Text>
        </PressableScale>
      ) : null}
    </LinearGradient>
  );
}

/**
 * Le brief quand le billet trône en haut de l'accueil : la même phrase, sans carte nuit,
 * pour que le billet reste le seul héros et que l'action du jour reste visible sans défiler.
 */
export function BriefLine() {
  const { c } = useTheme();
  const styles = useStyles();
  const brief = useBrief();
  const t = useT();
  return (
    <View style={{ gap: 6 }}>
      <Text variant="smallStrong" color={c.subtle}>
        {brief.hello} {brief.lead}
      </Text>
      <Text variant="h2">{brief.sentence}</Text>
      {brief.source ? (
        <PressableScale
          onPress={() => router.push({ pathname: '/(app)/guide/[id]', params: { id: brief.source!.slug } })}
          style={styles.sourceLight}
          accessibilityRole="link"
          accessibilityLabel={t('home.fromGuideA11y', { title: brief.source.title })}>
          <BookOpen size={14} color={c.electric} />
          <Text variant="caption" color={c.electric} style={{ flexShrink: 1 }} numberOfLines={1}>
            {t('home.fromGuide', { title: brief.source.title })}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ shadow }) => ({
  card: { borderRadius: radius.xxl, padding: 20, paddingTop: 8, gap: 14, overflow: 'hidden', ...shadow.md },
  ame: { alignItems: 'center', marginBottom: -6 },
  words: { flexDirection: 'row', flexWrap: 'wrap' },
  source: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36, alignSelf: 'stretch', paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  sourceLight: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, alignSelf: 'flex-start' },
}));
