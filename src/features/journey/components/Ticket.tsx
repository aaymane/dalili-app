import { BlurMask, Canvas, Fill, Group, LinearGradient, PathOp, RoundedRect, Shader, Skia, vec } from '@shopify/react-native-skia';
import { Lock, Plane } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { skyEffect, useSkyUniforms } from '@/components/brand/StarField';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { t, useT } from '@/i18n';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

export type TicketData = {
  from: string;
  to: string;
  /** Jours avant l'arrivée (négatif : déjà arrivé). */
  days: number;
  /** Faux tant que l'étudiant n'a pas donné sa date : le compte à rebours n'a pas de sens. */
  dateKnown: boolean;
  passenger: string;
  date: string;
};

const STUB = 96;

/**
 * Reflet holographique (déblocage, M2.3) : une bande de lumière irisée et de fines lignes qui glissent
 * avec l'inclinaison du téléphone. `tilt` va de -1 à 1, `on` fait apparaître le reflet.
 */
const HOLO = `
uniform float2 res;
uniform float2 tilt;
uniform float on;

half4 main(float2 p) {
  float2 uv = p / res;
  float d = uv.x * 0.75 + uv.y * 0.45 - 0.6 - tilt.x * 0.55 - tilt.y * 0.35;
  float sheen = exp(-d * d * 40.0);
  float h = uv.x * 1.2 - uv.y * 0.6 + tilt.x * 1.4 + tilt.y * 0.9;
  float3 iris = 0.5 + 0.5 * cos(6.2831 * (h + float3(0.0, 0.33, 0.67)));
  float lines = 0.5 + 0.5 * sin((uv.x + uv.y * 0.6) * 140.0 + tilt.x * 20.0);
  float a = (sheen * 0.3 + 0.025 * lines * sheen) * on;
  return half4(mix(iris, float3(1.0), 0.5) * a, a);
}`;
const holoEffect = Skia.RuntimeEffect.Make(HOLO);

