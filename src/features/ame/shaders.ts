/**
 * Monogramme DALILI en deux pièces (source : logo-dalili.svg, viewBox « -1 105 70 71 »).
 * Les deux pièces s'emboîtent : c'est ce qui permet à l'Âme de s'ouvrir, tourner et se reverrouiller.
 */
export const PIECE_BAS =
  'M45.83,124.17h-13.08s-12.61,12.62-12.61,12.62l6.87,6.9,10.2-10.03c.93-.48,3.49-.48,4.16.29l11.98,13.73-12.33,12.45c-1.41,1.43-2.43,2.99-4.05,4.34h-16.74c-1.73-1.43-2.84-2.99-4.25-4.58-5.09-5.75-10.17-11.5-15.26-17.25-.21-.22-.38-.39-.5-.5-.05-.04-.11-.1-.21-.14,0,0,0,0-.01,0,.1.12.08.58.08.84v14.73s14.37,16.39,14.37,16.39l26.56.04,2.49-2.55,23.38-23.49-21.05-23.8Z';
export const PIECE_HAUT =
  'M66.99,125.02l-14.38-16.39-26.56-.04-2.49,2.55L.19,134.62l21.05,23.8h13.08s12.61-12.62,12.61-12.62l-6.87-6.9-10.2,10.03c-.93.48-3.49.48-4.16-.29l-11.98-13.73,12.33-12.45c1.41-1.43,2.43-2.99,4.05-4.34h16.74c1.73,1.43,2.84,2.99,4.25,4.58l15.26,17.25c.28.32.46.55.73.65-.03-5.2-.05-10.39-.08-15.59Z';

/** Centre et taille du monogramme dans le repère du SVG. */
export const LOGO_CENTER = { x: 33.6, y: 140.5 };
export const LOGO_SIZE = 71;

/**
 * Face avant : lumière liquide. Cœur #EAF1FF → électrique #014DF8 → indigo #5B5CF0 vers l'extérieur,
 * un reflet diagonal (sweep) qui suit la rotation, et l'éclat de succès (flash).
 * Coordonnées du SVG : le shader bouge avec la face en 3D.
 */
export const FACE = `
uniform float2 c;
uniform float r;
uniform float t;
uniform float sweep;
uniform float glow;
uniform float flash;

const float3 CORE = float3(0.918, 0.945, 1.000);
const float3 ELEC = float3(0.004, 0.302, 0.973);
const float3 INDIGO = float3(0.357, 0.361, 0.941);

half4 main(float2 xy) {
  float2 p = (xy - c) / r;
  float d = length(p);
  // Courants lents : la lumière « coule » dans la matière.
  float flow = 0.12 * sin(p.x * 3.1 + t * 0.7) + 0.1 * sin(p.y * 4.3 - t * 0.5);
  float3 col = mix(ELEC, INDIGO, smoothstep(0.35, 1.05, d + flow));
  // Source de lumière intérieure (haut gauche), plus forte quand Dalili répond.
  float core = exp(-pow(length(p - float2(-0.22, -0.28)) * 1.25, 2.0));
  col = mix(col, CORE, core * (0.72 + 0.28 * glow));
  // Reflet qui balaie la face en diagonale.
  float band = exp(-pow((p.x + p.y) * 0.7 - sweep, 2.0) * 14.0);
  col = mix(col, CORE, band * 0.9);
  col = mix(col, float3(1.0), flash * 0.75);
  return half4(half3(col), 1.0);
}
`;
