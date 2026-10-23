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
6. 🟡 **M3 — Chat premium** : streaming, sources, lexique, drapeaux, 3114 et refus déjà faits en M1. M3.1 (23/10) : cartes « Ouvrir l'étape » sous la réponse, déduites des guides cités par le site (`lib/assistant/actions.ts`, événement `actions`). Reste M3.2 : 🔊 lecture à voix haute et 👎 « Cette réponse est fausse ».

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

- **Preview Vercel** : ✅ le 22/10, les 5 secrets (`SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `ADMIN_TOKEN`) sont en Production seulement. Reste : 4 branches mortes sur GitHub (`vercel/install-vercel-web-analytics-…` ×2, `worktree-agent-…` ×2) ont sans doute des Preview en ligne, avec du vieux code et les vraies clés.
- **`/api/test-email`** existe en production : vérifier qu'elle est protégée par `ADMIN_TOKEN`.
- **`.claude/settings.json`** : ne jamais y commiter `apply_migration` (autorisation d'écriture en prod).
- **Sauvegarde** : à refaire avant chaque nouvelle migration (plan gratuit, aucune sauvegarde automatique).
- **Taux de refus de l'assistant** : suivi chaque lundi (`dalili.study/docs/GUIDES-A-ECRIRE.md`).

## Règles de travail

- Claude ne commite et ne pousse jamais : il donne les commandes git à copier à la fin de chaque étape, dépôt par dépôt, puis attend le « poussé ».
- Rien en prod sans feu vert explicite.
- Aucune clé secrète dans l'app, aucun email personnel dans un fichier commité (l'adresse de test se donne dans la conversation, jamais dans un fichier).
