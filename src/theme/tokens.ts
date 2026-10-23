/**
 * DALILI — Design tokens
 * Source de vérité : Charte graphique DALILI + Design System Figma.
 * Ne jamais écrire une couleur / taille en dur dans un écran : toujours passer par ces tokens.
 */

export const palette = {
  // Marque
  navy: '#1F2850', // Bleu Sombre — couleur dominante, textes & structures
  navyDeep: '#0B1233', // fonds sombres (splash, hero cards)
  navyInk: '#141B3D',
  electric: '#014DF8', // Bleu Électrique — unique couleur d'action + rôle Étudiant
  electricLight: '#3D78FF',
  electricSoft: '#E6EEFF',

  // Rôles
  mentor: '#1FB17C',
  mentorSoft: '#E3F7EF',
  /** Vert du mentor sur fond nuit (étoile, icônes de la carte d'impact). */
  mentorGlow: '#7DE3B9',
  host: '#EA580C',
  hostSoft: '#FDEDE3',

  // Couleurs additionnelles (Design System)
  lilac: '#E9DDFF',
  blush: '#FFE1E1',
  cream: '#FFF3D6',

  // États
  success: '#16A34A',
  successSoft: '#E5F6EC',
  danger: '#E5484D',
  dangerSoft: '#FDE8E8',
  warning: '#F59E0B',
  warningSoft: '#FEF3DC',
  /** Texte sur warningSoft (contraste AA) : « À vérifier ». */
  warningInk: '#92600A',

  // Neutres
  white: '#FFFFFF',
  bg: '#F5F7FD',
  surface: '#FFFFFF',
  line: '#E4E8F3',
  muted: '#8A91AD',
  subtle: '#5B6384',
  black: '#0A0D1F',
  aiIndigo: '#5B5CF0',
  aiSoft: '#EEEDFF',
} as const;

/**
 * Tons des icônes (docs/DIRECTION.md §4) : tuile douce, trait foncé, remplissage translucide du même ton
 * (icône bicolore : les formes qui se superposent foncent, les détails restent visibles).
 * Le ton dit la famille (démarches, entraide, argent, urgence…), jamais l'action : celle-ci reste bleue.
 */
export const tones = {
  blue: { top: '#F1F5FF', bg: '#E2EAFF', ink: '#0B47D9', fill: '#0B47D933' },
  green: { top: '#EFFAF5', bg: '#DDF4E9', ink: '#11815A', fill: '#11815A33' },
  violet: { top: '#F4F3FF', bg: '#E7E5FF', ink: '#4F46E5', fill: '#4F46E533' },
  amber: { top: '#FFF8EB', bg: '#FDEFD2', ink: '#9A5B07', fill: '#C77A0C40' },
  orange: { top: '#FFF4EE', bg: '#FDE6D8', ink: '#C2410C', fill: '#C2410C33' },
  red: { top: '#FFF1F2', bg: '#FDE2E4', ink: '#C81E3A', fill: '#C81E3A33' },
  slate: { top: '#F5F7FB', bg: '#E9EDF5', ink: '#3A4466', fill: '#3A446629' },
} as const;

export type Tone = keyof typeof tones;

export type Role = 'student' | 'mentor' | 'host';

export const roleColors: Record<Role, { main: string; soft: string; label: string }> = {
  student: { main: palette.electric, soft: palette.electricSoft, label: 'Étudiant' },
  mentor: { main: palette.mentor, soft: palette.mentorSoft, label: 'Mentor' },
  host: { main: palette.host, soft: palette.hostSoft, label: 'Hôte' },
};

/** Échelle d'espacement (base 4). */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
} as const;

/** Bords arrondis systématiques (facteur d'harmonie). */
export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  xxl: 32,
  pill: 999,
} as const;

