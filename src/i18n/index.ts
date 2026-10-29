/**
 * Les langues de l'app : français (référence), arabe (de droite à gauche) et anglais, changées sans redémarrer.
 *
 * - `useT()` : la fonction `t('profile.language')` du composant, qui suit la langue en cours ;
 * - `t(…)` hors d'un composant (toasts, alertes) : lu au moment de l'appel, donc toujours dans la bonne langue ;
 * - `useLanguage` : le choix de l'utilisateur (Profil › Langue), gardé sur le téléphone ;
 * - `useDirection()` / `useIsRTL()` : le sens de lecture, appliqué à la racine de l'app et de chaque feuille.
 *
 * Le français est la source : une clé ajoutée dans `fr.json` doit l'être aussi dans `ar.json` et `en.json`
 * (le test `i18n/__tests__/locales-test.ts` le vérifie). Le contenu administratif (guides, étapes) vient du site
 * et reste en français tant que l'équipe ne l'a pas fait valider dans une autre langue.
 */
import 'intl-pluralrules';

import { getLocales, useLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { useEffect } from 'react';
import { initReactI18next, useTranslation } from 'react-i18next';
import { I18nManager, Platform } from 'react-native';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/lib/storage';

import ar from './locales/ar.json';
import en from './locales/en.json';
import fr from './locales/fr.json';

export const LANGUAGES = ['fr', 'ar', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];
export type LanguagePreference = 'system' | Language;

/** Le nom de chaque langue, écrit dans cette langue (pour le sélecteur). */
export const LANGUAGE_NAMES: Record<Language, string> = { fr: 'Français', ar: 'العربية', en: 'English' };

const isLanguage = (code: string | null | undefined): code is Language => LANGUAGES.includes(code as Language);

/** La langue du téléphone si l'app la parle, sinon le français. */
export function systemLanguage(): Language {
  const found = getLocales().find((l) => isLanguage(l.languageCode));
  return isLanguage(found?.languageCode) ? found.languageCode : 'fr';
}

export const resolveLanguage = (p: LanguagePreference): Language => (p === 'system' ? systemLanguage() : p);

export const isRTLLanguage = (l: Language) => l === 'ar';

// Le sens de lecture est décidé par l'app (racine en `direction: 'rtl'`), pas par le téléphone : sinon un téléphone
// en arabe inverserait aussi l'app en français, et la bascule demanderait un redémarrage.
if (Platform.OS !== 'web') {
  I18nManager.allowRTL(false);
  I18nManager.swapLeftAndRightInRTL(false);
}

// Une instance à nous (et non l'instance globale d'i18next), branchée sur React.
const i18n = createInstance();
void i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, ar: { translation: ar }, en: { translation: en } },
  lng: systemLanguage(),
  fallbackLng: 'fr',
  // React échappe déjà le texte.
  interpolation: { escapeValue: false },
  returnNull: false,
});

export const useLanguage = create<{ preference: LanguagePreference; setPreference: (p: LanguagePreference) => void }>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => {
        set({ preference });
        void i18n.changeLanguage(resolveLanguage(preference));
      },
    }),
    {
      name: 'dalili.language',
      storage: persistStorage,
      onRehydrateStorage: () => (state) => {
        if (state) void i18n.changeLanguage(resolveLanguage(state.preference));
      },
    },
  ),
);

/** À la racine : en « Langue du téléphone », suit un changement de langue fait dans les réglages. */
export function useLanguageSync() {
  const locales = useLocales();
  const preference = useLanguage((s) => s.preference);
  useEffect(() => {
    if (preference !== 'system') return;
    const code = locales.find((l) => isLanguage(l.languageCode))?.languageCode;
    void i18n.changeLanguage(isLanguage(code) ? code : 'fr');
  }, [locales, preference]);
}

/** La langue affichée en ce moment. */
export function useCurrentLanguage(): Language {
  const { i18n: instance } = useTranslation();
  return isLanguage(instance.language) ? instance.language : 'fr';
}

export function useIsRTL() {
  return isRTLLanguage(useCurrentLanguage());
}

export function useDirection(): 'ltr' | 'rtl' {
  return useIsRTL() ? 'rtl' : 'ltr';
}

/** `const t = useT();` puis `t('common.cancel')` ou `t('profile.stepsLeft', { count: 3 })`. */
export function useT() {
  return useTranslation().t;
}

/** Hors d'un composant : la traduction dans la langue en cours, au moment de l'appel. */
export const t = i18n.t.bind(i18n);

/** La langue en cours, hors d'un composant (dates, nombres). */
export const currentLanguage = (): Language => (isLanguage(i18n.language) ? i18n.language : 'fr');

export { i18n };
