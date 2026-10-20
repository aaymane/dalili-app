# DALILI — Guide pour Claude Code

@AGENTS.md

DALILI est l'application mobile gratuite qui accompagne les étudiants du Maghreb (Maroc, Algérie, Tunisie) de Campus France jusqu'à leur installation en France — « le grand frère / la grande sœur numérique ».
Promesse : transformer un parcours anxiogène en expérience guidée. Trois piliers UX : **réduire la charge mentale**, **personnaliser**, **concevoir la confiance**.

Rôles : **Étudiant** (MVP, bleu `#014DF8`), **Mentor** (MVP, vert `#1FB17C`), **Hôte** (V2, orange `#EA580C`) — un seul compte, un sélecteur de rôle.

## Stack

- Expo SDK 57 (Expo Go App Store) · React Native 0.86 · React 19 (React Compiler activé) · TypeScript strict
- Expo Router (routes typées) · Reanimated 4 · Skia (l'Âme de Dalili) · react-native-svg · expo-linear-gradient · expo-haptics
- Supabase (Postgres + RLS, Auth email/OTP + Google/Apple, Edge Functions) · TanStack Query · Zustand (persisté)
- Icônes : `lucide-react-native` · Polices : Montserrat (titres) + Open Sans (texte)

## Commandes

```bash
npm start                 # serveur de dev (Expo Go / dev build / web)
npm run typecheck         # tsc --noEmit
npm run lint              # eslint
npx expo install <pkg>    # TOUJOURS pour ajouter un paquet natif (versions compatibles SDK)
npx expo export -p web    # vérifier que tout compile
```

## Architecture

```
src/
  app/                    # ROUTES UNIQUEMENT (Expo Router)
    _layout.tsx           # polices, providers, gardes d'accès (Stack.Protected)
    (auth)/               # accueil, connexion, inscription 2 étapes, OTP
    (onboarding)/         # bienvenue + photo, situation, questions étudiant/mentor, chargement
    (app)/(tabs)/         # Accueil · Explorer · Dalili IA · Communauté · Profil
    (app)/…               # parcours, etape/[id] (fiche), mentor/[id], groupe/[id], evenement/[id], guide/[id], outils/…
  components/
    ui/                   # Text, Button, Card, Input, Tag/StatusPill/Chip, Avatar, ProgressRing, Segmented, Calendar, OptionCard…
    layout/               # Screen, AppHeader, TabBar, StepHeader, NightBackground
    feedback/             # BottomSheet, SuccessModal, Confetti (celebrate()), Toast (toast())
    brand/                # LogoMark (SVG vectorisé), LogoOrb, Glow, logos Google/Apple
  features/               # logique métier par domaine (store, contenu, composants spécifiques)
    auth/ profile/ journey/ guides/ mentors/ community/ ai/ home/
  data/                   # accès données : api.ts (Supabase OU démo), hooks.ts (React Query), local-db.ts, demo.ts
  lib/                    # supabase, env, haptics, dates, storage
  theme/                  # tokens.ts (SOURCE DE VÉRITÉ du design) + useRoleTheme()
supabase/
  migrations/             # schéma SQL + RLS (testé)
  seed.sql                # mentors, groupes, événements de départ
  functions/dalili-ia/    # Edge Function → Claude (clé Anthropic côté serveur)
```

## Règles d'or (à respecter à chaque modification)

1. **Design tokens obligatoires** : couleurs, rayons, ombres, typo, mouvements → `src/theme/tokens.ts`. Jamais de couleur en dur dans un écran (sauf dégradés décoratifs ponctuels).
2. **Toujours les composants du kit** : `Text` (jamais `<Text>` de RN), `Button`, `PressableScale` pour tout ce qui est cliquable (ressort + haptique), `Screen` comme gabarit, `BottomSheet`/`SuccessModal` pour les modales.
3. **Une seule couleur d'action** : bleu électrique (ou la couleur du rôle actif via `useRoleTheme()`). Les rôles se reconnaissent à leur couleur, sans lire un mot.
4. **Animations** : Reanimated uniquement. Entrées en cascade `FadeInDown.delay(i * 60).springify()`, ressorts de `motion` dans les tokens, `LinearTransition` pour les listes qui bougent. Pour modifier une shared value : `sv.set(…)` (compatible React Compiler), jamais `sv.value = …`.
5. **Retour haptique** via `src/lib/haptics.ts` (`tap`, `select`, `success`…), jamais `expo-haptics` directement. Célébrer les victoires avec `celebrate()`.
6. **Données** : les écrans n'appellent JAMAIS `supabase` directement → passer par `src/data/api.ts` / `hooks.ts` ou l'`api.ts` de la feature. Chaque fonction doit marcher en **mode démo** (sans clés) ET avec Supabase.
7. **Nouvelle table = RLS** : toute table créée dans `supabase/migrations/` active la RLS avec des policies « l'utilisateur ne voit/modifie que ce qui le concerne ». Nouveau fichier de migration daté, ne jamais modifier une migration déjà appliquée.
8. **Zustand** : un sélecteur ne doit jamais renvoyer un nouveau tableau/objet (`useStore(s => s.list.filter(…))` = boucle infinie). Sélectionne la donnée brute puis filtre en dehors.
9. **Ton** : français, tutoiement, bienveillant, phrases courtes, zéro jargon non expliqué. Les sigles passent par le lexique : `[[CAF]]` dans un texte rendu par `RichText` devient cliquable.
10. **Accessibilité** (WCAG AA) : `accessibilityLabel` sur les boutons icônes, cibles ≥ 44 px, contraste suffisant, `maxFontSizeMultiplier` déjà géré par `Text`.
11. **Contenu administratif** (`features/journey/steps.ts`, `features/guides/*`) : montants toujours avec « ≈ », lien vers la source officielle, à faire valider par l'équipe.
12. **Git** : commit après chaque fonctionnalité qui marche, push sur GitHub au moins une fois par session. On ne perd plus jamais de code.

## Créer un écran à partir d'une maquette Figma

1. Analyser la maquette : structure, composants existants réutilisables, couleurs ↔ tokens, états (vide, chargement, erreur, succès).
2. Route dans `src/app/(app)/…` (ou le bon groupe). Logique et sous-composants dans `src/features/<domaine>/`.
3. Construire avec le kit UI. S'il manque un composant réutilisable → l'ajouter dans `components/ui/` (documenté, typé).
4. Ajouter les micro-interactions : entrée animée, `PressableScale`, haptique, états vides soignés, `toast()`/`SuccessModal` pour confirmer.
5. Données : hook dans `data/hooks.ts` + fonction dans `data/api.ts` (démo + Supabase) + migration SQL si besoin.
6. Vérifier : `npm run typecheck && npm run lint`, puis tester sur téléphone (Expo Go) et sur le web.

## Définition de « terminé »

- [ ] `npm run typecheck` et `npm run lint` passent
- [ ] L'écran marche en mode démo ET avec Supabase
- [ ] Animations d'entrée + feedback tactile + états vides
- [ ] Textes en français, tutoiement, sans jargon
- [ ] Commit fait

## Contexte produit

- MVP (MoSCoW) : Must → Parcours-quête (stepper + calendrier), fiches de clarification, mentorat (réservation + appel), communauté & événements par ville. Should → Dalili IA. Won't (V2) → Hôte.
- Recherche : 82 % jugent la préparation difficile, 15 % font confiance aux infos trouvées, 74 % redoutent l'isolement.
- Le site dalili.study (75 guides) est la SEULE source du contenu administratif : l'app le lit via `/api/content/v1` (`src/data/content.ts`, `useContent`, `useGuide`). Ne jamais écrire un montant ou une démarche en dur dans l'app : on corrige le site. Instantané hors ligne : `npm run content:snapshot`.
- Feuille de route détaillée : `docs/ROADMAP.md`.
