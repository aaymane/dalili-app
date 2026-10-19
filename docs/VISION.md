# DALILI — Vision et plan (site ↔ app)

> Statut : **proposition à valider**. Rien n'est codé avant ton accord, sauf le labo de l'Âme (§5.1), un prototype jetable pour choisir la variante.
> Prérequis : `docs/AUDIT.md`. Respecte `docs/DIRECTION.md` et `src/theme/tokens.ts`.

---

## 1. Principe : une source, un cerveau, deux vitrines

```
                    ┌──────────────────────── dalili.study (Next.js, Vercel) ────────────────────────┐
  content/*.mdx ───►│ lib/content/  (parseur unique : frontmatter, KeyFacts, FAQ, blocs)              │
  lib/data/*.ts ───►│   ├─ pages SEO (inchangées)                                                    │
                    │   ├─ /api/content/v1/*.json  (statique, CDN, noindex)  ◄───────────── app ─────┤
                    │   └─ scripts/generate-embeddings ──► content_chunks (Supabase dalili.web)      │
                    │ lib/assistant/  (cerveau unique : recherche + prompt + citations + langues)    │
                    │   ├─ /api/assistant      (site, anonyme, limite par IP)                         │
                    │   └─ /api/v1/assistant   (app, JWT Supabase, limite par utilisateur, contexte)  │
                    │   └─ /api/v1/document    (« Explique-moi ce papier »)                          │
                    └────────────────────────────────────────────────────────────────────────────────┘
                                    ▲ même projet Supabase « dalili.web »
            dalili-app (Expo) ──────┘ auth, profils, parcours, mentors, communauté (migrations de l'app)
```

### 1.1 Décision n° 1 : un seul projet Supabase

Je recommande de **migrer l'app vers le projet `dalili.web`**, celui du site. Ses migrations n'ont jamais été appliquées nulle part, donc ça ne coûte rien aujourd'hui. On y gagne :
- la continuité site → app devient une simple jointure SQL sur un email **vérifié** ;
- le site peut vérifier le JWT de l'app (`supabase.auth.getUser`) sans échange de secrets ;
- un seul tableau de bord, une seule RLS et une seule facture.

Le projet « aaymane's Project » contient d'autres tables (`projects`, `profile`) : **on n'y touche pas**.

### 1.2 Décision n° 2 : le cerveau reste dans le site

| Option | Pour | Contre |
|---|---|---|
| **A. L'app appelle le site (`/api/v1/assistant`)** ✅ | Le code est déjà en prod, testé et journalisé. Il est **littéralement le même** pour les deux. L'indexation vit à côté des guides. Zéro réécriture. | Dépend de Vercel (déjà le cas pour le site). |
| B. On déplace tout dans une Edge Function Supabase | Proche de la base. | Il faut réécrire en Deno. Le site devrait appeler l'Edge Function, ce qui ajoute un saut. Pendant la migration, on aurait deux cerveaux, exactement ce qu'on veut éviter. |

→ **Option A.** On extrait d'abord un module `lib/assistant/answer.ts` (recherche → seuil → génération → validation) appelé par les deux routes. Les routes ne diffèrent que par l'authentification, la limite de débit et le contexte. On **supprime** ensuite l'Edge Function `dalili-ia` de l'app.

