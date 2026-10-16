---
description: Vérifier la qualité du projet (types, lint, build web) et corriger les problèmes
---

Lance et corrige jusqu'à ce que tout passe :
1. `npm run typecheck`
2. `npm run lint`
3. `npx expo export --platform web --output-dir /tmp/dalili-web` (doit compiler sans erreur)
4. `npx expo-doctor` si une dépendance a changé

Ensuite fais une revue rapide des fichiers modifiés depuis le dernier commit (`git diff --stat`) :
- couleurs en dur au lieu des tokens ? composants RN bruts au lieu du kit ?
- sélecteurs Zustand qui renvoient un nouveau tableau ?
- appels `supabase` directs dans un écran ?
- textes sans tutoiement ou avec du jargon non expliqué ?
Résume en 5 lignes ce que tu as corrigé.
