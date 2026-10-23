# DALILI — Direction artistique

> Document de référence pour tout écran, composant ou animation. Il complète `src/theme/tokens.ts` (les valeurs) et `CLAUDE.md` (les règles de code). En cas de doute : **les tokens l'emportent, puis ce document, puis le goût personnel.**

---

## 1. Cadrage

| | |
|---|---|
| **Public** | Un·e étudiant·e de 18–25 ans, à Casablanca, Alger ou Tunis, qui ouvre l'app entre deux démarches. Souvent sur un téléphone d'entrée de gamme, parfois en 4G faible, souvent le soir. |
| **État d'esprit** | Inquiet·e, débordé·e par les sigles, méfiant·e (15 % seulement font confiance aux infos trouvées). |
| **La seule chose à réussir** | Qu'en 3 secondes, la personne sache **où elle en est** et **quoi faire maintenant**, et qu'elle se sente accompagnée. |
| **Registre** | Utilitaire et chaleureux. Le soin est maximal, les effets restent rares. |

## 2. L'idée directrice : « le trajet, de la nuit au matin »

DALILI raconte un **voyage** : on part de chez soi (Maghreb), on traverse une période floue, on arrive, on s'installe. La direction visuelle suit ce trajet.

- **La nuit** (`gradients.night`, `navyDeep`) = l'avant-départ, l'inconnu, les moments solennels : bienvenue, onboarding, chargement, la carte « Ta mobilité ». C'est là que vit la profondeur : orbes qui respirent, halos.
- **Le matin** (`gradients.roleTop`, `bg #F5F7FD`) = le quotidien guidé : listes, fiches, communauté. Clair, aéré, calme.
- **Le bleu électrique** (`#014DF8`) = **le guide**. C'est la seule couleur qui dit « agis ici ». Il ne décore jamais.

Le vocabulaire visuel vient du voyage : un trajet entre deux villes, un compte à rebours, une étape, une porte d'embarquement, un tampon « fait ». On évite les métaphores de jeu vidéo (XP, niveaux, trophées dorés). La « quête » se lit comme un chemin, pas comme un score.

### Palette par rôle (rappel des tokens)

| Rôle | Token | Usage |
|---|---|---|
| Fond | `palette.bg` #F5F7FD | Toujours un bleu à peine teinté, jamais un gris pur. |
| Surface | `palette.surface` #FFFFFF | Objets posés (lignes, cartes de contenu). |
| Encre | `palette.navy` #1F2850 | Titres et texte principal. Jamais de noir. |
| Encre secondaire | `palette.subtle` #5B6384 / `palette.muted` #8A91AD | `muted` réservé au texte ≥ 13 px non essentiel (contraste ≈ 3:1). |
| Action | `palette.electric` ou `useRoleTheme().accent` | Un seul bouton plein par écran visible. |
| IA | `gradients.ai` (indigo → violet) | Uniquement Dalili IA. Jamais pour autre chose. |
| États | `success` / `warning` / `danger` + leurs `Soft` | Statuts d'étape seulement, jamais décoratifs. |

### Typographie

- **Montserrat** (titres) : 700 pour les titres, **900 Black réservé à un seul élément héros par écran** (compte à rebours, nom de ville, prénom).
- **Open Sans** (texte) : 400 pour le texte courant, 600 pour l'emphase.
- Échelle : celle de `type` (11 / 13 / 15 / 16 / 19 / 24 / 30). Une valeur hors échelle n'est permise que pour l'élément héros (par exemple 44–56 pour un « J‑32 »).
- **Pas de capitales pour les étiquettes courantes.** `overline` reste pour les badges courts (« FAIT », « VISA »), pas au-dessus de chaque titre. Un sous-titre en casse normale se lit mieux et inquiète moins.
- Pas un mot en couleur au milieu d'un titre, sauf le prénom dans le salut (signature déjà installée).

## 3. Mouvement

> Le mouvement **oriente** (d'où vient cet élément ?), **relie** (ceci est devenu cela) ou **célèbre** (c'est fait). S'il ne fait aucune des trois choses, on le supprime.

### Ressorts : un rôle chacun

