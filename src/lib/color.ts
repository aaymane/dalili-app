const rgb = (hex: string) => {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Mélange deux couleurs « #RRGGBB » : `t` = 0 donne `a`, 1 donne `b`. */
export function mix(a: string, b: string, t: number) {
  const [x, y] = [rgb(a), rgb(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Lavis du haut d'un écran aux couleurs d'un groupe ou d'un événement, qui se fond dans le fond de page.
 * Couleurs opaques déjà mélangées : iOS passe mal d'une couleur transparente à une opaque (bord visible).
 */
export function wash(color: string, bg: string) {
  return [mix(color, bg, 0.62), mix(color, bg, 0.88), bg] as const;
}
