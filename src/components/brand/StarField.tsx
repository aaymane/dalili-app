import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import {
  SensorType,
  useAnimatedSensor,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { EASE_OUT } from '@/theme/motion';

/**
 * Ciel étoilé des moments de marque (docs/DIRECTION.md §3, « Ciel étoilé »). Un seul shader, calculé par la carte
 * graphique : trois plans d'étoiles à des profondeurs différentes (scintillement propre à chaque étoile, aigrettes
 * sur les plus brillantes), une nébuleuse qui dérive, une étoile filante de temps en temps, et une onde qui allume
 * les étoiles depuis un point (`ignite`). Coordonnées en points, fond transparent : il se pose sur un dégradé nuit.
 */
const SKY = `
uniform float2 res;
uniform float t;
uniform float2 tilt;
uniform float ignite;
uniform float2 origin;
uniform float dens;
uniform float nebula;
uniform float shoot;

float hash(float2 p) {
  float3 q = fract(float3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float2 hash2(float2 p) {
  float3 q = fract(float3(p.xyx) * float3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy);
}

// 1 au centre, 0 à partir de « a ».
float fall(float a, float x) { return 1.0 - smoothstep(0.0, a, x); }

float vnoise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + float2(1.0, 0.0)), u.x), mix(hash(i + float2(0.0, 1.0)), hash(i + float2(1.0, 1.0)), u.x), u.y);
}

float fbm(float2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * vnoise(p);
    p = p * 2.03 + 17.0;
    a *= 0.5;
  }
  return v;
}

// Un plan d'étoiles : une étoile au plus par case, loin des bords (son halo ne déborde pas).
float3 starLayer(float2 p, float cell, float prob, float size, float seed, float flare) {
  float2 id = floor(p / cell);
  float on = step(1.0 - prob, hash(id + seed * 1.7));
  float2 c = (id + 0.25 + hash2(id + seed) * 0.5) * cell;
  float2 d = p - c;
  float r = length(d);
  float b = hash(id + seed * 3.1);
  float tw = 0.5 + 0.5 * sin(t * (0.6 + b * 2.4) + b * 40.0);
  float s = size * (0.55 + b * 0.9);
  float core = fall(s, r);
  float halo = (s * s * 0.8) / (r * r + s * s * 0.8) * 0.45 * fall(cell * 0.25, r);
  float spikes = flare * step(0.66, b) * (exp(-abs(d.x) * 1.1) * exp(-abs(d.y) * 0.16) + exp(-abs(d.y) * 1.1) * exp(-abs(d.x) * 0.16)) * fall(cell * 0.25, r);
  float3 col = mix(float3(0.78, 0.86, 1.0), float3(1.0, 0.9, 0.78), step(0.86, hash(id + seed * 5.3)));
  return col * (core + halo + spikes * 0.85) * (0.3 + 0.7 * tw) * on;
}

half4 main(float2 p) {
  float3 col = float3(0.0);

  // Voie lactée : une bande diagonale (haut droite → bas gauche), plus dense en étoiles, et une nébuleuse qui dérive.
  float2 uv = p / res;
  float2 nrm = normalize(float2(0.75, 0.85));
  float across = dot(uv - float2(0.9, 0.0) + tilt * 0.0006, nrm);
  float milky = exp(-across * across / 0.02) * nebula;
  if (nebula > 0.0) {
    float2 np = p / res.y * 2.4 + float2(t * 0.010, -t * 0.007) + tilt * 0.0015;
    float n = fbm(np);
    float n2 = fbm(np * 1.6 + 4.0);
    float band = smoothstep(0.38, 0.8, n) * (0.4 + 0.6 * n2);
    float3 neb = mix(float3(0.08, 0.3, 1.0), float3(0.55, 0.32, 0.98), n2);
    col += neb * (band * 0.3 + milky * (0.18 + 0.32 * n)) ;
    col += float3(0.75, 0.82, 1.0) * milky * smoothstep(0.5, 0.9, n2) * 0.07;
  }

  float3 s = starLayer(p + tilt * 0.35, 16.0, (0.22 + milky * 0.5) * dens, 0.75, 1.0, 0.0) * 0.75;
  s += starLayer(p + tilt * 0.75, 40.0, (0.32 + milky * 0.3) * dens, 1.05, 7.0, 0.0);
  s += starLayer(p + tilt * 1.3, 90.0, 0.34 * dens, 1.5, 13.0, 1.0) * 1.25;

  // L'onde d'allumage : les étoiles apparaissent derrière le front et brillent plus fort à son passage.
  float dist = length(p - origin);
  float front = ignite * length(res) * 1.1;
  float lit = fall(160.0, dist - front + 160.0);
  float crest = fall(70.0, abs(dist - front)) * (1.0 - ignite);
  col += s * lit * (1.0 + 1.6 * crest);
  col += float3(0.3, 0.5, 1.0) * crest * 0.08;

  if (shoot > 0.0) {
    float period = 8.0;
    float k = floor(t / period);
    float ph = t - k * period;
    float dur = 1.0;
    if (ph < dur) {
      float2 h = hash2(float2(k, 3.7));
      float2 a = float2(res.x * (0.45 + h.x * 0.5), res.y * (0.04 + h.y * 0.3));
      float2 dir = normalize(float2(-1.0, 0.5));
      float u = ph / dur;
      float2 head = a + dir * res.x * 0.7 * u;
      float2 rel = p - head;
      float along = dot(rel, -dir);
      float side = abs(rel.x * dir.y - rel.y * dir.x);
      float trail = step(0.0, along) * fall(130.0, along) * fall(1.6, side);
      float spark = exp(-dot(rel, rel) / 6.0);
      col += float3(0.88, 0.93, 1.0) * (trail * 0.9 + spark) * sin(u * 3.14159) * lit;
    }
  }

  float alpha = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
  return half4(half3(min(col, float3(1.0))), half(alpha));
}
`;

// `null` si le shader ne compile pas : on n'affiche alors rien plutôt que de planter.
export const skyEffect = Skia.RuntimeEffect.Make(SKY);

type Props = {
  /** `sky` : plein écran, nébuleuse et étoile filante. `card` : plus discret, pour une carte nuit. */
  variant?: 'sky' | 'card';
  /** Allume les étoiles par une onde partie de `origin` (par défaut le centre), au lancement. */
  ignite?: boolean;
  /** Point de départ de l'onde, en fraction de la taille (0 → 1). */
  origin?: { x: number; y: number };
  /** Décalage de parallaxe en points (inclinaison du téléphone). */
  tilt?: SharedValue<{ x: number; y: number }>;
};

type SkyOptions = Pick<Props, 'variant' | 'ignite' | 'origin' | 'tilt'>;

/**
 * Horloge et paramètres du ciel, pour dessiner `skyEffect` dans n'importe quel Canvas de la taille `size`
 * (le billet s'en sert à l'intérieur de sa découpe). Le temps ne tourne que si l'écran est visible et l'app active.
 */
export function useSkyUniforms(size: SharedValue<{ width: number; height: number }>, { variant = 'sky', ignite = false, origin = { x: 0.5, y: 0.5 }, tilt }: SkyOptions) {
  const reduce = useReducedMotion();
  const focused = useIsFocused();
  const t = useSharedValue(0);
  const lit = useSharedValue(ignite && !reduce ? 0 : 1);

  const frame = useFrameCallback((f) => {
    t.set(f.timeSinceFirstFrame / 1000);
  }, false);
  useEffect(() => {
    const update = (s: string | null | undefined) => frame.setActive(!reduce && focused && s === 'active');
    update(AppState.currentState);
    const sub = AppState.addEventListener('change', update);
    return () => sub.remove();
  }, [frame, reduce, focused]);

  useEffect(() => {
    if (ignite && !reduce) lit.set(withDelay(300, withTiming(1, { duration: 2200, easing: EASE_OUT })));
  }, [ignite, reduce, lit]);

  const card = variant === 'card';
  return useDerivedValue(() => {
    const { width, height } = size.get();
    const p = tilt?.get() ?? { x: 0, y: 0 };
    return {
      res: [width, height],
      t: t.get(),
      tilt: [p.x, p.y],
      ignite: lit.get(),
      origin: [width * origin.x, height * origin.y],
      dens: card ? 0.75 : 1,
      nebula: card ? 0 : 1,
      shoot: card || reduce ? 0 : 1,
    };
  });
}

export function StarField(props: Props) {
  const size = useSharedValue({ width: 0, height: 0 });
  const uniforms = useSkyUniforms(size, props);

  if (!skyEffect) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Canvas style={StyleSheet.absoluteFill} onSize={size}>
        <Fill>
          <Shader source={skyEffect} uniforms={uniforms} />
        </Fill>
      </Canvas>
    </View>
  );
}

