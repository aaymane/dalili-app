# DALILI — Où on en est

> Mis à jour le 23/10/2026. À relire en début de session, et à mettre à jour à la fin de chaque étape.
> Détails : `docs/SUPABASE.md` (base), `docs/VISION.md` (plan), `docs/AUDIT.md` (audit site ↔ app).

## Jalons

- ✅ **M0 — Contenu unifié** : l'app lit les guides, le parcours et les chiffres de dalili.study.
- ✅ **M1 — Cerveau IA commun, Âme, Brief du jour** : code poussé, **base de prod migrée le 21/10**.
- ✅ **M2 — Chemin + billet** : M2.1 « Ton chemin » (22/10), M2.2 billet en haut de l'accueil et « Bienvenue à … » le jour J (23/10), M2.3 déblocage plein écran au visa coché, bascule 3D et reflet holographique (23/10). Reste à valider sur iPhone (inclinaison, 60 fps sur un petit iPhone).

## Mise en production de M1 : suivi

| | Étape | État |
|---|---|---|
| a | Sauvegarde de la base | ✅ `~/Desktop/dalili-backups/2026-10-20/`, restauration testée |
| b | Variables Vercel | ✅ Toutes présentes. `NEXT_PUBLIC_SITE_URL` absente mais inutile : la valeur de secours `https://dalili.study` est la bonne (domaine principal sans www). ⚠️ Les déploiements Preview utilisent les clés de Production (voir « À surveiller ») |
| c | Migration M1 en prod + sécurité + formulaires | ✅ 6 migrations appliquées (dont le correctif « fonctions privées »), 49 tests de sécurité verts, contrôles en prod OK. Formulaires testés avec l'adresse de test de l'équipe, lignes de test supprimées. **Mais** l'email de bienvenue arrive en spam et son logo est cassé → étape 8 |
| d | Guide CVEC en brouillon | ❌ Priorité n° 1 du contenu : « C'est quoi la CVEC ? » est refusée (score 0,579 pour un seuil de 0,6). **Ne pas baisser le seuil** |
| e | Auth Supabase + `.env` de l'app + test iPhone | ✅ Testé le 22/10 sur iPhone avec un vrai compte : inscription, étape officielle (`step_progress`) et tâche perso (`custom_steps`) enregistrées, Dalili IA via `/api/v1/assistant` (`assistant_usage`). Clé publique uniquement. Accès direct au parcours ajouté sur l'accueil. `dalili-ia` supprimée (jamais déployée) |
| f | Corrections M1 | ✅ App (22/10) : étape du jour = plus proche échéance non faite ; « Mentors bientôt » (accueil, Explorer, carte « stress » de l'IA) tant qu'aucun mentor n'est validé ; carte 3114 seulement en France, sinon message sans numéro ; guides communs gardés même sans pays précisé ; profils de test absents du build de production (la route `dev-profil` reste, mais ne fait que rediriger). ⏸ Site : SMIC 12,31 € brut/heure depuis le 1er juin 2026, script des chiffres vérifiés il y a plus de 90 jours, origine des témoignages |
| p | Photo de profil | ✅ Migration `photos_profil` en prod (bucket privé, 4 règles, chemin obligatoire), 10 tests de sécurité verts. Testé le 22/10 : photo envoyée (JPEG 122 Ko, reliée au profil, ancienne supprimée). Corrigé : la galerie ne s'ouvrait pas sur iOS (ouverte pendant la fermeture de la feuille) |
| g | Direction artistique avant M2 | 🟡 Mouvement fait le 22/10 (`docs/DIRECTION.md` à jour) : entrées calmes sans rebond partout, apparitions au défilement, avion sur la carte mobilité, ouverture animée au lancement, feuilles du bas façon iOS (glisser pour fermer), calendrier qui glisse et se balaie, carte de succès et toasts avec entrée et sortie. Ciel étoilé fait le 22/10 (shader Skia : 3 plans, Voie lactée, étoile filante, inclinaison du téléphone, onde d'allumage au lancement) sur la bienvenue, la connexion, l'onboarding nuit, le chargement, le brief et « Ta mobilité ». Reste : validation sur iPhone, puis captures Aymen et Salma |
| 8 | Emails du site | ⏸ Plus tard (site) : logo cassé dans les emails, arrivée en spam (SPF, DKIM, DMARC, désabonnement) |

## Prochaine action

1. **Sécurité de l’app** : ✅ session chiffrée (AES-256, clé dans le trousseau, `src/lib/secure-session.ts`) ; ✅ page Confidentialité + suppression du compte (`/api/v1/account` sur le site : photos, fiche mentor puis compte, le reste part en cascade), testée en prod le 22/10 (rien d’orphelin, photo effacée du stockage) ; ✅ profil, photo et parcours remis depuis le serveur à la connexion d’un autre compte ou sur un nouveau téléphone (`restoreFromServer`, 8 s max), et chaque changement du profil après l’onboarding renvoyé en ligne (`watchProfile`) : testé le 22/10 sur une copie locale de Supabase (2 comptes de test) : connexion sans onboarding, profil, inquiétudes, photo, étapes cochées et tâche perso retrouvés, ville changée dans Profil IA bien envoyée.
2. ✅ Le 23/10 : passage au SDK 58 ; espace Mentor refait (carte nuit et constellation, demandes, créneaux), bascule Étudiant | Mentor dans l'en-tête, icônes bicolores par famille dans toute l'app (`tones`), écran SOS refait.
3. ✅ M2.2 — le billet en haut de l'accueil (23/10).
4. ✅ M2.3 — le déblocage (23/10).
5. **Validation M2 sur iPhone** : cocher le visa, incliner le téléphone sur le billet, fluidité de « Ton chemin ». Puis jalon suivant de `docs/VISION.md`.
6. 🟡 **M3 — Chat premium** : streaming, sources, lexique, drapeaux, 3114 et refus déjà faits en M1. M3.1 (23/10) : cartes « Ouvrir l'étape » sous la réponse, déduites des guides cités par le site (`lib/assistant/actions.ts`, événement `actions`). M3.2 (23/10) : 🔊 « Écouter » (expo-speech, langue de la réponse, darija lue en arabe standard et annoncée) et 👎 « Signaler » (feuille : motif + mot facultatif → `/api/v1/assistant/feedback`, rien n'est envoyé en mode démo). Corrigé le 23/10 : la feuille monte avec le clavier, la voix saute les emojis et prend la plus belle voix installée. ✅ Code de M3 terminé. Reste à tester sur iPhone avec un vrai compte : refus, quota (429), signalement visible dans `assistant_feedback`, voix Premium.

7. 🟡 **Mentorat réel** (choix du 23/10 : la réservation est une demande que le mentor accepte ou décline selon le moment, pas de créneaux fixes). Étape 1 ✅ migration `mentorat_reel` + 17 tests (pas appliquée en prod). Étape 2 ✅ espace Mentor sur les vraies données (`features/mentors/api.ts`, `hooks.ts`) : fiche envoyée à l'équipe depuis l'onboarding ou l'espace, « en cours de validation », demandes avec Accepter / Décliner, interrupteur « Je prends des demandes », chiffres calculés. Étape 3 ✅ côté étudiant : il propose un jour et une heure (plus de créneaux inventés, plus de faux envoi de documents), mentor en pause = message + autres mentors, demande « en attente » sur l'accueil (annulable) puis « Appel confirmé » ; réservations lues sur la base (`useMyBookings`), relues au retour dans l'app (`lib/query.ts`). ✅ Migration `mentorat_reel` appliquée en prod le 23/10 (feu vert, sauvegarde, advisor : seule nouvelle alerte voulue). **Reste : test à deux comptes (un étudiant demande, un mentor validé accepte).**

8. 🟡 **Espace admin des fondateurs** (`dalili.study/admin`, 23/10) : onglets Vue d'ensemble (comptes, mentors, demandes d'appel, questions et taux de refus de l'IA, coût, signalements), **Mentors** (valider, refuser une fiche jamais validée, suspendre ; email pour contacter), Inscrits (la waitlist, inchangée), Signalements IA. Accès par le code partagé `ADMIN_TOKEN` (comparé en temps constant, `lib/admin-auth.ts`). Plus tard : un compte par associé (table `admins`) pour savoir qui a validé quoi, et un email au mentor validé.

9. 🟡 **Notifications** (24/10) : le serveur du site prévient l'autre personne après avoir vérifié en base (`/api/v1/notify`, `lib/notify.ts`, Expo Push gratuit) : nouvelle demande → mentor ; acceptée ou déclinée → étudiant ; annulée → mentor ; fiche validée dans l'admin → mentor. Une seule alerte par événement. Toucher l'alerte ouvre le bon écran dans le bon rôle. L'autorisation est demandée au bon moment (demande envoyée, fiche mentor envoyée, Profil › Rappels). ✅ Projet EAS créé (`eas init`, identifiant dans `app.json`). ✅ Migration `notifications` appliquée en prod le 24/10. **Reste : test sur iPhone avec deux comptes. Android : build de développement obligatoire.** Suite décidée le 24/10 : notifications par webhook Supabase (fiables même si l'app se ferme), puis sécurité du mentorat (charte, mentors majeurs et vérifiés, Signaler, Bloquer ; règle pour les mineurs à décider par les fondateurs). Plus tard : email en complément, une fois les emails sortis du spam (étape 8).

Plus tard : régénérer `SUPABASE_SECRET_KEY`, `RESEND_API_KEY` et `ANTHROPIC_API_KEY` (elles ont été exposées sur des Preview Vercel), et supprimer les anciens déploiements Preview.

Ordre décidé le 21/10 : **l'app d'abord (e, f, g), le site ensuite.**

## Plus tard : le site

- **Étape 8 — emails du site** :
  - A. logo en PNG hébergé, avec `width`, `height` et `alt` ;
  - B. délivrabilité : DNS du domaine d'envoi dans Resend, `List-Unsubscribe` en un clic, version texte, expéditeur fixe, lien de désabonnement visible ;
  - C. aperçu des 4 emails avant les commits ;
  - D. après déploiement, nouvel envoi et score mail-tester.com.
- **Étape d — guides manquants** : un guide sur la CVEC (priorité n° 1), puis les sujets refusés par l'assistant (`dalili.study/docs/GUIDES-A-ECRIRE.md`).

## À surveiller

- **À revérifier (23/10)** : « C'est quoi compte bloqué » était refusé (sous le seuil de 0,6) alors que le guide existe. Correctif poussé sur le site : la définition simple du lexique enrichit la recherche. Reposer la question dans l'app et regarder `top_similarity` dans `assistant_queries`. Si c'est encore refusé : ajouter un nom complet ou des synonymes au terme, **sans baisser le seuil**.
- **Preview Vercel** : ✅ le 22/10, les 5 secrets (`SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `ADMIN_TOKEN`) sont en Production seulement. Reste : 4 branches mortes sur GitHub (`vercel/install-vercel-web-analytics-…` ×2, `worktree-agent-…` ×2) ont sans doute des Preview en ligne, avec du vieux code et les vraies clés.
- ✅ **`/api/test-email`** est protégée par `ADMIN_TOKEN` (vérifié le 23/10).
- **`.claude/settings.json`** : ne jamais y commiter `apply_migration` (autorisation d'écriture en prod).
- **Sauvegarde** : à refaire avant chaque nouvelle migration (plan gratuit, aucune sauvegarde automatique).
- **Taux de refus de l'assistant** : suivi chaque lundi (`dalili.study/docs/GUIDES-A-ECRIRE.md`).

## Règles de travail

- Claude ne commite et ne pousse jamais : il donne les commandes git à copier à la fin de chaque étape, dépôt par dépôt, puis attend le « poussé ».
- Rien en prod sans feu vert explicite.
- Aucune clé secrète dans l'app, aucun email personnel dans un fichier commité (l'adresse de test se donne dans la conversation, jamais dans un fichier).
