# Feuille de route DALILI

## ✅ Fait (v0.1)

- [x] Base Expo + Router + TypeScript strict, mode démo sans clés
- [x] Design system en code (tokens de la charte, composants animés, haptique, confettis)
- [x] Auth : email + mot de passe, OTP 6 chiffres, Google / Apple (Supabase), photo de profil
- [x] Onboarding étudiant (6 questions + rappels) et mentor, chargement animé
- [x] Accueil étudiant + accueil mentor, sélecteur de rôle
- [x] Parcours-quête (phases, validation, badges, tâches perso, calendrier) + fiches de clarification
- [x] Explorer (mentors, guides, hôtes teaser), profil mentor, réservation, écran d'appel (UI)
- [x] Dalili IA (cerveau local + Edge Function Claude), Profil IA
- [x] Communauté : groupes, événements, posts, likes, créations
- [x] Outils : guides, lexique, budget, documents, SOS
- [x] Supabase : schéma complet + RLS testée + seed

## 🔜 Prochaines étapes (priorité MVP)

- [x] **Sécurité du mentorat** : charte et mentors de 18 ans vérifiés (24/10), signaler et bloquer un mentor ou un étudiant (28/10)
- [ ] **Mineurs** : règle A, B ou C à choisir par les fondateurs

- [x] **Messagerie mentor ↔ étudiant (temps réel)** : ouverte quand le mentor accepte (29/10)
  > `/fonctionnalite Messagerie privée entre un étudiant et son mentor : liste des conversations, écran de chat avec bulles animées, indicateur « en train d'écrire », temps réel avec Supabase Realtime, tables conversations/messages avec RLS (seuls les 2 participants lisent). Accès depuis le profil mentor (« Écrire ») et depuis l'accueil.`

- [x] **Appels vidéo réels** : Daily, salle privée par rendez-vous, jeton donné par le site, compte Daily et premier build (29/10) — reste un vrai appel à deux
  > `/fonctionnalite Brancher l'écran src/app/(app)/appel/[id].tsx sur LiveKit (ou Daily) : Edge Function qui génère le token de la salle pour le booking, vérification que l'utilisateur est l'étudiant ou le mentor du rendez-vous. Nécessite un development build (expo-dev-client).`

- [x] **Notifications push & rappels d'échéances** — ✅ rappels locaux 7 jours avant et la veille (29/10) ; ✅ push des demandes d'appel (24/10) ; ✅ push des nouveaux messages (un seul par série non lue, rien si blocage) : l'app prévient aussi le site après chaque envoi (30/10). Le webhook de la base était refusé par le site (401) : secret `NOTIFY_WEBHOOK_SECRET` de Vercel à réaligner sur le Vault. Sur iPhone, les push demandent le compte Apple Developer.
  > `/fonctionnalite Rappels locaux avec expo-notifications : planifier une notification 7 jours et 1 jour avant chaque échéance du Parcours-quête (visa, CVEC, CAF…) quand profile.notificationsEnabled est vrai ; replanifier quand la date d'arrivée change. Puis push serveur (Expo Push) pour les nouveaux messages et les rendez-vous.`

- [x] **Synchronisation complète Supabase** : à chaque connexion, profil, étapes et tâches perso relus en arrière-plan (le serveur gagne, sauf ce que tu touches pendant la relecture ; une étape cochée hors ligne est renvoyée), écran « Mes rendez-vous » (à venir, historique, rejoindre, écrire, annuler) (30/10), index `bookings_student_idx` appliqué en prod
  > `/fonctionnalite Au login, charger depuis Supabase le profil, step_progress et custom_steps pour hydrater les stores Zustand (le serveur gagne en cas de conflit). Ajouter un écran « Mes rendez-vous » qui lit la table bookings.`