| Token | Valeurs | Quand |
|---|---|---|
| `motion.spring` | damping 18 · stiffness 220 · mass 0.9 | Interface : appui, curseur de `Segmented`, déplacement. Réponse nette, sans rebond visible. |
| `motion.springSoft` | damping 20 · stiffness 140 | Entrées et révélations : cartes, feuilles, déploiement d'une pile. |
| `motion.springBouncy` | damping 11 · stiffness 180 | **Uniquement** la célébration et le relâchement du doigt (`PressableScale` qui revient à 1). Jamais pour une entrée. |

### Durées (quand on utilise `withTiming`)

| Token | ms | Usage |
|---|---|---|
| `motion.fast` | 160 | Retour d'état : opacité, couleur, coche. |
| `motion.base` | 260 | Transition d'un composant (onglet, accordéon). |
| `motion.slow` | 420 | Révélation d'un élément héros. |
| — | 900–1100 | Tracé d'un anneau ou d'un chemin de progression : une fois par affichage, `EASE_OUT`. |
| — | 1600 | Vol de l'avion sur le trajet de la carte mobilité : `EASE_IN_OUT` (il se déplace à l'écran), puis roulis qui revient à plat en ressort. |
| — | 6000 | Boucles d'ambiance (orbes) : `Easing.inOut(Easing.sin)`, amplitude ≤ 20 px. |

### Courbes (`src/theme/motion.ts`)

- `EASE_OUT` = `bezier(0.23, 1, 0.32, 1)` pour tout ce qui **entre** ; `EASE_IN_OUT` = `bezier(0.77, 0, 0.175, 1)` pour ce qui **se déplace** à l'écran. Jamais d'`ease-in` sur l'interface : il retarde le moment que l'œil regarde.
- Un doigt est en jeu → ressort (il garde la vitesse si on interrompt). Sinon → durée + courbe.
- **Feuilles du bas** (`BottomSheet`) : montée 440 ms et descente 260 ms en `EASE_SHEET` = `bezier(0.32, 0.72, 0, 1)` (la courbe des feuilles iOS), sans rebond ; le fond s'assombrit au même rythme. Elles se ferment en les glissant vers le bas : la feuille suit le doigt, puis se ferme (plus d'un tiers ou geste rapide) ou revient en place avec `motion.springFirm`.

### Défilement

`Screen` suit la position de défilement sur le thread UI (`useScrollY()`), sans aucun rendu React. On s'en sert pour la parallaxe (≤ `depth.parallax`, 12 px) et les apparitions. Exemple : l'Âme du brief recule de 12 px et s'efface au défilement, et grossit un peu quand on tire vers le bas.

### Ciel étoilé

`src/components/brand/StarField.tsx` : un seul shader Skia (carte graphique), transparent, posé sur un dégradé nuit.

- **Trois plans d'étoiles** à des profondeurs différentes, chaque étoile scintille à son rythme ; les plus brillantes ont des aigrettes.
- **Voie lactée** en diagonale (haut droite → bas gauche), plus dense en étoiles, et nébuleuse bleu-violet qui dérive très lentement.
- **Étoile filante** toutes les 8 s environ (1 s de traversée).
- **Inclinaison** (`TiltingStarField`, plein écran seulement) : le ciel suit le téléphone, les plans proches bougent plus que les lointains (22 pt max) et la position de repos se recentre seule.
- **Allumage** (`ignite`) : au lancement, une onde part du logo et allume les étoiles, qui brillent plus fort au passage du front.
- Variante `card` pour le brief et « Ta mobilité » : moins dense, sans nébuleuse, sans étoile filante ni inclinaison.
- Le ciel ne tourne que si l'écran est au premier plan et l'app active. Réduction des animations : ciel figé, sans étoile filante ni onde.

### Lancement

Au premier affichage de l'accueil (`features/auth/components/LaunchIntro.tsx`), une seule fois par lancement :

1. **Image 1 = l'écran de lancement natif** (`app.json` → `expo-splash-screen` : fond `navyDeep`, monogramme blanc centré). `SplashFrame` le reproduit tant que l'app se prépare : aucune coupure.
2. 0 → 900 ms : le halo s'allume derrière le logo, qui grossit à peine (×1,08) comme une inspiration. Une onde partie du logo allume les étoiles (300 → 2500 ms).
3. 1000 → 2000 ms : le logo monte à sa place (`EASE_IN_OUT`) et passe du blanc au bleu ; le fond plat s'efface (400 → 1800 ms).
4. 1800 ms : « DALILI » s'écrit lettre par lettre (80 ms d'écart), quand le logo se pose. 2050 ms : le texte et les boutons arrivent.

