import { Heart, Quote, Star } from 'lucide-react-native';
import { useWindowDimensions, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { Avatar } from '@/components/ui/Avatar';
import { IconTile } from '@/components/ui/IconTile';
import { Text } from '@/components/ui/Text';
import type { Mentor } from '@/data/types';
import { useT } from '@/i18n';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

type Review = Mentor['reviews'][number];

const GAP = 12;
/** Écart avec le bord de l'écran (le même que le reste de l'accueil). */
const EDGE = 20;
/** La carte suivante dépasse un peu : on comprend qu'on peut glisser. */
const PEEK = 34;

/** Une carte : elle avance au centre (pleine, à sa taille) et recule sur les côtés. Suit le doigt, image par image. */
function ThanksCard({ r, i, x, step, width }: { r: Review; i: number; x: SharedValue<number>; step: number; width: number }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const style = useAnimatedStyle(() => {
    const d = (x.get() - i * step) / step;
    return {
      opacity: interpolate(d, [-1, 0, 1], [0.5, 1, 0.5], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(d, [-1, 0, 1], [0.94, 1, 0.94], Extrapolation.CLAMP) }, { translateY: interpolate(Math.abs(d), [0, 1], [0, 8], Extrapolation.CLAMP) }],
    };
  });
  return (
    <Animated.View style={[styles.card, { width }, style]} accessible accessibilityLabel={t('mentorHome.thanks.a11y', { name: r.author, rating: r.rating, text: r.text })}>
      <Quote size={22} color={c.mentor} fill={c.mentorSoft} />
      <Text variant={r.text.length <= 110 ? 'h3' : 'body'} numberOfLines={5} style={[{ flexGrow: 1 }, r.text.length <= 110 && styles.quote]}>
        {r.text}
      </Text>
      <View style={styles.author}>
        <Avatar name={r.author} size={36} color={c.mentor} uri={r.avatarUrl} cacheKey={r.avatarPath} />
        <Text variant="smallStrong" style={{ flex: 1 }} numberOfLines={1}>
          {r.author}
        </Text>
        <View style={{ flexDirection: 'row', gap: 1 }}>
          {Array.from({ length: 5 }, (_, k) => (
            <Star key={k} size={12} color={c.warning} fill={k < r.rating ? c.warning : 'transparent'} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

/** Les points sous le carrousel : celui de la carte au centre s'allume et grossit un peu (opacité et échelle seulement). */
function Dot({ i, x, step }: { i: number; x: SharedValue<number>; step: number }) {
  const { c } = useTheme();
  const style = useAnimatedStyle(() => {
    const near = interpolate(Math.abs(x.get() / step - i), [0, 1], [1, 0], Extrapolation.CLAMP);
    return { opacity: 0.3 + near * 0.7, transform: [{ scale: 1 + near * 0.4 }] };
  });
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.mentor }, style]} />;
}

/**
 * « Ils te disent merci » : les mots des étudiants après l'appel, avec leur visage. C'est ce qui donne envie de
 * revenir. Un seul avis : une carte. Aucun : la promesse du premier.
 */
export function ThanksCarousel({ reviews }: { reviews: Review[] }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const { width: screen } = useWindowDimensions();
  const x = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    x.set(e.contentOffset.x);
  });

  if (!reviews.length)
    return (
      <View style={[styles.card, styles.empty]}>
        <IconTile icon={Heart} tone="green" size={44} radius={14} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong">{t('mentorHome.thanks.emptyTitle')}</Text>
          <Text variant="small" color={c.subtle}>
            {t('mentorHome.thanks.emptyText')}
          </Text>
        </View>
      </View>
    );

  const single = reviews.length === 1;
  const width = single ? screen - EDGE * 2 : screen - EDGE * 2 - PEEK;
  const step = width + GAP;

  return (
    <View style={{ gap: 12 }}>
      <Animated.ScrollView
        horizontal
        scrollEnabled={!single}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={step}
        snapToAlignment="start"
        disableIntervalMomentum
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ marginHorizontal: -EDGE }}
        contentContainerStyle={{ paddingHorizontal: EDGE, gap: GAP }}>
        {reviews.map((r, i) => (
          <ThanksCard key={r.id ?? `${r.author}-${i}`} r={r} i={i} x={x} step={step} width={width} />
        ))}
      </Animated.ScrollView>
      {single ? null : (
        <View style={styles.dots} importantForAccessibility="no-hide-descendants">
          {reviews.map((r, i) => (
            <Dot key={r.id ?? i} i={i} x={x} step={step} />
          ))}
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  card: { minHeight: 172, padding: 18, gap: 12, borderRadius: radius.xl, backgroundColor: c.surface, ...shadow.sm },
  empty: { minHeight: 0, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  /** Un mot court devient une citation : semi-gras, un peu plus grand que le texte, sans écraser la carte. */
  quote: { fontSize: 18, lineHeight: 26, letterSpacing: -0.2 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
}));
