# Supabase unique — état, migrations et sécurité

> Projet : **`dalili.web`** (`aiyyvgdrtaxvtedcuxnn`, eu-west-1, Postgres 17, plan gratuit). Le site et l'app partagent cette base.
> Le projet « aaymane's Project » (`idgfoqxtiynllikcekvx`) n'est **jamais** touché.
> **Migration M1 appliquée en prod le 21/10/2026**, après sauvegarde, tests locaux et feu vert. Correctif « fonctions privées » appliqué le même jour.

## 1. Migrations appliquées en prod

Supabase enregistre chaque migration sous l'heure de son application, pas sous le nom du fichier du dépôt. Correspondance :

| Fichier du dépôt (`supabase/migrations/`) | Version enregistrée dans Supabase | Contenu |
|---|---|---|
| *(site)* | `20260622213151` → `20260925153701` (5 migrations) | waitlist, assistant RAG, extraits des guides |
| `20261017000000_init.sql` | `20261021120747 init` | Schéma de l'app (13 tables, RLS) |
| `20261019000000_pays_dalili_study.sql` | `20261021120813 pays_dalili_study` | 7 pays + « autre » |
| `20261020000000_durcissement_site.sql` | `20261021121007 durcissement_site` | Fin de l'insertion publique dans la waitlist, `TRUNCATE` révoqué, `search_path` de `set_updated_at` |
| `20261020000100_durcissement_app.sql` | `20261021121306 durcissement_app` | `search_path` vide sur les fonctions *security definer* ; fiches mentor **validées par l'équipe** (`is_active = false` par défaut, note, séances et avis non modifiables) ; compteurs protégés ; aucune table de l'app lisible sans compte |
| `20261020000200_assistant_app.sql` | `20261021121323 assistant_app` | Journal enrichi (canal, langue, pays, étape, jetons, coût, `requested`) **sans identifiant de personne** ; `assistant_usage` (quota par compte et par jour) ; RPC réservées à la clé service ; `assistant_feedback` |
| `20261021130000_fonctions_privees.sql` | `20261021192402 fonctions_privees` | Aucune fonction privilégiée appelable sans compte ; `display_name` renvoie « Prénom N. » seulement en cas de groupe commun ou pour un mentor validé, sinon `null` ; le fil affiche « Membre DALILI » quand le nom est masqué |
| `20261022120000_photos_profil.sql` | `20261022132208 photos_profil` | Bucket **privé** `avatars` (JPEG, 1 Mo max), un dossier par compte, seul le propriétaire lit, dépose, remplace ou supprime sa photo ; `profiles.avatar_url` n'accepte qu'un chemin vers son propre dossier, jamais un lien externe. Appliquée le 22/10 après sauvegarde ciblée (`~/Desktop/dalili-backups/2026-10-22/`, avec le script d'annulation) et 10 nouveaux tests verts. Aucune nouvelle alerte de l'advisor |
| `20261023130000_mentorat_reel.sql` | `20261023154336 mentorat_reel` | Une réservation est une **demande** : elle naît « en attente », seulement vers un mentor validé qui prend des demandes, pour plus tard, jamais vers soi-même. Garde `bookings_guard` : le mentor accepte, décline, annule ou marque fait, sans toucher à la date ni au sujet ; l'étudiant ne fait qu'annuler. `mentor_requests()` : le mentor connecté voit ses demandes avec « Prénom N. », ville et pays d'origine, rien d'autre. 17 nouveaux tests verts (75 au total). Appliquée le 23/10 après feu vert, sauvegarde (`~/Desktop/dalili-backups/2026-10-23/`, tables vides, script d'annulation) : défaut `pending`, 5 règles, garde actif, `mentor_requests` non exécutable sans compte, comptages inchangés (0 réservation, 0 mentor, 3 profils) |

Les données n'ont pas bougé : 58 inscrits, journal de l'assistant intact, 2 140 extraits.

## 2. Vérifications faites en prod (21/10)

Tests dans des transactions annulées : rien n'est resté écrit.

| Test | Sans compte (`anon`) | Compte connecté |
|---|---|---|
| Lire la waitlist | 0 ligne ✅ | 0 ligne ✅ |
| Insérer dans la waitlist | refusé ✅ | refusé ✅ |
| `TRUNCATE` sur la waitlist | interdit ✅ | interdit ✅ |
| Profils, mentors, quota | refusé ✅ | quota refusé ✅ |
| Se donner une note de mentor | — | refusé ✅ |
| Lire le journal de l'assistant | 0 ligne ✅ | 0 ligne ✅ |
| `display_name`, `is_member`, `handle_new_user`, `bump_count` | aucune exécutable ✅ | seulement `display_name` et `is_member` ✅ |

Formulaires du site testés en vrai avec l'adresse de test de l'équipe (waitlist, simulateur, calendrier, comparateur, une question à l'assistant) : tous en 200. Les 3 lignes créées par le test ont été supprimées par identifiant. Comptages avant / après identiques.

## 3. Alertes restantes de l'advisor de sécurité, et pourquoi elles sont acceptables

| Alerte | Niveau | Pourquoi c'est acceptable |
|---|---|---|
| `display_name` exécutable par un compte connecté | WARN | Voulu : la vue du fil (`posts_with_author`) en a besoin. Elle doit lire les profils des autres, que la RLS cache, d'où le mode *security definer*. Elle ne révèle que « Prénom N. », et seulement à quelqu'un qui partage un groupe avec la personne, ou pour un mentor validé. |
| `is_member` exécutable par un compte connecté | WARN | Voulu : les règles d'accès des posts et des événements l'appellent. Elle répond seulement « suis-je membre de ce groupe ? » pour l'appelant. Piste pour faire disparaître l'alerte : la passer en *security invoker*, puisque tout compte connecté peut déjà lire les adhésions. À tester avant. |
| `mentor_requests` exécutable par un compte connecté | WARN | Voulu : un mentor doit lire ses demandes, et les profils des étudiants sont cachés par la RLS. La fonction ne renvoie que les demandes du mentor connecté (jointure sur `mentors.user_id = auth.uid()`), avec « Prénom N. », ville et pays d'origine. Testé : un autre compte n'y voit rien, `anon` ne peut pas l'appeler. |
| Protection contre les mots de passe divulgués désactivée | WARN | **Pas acceptable à terme.** Elle refuse les mots de passe déjà fuités (base HaveIBeenPwned). Option du plan Pro de Supabase : à activer au passage en Pro (Dashboard → Authentication → Policies). En attendant, la connexion par code à 6 chiffres reste la voie conseillée dans l'app. |
| RLS sans règle sur `assistant_feedback`, `assistant_queries`, `assistant_rate_limits`, `assistant_usage`, `content_chunks` | INFO | Voulu : sans règle, l'API publique ne peut rien faire sur ces tables. Seul le serveur du site y accède, avec la clé secrète. |

## 4. Tester une migration avant la prod

`npm run test:migrations` lance un Postgres jetable (Docker). Le script rejoue le schéma du site tel qu'il était avant M1 (`supabase/tests/01_site_prod.sql`, relevé le 20/10), toutes les migrations, le seed, puis **58 tests de sécurité** (`supabase/tests/rls.sql`) : anon, quatre comptes, clé service, photos de profil. Dernier résultat (23/10) : 75 vérifications, toutes vertes.

Règles :
1. Nouveau fichier daté dans `supabase/migrations/`, jamais de modification d'une migration déjà appliquée.
2. `npm run test:migrations` vert **avant** toute application.
3. Sauvegarde (§5), puis application uniquement sur `dalili.web`, avec le feu vert explicite de l'équipe.
4. Relancer l'advisor de sécurité et comparer avec le §3.

L'autorisation `apply_migration` n'est **jamais** commitée dans `.claude/settings.json` : elle se donne au cas par cas.

## 5. Sauvegardes

Plan gratuit : **Supabase ne fait aucune sauvegarde automatique.**

- Dernière sauvegarde : `~/Desktop/dalili-backups/2026-10-20/`, faite avant M1. 12 fichiers, 28 Mo, empreintes `SHA256SUMS` vérifiées. Restauration testée dans un Postgres vide. Mode d'emploi dans son `LISEZ-MOI.md`.
- Contient des données personnelles (emails de la waitlist) : **jamais** dans un dépôt Git.
- À refaire avant chaque nouvelle migration.

## 6. Reste à faire côté Supabase

1. **Auth** (Dashboard → Authentication) :
   - template d'email avec `{{ .Token }}` (code à 6 chiffres) ;
   - URL de redirection `dalili://auth/callback` ;
   - Google et Apple, si on les garde.
2. **App** : `.env` avec `EXPO_PUBLIC_SUPABASE_URL` et la clé **publique** (`sb_publishable_…`) dans `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Jamais la clé secrète.
3. **Test avec un vrai compte sur iPhone**, dont `/api/v1/assistant`. Ensuite seulement : suppression de `supabase/functions/dalili-ia` (jamais déployée sur `dalili.web`).
4. **Vercel** : les déploiements Preview utilisent les clés de Production et écrivent dans la vraie base. Décocher Preview pour `SUPABASE_SECRET_KEY`, `RESEND_API_KEY` et `ANTHROPIC_API_KEY`.
5. **M5** : table `tool_results` (une ligne par usage d'outil, fin de l'écrasement de la waitlist) et RPC `claim_site_history()`, filtrée sur un email **vérifié**.