export type Holo = { tilt: SharedValue<{ x: number; y: number }>; on: SharedValue<number> };
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
function TicketBackground({ locked = false, holo }: { locked?: boolean; holo?: Holo }) {
  const { gradients } = useTheme();
  const size = useSharedValue({ width: 0, height: 0 });
  const uniforms = useSkyUniforms(size, { variant: 'card' });
  const clip = useDerivedValue(() => {
    const { width: w, height: h } = size.get();
    const shape = Skia.Path.RRect(Skia.RRectXY(Skia.XYWHRect(0, 0, w, h), R, R));
    const holes = Skia.PathBuilder.Make().addCircle(w - STUB, 0, NOTCH).addCircle(w - STUB, h, NOTCH).detach();
    return Skia.Path.MakeFromOp(shape, holes, PathOp.Difference) ?? shape;
  });
  const end = useDerivedValue(() => vec(size.get().width, size.get().height));
  const holoUniforms = useDerivedValue(() => {
    const t = holo?.tilt.get() ?? { x: 0, y: 0 };
    return { res: [size.get().width, size.get().height], tilt: [t.x, t.y], on: holo?.on.get() ?? 0 };
  });
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
        {holo && holoEffect ? (
          <Fill>
            <Shader source={holoEffect} uniforms={holoUniforms} />
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

/** Phrase lue par le lecteur d'écran, qui ne voit qu'un seul élément. */
function ticketLabel(d: TicketData) {
  if (d.days <= 0) return t('ticket.a11yArrived', { to: d.to, date: d.date });
  if (!d.dateKnown) return t('ticket.a11yNoDate', { from: d.from, to: d.to });
  return t('ticket.a11y', { from: d.from, to: d.to, days: d.days, date: d.date });
}

/**
 * Carte d'embarquement DALILI : ta ville → ta ville d'arrivée, le compte à rebours dans le talon.
 * Le jour J, elle devient « Bienvenue à … » et le talon reçoit le tampon « Arrivé·e ».
 */
export function Ticket({ data, onPress, holo }: { data: TicketData; onPress?: () => void; holo?: Holo }) {
  const { c } = useTheme();
  const tr = useT();
  const styles = useStyles();
  const arrived = data.days <= 0;
  const content = (
    <View style={styles.card}>
      <TicketBackground holo={holo} />
      <View style={styles.main}>
        <Text variant="overline" color="rgba(255,255,255,0.55)" style={{ fontSize: 9 }}>
          {tr('ticket.label')}
        </Text>
        {arrived ? (
          <View>
            <Text variant="small" color="rgba(255,255,255,0.7)">
              {tr('ticket.welcome')}
            </Text>
            <Text variant="h1" color="#fff" style={styles.city} numberOfLines={1} adjustsFontSizeToFit>
              {data.to}
            </Text>
          </View>
        ) : (
          <View style={styles.route}>
            <Text variant="h1" color="#fff" style={styles.city} numberOfLines={1}>
              {data.from}
            </Text>
            <Plane size={16} color={c.electricLight} style={{ marginHorizontal: 8 }} />
            <Text variant="h1" color="#fff" style={styles.city} numberOfLines={1}>
              {data.to}
            </Text>
          </View>
        )}
        <View style={styles.fields}>
          {/* Le passager prend la place qui reste, sans descendre sous la largeur de son libellé. */}
          <View style={{ flex: 1, minWidth: 72 }}>
            <Text variant="caption" color="rgba(255,255,255,0.5)" numberOfLines={1}>
              {tr('ticket.passenger')}
            </Text>
            <Text variant="smallStrong" color="#fff" numberOfLines={1}>
              {data.passenger}
            </Text>
          </View>
          <View>
            <Text variant="caption" color="rgba(255,255,255,0.5)">
              {arrived ? tr('ticket.arrivedOn') : tr('ticket.arrival')}
            </Text>
            <Text variant="smallStrong" color="#fff">
              {data.dateKnown || arrived ? data.date : tr('ticket.toSet')}
            </Text>
          </View>
          <View>
            <Text variant="caption" color="rgba(255,255,255,0.5)">
              {tr('ticket.class')}
            </Text>
            <Text variant="smallStrong" color="#fff">
              {tr('ticket.student')}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.perforation} />
      <View style={styles.stub}>
        {arrived ? (
          <Stamp />
        ) : (
          <>
            <Text variant="hero" color="#fff" style={styles.countdown} adjustsFontSizeToFit numberOfLines={1}>
              {data.dateKnown ? tr('ticket.countdown', { n: data.days }) : tr('ticket.countdownUnknown')}
            </Text>
            <Text variant="caption" color="rgba(255,255,255,0.6)" align="center">
              {data.dateKnown ? tr('ticket.beforeLeaving') : tr('ticket.setDate')}
            </Text>
          </>
        )}
        <View style={styles.barcode}>
          {bars(data.passenger + data.to).map((w, i) => (
            <View key={i} style={{ width: w, height: 22, backgroundColor: 'rgba(255,255,255,0.7)' }} />
          ))}
        </View>
      </View>
    </View>
  );
  if (!onPress) {
    return (
      <View style={styles.wrap} accessible accessibilityLabel={ticketLabel(data)}>
        {content}
      </View>
    );
  }
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={styles.wrap} accessibilityLabel={ticketLabel(data)} accessibilityHint={tr('ticket.hint')}>
      {content}
    </PressableScale>
  );
}

/** Tampon d'arrivée, posé de travers comme à la douane. */
function Stamp() {
  const { c } = useTheme();
  const tr = useT();
  const styles = useStyles();
  return (
    <View style={styles.stamp}>
      <Text variant="overline" color={c.mentorGlow} style={{ fontSize: 9, letterSpacing: 1.4 }}>
        {tr('ticket.arrived')}
      </Text>
      <Text variant="caption" color={c.mentorGlow}>
        {tr('common.france')}
      </Text>
    </View>
  );
}

/** Le billet tant que le visa n'est pas validé : flouté, avec un cadenas. */
export function LockedTicket() {
  const tr = useT();
  const styles = useStyles();
  return (
    <View style={[styles.wrap, { minHeight: 150 }]} accessible accessibilityLabel={tr('ticket.lockedA11y')}>
      <TicketBackground locked />
      <View style={styles.lockWrap} pointerEvents="none">
        <View style={styles.lock}>
          <Lock size={18} color="#fff" />
        </View>
        <Text variant="smallStrong" color="#fff" align="center">
          {tr('ticket.locked')}
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  wrap: { ...shadow.md },
  // Le dessin du billet (talon, perforation) est fixe : même sens dans toutes les langues.
  card: { flexDirection: 'row', direction: 'ltr', minHeight: 150 },
  main: { flex: 1, padding: 18, gap: 10 },
  route: { flexDirection: 'row', alignItems: 'center' },
  city: { fontSize: 20, lineHeight: 26, flexShrink: 1 },
  fields: { flexDirection: 'row', gap: 14, marginTop: 'auto' },
  perforation: { width: 0, borderLeftWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.28)', marginVertical: 16 },
  stub: { width: STUB, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 8, gap: 2 },
  countdown: { fontFamily: 'Montserrat_900Black', fontSize: 28, lineHeight: 34 },
  barcode: { flexDirection: 'row', gap: 1.5, marginTop: 8 },
  stamp: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: c.mentorGlow, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-12deg' }] },
  lockWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 },
  lock: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
}));