Dans Expo Go, l'écran blanc avec l'icône et « Loading… » appartient à Expo Go : il n'existe pas dans l'app installée.

### Chorégraphie d'entrée d'un écran

1. **Ordre de lecture = ordre d'apparition** : en-tête → élément héros → action principale → le reste.
2. Cascade `enter(i)` (`src/theme/motion.ts`) : fondu + montée de 12 px, 360 ms, `EASE_OUT`, **sans ressort ni rebond**, avec **6 crans maximum** (0 → 300 ms). Au-delà, tout le reste arrive au cran 6. Personne n'attend une animation pour lire. Petits éléments (coche, badge) : `pop()`, jamais depuis 0. Sortie : `leave` (fondu de 120 ms). Liste qui bouge : `reflow`.
3. **Seul le premier écran visible a la cascade.** Ce qui est sous la ligne de flottaison entre avec `Reveal` (`src/components/motion/Reveal.tsx`) **quand il arrive à l'écran au défilement** : une fois, 520 ms, `EASE_OUT`, 28 px + échelle 0,97 → 1. Ses enfants s'y calent avec `useReveal()` (un anneau se remplit, un avion décolle) au lieu de s'animer hors de vue.
4. **Une seule boucle par écran** (un halo qui respire sur l'étape en cours, *ou* le ciel étoilé, jamais les deux). Le ciel étoilé remplace les anciens orbes.
5. **Tout est lisible à l'image 1** : si l'animation ne se joue pas, l'écran est complet.
6. Réduction des animations : chaque `entering` et chaque boucle reçoit `.reduceMotion(ReduceMotion.System)`. Les boucles s'arrêtent, les cascades deviennent un fondu.

### Retour tactile (toujours couplé au mouvement)

| Geste | Haptique (`src/lib/haptics.ts`) | Mouvement |
|---|---|---|
| Appui sur un élément | `tap` | `PressableScale` 0.96 |
| Choix dans une liste ou un segment | `select` | curseur en `spring` |
| Action importante (réserver, valider) | `press` | — |
| Étape ou phase terminée | `success` + `celebrate()` | confettis, coche en `springBouncy` |

## 4. Profondeur : 5 couches, pas une de plus

| Couche | Exemple | Fond | Ombre | Flou |
|---|---|---|---|---|
| **0 · Sol** | fond d'écran, dégradé du haut | `bg` + `roleTop` | — | — |
| **1 · Posé** | ligne d'étape, carte de groupe | `surface` | `shadow.sm` | — |
| **2 · Héros** | carte mobilité, billet, étape du jour | `gradients.hero` / `night` | `shadow.md` | — |
| **3 · Flottant** | tab bar, en-tête collant, sélecteur flottant | blanc 85 % | `shadow.md` | `expo-blur`, intensité 30–50 |
| **4 · Modal** | `BottomSheet`, `SuccessModal` | `surface` | `shadow.md` | voile `navy` 40 % |

Règles :
- **Les ombres sont teintées navy** (`shadowColor: '#1F2850'`), jamais noires. `shadow.glow` (bleu) est réservé à **l'action principale** de l'écran et au bouton Dalili IA.
- **Tout n'est pas une carte.** Une liste de 5 étapes, c'est **une** surface avec des séparateurs, pas 5 cartes. Les cartes sont réservées aux objets qu'on peut ouvrir.
- **Hiérarchie des rayons** : héros `xxl` (32) → carte `xl` (26) → ligne/champ `lg` (20) → puce `pill`. L'objet le plus important a le rayon le plus grand.
- **Le flou** sert seulement à ce qui flotte au-dessus du contenu qui défile. Jamais sur une carte posée (coûteux sur Android, et illisible).
- **Les halos** (`Glow`, `heroGlow`) vivent dans les couches nuit uniquement, à 60 % d'opacité maximum.

## 4 bis. Icônes

`IconTile` avec `icon` + `tone` (`tones` dans `src/theme/tokens.ts`) : une **tuile douce** (dégradé très léger, liseré clair), l'icône lucide en **deux tons**, trait foncé et remplissage translucide du même ton (les formes qui se superposent foncent, les détails restent lisibles).

- **Le ton dit la famille**, toujours la même : `blue` démarches et guides, `violet` lexique et écoute, `green` entraide, mentors et santé, `amber` papiers et budget, `orange` hôte et enregistrements, `red` urgences et échéances proches, `slate` réglages.
- **Plus de dégradés saturés avec une icône blanche** (effet « appli générique »). `colors` reste réservé aux cartes nuit et à Dalili IA (`gradients.ai`).
- Taille : icône = 56 % de la tuile ; tuile 38–46 dans une liste, 56 pour un choix d'onboarding.

## 5. Règles « 3D »

DALILI n'embarque pas de moteur 3D. La « 3D » est faite de **perspective et de couches**, avec parcimonie.

1. **Un seul objet 3D par écran** : l'élément héros (billet, carte mobilité, pile d'étapes). Jamais une liste, jamais un bouton.
2. **Toujours `perspective` avant les rotations** : `transform: [{ perspective: depth.perspective }, { rotateX: '…deg' }]`.
3. **Inclinaison maximale `depth.tilt` (6°)** au repos ou au toucher, 12° le temps d'une entrée (qui revient à 0 en `springSoft`).
4. **Parallaxe ≤ 12 px** entre deux couches (par exemple halo et carte au défilement). Au-delà, ça donne le mal de mer.
5. **Pile = profondeur** : les objets « plus tard » s'empilent derrière l'objet « maintenant » (échelle −5 % et décalage de 10 px par niveau, 3 niveaux visibles au maximum).
6. **Pas d'illustrations 3D génériques** (personnages en pâte à modeler, emojis 3D). Icônes `lucide` bicolores (§4 bis), logo vectoriel, photos réelles des mentors.
7. Désactivé avec la réduction des animations : on garde l'état final, à plat.

