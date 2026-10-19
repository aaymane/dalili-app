/**
 * Shaders SkSL de l'Âme de Dalili (docs/VISION.md §5).
 * Uniforms communs : res (taille en px), t (secondes), amp (écoute), swirl (réflexion),
 * pulse (réponse), flash (succès). Couleurs = palette.navyDeep / electric / aiIndigo + un bleu glacier.
 * Sortie en alpha prémultiplié : le canvas est transparent, l'Âme se pose sur n'importe quel fond.
 */

const COMMON = `
uniform float2 res;
uniform float t;
uniform float amp;
uniform float swirl;
uniform float pulse;
uniform float flash;

const float3 NAVY = float3(0.043, 0.071, 0.200);
const float3 ELEC = float3(0.004, 0.302, 0.973);
const float3 INDIGO = float3(0.357, 0.361, 0.941);
const float3 ICE = float3(0.650, 0.780, 1.000);

float hash(float2 p) { return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + float2(1.0, 0.0)), u.x),
             mix(hash(i + float2(0.0, 1.0)), hash(i + float2(1.0, 1.0)), u.x), u.y);
}

// 3 octaves maximum : budget GPU d'un téléphone milieu de gamme.
float fbm(float2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p = p * 2.03 + float2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

float2 rotate(float2 p, float a) {
  return float2(cos(a) * p.x - sin(a) * p.y, sin(a) * p.x + cos(a) * p.y);
}
`;

/** Variante A · Perle liquide : sphère nette, liseré de Fresnel, courants de lumière intérieurs. */
export const PERLE = `${COMMON}
half4 main(float2 xy) {
  float2 p = (xy - res * 0.5) / (res.y * 0.5);
  float breathe = 1.0 + 0.02 * sin(t * 1.0472) + 0.035 * pulse;
  float R = 0.6 * breathe;
  float r = length(p);
  float tt = t * 0.12 * (1.0 + 2.0 * swirl);

  float2 q = rotate(p, swirl * 1.6 * (1.0 - r) + tt * 0.5);
  float2 w = float2(fbm(q * 1.6 + tt), fbm(q * 1.6 - tt + 3.1));
  float n = fbm(q * 2.2 + w * (1.6 + amp * 1.6) + float2(0.0, tt));

  // Volume : lumière venant d'en haut à gauche, ombre indigo en bas à droite.
  float light = clamp(0.55 - dot(p / R, float2(0.45, 0.55)) * 0.5, 0.0, 1.0);
  float3 col = mix(NAVY, ELEC, smoothstep(0.15, 0.7, n) * (0.6 + 0.6 * light));
  col += INDIGO * 0.12 * (1.0 - light);
  col = mix(col, INDIGO, smoothstep(0.5, 0.9, w.x) * (1.0 - light) * 0.8);
  // Veines de lumière liquide : crêtes fines du bruit.
  float vein = 1.0 - abs(n - 0.55) * 9.0;
  col += mix(ELEC, ICE, 0.6) * pow(clamp(vein, 0.0, 1.0), 3.0) * (0.55 + 0.5 * light + 0.4 * amp);

  float edge = clamp(r / R, 0.0, 1.0);
  col += mix(ELEC, INDIGO, 0.3) * pow(edge, 5.0) * 0.75 + ICE * pow(edge, 18.0) * 0.35;
  float spec = exp(-pow(length(p - float2(-0.28, -0.32) * R) / (0.2 * R), 2.0));
  col += ICE * spec * 0.3;
  col += float3(1.0) * flash * 0.55;

  float inside = 1.0 - smoothstep(R - 0.012, R + 0.012, r);
  float glow = exp(-pow(max(r - R, 0.0) * 4.5, 1.2)) * (0.5 + 0.25 * pulse + 0.6 * flash);
  float a = inside + (1.0 - inside) * glow * 0.6;
  float3 c = mix(mix(ELEC, INDIGO, 0.4), col, inside);
  return half4(half3(c * a), half(a));
}
`;

/** Variante B · Aurore : nébuleuse sans bord, rubans de lumière qui tournent dans un halo. */
export const AURORE = `${COMMON}
half4 main(float2 xy) {
  float2 p = (xy - res * 0.5) / (res.y * 0.5);
  float breathe = 1.0 + 0.03 * sin(t * 1.0472) + 0.05 * pulse;
  p /= breathe;
  float r = length(p);
  float tt = t * 0.1 * (1.0 + 2.5 * swirl);
  float2 q = rotate(p, tt * 0.6 + swirl * 2.0 * (1.0 - r));
  float a = atan(q.y, q.x);
  float n = fbm(q * 1.8 + float2(tt, -tt * 0.7));

  float3 col = float3(0.0);
  float alpha = 0.0;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float ph = a * 2.0 + fk * 2.1 + tt * (1.0 + fk * 0.3) + n * 3.0;
    float wob = fbm(q * 2.6 + float2(fk * 4.0, tt * 1.3));
    float ring = 0.26 + fk * 0.12 + 0.07 * sin(ph) + 0.22 * (wob - 0.5) * (1.0 + amp * 2.0);
    float band = exp(-pow((r - ring) / (0.045 + 0.03 * amp), 2.0)) * pow(0.5 + 0.5 * sin(ph), 1.5);
    col += mix(ELEC, INDIGO, fk * 0.5) * band;
    alpha += band * 0.7;
  }
  float core = exp(-pow(r / 0.24, 2.0));
  col += mix(ELEC, ICE, 0.25) * core * (0.8 + 0.3 * pulse);
  alpha += core * 0.85;
  col += ICE * flash * exp(-r * r * 3.0) * 0.9;
  alpha += flash * exp(-r * r * 3.0) * 0.6;

  float mask = 1.0 - smoothstep(0.62, 0.98, r);
  alpha = clamp(alpha * mask, 0.0, 1.0);
  col = min(col * mask, float3(alpha)); // reste prémultiplié
  return half4(half3(col), half(alpha));
}
`;
