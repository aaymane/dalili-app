import { router } from 'expo-router';
import { Check, Flag, MapPin } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import type { JourneyItem } from '@/features/journey/store';
import { phaseMeta, type Phase } from '@/features/journey/steps';
import { formatDayMonth } from '@/lib/date';
import { gradients, motion, palette, radius, shadow } from '@/theme/tokens';

import { enter, itemTitle, openItem, steps, useHomeData } from './shared';

const APath = Animated.createAnimatedComponent(Path);

const ROW = 64;
const MARK = 40;
const CURRENT = 188;
/** Le sentier serpente dans la marge gauche, les libellés restent alignés à droite. */
const X = [30, 62];
const LABEL_X = 96;

type Row =
  | { kind: 'mark'; phase: Phase; y: number; h: number }
  | { kind: 'node'; item: JourneyItem; y: number; h: number; cx: number; cy: number };

function layout(items: JourneyItem[]) {
  const rows: Row[] = [];
  let y = 0;
  let prev: Phase | null = null;
  let n = 0;
  items.forEach((item) => {
    const phase = item.kind === 'official' ? item.step.phase : prev ?? 'before';
    if (phase !== prev) {
      rows.push({ kind: 'mark', phase, y, h: MARK });
      y += MARK;
      prev = phase;
    }
    const h = item.current ? CURRENT : ROW;
    rows.push({ kind: 'node', item, y, h, cx: X[n % 2], cy: y + (item.current ? 26 : 22) });
    y += h;
    n++;
  });
  return { rows, height: y };
}

/** Courbe douce entre les centres successifs (tangentes verticales). */
function trail(points: { x: number; y: number }[]) {
  if (!points.length) return '';
  return points.reduce((d, p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const a = points[i - 1];
    const my = (a.y + p.y) / 2;
    return `${d} C${a.x},${my} ${p.x},${my} ${p.x},${p.y}`;
  }, '');
}
const approxLength = (pts: { x: number; y: number }[]) => pts.reduce((l, p, i) => (i ? l + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) * 1.08 : 0), 0);

function Halo() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.System }), -1, true));
  }, [t]);
  const s = useAnimatedStyle(() => ({ opacity: 0.45 - t.value * 0.3, transform: [{ scale: 1 + t.value * 0.35 }] }));
  return <Animated.View style={[styles.halo, s]} />;
}

