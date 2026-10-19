# DALILI — Audit site ↔ app

> Audit du 19 octobre 2026. Périmètre : `dalili.study` (Next.js) et `dalili-app` (Expo).
> Les chiffres viennent du code et des deux projets Supabase, lus directement. Ils n'ont pas été supposés.
> Légende : 🔴 faux ou risqué pour la confiance · 🟠 incohérent · 🟢 sain.

---

## 0. Ce qu'il faut retenir (en 10 lignes)

1. **Le site a déjà le bon cerveau.** Son assistant RAG (`/api/assistant`) est solide : il a un seuil de pertinence, valide les citations et répond en 4 langues. **L'app, elle, ne l'utilise pas** : son Edge Function `dalili-ia` appelle Claude sans aucun guide, et le prompt lui demande même de « donner des ordres de grandeur ». Cela contredit directement la promesse de confiance.
2. **L'app n'a pas de backend en ligne.** Le projet Supabase « dalili.web » ne contient que les tables du site. L'autre projet (« aaymane's Project ») n'a pas le schéma de l'app. Aujourd'hui, l'app tourne **uniquement en mode démo**.
3. **L'app donne des chiffres périmés** : 615 €, visa ≈ 50 €, une APL présentée comme acquise pour tous, un TCF ≈ 110 €. Le détail est en §3.
4. **La réforme APL du 1er juillet 2026 est la plus grosse incohérence**, et elle dépasse ta liste. Le site l'explique dans un guide, mais trois endroits la contredisent : la page stats, les budgets « net » des 14 villes et le calendrier. L'app la contredit aussi (étape CAF, simulateur à −25/30 % d'APL).
5. 🔴 **« 200+ étudiants inscrits » est faux.** Il est affiché à 4 endroits du site, alors que la table `waitlist` compte **58 emails** (34 web, 18 simulateur, 4 calendrier, 2 comparateur). Pour une marque qui vend la confiance, c'est le premier point à corriger.
6. 🔴 **L'assistant du site renvoie « je n'ai pas cette information » dans 47 % des cas** : 58 refus sur 123 questions dans `assistant_queries`. Une partie de ces cas date d'avant le commit `6443604`, qui a comblé des trous. Mais si l'app en fait son cœur, ce taux est le KPI n° 1.
7. **Les outils du site écrasent les réponses précédentes.** Chaque outil fait un `upsert(..., ignoreDuplicates: false)` sur la même ligne : le calendrier écrase le budget du simulateur. La continuité site → app est donc aujourd'hui partielle et avec pertes.
8. Les guides n'ont **pas de champ pays** ni de liste de sources ou de documents structurée dans le frontmatter. Le pays se déduit de `cluster` ou du slug. Les « chiffres clés » se trouvent dans `<KeyFacts>`.
9. **Le Liban** a 5 guides, mais pas de page `/pays`, et il manque dans le calendrier et le simulateur. **Côte d'Ivoire et Cameroun** n'ont qu'un guide chacun : leurs parcours seront maigres.
10. La doc de l'app n'est plus à jour : `CLAUDE.md` parle de SDK 58, RN 0.88 et de 64 guides. En réalité : `expo ~57.0.30`, `react-native 0.86.3` et 75 guides.

---

## 1. Ce qui existe — le site `dalili.study`

| Brique | Implémentation | État |
|---|---|---|
| Framework | Next.js 14.2 (App Router), React 18, Tailwind, déployé sur Vercel | 🟢 |
| Guides | `content/blog/*.mdx` — **75 fichiers**, lus par `lib/blog.ts` (gray-matter + next-mdx-remote) | 🟢 |
| Frontmatter | `title, description, date, updatedDate, category, readTime, excerpt, author, ogImage, thumbnail, cluster` | 🟠 aucun `country`, `sources`, `documents`, `summary` |
| Composants MDX | `<KeyFacts f1… source="…"/>` (chiffres clés + source), `<Callout>`, FAQ en `**Question ?**` ou `### Question ?` sous un H2 « FAQ » | 🟢 parsables (déjà fait par `generate-embeddings.mjs`) |
| Catégories | Visa 29 · Vie étudiante 11 · Études 9 · Logement 8 · Démarches 6 · Emploi 3 · Finances 3 · Banque 2 · Budget 2 · Santé 2 | 🟠 taxonomie hétérogène (Banque/Finances/Budget) |
| Clusters (≈ pays) | `CLUSTER_MAP` dans `lib/blog.ts` : maroc, algerie, tunisie, senegal, liban, cote-ivoire, cameroun + thématiques | 🟠 le guide générique `compte-bloque-visa-…` est classé « tunisie » |
| Villes | `lib/cities.ts` (15 entrées, dont Caen) + `content/villes/*.mdx` ; `monthlyBudgetMin/Max/Brut/Net` | 🟠 « net » suppose l'APL (voir §4) |
| Universités | `lib/universities.ts` + `content/universites/*.mdx` (14) | 🟢 |
| Pays | `app/pays/*` (6 pages en dur : MA, DZ, TN, SN, CI, CM) | 🟠 pas de Liban |
| Chiffres réglementaires | `lib/data/regulatory-figures.ts` — **vraie source unique** avec paliers datés (615 → 877,50 € au 1/08/2026, CVEC 105, 2 895 / 3 941 / 397 €, plafond d'exonération 30→20 %) | 🟢 excellent, à exposer à l'app |
| Outils | `/simulateur`, `/calendrier` (`lib/calendrier-data.ts`), `/comparer` (`lib/comparer-scores.ts`), `/checklist` (PDF) | 🟠 voir §4 |
| Waitlist | Supabase `dalili.web` → `waitlist(email unique, source, status, metadata, simulateur_data)` ; 58 lignes | 🟠 écrasement, voir §0.7 |
| Emails | Resend (bienvenue + résultat d'outil en PDF) | 🟢 |
| Assistant IA | `app/api/assistant/route.ts` + `lib/assistant/*` + widget global `AssistantWidget` (dans `app/layout.tsx`) | 🟢 voir §1.1 |

### 1.1 L'assistant du site, en détail

| Élément | Réalité dans le code |
|---|---|
| Endpoint | `POST /api/assistant` — runtime Node, public, `{question, history}` → NDJSON (`text` / `sources` / `fallback` / `error`) |
| Corpus | Supabase `content_chunks` : **2 140 extraits de 104 pages** (blog 1 385, villes 260, universités 495). Découpage par H2, un extrait par paire FAQ, et `KeyFacts` comme extrait « Points clés vérifiés » |
| Embeddings | Voyage `voyage-4-lite`, 1024 dimensions, `input_type` asymétrique ; RPC `match_content_chunks` ; MAJ incrémentale via `npm run generate-embeddings` (hash du contenu) |
| Langues | `detectLanguage()` local (fr / ar / darija / en). Si la question n'est pas en français, Haiku la traduit en français **pour la recherche seulement**. Les relances sont reformulées par `condenseQuestion()` |
| Garde-fou 1 | **Seuil de pertinence 0,6** : en dessous, Claude n'est **jamais** appelé ; on renvoie une phrase fixe dans la langue détectée + 3 suggestions de guides |
| Garde-fou 2 | Le modèle termine par `SOURCES_USED: [n…]` ; `extractAndValidateSources()` jette tout index inventé |
| Prompt | `RULES` : uniquement les extraits, aucun chiffre inventé, langue de l'utilisateur, « je n'ai pas cette information… », renvoi vers un professionnel pour le juridique ou le médical |
| Modèle | `ASSISTANT_MODEL` ou `claude-haiku-4-5`, 800 tokens, cache de prompt en 2 points |
| Limite de débit | 20 requêtes / 10 min **par IP hachée** |
| Journal | `assistant_queries` (question, top_similarity, fallback), sans donnée identifiante |

**Limites pour l'app :**
- 🟠 **Faux streaming.** Le serveur attend `finalMessage()` puis envoie tout le texte d'un bloc, parce qu'il doit couper la ligne `SOURCES_USED`. Pour l'app, il faut streamer les deltas en retenant seulement la dernière ligne.
- 🔴 **Limite par IP incompatible avec le mobile.** Au Maghreb, les opérateurs partagent souvent la même IP entre des milliers d'abonnés (CG-NAT). 20 questions / 10 min par IP bloquerait des utilisateurs qui n'ont rien fait. L'app doit être limitée **par utilisateur authentifié**.
- 🟠 **Pas de « disclaimer juridique » systématique.** C'est le prompt qui renvoie vers un professionnel. Il n'y a pas de drapeau structuré que l'UI pourrait afficher.
- 🟠 **Pas de contexte.** Le pays ou l'étape de l'étudiant ne sert pas à la recherche. Pourtant, filtrer ou favoriser le bon `cluster` éviterait de citer le guide Algérie à un Marocain.
- 🟠 Pas de retour « réponse fausse » ni de lien entre une question et une réponse dans le journal.
- 🟢 Pas de nom d'outil exposé, pas de clé côté client.

---

## 2. Ce qui existe — l'app `dalili-app`

| Brique | Réalité | État |
|---|---|---|
| Stack | `expo ~57.0.30`, `react-native 0.86.3`, React 19.2, Reanimated 4.5.1, worklets 0.10.1, expo-blur, expo-image-picker, expo-notifications, expo-localization | 🟠 `CLAUDE.md` annonce SDK 58 / RN 0.88 |
| Absents | `@shopify/react-native-skia`, `expo-speech`, `expo-camera`, `expo-calendar`, `expo-sensors`, persisteur React Query | à ajouter (tous inclus dans Expo Go, à confirmer avec la doc v57 avant l'install) |
| Parcours | `features/journey/steps.ts` : **17 étapes** avec texte en dur (oneLiner, why, howTo, budget, needs) + `guideId` vers les **guides internes de l'app** | 🔴 deuxième source de vérité |
| Guides | `features/guides/guides.ts` : quelques guides réécrits à la main (« à synchroniser avec les 64 guides ») | 🔴 à supprimer au profit du site |
| Lexique | `features/guides/glossary.ts` (26 termes) + `RichText` `[[TERME]]` | 🟢 bonne idée, à aligner sur le site |
| Villes | `data/cities.ts` : 12 villes dont **Le Havre (absent du site)** ; il manque Nice, Clermont-Ferrand, Dijon et Caen ; les loyers diffèrent du site | 🟠 |
| Pays | `Country = 'MA' \| 'DZ' \| 'TN' \| 'other'` | 🟠 il manque SN, CI, CM, LB |
| IA (démo) | `features/ai/brain.ts` : mots-clés → texte des étapes | 🟠 cite 615 € |
| IA (prod) | `supabase/functions/dalili-ia` : Claude **sans RAG**, réponse non streamée, sans citations, avec le profil collé dans le prompt | 🔴 viole la règle « un seul cerveau » |
| Backend | `supabase/migrations/20261017000000_init.sql` (profils, étapes, mentors, réservations, groupes, posts, événements, ai_messages ; RLS partout) | 🟠 **jamais appliqué** sur un projet distant |
| Accueil | `StudentHome` + 3 pistes non commitées (`/pistes` : billet, chemin, focus) + tokens modifiés | 🟠 travail non commité, à sauver avant tout |
| Outils | `outils/budget.tsx` (APL forfaitaire à 25-30 % du loyer), `outils/documents.tsx`, `outils/sos.tsx` | 🔴 budget faux depuis la réforme APL |

---

## 3. Contenus de l'app devenus faux par rapport au site

| # | Où (app) | L'app dit | Le site dit (source) | Action |
|---|---|---|---|---|
| 1 | `steps.ts:147,153` · `guides.ts:65` · `budget.tsx:17` · `brain.ts:93` · `outils/documents.tsx:48` | Ressources ≥ **615 €/mois** | **877,50 €/mois depuis le 1er août 2026** (décret n° 2026-526 du 22 juin 2026) — `regulatory-figures.ts` | Lire la valeur depuis l'API de contenu (paliers datés) |
| 2 | `steps.ts:140` (visa) | « ≈ 50 € + frais prestataire » | **≈ 99 €** de frais consulaires + frais VFS/TLS (guides visa MA/TN/LB/CI/CM) | Corriger via le guide |
| 3 | `steps.ts:335` (validation visa) | « ≈ 50 € (timbre fiscal) » | Le guide OFII dit **150 €** (en citant service-public F2231) | ⚠️ **À trancher par l'équipe** : un des deux est faux. À vérifier sur service-public avant publication |
| 4 | `steps.ts` étape `caf` + `guides.ts:41` + `budget.tsx` (APL 25-30 %) | « Fais-la dès ton arrivée — ça te rapporte » ; APL déduite pour tous | **Depuis le 1er juillet 2026, plus d'APL hors UE sauf 5 exceptions** (`reforme-apl-etudiant-etranger-2026`) | Étape CAF conditionnelle (« vérifie si tu es concerné ») ; budget brut par défaut |
| 5 | `steps.ts:73` (TCF) | « ≈ 110 € » | TCF Maroc : **≈ 350 MAD (≈ 32 €)** (`tcf-maroc-2026-guide-complet`) | Montant par pays, tiré du guide. ⚠️ 350 MAD paraît bas, à revérifier côté site |
| 6 | Absent de l'app | — | **Repas au resto U à 1 €** pour tous les étudiants depuis le 4 mai 2026 | À ajouter (budget, arrivée) |
| 7 | `glossary.ts` CVEC, `steps.ts` | ≈ 105 € | 105 € (CNOUS 2025-2026) | 🟢 juste, mais à lire depuis l'API |
| 8 | Absent de l'app | — | **964 h/an** de travail ; **803 h/an pour les Algériens** (accord de 1968, page stats) | Étape « travail », avec variante pour DZ |
| 9 | Absent de l'app | — | Frais de scolarité **2 895 € (licence) / 3 941 € (master)** / 397 € (doctorat) + plafond d'exonération | Étape « école » + simulateur |
| 10 | `steps.ts` (`autoDone` TCF) | Le TCF concerne tout le monde | Pas exigé si tu es francophone par ton diplôme ou si tu as le DELF/DALF (`delf-dalf-vs-tcf…`) | Logique par profil, d'après le guide |
| 11 | `data/cities.ts` | Paris CROUS 450 €, Lyon studio 620 €… | `lib/cities.ts` (min/max/brut) | Remplacer par les données du site |
| 12 | `glossary.ts` APL | « Une aide de la CAF qui paie une partie de ton loyer » | Plus accessible à la plupart des étudiants hors UE | Ajouter la nuance |
| 13 | `dalili-ia` (prompt) | « Donne des ordres de grandeur avec environ » | Interdit d'inventer un chiffre | Remplacer par le cerveau du site |

---

## 4. Incohérences internes du site à corriger

| # | Sujet | Constat (fichier:ligne) | Correction proposée |
|---|---|---|---|
| S1 | **Frais CEF Maroc** | **2 200 MAD** dans `campusfrance-maroc-guide-complet.mdx:20` (KeyFacts), `visa-etudiant-france-maroc-2026.mdx:21`, `app/faq/visa-etudiant-france/page.tsx:68`, `campusfrance-tunisie-guide-complet-2026.mdx:144`. **1 900 MAD** dans le corps des mêmes guides (`campusfrance-maroc…:54,93`, `visa-…-maroc:117`) et `etudier-en-france-depuis-cote-ivoire.mdx:61` | Un seul montant, vérifié sur maroc.campusfrance.org, et ajouté à `regulatory-figures.ts` (`fraisCefMaroc`) |
| S2 | **Délais visa Maroc** | KeyFacts `:19` « 8 à 14 semaines en été, 4 à 8 hors saison » ; tableau `:89-93` « 6–10 / 9–22 semaines » ; description « 4-8 semaines » ; `:30` « Campus France ajoute 4 à 8 semaines » | Aligner KeyFacts et description sur le tableau (le plus détaillé) |
| S3 | **Page stats : Paris** | `app/stats/page.tsx:52` brut 950, net 650, CAF 200. **Nuance** : la formule en commentaire (`:49-50`) retire aussi le RU, le transport et la CSS, donc 950 − 200 ≠ 650 n'est pas forcément une faute de calcul. Le vrai problème est que la décomposition n'est pas affichée et que **la CAF y est supposée pour tous** | Afficher la décomposition et recalculer sans APL par défaut (réforme 2026) |
| S4 | **Page stats : Bordeaux** | Tableau `:54` → 680 / 420 ; détail `:68-76` → total 645 / 370 (le calcul est juste ligne par ligne). `lib/cities.ts:50-51` dit aussi 680 / 420 | Une seule source : générer le tableau depuis `lib/cities.ts` avec la même formule |
| S5 | **APL dans les budgets nets** | `lib/cities.ts` (`monthlyBudgetNet` × 15), `stats/page.tsx` (« avec les aides, 370–450 €/mois »), simulateur (`cafMid`) supposent l'APL. Le guide de réforme dit le contraire | Le « net » ne doit compter l'APL que si l'étudiant entre dans une des 5 exceptions |
| S6 | **Commission / affiliation** | `PartnersSection.jsx:137` « pas pour une commission » et `:378` « **aucune commission** » ; `mentions-legales:93-96` « DALILI peut percevoir une commission » ; `TestimonialsSection.jsx:379` « certains liens sont affiliés » | Garder la version honnête partout : « Certains liens sont affiliés, on te le dit toujours. Ça ne change pas nos recommandations. » |
| S7 | 🔴 **« 200+ étudiants »** | `ClientHomePage.tsx:137`, `EmailCapture.jsx:274,375`, `checklist/page.tsx:266` ; la base compte 58 emails | Afficher le vrai nombre, calculé depuis la base (comme `site-stats.ts`), ou retirer la mention |
| S8 | **Calendrier : liens faux** | `lib/calendrier-data.ts` : Tunisie → `visaLink` pointe vers **le guide visa Algérie** et `cfLink` vers la page pays, alors que `campusfrance-tunisie-guide-complet-2026` et `visa-etudiant-france-tunisie-2026` existent. Liban absent. L'étape « garant VISALE » pointe vers le guide CROUS. « Médecin traitant » n'a pas de lien alors que le guide existe | Corriger les liens et ajouter le Liban |
| S9 | **Calendrier : délais et APL** | Visa « 3 à 6 semaines » contre 4 à 8 / 9 à 22 dans le guide Maroc ; Sénégal `tcfRequired: false` alors que `tcf-senegal-dakar-guide-2026` existe | Aligner les délais sur les guides et faire vérifier la règle TCF pour le Sénégal |
| S10 | **SMIC** | 11,88 €/h (`faq/budget`) contre 11,91 €/h (`budget-etudiant-senegalais`) | Ajouter `smicHoraire` à `regulatory-figures.ts` |
| S11 | **Heures de travail pour les Algériens** | 803 h seulement sur la page stats ; le guide `travailler-en-france-etudiant-etranger` n'en parle pas (964 h partout) | Ajouter la section Algérie au guide (c'est lui que l'assistant cite) |
| S12 | **Taxe de validation du visa** | Guide OFII : 150 € ; l'app : 50 €. Voir §3-3 | Ajouter `taxeValidationVlsTs` à `regulatory-figures.ts` avec sa source |
| S13 | **Outils → waitlist** | `upsert` avec `ignoreDuplicates:false` : chaque outil **écrase** `simulateur_data` et `source` du précédent | Table d'événements `tool_results` (une ligne par usage), voir VISION §2.6 |
| S14 | Hygiène | `api/simulateur` journalise le corps complet (email + budget) et le début de la clé Resend ; `ADMIN` en dur | Retirer les `console.log` de données personnelles |
| S15 | Schéma | `supabase/schema.sql` ne déclare ni `simulateur_data`, ni `content_chunks`, ni `match_content_chunks`, ni les tables de l'assistant | Versionner de vraies migrations dans le dépôt du site |

---

## 5. Couverture des guides par pays (pour le parcours de l'app)

| Étape | MA | DZ | TN | SN | LB | CI | CM |
|---|---|---|---|---|---|---|---|
| Campus France | ✅ | ✅ | ✅ | ✅ | ✅ | page pays | page pays |
| Visa | ✅ | ✅ | ✅ | ✅ | ✅ | page pays | page pays |
| TCF | ✅ (+ calendrier, 30 jours) | ❌ → `delf-dalf-vs-tcf` | ✅ | ✅ | ❌ → `delf-dalf-vs-tcf` | ❌ | ❌ |
| Bourses | général | général | ✅ | ✅ | ✅ | général | général |
| Le reste (logement, banque, santé, CAF, OFII…) | guides généraux communs | | | | | | |

👉 Pour CI et CM, l'app doit dire honnêtement « Notre guide spécifique arrive bientôt. En attendant, voici le guide général. » Elle ne doit **jamais** combler le vide elle-même.

---

## 6. Points de vigilance sur la demande initiale

Ces points sont repris et argumentés dans `VISION.md` §8 :
- Le **Brief du jour ne doit pas être généré par l'IA** à chaque ouverture. Un texte rédigé (modèle + champs du profil + chiffre clé tiré du guide) est plus sûr, gratuit, disponible hors ligne et instantané.
- **Continuité par email** : ne jamais pré-remplir un profil avant d'avoir **vérifié l'email par OTP**. Sinon, n'importe qui pourrait taper l'email d'un autre et voir sa ville et son budget. Il faut aussi mettre à jour la politique de confidentialité du site.
- **« Explique-moi ce papier »** : un courrier CAF ou de préfecture contient des données personnelles. Il faut un traitement éphémère sans stockage de l'image, et séparer clairement « ce que dit ton courrier » de « ce que disent nos guides ».
- **Le billet ne doit pas remplacer l'action du jour** : après le visa restent le logement, la CVEC, la validation sur l'ANEF… On garde le billet au-dessus de l'action, pas à sa place.
- **Lecture à voix haute en darija** : aucune voix système ne la prend en charge. La lecture se fera en arabe standard ou en français, et il faut le dire.
- **Brief mentor** : l'étudiant doit voir et valider le résumé avant qu'il parte au mentor.
