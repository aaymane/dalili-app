import { BlurMask, Canvas, Fill, Group, LinearGradient, PathOp, RoundedRect, Shader, Skia, vec } from '@shopify/react-native-skia';
import { Lock, Plane } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { skyEffect, useSkyUniforms } from '@/components/brand/StarField';
import { Text } from '@/components/ui/Text';
import { gradients, palette, radius, shadow } from '@/theme/tokens';

export type TicketData = {
  from: string;
  to: string;
  /** Jours avant l'arrivée (négatif : déjà arrivé). */
  days: number;
  passenger: string;
  date: string;
};

const STUB = 96;
const NOTCH = 11;
const R = radius.xxl;

/** Code-barres décoratif, toujours le même pour un même passager. */
function bars(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return Array.from({ length: 22 }, () => {
    h = (h * 1103515245 + 12345) >>> 0;
    return 1 + (h % 3);
  });
}

/**
 * Fond du billet en Skia : dégradé nuit et ciel étoilé, découpés en vrai (coins arrondis + deux encoches de
 * perforation). Les encoches laissent voir ce qu'il y a derrière, quel que soit le fond de l'écran.
 */
function TicketBackground({ locked = false }: { locked?: boolean }) {
  const size = useSharedValue({ width: 0, height: 0 });
  const uniforms = useSkyUniforms(size, { variant: 'card' });
  const clip = useDerivedValue(() => {
    const { width: w, height: h } = size.get();
    const shape = Skia.Path.Make();
    shape.addRRect(Skia.RRectXY(Skia.XYWHRect(0, 0, w, h), R, R));
    const holes = Skia.Path.Make();
    holes.addCircle(w - STUB, 0, NOTCH);
    holes.addCircle(w - STUB, h, NOTCH);
    return Skia.Path.MakeFromOp(shape, holes, PathOp.Difference) ?? shape;
  });
  const end = useDerivedValue(() => vec(size.get().width, size.get().height));
  return (
    <Canvas style={StyleSheet.absoluteFill} onSize={size}>
      <Group clip={clip}>
        <Fill>
          <LinearGradient start={vec(0, 0)} end={end} colors={[...gradients.night]} />
        </Fill>
        {skyEffect ? (
          <Fill>
            <Shader source={skyEffect} uniforms={uniforms} />
          </Fill>
        ) : null}
        {locked ? (
          <>
            {/* Verrouillé : le contenu n'est qu'une silhouette floue, sous un voile nuit. */}
            {GHOSTS.map((g, i) => (
              <Ghost key={i} size={size} spec={g} />
            ))}
            <Fill color="rgba(11,18,51,0.35)" />
          </>
        ) : null}
      </Group>
    </Canvas>
  );
}

/** Silhouettes du contenu (x, y, largeur, hauteur) ; x négatif = depuis le bord droit. */
const GHOSTS: [number, number, number, number][] = [
  [18, 20, 130, 7],
  [18, 44, 0.42, 20],
  [18, 108, 54, 9],
  [92, 108, 54, 9],
  [166, 108, 48, 9],
  [-78, 46, 60, 26],
  [-80, 104, 64, 20],
];

function Ghost({ size, spec }: { size: SharedValue<{ width: number; height: number }>; spec: [number, number, number, number] }) {
  const [x, y, w, h] = spec;
  const rect = useDerivedValue(() => {
    const W = size.get().width;
    return Skia.RRectXY(Skia.XYWHRect(x < 0 ? W + x : x, y, w < 1 ? W * w : w, h), 4, 4);
  });
  return (
    <RoundedRect rect={rect} color="rgba(255,255,255,0.5)">
      <BlurMask blur={5} style="normal" />
    </RoundedRect>
  );
}

/** Carte d'embarquement DALILI : ta ville → ta ville d'arrivée, le compte à rebours dans le talon. */
export function Ticket({ data }: { data: TicketData }) {
  const label = data.days > 0 ? `J-${data.days}` : 'J-0';
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <TicketBackground />
        <View style={styles.main}>
          <Text variant="overline" color="rgba(255,255,255,0.55)" style={{ fontSize: 9 }}>
            Carte d’embarquement · DALILI
          </Text>
          <View style={styles.route}>
            <Text variant="h1" color="#fff" style={styles.city} numberOfLines={1}>
              {data.from}
            </Text>
            <Plane size={16} color={palette.electricLight} style={{ marginHorizontal: 8 }} />
            <Text variant="h1" color="#fff" style={styles.city} numberOfLines={1}>
              {data.to}
            </Text>
          </View>
          <View style={styles.fields}>
            <View>
              <Text variant="caption" color="rgba(255,255,255,0.5)">
                Passager·e
              </Text>
              <Text variant="smallStrong" color="#fff" numberOfLines={1}>
                {data.passenger}
              </Text>
            </View>
            <View>
              <Text variant="caption" color="rgba(255,255,255,0.5)">
                Arrivée
              </Text>
              <Text variant="smallStrong" color="#fff">
                {data.date}
              </Text>
            </View>
            <View>
              <Text variant="caption" color="rgba(255,255,255,0.5)">
                Classe
              </Text>
              <Text variant="smallStrong" color="#fff">
                Étudiant
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.perforation} />
        <View style={styles.stub}>
          <Text variant="hero" color="#fff" style={styles.countdown} adjustsFontSizeToFit numberOfLines={1}>
            {label}
          </Text>
          <Text variant="caption" color="rgba(255,255,255,0.6)" align="center">
            {data.days > 0 ? 'avant le départ' : 'bienvenue !'}
          </Text>
          <View style={styles.barcode}>
            {bars(data.passenger + data.to).map((w, i) => (
              <View key={i} style={{ width: w, height: 22, backgroundColor: 'rgba(255,255,255,0.7)' }} />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

/** Le billet tant que le visa n'est pas validé : flouté, avec un cadenas. */
export function LockedTicket() {
  return (
    <View style={[styles.wrap, { minHeight: 150 }]} accessible accessibilityLabel="Ton billet, verrouillé. Il se débloque quand ton visa est validé.">
      <TicketBackground locked />
      <View style={styles.lockWrap} pointerEvents="none">
        <View style={styles.lock}>
          <Lock size={18} color="#fff" />
        </View>
        <Text variant="smallStrong" color="#fff" align="center">
          Se débloque quand ton visa est validé
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...shadow.md },
  card: { flexDirection: 'row', minHeight: 150 },
  main: { flex: 1, padding: 18, gap: 10 },
  route: { flexDirection: 'row', alignItems: 'center' },
  city: { fontSize: 20, lineHeight: 26, flexShrink: 1 },
  fields: { flexDirection: 'row', gap: 16, marginTop: 'auto' },
  perforation: { width: 0, borderLeftWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.28)', marginVertical: 16 },
  stub: { width: STUB, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 8, gap: 2 },
  countdown: { fontFamily: 'Montserrat_900Black', fontSize: 28, lineHeight: 34 },
  barcode: { flexDirection: 'row', gap: 1.5, marginTop: 8 },
  lockWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 },
  lock: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
});
