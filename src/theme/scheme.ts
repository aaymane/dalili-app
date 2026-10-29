/**
 * Le thème vivant : clair, sombre, ou celui du téléphone (Automatique), changé sans redémarrer l'app.
 *
 * - `useTheme()` : les couleurs, tons, dégradés et ombres du thème en cours ;
 * - `makeStyles((t) => ({ … }))` : des styles qui suivent le thème (deux feuilles en cache, une par thème) ;
 * - `useAppearance` : le choix de l'utilisateur (Profil › Apparence), gardé sur le téléphone.
 *
 * Tant que tous les écrans ne sont pas passés au thème vivant (`DARK_MODE_READY`), l'app reste en clair.
 */
import { StyleSheet, useColorScheme, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/lib/storage';

import { darkGradients, darkPalette, darkShadow, darkTones, gradients, lightPalette, lightTones, shadow, type Palette, type ShadowSet, type ToneSet } from './tokens';

/** Passe à `true` quand tous les écrans lisent leurs couleurs dans le thème vivant. */
export const DARK_MODE_READY = true;

export type Scheme = 'light' | 'dark';
export type Preference = 'system' | Scheme;

export const useAppearance = create<{ preference: Preference; setPreference: (p: Preference) => void }>()(
  persist((set) => ({ preference: 'system', setPreference: (preference) => set({ preference }) }), { name: 'dalili.appearance', storage: persistStorage }),
);

/** Le thème en cours : le choix de l'utilisateur, ou celui du téléphone en Automatique. */
export function useScheme(): Scheme {
  const system = useColorScheme();
  const preference = useAppearance((s) => s.preference);
  if (!DARK_MODE_READY) return 'light';
  if (preference === 'system') return system === 'dark' ? 'dark' : 'light';
  return preference;
}

export type Theme = {
  scheme: Scheme;
  c: Palette;
  tones: ToneSet;
  gradients: typeof gradients | typeof darkGradients;
  shadow: ShadowSet;
};

const THEMES: Record<Scheme, Theme> = {
  light: { scheme: 'light', c: lightPalette, tones: lightTones, gradients, shadow },
  dark: { scheme: 'dark', c: darkPalette, tones: darkTones, gradients: darkGradients, shadow: darkShadow },
};

export const themeFor = (scheme: Scheme) => THEMES[scheme];

export function useTheme(): Theme {
  return THEMES[useScheme()];
}

/** Raccourci : seulement les couleurs. */
export function useColors(): Palette {
  return useTheme().c;
}

/**
 * Des styles qui suivent le thème, écrits comme un `StyleSheet.create` :
 *   const useStyles = makeStyles(({ c }) => ({ card: { backgroundColor: c.card } }));
 *   const styles = useStyles();
 * Chaque thème n'est calculé qu'une fois.
 */
type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

export function makeStyles<T extends NamedStyles>(factory: (t: Theme) => T) {
  const cache: Partial<Record<Scheme, T>> = {};
  return function useStyles(): T {
    const scheme = useScheme();
    return (cache[scheme] ??= StyleSheet.create(factory(THEMES[scheme])));
  };
}
