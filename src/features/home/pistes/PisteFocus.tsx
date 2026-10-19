import { router } from 'expo-router';
import { ArrowRight, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, ReduceMotion, useAnimatedStyle, useDerivedValue, withSpring, type DerivedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import type { JourneyItem } from '@/features/journey/store';
import { haptics } from '@/lib/haptics';
import { formatDayMonth, relativeDays } from '@/lib/date';
import { fonts, gradients, motion, palette, radius, shadow } from '@/theme/tokens';

import { AiCta } from '../AiCta';
import { enter, itemTitle, openItem, useHomeData } from './shared';

const CARD = 72;
const GAP = 10;
const PEEK = 10;

function DeckCard({ item, i, open }: { item: JourneyItem; i: number; open: DerivedValue<number> }) {
  // Pile = profondeur (DIRECTION.md §5) : -5 % d'échelle et 10 px de décalage par niveau.
  // Pas de rotateX ici : sur iOS, la 3D réordonne les calques et casse l'empilement.
  const s = useAnimatedStyle(() => ({
    opacity: interpolate(open.value, [0, 1], [1 - i * 0.22, 1]),
    transform: [
      { translateY: interpolate(open.value, [0, 1], [i * PEEK, i * (CARD + GAP)]) },
      { scale: interpolate(open.value, [0, 1], [1 - i * 0.05, 1]) },
    ],
  }));
  return (
    <Animated.View style={[styles.card, { zIndex: 10 - i }, s]}>
      <PressableScale onPress={() => openItem(item)} scaleTo={0.98} style={styles.cardInner}>
        <View style={{ flex: 1 }}>
          <Text variant="smallStrong" numberOfLines={1}>
            {itemTitle(item)}
          </Text>
          <Text variant="caption" color={palette.muted}>
            {formatDayMonth(item.date)} · {relativeDays(item.date)}
          </Text>
        </View>
        <ArrowRight size={16} color={palette.subtle} />
      </PressableScale>
    </Animated.View>
  );
}

/** Piste C · Une seule chose — l'étape du jour en grand, le reste empilé derrière. */
export function PisteFocus() {
  const { j, hello, guides, next } = useHomeData();
  const insets = useSafeAreaInsets();
  const current = j.current;
  const [isOpen, setOpen] = useState(false);
  const open = useDerivedValue<number>(() => withSpring(isOpen ? 1 : 0, { ...motion.springSoft, reduceMotion: ReduceMotion.System }));
  // Hauteurs calculées hors worklet : `next` contient des Date, non copiables vers le thread UI.
  const closedH = CARD + PEEK * Math.max(0, next.length - 1);
  const openH = next.length * CARD + Math.max(0, next.length - 1) * GAP;
  const deckH = useAnimatedStyle(() => ({ height: interpolate(open.value, [0, 1], [closedH, openH]) }));

  return (
    <Screen top={[gradients.night[0], gradients.night[0]]} tabBar padded={false}>
      <View style={[styles.hero, { marginTop: -insets.top, paddingTop: insets.top }]}>
        <LinearGradient colors={gradients.night} style={StyleSheet.absoluteFill} />
        <AppHeader />
        <View style={{ paddingHorizontal: 20, gap: 16, paddingBottom: 26 }}>
          <Animated.View entering={enter(0)} style={styles.segments} accessibilityLabel={`${j.doneCount} étapes faites sur ${j.total}`}>
            {j.all
              .filter((i) => i.kind === 'official')
              .map((it, i) => (
                <View key={i} style={[styles.seg, it.done && { backgroundColor: '#fff' }, it.current && { backgroundColor: palette.electricLight }]} />
              ))}
          </Animated.View>

          <Animated.View entering={enter(1)} style={{ gap: 10 }}>
            <Text variant="body" color="rgba(255,255,255,0.65)">
              Aujourd’hui{hello}, une seule chose :
            </Text>
            <Text style={styles.statement} color="#fff">
              {current ? current.step.title : 'Tout est prêt. Profite de ton arrivée !'}
            </Text>
            {current ? (
              <Text variant="body" color="rgba(255,255,255,0.7)">
                {current.step.oneLiner}
              </Text>
            ) : null}
          </Animated.View>

          {current ? (
            <Animated.View entering={enter(2)} style={{ gap: 14 }}>
              <Button label={current.step.action.label} variant="white" onPress={() => openItem(current)} icon={<ArrowRight size={18} color={palette.navy} />} />
              <PressableScale onPress={() => router.navigate('/(app)/(tabs)/explorer')} style={styles.help} scaleTo={0.98}>
                <View style={{ flexDirection: 'row' }}>
                  {guides.slice(0, 3).map((m, i) => (
                    <View key={m.id} style={{ marginLeft: i ? -8 : 0 }}>
                      <Avatar name={`${m.firstName} ${m.lastName}`} color={m.avatarColor} size={30} ring={gradients.night[1]} />
                    </View>
                  ))}
                </View>
                <Text variant="small" color="rgba(255,255,255,0.8)" style={{ flex: 1 }}>
                  {guides[0] ? `${guides[0].firstName} connaît cette étape. Appel gratuit.` : 'Un mentor peut t’appeler.'}
                </Text>
              </PressableScale>
            </Animated.View>
          ) : null}
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, gap: 22, marginTop: 22 }}>
        {next.length ? (
          <Animated.View entering={enter(3)} style={{ gap: 10 }}>
            <PressableScale
              haptic={false}
              onPress={() => {
                haptics.select();
                setOpen((o) => !o);
              }}
              style={styles.deckHead}
              accessibilityLabel={isOpen ? 'Replier les prochaines étapes' : 'Déplier les prochaines étapes'}>
              <Text variant="h3" style={{ flex: 1 }}>
                Plus tard
              </Text>
              <Text variant="smallStrong" color={palette.electric}>
                {isOpen ? 'Replier' : `${next.length} étapes`}
              </Text>
              <ChevronDown size={16} color={palette.electric} style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
            </PressableScale>
            <Animated.View style={deckH}>
              {/* Rendu de l'arrière vers l'avant : la première étape reste au-dessus. */}
              {next
                .map((it, i) => <DeckCard key={i} item={it} i={i} open={open} />)
                .reverse()}
            </Animated.View>
          </Animated.View>
        ) : null}
        <AiCta />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden', borderBottomLeftRadius: radius.xxl, borderBottomRightRadius: radius.xxl },
  segments: { flexDirection: 'row', gap: 3 },
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.16)' },
  statement: { fontFamily: fonts.displayBlack, fontSize: 32, lineHeight: 37, letterSpacing: -0.8 },
  help: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  deckHead: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  card: { position: 'absolute', left: 0, right: 0, top: 0, height: CARD, borderRadius: radius.lg, backgroundColor: palette.surface, ...shadow.sm },
  cardInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
});