## 6. Ton des textes

**La voix du grand frère ou de la grande sœur** : quelqu'un qui est passé par là, qui te tutoie, qui va droit au but et qui ne te juge pas.

| ✅ On écrit | ❌ On évite |
|---|---|
| « Ta seule action maintenant » | « Veuillez compléter l'étape suivante » |
| « Pas de panique, des milliers d'étudiants sont passés par là. » | « Attention ! Délai critique ! » |
| « Prends rendez-vous chez VFS » (le verbe dit ce qui se passe) | « Continuer », « Valider », « Suivant » |
| « Ton [[ANEF]] », sigle cliquable vers le lexique | « Effectue ta VLS-TS sur l'ANEF » sans explication |
| « ≈ 110 € » avec la source | « 110 € » |
| « Rien de prévu ce jour. Ajoute une tâche ci-dessous. » | « Aucune donnée » |
| « Adnane est passé par là, il peut t'appeler » | « Contactez un expert » |

- Phrases de 12 mots maximum, une idée par phrase.
- Écriture inclusive avec le point médian, seulement là où c'est naturel (« prêt·e »).
- Les erreurs disent quoi faire : « Pas de connexion. Tes étapes restent disponibles hors ligne. »
- Un bouton garde son nom tout au long du parcours : « Réserver » donne le toast « Réservé ».
- Typographie française : `’` typographique, espace insécable avant `: ; ! ?`, guillemets « ».
- Pas de flèche « → » ajoutée au texte des boutons : l'icône `ArrowRight` fait ce travail quand c'est utile.

## 7. L'accueil retenu : le « Brief du jour »

Les trois pistes (billet, chemin, une seule chose) ont été essayées puis retirées. L'accueil est le **Brief du jour** (`features/home/`, voir `docs/VISION.md` §4.A) : l'Âme et la phrase du jour dans une carte nuit, **ta seule action**, l'accès au parcours, le champ pour demander à Dalili, puis le reste qui apparaît au défilement.

Ce qui reste des pistes vit dans M2 : le **chemin** (tracé au défilement, avion) et le **billet** (débloqué au visa).

### « Ton chemin » (M2.1)

`features/journey/components/JourneyPath.tsx`, données et géométrie dans `features/journey/path.ts`.