/** Piste B · Le chemin — le parcours comme un sentier : « Tu es ici ». */
export function PisteChemin() {
  const { j, hello, to, days } = useHomeData();
  const official = j.all.filter((i) => i.kind === 'official');
  const curIdx = Math.max(0, official.findIndex((i) => i.current));
  const start = Math.max(0, curIdx - 2);
  const items = official.slice(start, start + 6);
  const { rows, height } = layout(items);
  const nodes = rows.filter((r): r is Extract<Row, { kind: 'node' }> => r.kind === 'node');
  const pts = nodes.map((r) => ({ x: r.cx, y: r.cy }));
  const doneCount = nodes.findIndex((r) => r.item.current);
  const donePts = pts.slice(0, (doneCount < 0 ? pts.length - 1 : doneCount) + 1);

  // Le tracé « fait » se dessine une seule fois (DIRECTION.md §3).
  const len = approxLength(donePts);
  const draw = useSharedValue(0);
  useEffect(() => {
    draw.set(withDelay(motion.stagger * 2, withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System })));
  }, [draw]);
  const drawProps = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - draw.value) }));

  return (
    <Screen top={gradients.roleTop.student} tabBar padded={false} header={<AppHeader />}>
      <View style={{ paddingHorizontal: 20 }}>
        <Animated.View entering={enter(0)}>
          <Text variant="h1">Tu es ici{hello}.</Text>
          <Text variant="body" color={palette.subtle}>
            {steps(j.doneCount)} derrière toi · {to} dans {days} jours
          </Text>
        </Animated.View>

        <Animated.View entering={enter(1)} style={[styles.map, { height: height + 8 }]}>
          <Svg width="100%" height={height} style={StyleSheet.absoluteFill}>
            <Path d={trail(pts)} stroke={palette.electric} strokeOpacity={0.25} strokeWidth={3} strokeDasharray="2 8" strokeLinecap="round" fill="none" />
            {donePts.length > 1 ? (
              <APath d={trail(donePts)} stroke={palette.electric} strokeWidth={4} strokeLinecap="round" fill="none" strokeDasharray={`${len} ${len}`} animatedProps={drawProps} />
            ) : null}
          </Svg>

          {rows.map((r, i) =>
            r.kind === 'mark' ? (
              <View key={`m${i}`} style={[styles.mark, { top: r.y }]}>
                {r.phase === 'before' ? <MapPin size={14} color={palette.subtle} /> : <Flag size={14} color={palette.subtle} />}
                <Text variant="smallStrong" color={palette.subtle}>
                  {phaseMeta[r.phase].title}
                </Text>
              </View>
            ) : (
              <View key={`n${i}`} style={{ position: 'absolute', top: r.y, left: 0, right: 0, height: r.h }}>
                <View style={[styles.nodeWrap, { left: r.cx - 22, top: r.cy - r.y - 22 }]}>
                  {r.item.current ? <Halo /> : null}
                  <View style={[styles.node, r.item.done && styles.nodeDone, r.item.current && styles.nodeCurrent]}>
                    {r.item.done ? <Check size={14} color="#fff" strokeWidth={3} /> : r.item.current ? <View style={styles.nodeCore} /> : null}
                  </View>
                </View>
                {r.item.current ? (
                  <View style={[styles.card, { left: LABEL_X - 12 }]}>
                    <Text variant="caption" color={palette.electric}>
                      Ta seule action maintenant
                    </Text>
                    <Text variant="h3">{itemTitle(r.item)}</Text>
                    {r.item.kind === 'official' ? (
                      <Text variant="small" color={palette.subtle} numberOfLines={2}>
                        {r.item.step.oneLiner}
                      </Text>
                    ) : null}
                    <Button label={r.item.kind === 'official' ? r.item.step.action.label : 'Ouvrir'} size="sm" onPress={() => openItem(r.item)} />
                  </View>
                ) : (
                  <PressableScale onPress={() => openItem(r.item)} scaleTo={0.98} style={[styles.label, { left: LABEL_X }]}>
                    <Text variant="smallStrong" color={r.item.done ? palette.muted : palette.navy} numberOfLines={1} style={r.item.done && styles.strike}>
                      {itemTitle(r.item)}
                    </Text>
                    <Text variant="caption" color={palette.muted}>
                      {r.item.done ? 'Fait' : formatDayMonth(r.item.date)}
                    </Text>
                  </PressableScale>
                )}
              </View>
            ),
          )}
        </Animated.View>

        <Animated.View entering={enter(2)}>
          <Button label="Voir tout le parcours" variant="secondary" size="md" onPress={() => router.push('/(app)/parcours')} />
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: { marginTop: 18, marginBottom: 12 },
  mark: { position: 'absolute', left: LABEL_X - 12, height: MARK, flexDirection: 'row', alignItems: 'center', gap: 6 },
  nodeWrap: { position: 'absolute', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  node: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(1,77,248,0.3)', backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center' },
  nodeDone: { backgroundColor: palette.electric, borderColor: palette.electric },
  nodeCurrent: { width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: palette.electric, ...shadow.glow },
  nodeCore: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.electric },
  halo: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: palette.electric },
  label: { position: 'absolute', right: 0, top: 6, minHeight: 44, justifyContent: 'center' },
  strike: { textDecorationLine: 'line-through' },
  card: { position: 'absolute', right: 0, top: 0, padding: 14, gap: 6, borderRadius: radius.xl, backgroundColor: palette.surface, ...shadow.md },
});
