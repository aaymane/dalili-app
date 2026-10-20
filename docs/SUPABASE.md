# Supabase unique — audit RLS et plan de migration

> Projet cible : **`dalili.web`** (`aiyyvgdrtaxvtedcuxnn`, eu-west-1, Postgres 17). Audit du 19/10/2026, en lecture seule.
> Le projet « aaymane's Project » (`idgfoqxtiynllikcekvx`) n'est **jamais** touché.
> Migration préparée et testée en local au jalon **M1** (20/10/2026). **Rien n'est appliqué en prod** : il faut ton feu vert, après la sauvegarde du §4.

## 1. État actuel du projet du site

| Objet | RLS | Policies | Test `anon` | Test `authenticated` |
|---|---|---|---|---|
| `waitlist` (58 lignes) | ✅ | `waitlist_public_insert` (INSERT, anon + authenticated, `true`) · `waitlist_deny_anon_select` (SELECT anon `false`) | **0 ligne lisible** ✅ | **0 ligne lisible** ✅ |
| `waitlist_stats` (vue) | — | `security_invoker = on` → hérite de la RLS de `waitlist` | total = 0 ✅ | total = 0 ✅ |
| `content_chunks` (2 140) | ✅ | aucune → tout refusé | 0 ✅ | 0 ✅ |
| `assistant_queries` (123) | ✅ | aucune → tout refusé | 0 ✅ | 0 ✅ |
| `assistant_rate_limits` | ✅ | aucune → tout refusé | 0 ✅ | 0 ✅ |
| `match_content_chunks()` | invoker | exécutable par anon, mais soumis à la RLS → renvoie 0 ligne | ✅ | ✅ |

Tests réalisés dans des transactions annulées (`begin; set local role anon; select …; rollback;`).

**Conclusion : la waitlist et les résultats des outils ne sont lisibles ni avec la clé anon, ni par un utilisateur connecté.** Le site n'y accède qu'avec la clé service (`supabaseAdmin`).

### Durcissements à inclure dans la migration M1