- Les étapes du site sont regroupées en **6 jalons** (projet d'études, Campus France, visa, logement, arrivée, nouvelle vie), après le départ de ta ville. Un jalon sans étape pour ton profil disparaît.
- Sentier en S dessiné en Skia : **bleu plein jusqu'à « Tu es ici »**, pointillés ensuite. Il se trace **au défilement, lié au doigt** (dans les deux sens) : pas de chorégraphie d'entrée.
- L'avion suit la tangente et s'arrête juste avant la pastille « Tu es ici » (retour haptique `select` à l'arrivée, une fois). Halo statique : la boucle de l'accueil reste l'Âme.
- Chaque jalon se pose quand le tracé l'atteint et ouvre son étape.
- Au bout, le **billet** (`Ticket.tsx`) : fond Skia avec de vraies encoches de perforation et le ciel étoilé. Verrouillé tant que le visa n'est pas validé : silhouette floue sous un voile nuit, cadenas, « Se débloque quand ton visa est validé ».

### Le billet en haut de l'accueil (M2.2)

`features/journey/ticket.ts` (`useTicket`) décide de l'état du billet, pour l'accueil comme pour « Ton chemin ».

- **Visa validé** : le billet remplace la carte nuit du brief en haut de l'accueil (J-12, Alger → Lyon). La phrase du jour passe dessous en texte simple (`BriefLine`), puis l'action du jour : un seul héros et une seule boucle (le ciel du billet), et l'action reste visible sans défiler.
- Sans date d'arrivée donnée : « J-? · fixe ta date ». Toucher le billet ouvre le réglage de la date (`ArrivalSheet`).
- **Jour J et 7 jours après** : « Bienvenue à Lyon », et le talon reçoit le tampon « Arrivé·e » (vert mentor, penché de 12°). Ensuite, le billet quitte l'accueil et reste au bout de « Ton chemin ».

### Le déblocage du billet (M2.3)

`features/journey/components/TicketUnlock.tsx`, route `(app)/billet`. Il s'ouvre **une seule fois**, une seconde après que l'étudiant a coché « Visa » lui-même (`toggle` → `ticketPending`, surveillé dans `(app)/_layout.tsx`). Une reprise depuis le serveur ou un profil de test ne le déclenche pas ; décocher puis recocher non plus (`ticketSeen`).

- Fond nuit, ciel qui suit l'inclinaison et s'allume depuis le billet. « Ton visa est validé » (vert), « Ton billet est débloqué », la route.
- Le billet bascule de 12° à plat et grandit de 0,9 à 1 (`springSoft`, `perspective`), puis `success` + `celebrate()` et le **reflet holographique** s'allume : un shader Skia découpé dans la forme du billet, une bande irisée discrète qui glisse avec le capteur de rotation, et le billet s'incline de 6° au plus.
- C'est un écran de la pile, pas une modale native : les confettis de la racine passent par-dessus. Un seul bouton : « Garder mon billet ».
- Réduction des animations : billet à plat, sans reflet ni bascule.

### La nuit pour les moments de marque, le matin pour le quotidien

- **Nuit** : bienvenue, onboarding, chargement, carte du brief, carte « Ta mobilité ». C'est là que vivent la profondeur, les halos et, à venir, le ciel étoilé.
- **Matin** : tout le reste (listes, fiches, communauté). Clair et calme : on y anime l'arrivée des éléments et la réponse au toucher, pas le décor.

### L'avion

Un **avion vectoriel en perspective** (pas de moteur 3D, §5) : sur la carte « Ta mobilité », il vole le long d'un arc de ta ville à ta ville d'arrivée et s'arrête à ta progression (`features/journey/components/RouteArc.tsx`). Le même avion suit « Ton chemin » sur l'accueil (M2.1).

### L'espace Mentor

`features/home/MentorHome.tsx` reprend la grammaire du Brief : une **carte nuit** (ciel étoilé) avec la **constellation** du mentor (`features/mentors/components/Constellation.tsx`) : il est l'étoile du centre, reliée par un trait plein aux étudiants qu'il aide et en pointillés à ceux qui attendent sa réponse ; les traits se tracent une fois à l'affichage. Dessous, une phrase (« 2 étudiants attendent ta réponse. ») et trois chiffres sobres. Puis les demandes sur **une seule surface** (« Accepter » plein, « Décliner » en texte) et les créneaux par jour.

### Changer de rôle

Pas d'étiquette « MODE ÉTUDIANT » : la bascule **Étudiant | Mentor** vit dans l'en-tête des accueils (`RoleSwitch`), seulement pour qui a les deux rôles. Le curseur glisse et prend la couleur du rôle, puis l'accueil change. La feuille `role.tsx` (depuis Profil) reste pour découvrir les rôles, avec un bouton radio et l'Hôte « Bientôt ».

