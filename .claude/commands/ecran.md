---
description: Construire un écran DALILI à partir d'une maquette (image/SVG Figma) en respectant le design system
argument-hint: <nom de l'écran + description, maquette jointe>
---

Construis l'écran suivant pour DALILI : $ARGUMENTS

Méthode (lis d'abord CLAUDE.md) :
1. Analyse la maquette jointe : liste les sections, les composants du kit réutilisables (`src/components/ui`, `layout`, `feedback`), les tokens de couleur correspondants et les états à prévoir (vide, chargement, erreur, succès).
2. Propose en 5 lignes max la structure (route, fichiers, données) puis implémente directement.
3. Utilise exclusivement : `Text`, `Button`, `PressableScale`, `Screen`, `AppHeader`, les tokens de `src/theme/tokens.ts` et `useRoleTheme()`. S'il manque un composant réutilisable, ajoute-le dans `src/components/ui/` (documenté, typé).
4. Ajoute le « wow » : entrées en cascade Reanimated (`FadeInDown.delay(i*60).springify()`), haptique (`src/lib/haptics.ts`), `toast()` / `SuccessModal` / `celebrate()` quand une action réussit.
5. Données via `src/data/hooks.ts` + `src/data/api.ts` (mode démo ET Supabase). Nouvelle table → migration SQL avec RLS.
6. Termine par `npm run typecheck && npm run lint`, corrige tout, fais tester sur téléphone (Expo Go) et sur le web, puis donne les commandes de commit à copier (message clair en français).
