# Feuille de route DALILI

Chaque ligne non cochée contient un **prompt prêt à coller** dans Claude Code.

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

- [ ] **Messagerie mentor ↔ étudiant (temps réel)**
  > `/fonctionnalite Messagerie privée entre un étudiant et son mentor : liste des conversations, écran de chat avec bulles animées, indicateur « en train d'écrire », temps réel avec Supabase Realtime, tables conversations/messages avec RLS (seuls les 2 participants lisent). Accès depuis le profil mentor (« Écrire ») et depuis l'accueil.`

- [ ] **Appels vidéo réels**
  > `/fonctionnalite Brancher l'écran src/app/(app)/appel/[id].tsx sur LiveKit (ou Daily) : Edge Function qui génère le token de la salle pour le booking, vérification que l'utilisateur est l'étudiant ou le mentor du rendez-vous. Nécessite un development build (expo-dev-client).`

- [ ] **Notifications push & rappels d'échéances**
  > `/fonctionnalite Rappels locaux avec expo-notifications : planifier une notification 7 jours et 1 jour avant chaque échéance du Parcours-quête (visa, CVEC, CAF…) quand profile.notificationsEnabled est vrai ; replanifier quand la date d'arrivée change. Puis push serveur (Expo Push) pour les nouveaux messages et les rendez-vous.`

- [ ] **Synchronisation complète Supabase**
  > `/fonctionnalite Au login, charger depuis Supabase le profil, step_progress et custom_steps pour hydrater les stores Zustand (le serveur gagne en cas de conflit). Ajouter un écran « Mes rendez-vous » qui lit la table bookings.`

- [ ] **Espace mentor complet**
  > `/fonctionnalite Espace mentor : formulaire « Devenir mentor » (ville, parcours, spécialités, langues, citation) qui crée la ligne mentors, gestion des créneaux (table mentor_slots + RLS), demandes reçues lues depuis bookings avec accepter/refuser, statistiques réelles.`

- [ ] **Commentaires sur les posts**
  > `/fonctionnalite Commentaires : ouvrir un post en plein écran, liste des commentaires, champ de saisie collant au clavier, insertion dans la table comments (RLS membres), mise à jour optimiste.`

- [ ] **Écoles partenaires (« Nos partenaires »)**
  > `/fonctionnalite Onglet Écoles partenaires dans Explorer : choisir formation, ville et établissement certifié par l'État, fiche école, bouton « Je suis intéressé·e » qui enregistre un lead (table school_leads avec RLS).`

## 🌍 Ensuite

- [ ] **Internationalisation FR / العربية / EN** (avec RTL pour l'arabe)
  > `/fonctionnalite Internationalisation avec expo-localization + i18next : extraire tous les textes en fichiers fr.json/ar.json/en.json, gérer le RTL pour l'arabe (I18nManager), sélecteur de langue dans le Profil.`
- [ ] **Mode sombre** (tokens déjà centralisés)
- [ ] **Guides synchronisés avec dalili.study** (les 64 guides via une table `guides` ou le CMS du site)
- [ ] **Espace Hôte (V2)** : annonces d'hébergement temporaire, vérification d'identité, réservation
- [ ] **Analytics** (PostHog) : onboarding complété, étapes validées, réservations — pour le reporting KPI
- [ ] **Tests** : Jest + React Native Testing Library sur `features/journey/store.ts` et les composants du kit

## ⚠️ À valider par l'équipe

- Les montants et délais dans `src/features/journey/steps.ts` et `src/features/guides/*` (indexés chaque année).
- Les budgets par ville dans `src/data/cities.ts` (estimations).
- Le modèle Claude utilisé par l'Edge Function (`DALILI_AI_MODEL`, par défaut `claude-haiku-5-5`).
