import { router } from 'expo-router';
import { ArrowRight, Plane } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import Svg, { ClipPath, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { StepIcon } from '@/features/journey/components/StepIcon';
import { formatDayMonth } from '@/lib/date';
import { depth, fonts, gradients, motion, palette, radius, shadow } from '@/theme/tokens';

import { enter, itemTitle, openItem, steps, useHomeData } from './shared';

const NOTCH = 13;

/** Contour du billet : rectangle arrondi avec deux découpes demi-cercle à la perforation. */
function ticketPath(w: number, h: number, y: number, r = radius.xxl) {
  const n = NOTCH;
  return [
    `M${r},0 H${w - r} A${r},${r} 0 0 1 ${w},${r}`,
    `V${y - n} A${n},${n} 0 0 0 ${w},${y + n}`,
    `V${h - r} A${r},${r} 0 0 1 ${w - r},${h} H${r} A${r},${r} 0 0 1 0,${h - r}`,
    `V${y + n} A${n},${n} 0 0 0 0,${y - n}`,
    `V${r} A${r},${r} 0 0 1 ${r},0 Z`,
  ].join(' ');
}

function Ticket({ top, stub }: { top: ReactNode; stub: ReactNode }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [cut, setCut] = useState(0);
  // Entrée « 3D » : le billet arrive incliné puis se pose à plat (DIRECTION.md §5).
  const tilt = useSharedValue<number>(depth.tiltEntrance);
  useEffect(() => {
    tilt.set(withDelay(motion.stagger, withSpring(0, { ...motion.springSoft, reduceMotion: ReduceMotion.System })));
  }, [tilt]);
  const style = useAnimatedStyle(() => ({ transform: [{ perspective: depth.perspective }, { rotateX: `${tilt.value}deg` }] }));

  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  return (
    <Animated.View style={[styles.ticket, style]} onLayout={onLayout}>
      {size.w > 0 && cut > 0 ? (
        <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
          <Defs>
            <ClipPath id="ticket">
              <Path d={ticketPath(size.w, size.h, cut)} />
            </ClipPath>
            <LinearGradient id="night" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={gradients.hero[0]} />
              <Stop offset="1" stopColor={gradients.hero[1]} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={size.w} height={cut} fill="url(#night)" clipPath="url(#ticket)" />
          <Rect x={0} y={cut} width={size.w} height={size.h - cut} fill={palette.surface} clipPath="url(#ticket)" />
          <Line x1={NOTCH + 8} x2={size.w - NOTCH - 8} y1={cut} y2={cut} stroke={palette.line} strokeWidth={1.5} strokeDasharray="5 6" />
        </Svg>
      ) : null}
      <View onLayout={(e) => setCut(e.nativeEvent.layout.height)}>{top}</View>
      {stub}
    </Animated.View>
  );
}

/** Piste A · Le billet — ton trajet personnel, l'étape en cours dans le talon. */
export function PisteBillet() {
  const { j, hello, from, to, days, next, guides } = useHomeData();
  const current = j.current;

  return (
    <Screen top={gradients.roleTop.student} tabBar padded={false} header={<AppHeader />}>
      <View style={{ paddingHorizontal: 20, gap: 18 }}>
        <Animated.View entering={enter(0)}>
          <Text variant="h1">Bon voyage{hello} !</Text>
          <Text variant="body" color={palette.subtle}>
            Voici ton billet. On s’occupe du reste ensemble.
          </Text>
        </Animated.View>

        <Animated.View entering={enter(1)}>
          <Ticket
            top={
              <View style={styles.top}>
                <View style={styles.route}>
                  <View style={styles.dot} />
                  <View style={styles.dash} />
                  <Plane size={16} color={palette.electricLight} style={{ transform: [{ rotate: '135deg' }] }} />
                  <View style={styles.dash} />
                  <View style={[styles.dot, styles.dotTo]} />
                </View>
                <View style={{ flex: 1, justifyContent: 'space-between' }}>
                  <View>
                    <Text variant="small" color="rgba(255,255,255,0.55)">Départ</Text>
                    <Text variant="h1" color="#fff" numberOfLines={1} adjustsFontSizeToFit>
                      {from}
                    </Text>
                  </View>
                  <View>
                    <Text variant="small" color="rgba(255,255,255,0.55)">Arrivée</Text>
                    <Text variant="h1" color="#fff" numberOfLines={1} adjustsFontSizeToFit>
                      {to}
                    </Text>
                  </View>
                </View>
                <View style={styles.countdown}>
                  <Text style={styles.jx} color="#fff" accessibilityLabel={`${days} jours avant ton arrivée`}>
                    J‑{days}
                  </Text>
                  <Text variant="caption" color="rgba(255,255,255,0.55)" align="right">
                    avant le {formatDayMonth(j.arrival)}
                  </Text>
                </View>
              </View>
            }
            stub={
              <View style={styles.stub}>
                {current ? (
                  <>
                    <Text variant="smallStrong" color={palette.subtle}>
                      Ta seule action maintenant
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                      <IconTile size={44} bg={palette.electricSoft}>
                        <StepIcon name={current.step.icon} color={palette.electric} size={20} />
                      </IconTile>
                      <View style={{ flex: 1 }}>
                        <Text variant="h3">{current.step.title}</Text>
                        <Text variant="small" color={palette.subtle} numberOfLines={2}>
                          {current.step.oneLiner}
                        </Text>
                      </View>
                    </View>
                    <Button label={current.step.action.label} size="md" onPress={() => openItem(current)} icon={<ArrowRight size={16} color="#fff" />} />
                  </>
                ) : (
                  <Text variant="h3">Tout est prêt. Profite de ton arrivée !</Text>
                )}
                <View style={styles.bar}>
                  <View style={[styles.barFill, { width: `${Math.round(j.progress * 100)}%` }]} />
                </View>
                <Text variant="caption" color={palette.muted}>
                  {steps(j.doneCount)} faite{j.doneCount > 1 ? 's' : ''} sur {j.total}
                </Text>
              </View>
            }
          />
        </Animated.View>

        <Animated.View entering={enter(2)} style={styles.list}>
          <Text variant="h3" style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
            Ensuite
          </Text>
          {next.map((it, i) => (
            <PressableScale key={i} onPress={() => openItem(it)} scaleTo={0.98} style={[styles.row, i > 0 && styles.sep]}>
              <Text variant="smallStrong" style={{ flex: 1 }} numberOfLines={1}>
                {itemTitle(it)}
              </Text>
              <Text variant="caption" color={palette.muted}>
                {formatDayMonth(it.date)}
              </Text>
            </PressableScale>
          ))}
        </Animated.View>

        <View style={{ gap: 10 }}>
          <Text variant="h3">Des mentors ont fait ce trajet avant toi</Text>
          <PressableScale onPress={() => router.navigate('/(app)/(tabs)/explorer')} style={styles.guides} scaleTo={0.98}>
            <View style={{ flexDirection: 'row' }}>
              {guides.slice(0, 4).map((m, i) => (
                <View key={m.id} style={{ marginLeft: i ? -10 : 0 }}>
                  <Avatar name={`${m.firstName} ${m.lastName}`} color={m.avatarColor} size={38} ring="#fff" />
                </View>
              ))}
            </View>
            <Text variant="small" color={palette.subtle} style={{ flex: 1 }}>
              {guides.length} mentors, appel gratuit
            </Text>
            <ArrowRight size={16} color={palette.electric} />
          </PressableScale>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  ticket: { borderRadius: radius.xxl, ...shadow.md },
  top: { flexDirection: 'row', gap: 14, padding: 20, paddingBottom: 22, minHeight: 168 },
  route: { alignItems: 'center', paddingVertical: 22, gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: palette.electricLight },
  dotTo: { backgroundColor: palette.electricLight },
  dash: { flex: 1, width: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  countdown: { justifyContent: 'flex-end', alignItems: 'flex-end' },
  jx: { fontFamily: fonts.displayBlack, fontSize: 44, lineHeight: 48, letterSpacing: -1.5 },
  stub: { padding: 20, paddingTop: 22, gap: 12 },
  bar: { height: 4, borderRadius: 2, backgroundColor: palette.line, overflow: 'hidden', marginTop: 4 },
  barFill: { height: 4, borderRadius: 2, backgroundColor: palette.electric },
  list: { backgroundColor: palette.surface, borderRadius: radius.xl, paddingBottom: 6, ...shadow.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 48 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
  guides: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.xl, backgroundColor: palette.surface, ...shadow.sm },
});
