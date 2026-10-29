import { BlurMask, Canvas, Circle, DashPathEffect, Group, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useDerivedValue, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { useT } from '@/i18n';
import { EASE_OUT } from '@/theme/motion';
import { useTheme } from '@/theme/scheme';

const HEIGHT = 128;
/** Places des étoiles autour du centre, en fraction de la largeur (x) et de la hauteur (y) : un dessin irrégulier, comme un vrai ciel. */
const SPOTS = [
  [-0.32, -0.3],
  [0.3, -0.32],
  [0.36, 0.24],
  [-0.26, 0.32],
  [0.05, 0.4],
  [-0.42, 0.04],
  [0.15, -0.42],
] as const;

type Props = { helped: number; waiting: number };

/**
 * Le mentor au centre, relié aux étudiants qu'il aide (traits pleins) et à ceux qui attendent
 * sa réponse (pointillés). Les traits se tracent une fois à l'affichage, puis tout reste immobile :
 * la boucle de la carte, c'est le ciel étoilé.
 */
export function Constellation({ helped, waiting }: Props) {
  const { c } = useTheme();
  const t = useT();
  const reduce = useReducedMotion();
  const [width, setWidth] = useState(0);
  const draw = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    if (!reduce && width > 0) draw.set(withDelay(250, withTiming(1, { duration: 1000, easing: EASE_OUT })));
  }, [reduce, width, draw]);

  const stars = useMemo(() => {
    const cx = width / 2;
    const cy = HEIGHT / 2;
    return SPOTS.slice(0, Math.min(SPOTS.length, helped + waiting)).map(([fx, fy], i) => {
      const x = cx + fx * width;
      const y = cy + fy * HEIGHT;
      const line = Skia.PathBuilder.Make().moveTo(cx, cy).lineTo(x, y).detach();
      return { x, y, line, waiting: i >= helped };
    });
  }, [width, helped, waiting]);

  // Chaque étoile s'allume quand son trait l'atteint.
  const lit = useDerivedValue(() => Math.min(1, Math.max(0, (draw.get() - 0.55) / 0.45)));

  const label = t('mentors.constellation.helped', { count: helped }) + (waiting ? t('mentors.constellation.waiting', { count: waiting }) : '');

  return (
    <View style={{ height: HEIGHT }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessible accessibilityRole="image" accessibilityLabel={label}>
      {width > 0 ? (
        <Canvas style={{ flex: 1 }}>
          {stars.map((s, i) => (
            <Path key={`l${i}`} path={s.line} style="stroke" strokeWidth={1.2} strokeCap="round" color={s.waiting ? 'rgba(255,255,255,0.35)' : 'rgba(125,227,185,0.55)'} end={draw}>
              {s.waiting ? <DashPathEffect intervals={[3, 5]} /> : null}
            </Path>
          ))}
          {stars.map((s, i) => (
            <Group key={`s${i}`} opacity={lit}>
              <Circle cx={s.x} cy={s.y} r={s.waiting ? 7 : 9} color={s.waiting ? 'rgba(255,255,255,0.18)' : 'rgba(125,227,185,0.4)'}>
                <BlurMask blur={6} style="normal" />
              </Circle>
              <Circle cx={s.x} cy={s.y} r={s.waiting ? 2.5 : 3.5} color={s.waiting ? 'rgba(255,255,255,0.7)' : c.white} />
            </Group>
          ))}
          <Circle cx={width / 2} cy={HEIGHT / 2} r={22} color={c.mentorGlow} opacity={0.35}>
            <BlurMask blur={14} style="normal" />
          </Circle>
          <Circle cx={width / 2} cy={HEIGHT / 2} r={6} color={c.white} />
          <Circle cx={width / 2} cy={HEIGHT / 2} r={9} color={c.mentorGlow} style="stroke" strokeWidth={1.5} />
        </Canvas>
      ) : null}
    </View>
  );
}
