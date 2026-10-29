import 'i18next';

import type fr from './locales/fr.json';

// Les clés de traduction sont vérifiées par TypeScript, à partir du fichier français (la référence).
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof fr };
  }
}
