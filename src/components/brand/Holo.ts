import { Skia } from '@shopify/react-native-skia';
import { SensorType, useAnimatedSensor, useFrameCallback, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';

/**
 * Reflet holographique (billet du Parcours, carte du Profil) : une bande de lumière irisée et de fines lignes qui
 * glissent avec l'inclinaison du téléphone. `tilt` va de -1 à 1, `on` fait apparaître le reflet.
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
export const holoEffect = Skia.RuntimeEffect.Make(HOLO);

export type Holo = { tilt: SharedValue<{ x: number; y: number }>; on: SharedValue<number> };

/** Inclinaison (radians) qui donne le maximum de -1 / 1. */
const FULL_TILT = 0.45;
const clamp = (v: number) => {
  'worklet';
  return Math.max(-1, Math.min(1, v));
};

/**
 * L'inclinaison du téléphone, de -1 à 1 sur chaque axe. La position de repos se recentre doucement : tenu
 * immobile, le reflet revient au milieu. Immobile si le mouvement est réduit.
 */
export function useDeviceTilt() {
  const reduce = useReducedMotion();
  const tilt = useSharedValue({ x: 0, y: 0 });
  const rest = useSharedValue<{ pitch: number; roll: number } | null>(null);
  const rotation = useAnimatedSensor(SensorType.ROTATION, { interval: 'auto' });
  useFrameCallback(() => {
    if (reduce) return;
    const s = rotation.sensor.get();
    const r = rest.get() ?? { pitch: s.pitch, roll: s.roll };
    const next = { pitch: r.pitch + (s.pitch - r.pitch) * 0.01, roll: r.roll + (s.roll - r.roll) * 0.01 };
    rest.set(next);
    const target = { x: clamp((s.roll - next.roll) / FULL_TILT), y: clamp((s.pitch - next.pitch) / FULL_TILT) };
    const cur = tilt.get();
    tilt.set({ x: cur.x + (target.x - cur.x) * 0.15, y: cur.y + (target.y - cur.y) * 0.15 });
  });
  return tilt;
}