- [ ] **Mentorat refondu (décisions du 30/10)** — un compte est étudiant OU mentor, jamais les deux
  - [x] **Étape 1 · Candidature mentor vérifiée** (30/10) : plus de sélecteur de rôle ; on ne devient mentor qu'en France, charte + titre de séjour + certificat de scolarité envoyés dans l'app (bucket privé), l'équipe valide ou refuse avec un motif dans l'admin du site, documents supprimés à la décision et avec le compte ; l'app bascule seule dans l'espace mentor. La base refuse une fiche hors de France ou sans les deux documents. Migrations appliquées en prod le 30/10.
  - [x] **Étape 2a · Espace mentor** (30/10) : onglets du mentor (Accueil, Agenda, Messages, Profil ; l'étudiant garde les siens), accueil refait (carte nuit + disponibilité, prochain appel avec compte à rebours, 3 demandes à traiter, raccourcis), Agenda (À traiter, À venir, Historique), « Ma fiche publique » modifiable avec aperçu en direct, spécialités traduites dans la langue de l'étudiant.
  - [x] **Étape 2b · Créneaux, avis, communauté** (30/10) : le mentor choisit ses créneaux (heure de Paris), l'étudiant réserve sur un créneau libre à son heure (la base refuse hors créneau et les doublons) ; avis 1 à 5 après un appel passé, note et derniers avis tenus par la base (prénom seulement) ; seuls les mentors validés créent groupes et événements, onglet Communauté pour le mentor ; Profil et notifications propres au mentor. Migrations appliquées en prod le 30/10.
  - [x] **Étape 3 · Le mentor lance l'appel** (30/10) : « Démarrer l'appel » chez le mentor (le site note l'ouverture du salon et prévient l'étudiant : « Yassine t'attend dans le salon ») ; l'étudiant arrivé avant attend dans une salle d'attente qui bascule seule dans l'appel. Migration appliquée en prod le 30/10 ; reste à pousser le site.
  - [x] **Une demande à la fois** (30/10) : un étudiant ne peut pas redemander (même mentor ou autre) tant que sa demande attend une réponse ou que l'appel accepté n'est pas passé ; refusée ou annulée, il redemande tout de suite. La base le garantit ; l'écran de réservation montre la demande en cours (voir, annuler). Migration appliquée en prod le 30/10.
  - [x] **Fin d'appel** (30/10) : le salon ferme 45 minutes après l'heure (appel de 30 min + 15 de marge) ou dès que le mentor touche « Terminer pour nous deux » (le site supprime la salle Daily). Écran « Appel terminé » : l'étudiant note son mentor (la feuille s'ouvre seule) et peut réserver un autre appel tout de suite ; le mentor retrouve son agenda. L'accueil ne garde plus un appel fini. Migration `fin_d_appel` à appliquer en prod.
  - [x] **Documents en photo ou PDF** (30/10) : « titre de séjour ou visa » et certificat de scolarité ; le PDF demande un nouveau build de l'app (`expo-document-picker`), la photo marche déjà.
  - [x] **Étape 4 · Partenaires (site)** (30/10) : page dalili.study/partenaires (parcours de l'étudiant animé, chiffres réels, pour qui, règles, étapes, formulaire anti-robots limité à 3 envois par heure, FAQ), email à l'équipe, onglet admin « Partenaires » (statut, notes, pastille). Table `partner_leads` sans aucun accès public. Migration appliquée en prod le 30/10.

- [x] **Commentaires sur les posts** : plein écran, champ collé au clavier, supprimer le sien (29/10)
  > `/fonctionnalite Commentaires : ouvrir un post en plein écran, liste des commentaires, champ de saisie collant au clavier, insertion dans la table comments (RLS membres), mise à jour optimiste.`

- [x] **Écoles partenaires (« Nos partenaires »)** : Digital Campus Nantes publiée, présentation « Découvrir en 30 s », demande gardée par DALILI (29/10)
  > `/fonctionnalite Onglet Écoles partenaires dans Explorer : choisir formation, ville et établissement certifié par l'État, fiche école, bouton « Je suis intéressé·e » qui enregistre un lead (table school_leads avec RLS).`

## 🌍 Ensuite

- [x] **Internationalisation FR / العربية / EN** (avec RTL pour l'arabe) : toute l'app, 3 étapes faites le 29/10 — reste la relecture de l'arabe par un arabophone, et les notifications push du site en 3 langues
  > `/fonctionnalite Internationalisation avec expo-localization + i18next : extraire tous les textes en fichiers fr.json/ar.json/en.json, gérer le RTL pour l'arabe (I18nManager), sélecteur de langue dans le Profil.`
- [x] **Mode sombre** : thème vivant, bascule instantanée, Profil › Apparence (Auto / Clair / Sombre) (29/10)
- [ ] **Guides synchronisés avec dalili.study** (les 64 guides via une table `guides` ou le CMS du site)
- [ ] **Espace Hôte (V2)** : annonces d'hébergement temporaire, vérification d'identité, réservation
- [x] **Analytics** (PostHog, serveur européen) : après accord, anonyme, 13 événements, projet UE configuré (29/10)
- [x] **Tests** : Jest 30 + jest-expo 58 + Testing Library (29/10) ; 62 tests (parcours, synchronisation, candidature mentor, agenda du mentor, heure de Paris, créneaux et avis, rendez-vous, présentation des écoles, chiffres, appels, dates, rappels, démo messagerie et sécurité). `npm test`, et `npm run check` = types + lint + tests

## ⚠️ À valider par l'équipe

- Les montants et délais dans `src/features/journey/steps.ts` et `src/features/guides/*` (indexés chaque année).
- Les budgets par ville dans `src/data/cities.ts` (estimations).
- Le modèle Claude utilisé par l'Edge Function (`DALILI_AI_MODEL`, par défaut `claude-haiku-5-5`).