Améliorations du cerveau, valables **pour les deux** vitrines :
1. **Vrai streaming** : les deltas partent tout de suite. Seule la ligne `SOURCES_USED`/`FLAGS` est retenue en mémoire.
2. **Contexte de recherche** (app seulement, optionnel) : `{country, stepId}`. Il sert **uniquement** à favoriser les extraits du bon pays (+0,03 de similarité si `cluster` = pays, et on exclut les guides d'un autre pays). Il ne va **jamais** dans le prompt sous forme de « faits ». Le ton peut utiliser le prénom.
3. **Drapeaux structurés** en fin de réponse : `FLAGS: [legal, stress, complex]`, sur une liste blanche validée comme les sources. L'UI s'en sert pour afficher « Ce n'est pas un conseil juridique », proposer un mentor ou la carte 3114. Une détection locale par regex de la détresse s'ajoute, pour ne pas dépendre du modèle.
4. **Événement `meta`** avec `query_id`, `lang`, `updatedDate` des sources. Il permet le bouton « Cette réponse est fausse » → table `assistant_feedback`.
5. **Actions déterministes** : le serveur traduit les **sources citées** en actions (slug → étape grâce à la table de correspondance). Le modèle n'invente donc aucune action.
6. **KPI** : le taux de refus (47 % aujourd'hui) est suivi chaque semaine. Les questions sans réponse alimentent la liste des guides à écrire.

### 1.3 L'API de contenu (`/api/content/v1/`)

Ce sont des route handlers Next en `force-static`, générés au build depuis `lib/content/`, la **même** source que les pages. Ils sont servis par le CDN, avec un en-tête `X-Robots-Tag: noindex`. **Aucun effet sur le SEO ni sur les pages.**

| Fichier | Contenu |
|---|---|
| `manifest.json` | version, `generatedAt`, liste des guides (slug, titre, catégorie, cluster, `countries[]`, `updatedDate`, extrait, `hash`) |
| `guides/[slug].json` | `summary`, `keyFacts[]` (+ source), `documents[]`, `faq[]`, `sources[]`, `blocks[]` (h2, p, liste, tableau, callout, lien), `readTime`, `url` |
| `journey.json` | étapes du Parcours-quête → guides par pays (§2.2), fenêtres, conditions d'affichage |
| `cities.json` · `universities.json` · `countries.json` | données de `lib/cities.ts`, `lib/universities.ts`, pays + Liban |
| `figures.json` | `regulatory-figures.ts` complet (paliers datés) + `fraisCefMaroc`, `taxeValidationVlsTs`, `smicHoraire`, `heuresTravail` (964 / 803 DZ), repas au resto U |
| `tools.json` | paramètres du simulateur, générateur du calendrier, scores du comparateur + **cas de test de référence** |
| `glossary.json` | le lexique de l'app, déplacé côté site (il pourra aussi servir sur le site) |

**Frontmatter optionnel ajouté** aux 35 guides cartographiés. Il est invisible sur les pages et n'a aucun effet SEO :
```yaml
appSummary: "Le compte bloqué prouve au consulat que tu peux vivre en France. Il te faut 877,50 € par mois."
countries: [MA, DZ, TN, SN, LB, CI, CM]   # ou un sous-ensemble
documents: ["Passeport", "Attestation de pré-inscription"]
sources:
  - { label: "Service-public.fr — F2231", url: "https://www.service-public.gouv.fr/..." }
```
Les chiffres dans `appSummary` sont relus par l'équipe (règle 11). Une étape sans guide n'affiche **aucun** chiffre.

**Côté app** : `src/data/content.ts`, avec des hooks React Query (`useGuide`, `useJourney`, `useFigures`…). Les données sont persistées dans AsyncStorage (`@tanstack/query-async-storage-persister`, du pur JS compatible Expo Go), avec `staleTime` de 24 h et `gcTime` de 30 jours. Un **instantané embarqué** (`assets/content-snapshot.json`) est produit par un script au moment du build : il garantit un premier lancement hors ligne. Chaque fiche affiche « Mis à jour le … » et le lien « Lire sur dalili.study ».

### 1.4 Ce qu'on supprime dans l'app
`features/guides/guides.ts`, les textes de `steps.ts` (il ne reste qu'icônes et logique), `data/cities.ts`, `supabase/functions/dalili-ia`, `brain.ts`. Le mode démo lit alors l'instantané embarqué et répond « Dalili a besoin d'internet pour répondre » au lieu d'inventer.

---

## 2. Le Parcours-quête unifié

### 2.1 Pays
`Country = 'MA' | 'DZ' | 'TN' | 'SN' | 'CI' | 'CM' | 'LB' | 'other'`. Le store Zustand passe en version 2 avec une migration (les anciennes valeurs sont conservées). L'onboarding affiche 7 drapeaux + « Autre ». Pour CI, CM et « Autre », l'app dit honnêtement « Guide spécifique bientôt, voici le guide général ».

### 2.2 Étapes → guides

| Étape (id) | Phase | Guide(s) — `{pays}` selon le profil | Nouveau |
|---|---|---|---|
| `bourses` | avant (−330 j) | `bourses-etudes-france-etudiants-tunisiens` (TN), `bourses-etudiants-senegalais-france-2026` (SN), `bourses-etudiants-libanais-france-2026` (LB), sinon `bourses-etudes-etudiants-etrangers-france-2026` | ✅ |
| `tcf` | avant | `tcf-maroc-2026-guide-complet` (MA), `tcf-tunisie-centres-dates-2026` (TN), `tcf-senegal-dakar-guide-2026` (SN), sinon `delf-dalf-vs-tcf-etudiant-etranger-france` | |
| `ecole` | avant | `ecole-privee-france-reconnue-etat-comment-verifier`, `ecole-privee-vs-universite-publique-etudiant-etranger`, `lettre-motivation-campus-france-exemple-2026` | |
| `documents` | avant (−240 j) | `apostille-legalisation-traduction-documents-etudiant-etranger` | ✅ |
| `campus-france` | avant | `campusfrance-maroc-guide-complet` · `campusfrance-algerie-guide-entretien-2026` · `campusfrance-tunisie-guide-complet-2026` · `campusfrance-senegal-guide-inscription-dakar` · `campus-france-liban-procedure-2026` · CI/CM → page pays | |
| `ressources` (compte bloqué) | avant (−120 j) | `compte-bloque-visa-etudiant-france-guide` | ✅ |
| `visa` | avant | `visa-etudiant-france-{maroc,algerie,tunisie,senegal,liban}-2026` | |
| `logement` | avant | `logement-crous-etudiant-etranger-demande`, `trouver-logement-france-depuis-etranger` | |
| `garant` | avant | `garant-logement-etudiant-etranger-france`, `visale-refuse-proprietaire-que-faire` | |
| `cvec` | avant | *(aucun guide dédié)* → chiffre lu dans `figures.json` + source CNOUS | |
| `arrivee`, `assurance`, `sim` | arrivée | *(aucun guide)* → texte de l'équipe, **sans chiffre** | |
| `banque` | arrivée | `ouvrir-compte-bancaire-etudiant-etranger-2026`, `comment-ouvrir-compte-bancaire-france-sans-adresse-fixe` | |
| `transport` | arrivée | `transport-etudiant-france-abonnements-reductions` | |
| `validation-visa` | arrivée | `ofii-validation-visa-etudiant-france-guide` | |
| `secu` · `mutuelle` · `vitale` | premiers mois | `securite-sociale-etudiante-france-inscription` · `securite-sociale-complementaire-sante-solidaire-etudiant-etranger` · `carte-vitale-etudiant-etranger-guide` | |
| `caf` | premiers mois | `caf-etudiant-etranger-delais-documents-erreurs`, `reforme-apl-etudiant-etranger-2026` → **devient « Vérifie si tu as droit à l'APL »** (5 exceptions) | modifiée |
| `medecin` | premiers mois (+45 j) | `medecin-traitant-france-etudiant-etranger` | ✅ |
| `travail` | premiers mois (facultatif) | `travailler-en-france-etudiant-etranger` (964 h, 803 h si DZ) | ✅ |
| `renouvellement` | ≈ 2 mois avant la fin du VLS-TS | `titre-sejour-etudiant-france-renouvellement` | ✅ |
| `securite` | transversal (bouclier, pas une étape) | `arnaques-etudes-france-etudiant-etranger-eviter` | ✅ |

Cette table vit dans `journey.json`, donc **côté site**. Corriger un lien ne demande pas de nouvelle version de l'app.

### 2.3 Outils
- **Simulateur** : formule extraite dans `lib/tools/budget.ts` (site), paramètres dans `tools.json`, et une copie de la fonction pure dans l'app, vérifiée par les cas de test de `tools.json` (`npm run check:tools`). **Budget brut par défaut.** L'APL n'est comptée que si l'étudiant coche l'une des 5 exceptions.
- **Calendrier** : même générateur et mêmes données (après correction des liens Tunisie/Liban, voir l'audit S8-S9).
- **Comparateur** : `CITY_SCORES` + `cities.json` (15 villes, Caen comprise).

---

## 3. Aymen, du jour 1 à l'arrivée

| Moment | Ce qu'Aymen vit | Ce que fait l'app |
|---|---|---|
| **J1, 22 h, Casablanca** | Bac en poche, rien commencé, stressé. Il installe l'app. | Accueil nuit → inscription par email + OTP → 4 questions (pays 🇲🇦, ville d'origine, « Où en es-tu ? » → *Je n'ai rien commencé*, ville rêvée → Paris). |
| J1 | Premier accueil | L'Âme respire. « Salut Aymen. On commence ensemble. Une étape à la fois. » Puis, mot par mot : « Avant tout, il te faut un niveau de français officiel. On le fait ensemble : 10 minutes aujourd'hui. » · *D'après notre guide TCF Maroc 2026*. **Une seule carte** : « Trouve ta session TCF » — pourquoi, 10 min, ce qu'il faut avoir (CIN), un bouton. Dessous, Yassine (Casablanca → Lyon) « est passé par là » + « Appel gratuit ». |
| J1 | Il tape « c koi campus france » | Le chat répond en français simple, cite `campusfrance-maroc-guide-complet`, et [[Campus France]] est cliquable. |
| J3 | Il bloque sur « apostille » | Lexique → fiche → guide `apostille-…`. Il coche « Documents prêts ». |
| M+1 | TCF passé | `success` + `celebrate()`. Le brief passe à « Ton dossier Campus France ». Le chemin avance : l'avion glisse d'un cran. |
| M+4 | Entretien Campus France | 3 jours avant, rappel + « Prépare-le avec Yassine » (brief mentor validé par Aymen). |
| M+7 | Il reçoit un courrier du consulat | « Explique-moi ce papier » → « C'est quoi / Ce que tu dois faire / Avant le 12 juillet » → ajouté au calendrier. |
| **Visa validé** | Le grand moment | Le billet se débloque en plein écran (hologramme, gyroscope, `celebrate()`). Ensuite, il trône en haut de l'accueil : **J-38**, Casablanca → Paris. L'action du jour reste dessous (logement, CVEC…). |
| J-0 | Il atterrit | Le billet devient « Bienvenue à Paris ». Phase « arrivée » : validation ANEF (3 mois), banque, Sécu. |

**Profil avancé testé en parallèle** : Salma, Alger → Lyon, visa obtenu, logement trouvé. Le billet est débloqué, J-12, et sa seule action est « Paie ta CVEC ».

---

## 4. Écrans et états

Pour chaque écran : **vide · chargement · erreur · hors ligne · succès**. Le hors ligne lit toujours le cache. Aucun écran ne reste blanc.

### A. Accueil « Brief du jour » (`(tabs)/index.tsx` → `features/home/Brief*.tsx`)

Ordre de lecture = ordre d'entrée (6 crans maximum) :
1. En-tête (salut, avatar) ;
2. **L'Âme** (180 px) ;
3. La phrase du brief, qui apparaît mot par mot, + « D'après notre guide … » ;
4. La carte **« Ta seule action aujourd'hui »** : titre, pourquoi, ⏱ durée, « Il te faut : … », **un** bouton plein, 1 à 2 mentors + « Appel gratuit » ;
5. Le champ « Demande-moi n'importe quoi… », toujours visible (il devient collant au défilement, en verre dépoli) + 3 suggestions ;
6. « Ton chemin » (sous la ligne de flottaison, sans chorégraphie d'entrée).

**Le brief est déterministe, pas généré par l'IA** : `nextAction(profile, progress, journey)` choisit l'étape. La phrase vient d'un modèle rédigé par l'équipe dans `journey.json` (`brief: "Avant tout, {besoin}. On le fait ensemble : {durée} aujourd'hui."`). C'est gratuit, instantané, disponible hors ligne et sans risque d'hallucination.

| État | Rendu |
|---|---|
| Vide (débutant total) | « On commence ensemble. Une étape à la fois. » + première action |
| Chargement | L'Âme est déjà là (locale) ; squelettes pour la carte d'action (pas de spinner) |
| Erreur (contenu) | Instantané embarqué + bandeau discret « Contenu du 12/10 — on réessaie » |
| Hors ligne | Pareil, et le champ IA affiche « Dalili te répond dès que tu as du réseau » |
| Succès (étape cochée) | L'Âme en *succès* + `celebrate()` + la carte suivante glisse (`LinearTransition`) |
| Billet débloqué | Billet en haut (J-xx), **l'action reste dessous** |

### B. « Ton chemin »
Le tracé Skia se dessine au défilement (`end` du `Path` = progression du scroll). Un avion suit la tangente (`ContourMeasure.getPosTan`) jusqu'à « Tu es ici ». Les étapes futures sont en pointillés. À la fin, le billet est **verrouillé et flouté** (cadenas + « Se débloque quand ton visa est validé »).

### C. Déblocage du billet (modal plein écran)
Bascule 3D (`perspective` + `rotateY` 12° → 0) en `springSoft`, puis un reflet holographique (shader Skia) piloté par `useAnimatedSensor(SensorType.ROTATION)` de Reanimated : pas de dépendance en plus, tout sur le thread UI. `success` + `celebrate()`. Bouton « Garder mon billet ». Réduction des animations : billet à plat, pas de reflet.

### D. Chat premium (`(tabs)/ia.tsx`)
- Streaming via `expo/fetch` (NDJSON) → texte affiché au fil de l'eau ; l'Âme est en *réflexion* puis en *réponse*.
- Sous la réponse : sources (pastilles de guides → `guide/[slug]` dans l'app) puis cartes d'action (ouvrir l'étape, lire le guide, réserver un mentor, ajouter au calendrier).
- `[[lexique]]` cliquable ; « Ce n'est pas un conseil juridique » si le drapeau `legal` est levé ; carte mentor si `stress` ou `complex` ; carte 3114 si détresse.
- 🔊 lecture via expo-speech (la langue suit `lang` ; darija → voix arabe + mention « lecture en arabe standard ») ; 👎 « Cette réponse est fausse » → feuille avec motif.
- États : vide = l'Âme + 3 suggestions du profil · réflexion = Âme en tourbillon (pas de « … ») · refus = « Je n'ai pas cette information dans nos guides » + 3 guides proches + « Demande à un mentor » · erreur réseau = « Pas de réseau. Ta question est gardée, je réessaie. » · 429 = « Pause de quelques minutes ».

### E. « Explique-moi ce papier » (`outils/papier.tsx`)
1. Photo (expo-image-picker, appareil photo ou galerie, déjà installé), redimensionnée à 1600 px.
2. Le faisceau lumineux balaie la photo pendant l'analyse.
3. `POST /api/v1/document` → **étape 1, lecture** (Claude vision, sortie structurée : type, expéditeur, date, échéance, actions demandées). C'est « **D'après ton courrier** ». **Étape 2, explication** : requête RAG construite depuis le type et les actions → même seuil, mêmes citations. C'est « **D'après nos guides** ».
4. Résultat en 3 blocs : « C'est quoi » · « Ce que tu dois faire » · « Avant quand » (+ « Ajouter à mon calendrier », expo-calendar) + le guide.
5. Hors du champ des guides : « Ce courrier sort de ce que nos guides couvrent » + mentor.
- **Vie privée** : l'image n'est **jamais stockée** (ni journal, ni base). On l'efface de la mémoire après la réponse. Le journal ne garde que le type de document et le taux de refus. Un message avant la prise de vue invite à cacher le numéro allocataire si on veut.
- États : permission refusée → « Autorise l'appareil photo dans Réglages » + galerie · photo floue → « Je n'arrive pas à lire. Reprends-la à plat, en pleine lumière. » · hors ligne → bouton désactivé + explication.

### F. Brief mentor
À la réservation, `POST /api/v1/mentor-brief` résume profil, progression et thèmes des dernières questions. **Aymen voit le résumé, peut le modifier ou le retirer**, puis il est joint à `bookings.brief`. Il est signé « Préparé par Dalili, relu par Aymen ».

### G. Continuité site → app
Après l'OTP (email **vérifié**), une RPC `claim_site_history()` (security definer, limitée à `auth.email()`) lit `waitlist` et `tool_results`. L'onboarding est pré-rempli **avec confirmation** : « On a retrouvé ça depuis dalili.study : Paris, ≈ 900 €/mois, rentrée sept. 2027. C'est toujours bon ? ». Puis l'accueil dit « Content de te revoir, on reprend là où tu en étais ». La politique de confidentialité du site doit mentionner cette réutilisation.
**Liens universels** : `/.well-known/apple-app-site-association` + `assetlinks.json` servis par le site, `associatedDomains` et `intentFilters` dans `app.json`, et la route `blog/[slug]` → `guide/[slug]`. ⚠️ **Testable seulement dans un build de développement ou store**, pas dans Expo Go (dans Expo Go, on teste via le schéma `dalili://`).

---

## 5. L'Âme de Dalili

### 5.1 Deux variantes (labo jetable : `/ame-lab`)

| | **A · Perle liquide** | **B · Aurore** |
|---|---|---|
| Idée | Une sphère nette, avec un liseré de lumière (effet de Fresnel) et des courants de lumière liquide à l'intérieur (bruit fractal déformé). | Une nébuleuse sans bord dur : des rubans d'aurore bleu → indigo qui tournent lentement dans un halo. |
| Lecture | « Un objet » : présent, rassurant, très Apple. | « Une présence » : plus organique et onirique. |
| Risque | Peut faire « bille », il faut doser la brillance. | Moins lisible en petit (64 px dans le chat). |

Technique commune : `@shopify/react-native-skia` (inclus dans Expo Go, d'après la doc v57). Un `RuntimeEffect` en SkSL ; les uniforms (`time`, `amp`, `swirl`, `pulse`, `flash`) sont des shared values Reanimated, donc **thread UI uniquement**. Le canvas est réduit au strict nécessaire (180 px accueil / 64 px chat). Il est en pause quand l'écran perd le focus ou que l'app passe en arrière-plan. Avec `useReducedMotion`, on garde une image fixe. Sur le web, on retombe sur le `LogoOrb` actuel, car Skia web impose CanvasKit (≈ 3 Mo).

### 5.2 États

| État | Déclencheur | Comportement | Durée / ressort |
|---|---|---|---|
| Repos | par défaut | Respiration : échelle 1 ± 0,02, lumière ± 8 % | boucle 6 000 ms, `Easing.inOut(sin)` |
| Écoute | frappe dans le champ | Ondulation : chaque touche ajoute une impulsion à `amp` qui retombe | impulsion → 0 en 420 ms (`withTiming`, `motion.slow`) |
| Réflexion | requête envoyée | Tourbillon : `swirl` × 3, ralentit à l'arrivée du 1er token | rampe 260 ms (`motion.base`) |
| Réponse | flux de tokens | Pulsation douce à chaque paquet reçu, plafonnée à 4 Hz | `withSpring(springSoft)` |
| Succès | étape cochée, billet | Éclat : `flash` 0 → 1 → 0 + haptique `success` | 600 ms, montée `springBouncy` |

C'est **la seule boucle de l'écran**. Le halo « Tu es ici » du chemin devient donc statique (cf. DIRECTION §3.4).

---

## 6. Inventaire des animations

| Animation | Déclencheur | Technique | Durée / ressort | Réduction des animations |
|---|---|---|---|---|
| Entrée d'écran | montage | `enter(i)` (`FadeInDown.springify`, `springSoft`), 6 crans de 60 ms | ≤ 300 ms de décalage | fondu |
| Brief mot par mot | 1er affichage du jour | `FadeIn` par mot, `delay = i × 45 ms`, plafond 1,2 s | 45 ms/mot | texte entier d'un coup |
| Carte d'action suivante | étape cochée | `LinearTransition.springify()` + `FadeOutUp` | `springSoft` | instantané |
| Tracé du chemin | scroll | Skia `Path end` ← `scrollY` interpolé | lié au doigt | tracé complet |
| Avion | scroll | `getPosTan` sur le thread UI | lié au doigt | posé sur « Tu es ici » |
| Billet verrouillé | — | flou Skia `Blur 8` + cadenas | statique | — |
| Déblocage du billet | visa validé | `rotateY` 12° → 0 + échelle 0,9 → 1 | `springSoft`, puis reflet | à plat |
| Reflet holographique | gyroscope | `useAnimatedSensor(ROTATION)` → uniform du shader | continu (écran modal seulement) | désactivé |
| Faisceau « papier » | analyse | bande dégradée en `translateY` aller-retour | 1 600 ms `inOut(sin)` (seule boucle de cet écran) | barre de progression fixe |
| Bulles du chat | nouveau message | `FadeInDown.springify` | `springSoft` | fondu |
| Pastilles de sources | fin du flux | cascade 3 × 60 ms | `springSoft` | fondu |
| Appui | toucher | `PressableScale` 0,96 + `tap` | `spring` / retour `springBouncy` | échelle seule |

Haptique : `tap` (appui), `select` (choix), `press` (envoyer, réserver), `success` (étape, billet, ajout au calendrier), `warning` (refus, erreur).

---

## 7. Jalons

Chaque jalon se termine de la même façon : typecheck et lint **dans les deux projets**, `npx expo export -p web`, `/capture` Aymen (Casablanca → Paris, rien commencé) et Salma (avancée), commit en français dans le bon dépôt, push, **puis arrêt pour validation**.

| Jalon | Site | App | Critère « fini » |
|---|---|---|---|
| **M0 — Contenu unifié** | `lib/content/` + `/api/content/v1/*` ; frontmatter `appSummary/countries/documents/sources` (35 guides, **à valider par l'équipe**) ; corrections S1-S12 ; « 200+ » → vrai nombre ; `regulatory-figures` enrichi | `data/content.ts` + persisteur + instantané ; `steps.ts` sans texte ; fiche d'étape = guide (résumé, chiffres clés, documents, FAQ, sources, date) ; 7 pays ; nouvelles étapes ; simulateur, calendrier et comparateur alignés ; suppression de `guides.ts` et `cities.ts` | Aucun montant en dur dans `src/` (`grep "€" src/features` ne renvoie que des libellés) ; fiche hors ligne OK |
| **M1 — Cerveau + Âme + Brief** | `lib/assistant/answer.ts` partagé ; `/api/v1/assistant` (JWT, limite par utilisateur, contexte, vrai streaming, drapeaux, `meta`) ; migration `assistant_feedback` | migration vers le projet `dalili.web` ; Skia ; `Ame` (variante retenue) ; Brief du jour ; champ IA ; suppression de `dalili-ia` et `brain.ts` | Une même question posée sur le site et dans l'app donne les **mêmes sources** |
| **M2 — Chemin + billet** | — | Chemin Skia au scroll, avion, billet verrouillé, déblocage plein écran, billet en haut de l'accueil | 60 fps sur iPhone SE (moniteur de perf), réduction des animations OK |
| **M3 — Chat premium** | événements `actions` | streaming `expo/fetch`, cartes, sources → guide dans l'app, lexique, disclaimer, mentor, 3114, expo-speech, 👎 | refus et 429 testés |
| **M4 — Papier** | `/api/v1/document` (vision + RAG) | caméra, faisceau, 3 blocs, expo-calendar | image jamais stockée (vérifié dans les journaux) |
| **M5 — Continuité + brief mentor** | table `tool_results` (fin de l'écrasement) ; `.well-known/*` | `claim_site_history()` ; pré-remplissage confirmé ; « Content de te revoir » ; brief mentor relu ; config des liens universels | test avec un email de la waitlist **vérifié par OTP** |

Nouvelles dépendances de l'app, **toutes dans Expo Go** (à reconfirmer pour chacune avec la doc v57 au moment de `npx expo install`) : `@shopify/react-native-skia`, `expo-speech`, `expo-calendar`, `expo-image-manipulator`, `@tanstack/query-async-storage-persister`, `@tanstack/react-query-persist-client`. **Aucune n'exige de build de développement.** Seuls les liens universels en ont besoin.

---

## 8. Là où je propose autre chose que ta demande

1. **Le Brief du jour ne passe pas par l'IA** (§4.A). Une phrase générée à chaque ouverture coûte de l'argent, demande du réseau, prend 1 à 2 secondes et peut inventer un fait. Un modèle rédigé et relu par l'équipe donne le même effet, avec zéro risque.
2. **Le billet ne remplace pas le brief.** Après le visa, il reste les étapes les plus anxiogènes (logement, ANEF). Le billet passe au-dessus et l'action du jour reste visible.
3. **Pas de pré-remplissage sans OTP**, et toujours avec confirmation. Sinon, c'est une fuite de données (ville, budget) pour quiconque connaît un email.
4. **Pas de « 200+ »** tant que la base dit 58. La confiance se perd sur ce genre de détail.
5. **Darija à voix haute** : impossible avec les voix système, donc on lit en arabe standard et on le dit.
6. **« Explique-moi ce papier » sépare deux autorités.** Ce que dit *ton courrier* (lecture) n'est pas ce que disent *nos guides* (explication). Les mélanger trahirait la promesse « tout est appuyé sur un guide ».
7. **Le halo « Tu es ici » cesse de boucler.** L'Âme est la seule boucle (ta propre règle n° 6).
8. **Un seul projet Supabase** (§1.1), au lieu d'un backend d'app séparé jamais déployé.

## 9. Risques

| Risque | Impact | Parade |
|---|---|---|
| Taux de refus de 47 % | L'app « IA-native » répond « je ne sais pas » une fois sur deux | Suivi hebdo de `assistant_queries`, guides écrits pour combler les trous, contexte pays dans la recherche, proposition de mentor dans chaque refus |
| Shader trop coûteux sur Android milieu de gamme | Saccades, batterie | Canvas ≤ 180 px, 3 octaves de bruit maximum, pause hors focus, repli statique si le temps de frame dépasse 20 ms pendant 1 s |
| Chiffres réglementaires qui changent | Information fausse | Paliers datés (`regulatory-figures`), `updatedDate` visible, instantané régénéré à chaque build |
| Vercel en panne | Plus d'IA | L'app reste utilisable : contenu en cache, message honnête |
| Vie privée (courriers, brief mentor) | Confiance, RGPD | Aucun stockage d'image, validation par l'étudiant, politique de confidentialité mise à jour |
| Contenu CI, CM, Liban mince | Parcours pauvre | Message honnête + priorité éditoriale |
| Coût IA | Budget | Haiku par défaut, cache de prompt, limite par utilisateur (30 / jour au départ) |
| Travail non commité (`pistes/`, `tokens.ts`) | Perte de code | Commit « wip: pistes d'accueil » avant M0 (avec ton accord) |
