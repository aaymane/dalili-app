# DALILI — Où on en est

> Mis à jour le 22/10/2026. À relire en début de session, et à mettre à jour à la fin de chaque étape.
> Détails : `docs/SUPABASE.md` (base), `docs/VISION.md` (plan), `docs/AUDIT.md` (audit site ↔ app).

## Jalons

- ✅ **M0 — Contenu unifié** : l'app lit les guides, le parcours et les chiffres de dalili.study.
- ✅ **M1 — Cerveau IA commun, Âme, Brief du jour** : code poussé, **base de prod migrée le 21/10**.
- ⏸ **M2 — Chemin + billet** : attend la direction artistique (g).

## Mise en production de M1 : suivi

| | Étape | État |
|---|---|---|
| a | Sauvegarde de la base | ✅ `~/Desktop/dalili-backups/2026-10-20/`, restauration testée |
| b | Variables Vercel | ✅ Toutes présentes. `NEXT_PUBLIC_SITE_URL` absente mais inutile : la valeur de secours `https://dalili.study` est la bonne (domaine principal sans www). ⚠️ Les déploiements Preview utilisent les clés de Production (voir « À surveiller ») |
| c | Migration M1 en prod + sécurité + formulaires | ✅ 6 migrations appliquées (dont le correctif « fonctions privées »), 49 tests de sécurité verts, contrôles en prod OK. Formulaires testés avec l'adresse de test de l'équipe, lignes de test supprimées. **Mais** l'email de bienvenue arrive en spam et son logo est cassé → étape 8 |
| d | Guide CVEC en brouillon | ❌ Priorité n° 1 du contenu : « C'est quoi la CVEC ? » est refusée (score 0,579 pour un seuil de 0,6). **Ne pas baisser le seuil** |
| e | Auth Supabase + `.env` de l'app + test iPhone | ✅ Testé le 22/10 sur iPhone avec un vrai compte : inscription, étape officielle (`step_progress`) et tâche perso (`custom_steps`) enregistrées, Dalili IA via `/api/v1/assistant` (`assistant_usage`). Clé publique uniquement. Accès direct au parcours ajouté sur l'accueil. `dalili-ia` supprimée (jamais déployée) |
| f | Corrections M1 | ✅ App (22/10) : étape du jour = plus proche échéance non faite ; « Mentors bientôt » (accueil, Explorer, carte « stress » de l'IA) tant qu'aucun mentor n'est validé ; carte 3114 seulement en France, sinon message sans numéro ; guides communs gardés même sans pays précisé ; profils de test absents du build de production (la route `dev-profil` reste, mais ne fait que rediriger). ⏸ Site : SMIC 12,31 € brut/heure depuis le 1er juin 2026, script des chiffres vérifiés il y a plus de 90 jours, origine des témoignages |
| p | Photo de profil | ⏳ Migration `photos_profil` appliquée en prod le 22/10 (bucket privé, 4 règles, chemin obligatoire), 10 tests de sécurité verts, advisor sans nouvelle alerte. Reste : test sur iPhone (changer sa photo depuis Profil) |
| g | Direction artistique avant M2 | ❌ Nuit étoilée et avion 3D pour les moments de marque, écrans du quotidien clairs, `docs/DIRECTION.md` à mettre à jour (il décrit encore les pistes supprimées), captures de l'accueil et de « Ton chemin ». Retour du 21/10 sur simulateur : animations et design jugés « un peu statiques » |
| 8 | Emails du site | ⏸ Plus tard (site) : logo cassé dans les emails, arrivée en spam (SPF, DKIM, DMARC, désabonnement) |

## Prochaine action

1. **Tester la photo sur iPhone** : la changer depuis Profil, vérifier qu'elle arrive dans le bucket `avatars`.
2. **Sécurité de l'app** : ✅ session chiffrée (AES-256, clé dans le trousseau, uniquement sur ce téléphone, `src/lib/secure-session.ts`) ; reste la suppression de compte dans l'app + vraie page Confidentialité, puis le profil rechargé depuis le serveur à la connexion.
3. **Étape g — direction artistique et motion.**

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