export const fonts = {
  // Montserrat — titres & logo
  displayBlack: 'Montserrat_900Black',
  displayBold: 'Montserrat_700Bold',
  displaySemi: 'Montserrat_600SemiBold',
  displayMedium: 'Montserrat_500Medium',
  // Open Sans — texte courant
  body: 'OpenSans_400Regular',
  bodySemi: 'OpenSans_600SemiBold',
  bodyBold: 'OpenSans_700Bold',
} as const;

export const type = {
  hero: { fontFamily: fonts.displayBold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  h1: { fontFamily: fonts.displayBold, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 25, letterSpacing: -0.2 },
  h3: { fontFamily: fonts.displaySemi, fontSize: 16, lineHeight: 21 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  smallStrong: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.bodySemi, fontSize: 11, lineHeight: 14 },
  overline: { fontFamily: fonts.displayBold, fontSize: 10.5, lineHeight: 14, letterSpacing: 1.1, textTransform: 'uppercase' as const },
  button: { fontFamily: fonts.displayBold, fontSize: 15, lineHeight: 20, letterSpacing: 0.1 },
} as const;

export type TypeVariant = keyof typeof type;

/** Ombres douces (élévation) — iOS + Android + web. */
export const shadow = {
  sm: {
    shadowColor: '#1F2850',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  md: {
    shadowColor: '#1F2850',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  glow: {
    shadowColor: '#014DF8',
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
} as const;

/** Mouvement — springs & durées partagés pour une sensation cohérente. */
export const motion = {
  spring: { damping: 18, stiffness: 220, mass: 0.9 },
  springSoft: { damping: 20, stiffness: 140 },
  springBouncy: { damping: 11, stiffness: 180 },
  /** Retour en place après un glissé du doigt (feuille relâchée) : ferme, sans dépassement visible. */
  springFirm: { damping: 32, stiffness: 320, mass: 1 },
  fast: 160,
  base: 260,
  slow: 420,
  stagger: 60,
  /** Nombre maximal de crans d'une cascade d'entrée (au-delà, tout arrive au dernier cran). */
  staggerMax: 6,
} as const;

/** « 3D » : perspective et inclinaisons maximales (voir docs/DIRECTION.md §5). */
export const depth = {
  perspective: 900,
  /** Inclinaison max au repos / au toucher (degrés). */
  tilt: 6,
  /** Inclinaison max pendant une entrée (degrés). */
  tiltEntrance: 12,
  /** Décalage max entre deux couches en parallaxe (px). */
  parallax: 12,
} as const;

export const gradients = {
  /** Fond haut d'écran (bleu lavande → blanc), comme sur le prototype. */
  screenTop: ['#9FB5FF', '#D9E2FF', '#F5F7FD'] as const,
  hero: ['#1A2257', '#0D1438'] as const,
  heroGlow: ['rgba(1,77,248,0.55)', 'rgba(1,77,248,0)'] as const,
  electric: ['#2F6BFF', '#014DF8'] as const,
  mentor: ['#2BC78F', '#169367'] as const,
  host: ['#F97A3A', '#D9480F'] as const,
  night: ['#1B2470', '#101656', '#0A0F3A'] as const,
  /** Couleur de Dalili IA (indigo → violet), utilisée pour le bouton central et le chat. */
  ai: ['#4D6BFF', '#7A5AF8'] as const,
  /** Dégradés pastel des écrans de questions (un par étape). */
  peach: ['#FFD7B5', '#FFF1E6', '#FFFFFF'] as const,
  sky: ['#9DB6FF', '#E3EAFF', '#FFFFFF'] as const,
  mint: ['#A5EBC8', '#E6F8EF', '#FFFFFF'] as const,
  lilac: ['#CDB6FF', '#EFE8FF', '#FFFFFF'] as const,
  /** Haut d'écran par rôle. */
  roleTop: {
    student: ['#9FB5FF', '#D9E2FF', '#F5F7FD'],
    mentor: ['#8EDFC0', '#D5F3E7', '#F5F8F7'],
    host: ['#FFC29E', '#FFE4D3', '#FBF7F5'],
  } as const,
};