1. **Supprimer `waitlist_public_insert`.** Le site insère uniquement via la clé service. Laisser l'insertion ouverte permettrait à n'importe qui (et bientôt à tout utilisateur de l'app) d'insérer une ligne avec l'email d'un autre et de faux `simulateur_data`. Ces données seraient ensuite proposées en pré-remplissage à la vraie personne.
2. `revoke truncate, trigger, references on all tables in schema public from anon, authenticated;` La RLS ne protège pas `TRUNCATE`. Ce n'est pas exposé par l'API REST, mais c'est inutile.
3. `set_updated_at` : `set search_path = ''` (avertissement de l'advisor Supabase « search_path mutable »).
4. Nouvelle table `tool_results` (fin de l'écrasement des résultats d'outils) : RLS activée, **aucune policy pour anon/authenticated**. Lecture uniquement via la RPC `claim_site_history()` (security definer, filtrée sur `auth.email()` **et** `auth.jwt()->>'email_verified' = true`).

## 2. Collisions de noms

| L'app crée | Le site a déjà | Collision |
|---|---|---|
| Tables : `profiles, step_progress, custom_steps, mentors, bookings, groups, group_members, posts, post_likes, comments, events, event_attendees, ai_messages` | `waitlist, content_chunks, assistant_queries, assistant_rate_limits` | ❌ aucune |
| Fonctions : `bump_count, display_name, handle_new_user, is_member` | `set_updated_at, match_content_chunks` | ❌ aucune |
| Vue : `posts_with_author` | `waitlist_stats` | ❌ aucune (⚠️ à créer en `security_invoker = on`) |
| Trigger `on_auth_user_created` sur `auth.users` | aucun trigger sur `auth.users` | ❌ aucune |

## 3. Comment tester avant la prod

1. **En local** : `npx supabase start` (Docker), puis `npx supabase db pull` du schéma de `dalili.web` dans un dossier temporaire. On applique les 5 migrations du site, puis celle de l'app et les durcissements, et on rejoue les tests anon/authenticated du §1 plus ceux de l'app.
2. **Ou sur une branche Supabase** (`create_branch`, payante à l'heure) : même jeu de tests, puis suppression de la branche.
3. **Jamais** de `apply_migration` direct sur `dalili.web` sans ton feu vert explicite, après les tests.

## 4. Sauvegardes à faire AVANT d'appliquer (checklist)

- [ ] Vérifier le plan Supabase : les sauvegardes automatiques quotidiennes n'existent que sur le plan Pro. Sur le plan gratuit, il n'y en a pas. Dans ce cas, faire **obligatoirement** les exports ci-dessous.
- [ ] `npx supabase db dump --db-url "$DB_URL" -f backup/schema-2026-xx-xx.sql` (schéma complet)
- [ ] `npx supabase db dump --db-url "$DB_URL" --data-only -f backup/data-2026-xx-xx.sql` (données : waitlist, assistant_queries, content_chunks…)
- [ ] Export CSV de `waitlist` depuis le Dashboard (Table editor → Export), à garder hors du dépôt Git (données personnelles)
- [ ] Noter la liste des migrations déjà appliquées (5, de `20260622213151` à `20260925153701`)
- [ ] Noter les clés et secrets actuels (anon, service role, Resend, Voyage, Anthropic) : on n'en change aucun, mais il faut pouvoir revenir en arrière
- [ ] Vérifier que `content_chunks` peut être reconstruite (`npm run generate-embeddings`) : c'est la seule table régénérable
- [ ] Fenêtre de migration hors des heures de forte activité ; site en lecture seule non nécessaire (migrations additives uniquement)

## 5. Migration M1 : prête, testée en local, PAS appliquée

| Fichier (`supabase/migrations/`) | Contenu |
|---|---|
| `20261017000000_init.sql` | Schéma de l'app (13 tables, RLS) |
| `20261019000000_pays_dalili_study.sql` | 7 pays + « autre » |
| `20261020000000_durcissement_site.sql` | Suppression de `waitlist_public_insert`, `TRUNCATE` révoqué, `search_path` de `set_updated_at` |
| `20261020000100_durcissement_app.sql` | `search_path` vide sur les fonctions *security definer* ; fiches mentor **validées par l'équipe** (`is_active = false` par défaut, note/séances/avis non modifiables) ; compteurs des groupes et événements protégés ; aucune table de l'app lisible sans compte |
| `20261020000200_assistant_app.sql` | Journal enrichi (canal, langue, pays, étape, jetons, coût, `requested`) **sans identifiant de personne** ; `assistant_usage` (quota et coût par compte et par jour) ; RPC `assistant_consume` et `assistant_record_usage` réservées à la clé service ; `assistant_feedback` |

**Test** : `npm run test:migrations`. Le script lance un Postgres jetable (Docker), puis rejoue le schéma actuel du site (`supabase/tests/01_site_prod.sql`, relevé le 20/10), toutes les migrations, le seed et **38 tests de sécurité** (`supabase/tests/rls.sql`) : anon, deux comptes, clé service. Résultat du 20/10 : tous verts.

### Ordre d'application (le moment venu)

1. Sauvegarde : checklist du §4.
2. Appliquer les 5 fichiers **dans l'ordre**, avec le SQL Editor du Dashboard ou `apply_migration`, uniquement sur `dalili.web`.
3. Relancer les advisors de sécurité (`get_advisors`) : aucun nouvel avertissement attendu.
4. Vérifier en prod, dans une transaction annulée : `set local role anon; select count(*) from waitlist;` doit renvoyer 0.
5. Dans Vercel (projet du site), facultatif : `ASSISTANT_DAILY_LIMIT` (30 par défaut).
6. Auth du projet `dalili.web` (Dashboard → Authentication) :
   - template d'email avec `{{ .Token }}` (code à 6 chiffres) ;
   - URL de redirection `dalili://auth/callback` ;
   - Google et Apple, si on les garde.
7. Dans l'app, `.env` : `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` de `dalili.web`.

**Si le site est déployé avant la migration** : rien ne casse. Le journal du site se replie sur les anciennes colonnes, et `/api/v1/assistant` répond 503 « Dalili IA arrive très bientôt dans l'app ». En mode démo, l'app utilise le point d'accès public du site.

### Suppression de `supabase/functions/dalili-ia`

L'app ne l'appelle plus depuis M1. Le dossier reste dans le dépôt jusqu'au test de `/api/v1/assistant` en ligne avec un vrai compte (§5, étape 7). On le supprimera ensuite (garde-fou validé).
