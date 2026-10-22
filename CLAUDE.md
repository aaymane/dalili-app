# DALILI — Guide pour Claude Code

@AGENTS.md

DALILI est l'application mobile gratuite qui accompagne les étudiants du Maghreb (Maroc, Algérie, Tunisie) de Campus France jusqu'à leur installation en France — « le grand frère / la grande sœur numérique ».
Promesse : transformer un parcours anxiogène en expérience guidée. Trois piliers UX : **réduire la charge mentale**, **personnaliser**, **concevoir la confiance**.

Rôles : **Étudiant** (MVP, bleu `#014DF8`), **Mentor** (MVP, vert `#1FB17C`), **Hôte** (V2, orange `#EA580C`) — un seul compte, un sélecteur de rôle.

## Commandes

```bash
npm start                 # serveur de dev (Expo Go / dev build / web)
npm run typecheck         # tsc --noEmit
npm run lint              # eslint
npx expo install <pkg>    # TOUJOURS pour ajouter un paquet natif (versions compatibles SDK)
npx expo export -p web    # vérifier que tout compile
```

## Architecture

- `src/app/` = routes uniquement (Expo Router). La logique et les sous-composants vont dans `src/features/<domaine>/`.

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
12. **Git** : Claude ne commite pas et ne pousse pas. **À la fin de chaque étape**, il donne les commandes git à copier (`git add` fichier par fichier, `git commit` en français, `git push`) pour chaque dépôt touché, puis attend le « poussé » avant l'étape suivante. Jamais `git add -A` sur le site, jamais `.claude/settings.json` ni de fichier contenant une clé ou un email personnel. On ne perd plus jamais de code.

Écran à partir d'une maquette Figma : commande `/ecran`.

## Définition de « terminé »

- [ ] `npm run typecheck` et `npm run lint` passent
- [ ] L'écran marche en mode démo ET avec Supabase
- [ ] Animations d'entrée + feedback tactile + états vides
- [ ] Textes en français, tutoiement, sans jargon
- [ ] Commandes de commit données (c'est l'utilisateur qui commite)

## Contexte produit

- MVP (MoSCoW) : Must → Parcours-quête (stepper + calendrier), fiches de clarification, mentorat (réservation + appel), communauté & événements par ville. Should → Dalili IA. Won't (V2) → Hôte.
- Recherche : 82 % jugent la préparation difficile, 15 % font confiance aux infos trouvées, 74 % redoutent l'isolement.
- Dalili IA = UN seul cerveau, celui du site (`lib/assistant/answer.ts`) : l'app appelle `/api/v1/assistant` (session Supabase, quota par compte, streaming) via `src/features/ai/api.ts`, ou `/api/assistant` en mode démo. L'app n'écrit jamais de réponse elle-même.
- Supabase : un seul projet, celui du site (`dalili.web`). Toute migration passe par `npm run test:migrations` avant la prod (voir `docs/SUPABASE.md`).
- Le site dalili.study (75 guides) est la SEULE source du contenu administratif : l'app le lit via `/api/content/v1` (`src/data/content.ts`, `useContent`, `useGuide`). Ne jamais écrire un montant ou une démarche en dur dans l'app : on corrige le site. Instantané hors ligne : `npm run content:snapshot`.
- Feuille de route détaillée : `docs/ROADMAP.md`.