const TILT = 22; // décalage max du plan le plus proche, en points (× 1,3 dans le shader)

/**
 * Le ciel suit l'inclinaison du téléphone : les plans proches bougent plus que les lointains.
 * La position de repos se recentre doucement, pour que le ciel revienne quand on garde le téléphone immobile.
 */
export function TiltingStarField(props: Omit<Props, 'tilt'>) {
  const reduce = useReducedMotion();
  const gravity = useAnimatedSensor(SensorType.GRAVITY, { interval: 'auto' });
  const rest = useSharedValue<{ x: number; y: number } | null>(null);
  const tilt = useSharedValue({ x: 0, y: 0 });

  useFrameCallback(() => {
    if (reduce) return;
    const g = gravity.sensor.get();
    const r = rest.get() ?? { x: g.x, y: g.y };
    const next = { x: r.x + (g.x - r.x) * 0.004, y: r.y + (g.y - r.y) * 0.004 };
    rest.set(next);
    const cur = tilt.get();
    const target = { x: ((g.x - next.x) / 9.81) * TILT * -1, y: ((g.y - next.y) / 9.81) * TILT };
    tilt.set({ x: cur.x + (target.x - cur.x) * 0.12, y: cur.y + (target.y - cur.y) * 0.12 });
  });

  return <StarField {...props} tilt={tilt} />;
}
