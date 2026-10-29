-- Tests de sécurité, rejoués après chaque migration (scripts/test-migrations.sh).
-- Chaque échec lève une exception : psql s'arrête (ON_ERROR_STOP) et le script échoue.

create schema tests;
grant usage on schema tests to anon, authenticated, service_role;

create function tests.must_fail(label text, q text) returns void language plpgsql as $$
begin
  execute q;
  raise exception 'ÉCHEC — aurait dû être refusé : %', label;
exception
  when raise_exception then raise;
  when others then raise notice 'ok  refusé : % (%)', label, sqlerrm;
end $$;

create function tests.must_count(label text, q text, expected bigint) returns void language plpgsql as $$
declare n bigint;
begin
  execute format('select count(*) from (%s) t', q) into n;
  if n <> expected then raise exception 'ÉCHEC — % : % ligne(s), % attendue(s)', label, n, expected; end if;
  raise notice 'ok  % (% ligne(s))', label, n;
end $$;
grant execute on all functions in schema tests to anon, authenticated, service_role;

-- Quatre comptes : A (Aymen) et B, plus C et D pour les fiches mentor.
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', now()),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local', now()),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.local', now()),
  ('00000000-0000-0000-0000-00000000000d', 'd@test.local', now());
insert into public.groups (id, name, city) values ('00000000-0000-0000-0000-0000000000c1', 'Groupe test', 'Paris')
  on conflict do nothing;

-- ───────────── anon (clé publique, sans compte) ─────────────
begin;
set local role anon;
select tests.must_count('anon ne lit pas la waitlist', 'select * from public.waitlist', 0);
select tests.must_count('anon : waitlist_stats vide', 'select * from public.waitlist_stats where total > 0', 0);
select tests.must_fail('anon insère dans la waitlist', $q$insert into public.waitlist (email) values ('pirate@x.fr')$q$);
select tests.must_fail('anon vide la waitlist (TRUNCATE)', 'truncate public.waitlist');
select tests.must_count('anon ne lit pas le journal', 'select * from public.assistant_queries', 0);
select tests.must_count('anon ne lit pas les extraits', 'select * from public.content_chunks', 0);
select tests.must_fail('anon lit les quotas', 'select * from public.assistant_usage');
select tests.must_fail('anon lit les retours', 'select * from public.assistant_feedback');
select tests.must_fail('anon consomme un quota', $q$select public.assistant_consume('00000000-0000-0000-0000-00000000000a', 30)$q$);
select tests.must_fail('anon lit les profils', 'select * from public.profiles');
select tests.must_fail('anon lit les mentors', 'select * from public.mentors');
select tests.must_fail('anon lit les posts', 'select * from public.posts_with_author');
select tests.must_fail('anon appelle display_name', $q$select public.display_name('00000000-0000-0000-0000-00000000000a')$q$);
select tests.must_fail('anon appelle is_member', $q$select public.is_member('00000000-0000-0000-0000-0000000000c1')$q$);
select tests.must_fail('anon appelle handle_new_user', 'select public.handle_new_user()');
select tests.must_fail('anon appelle bump_count', 'select public.bump_count()');
rollback;

-- ───────────── fonctions privées : droits d'exécution ─────────────
select tests.must_count('anon n''exécute aucune des 4 fonctions',
  $q$select 1 from unnest(array['public.display_name(uuid)', 'public.is_member(uuid)', 'public.handle_new_user()', 'public.bump_count()']) f
     where has_function_privilege('anon', f, 'execute')$q$, 0);
select tests.must_count('connecté : handle_new_user et bump_count non exécutables',
  $q$select 1 from unnest(array['public.handle_new_user()', 'public.bump_count()']) f
     where has_function_privilege('authenticated', f, 'execute')$q$, 0);

-- ───────────── compte A connecté ─────────────
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","email":"a@test.local","role":"authenticated"}';
select tests.must_count('A ne lit pas la waitlist', 'select * from public.waitlist', 0);
select tests.must_fail('A insère dans la waitlist', $q$insert into public.waitlist (email) values ('b@test.local')$q$);
select tests.must_fail('A vide la waitlist (TRUNCATE)', 'truncate public.waitlist');
select tests.must_count('A ne lit pas le journal', 'select * from public.assistant_queries', 0);
select tests.must_fail('A lit les quotas', 'select * from public.assistant_usage');
select tests.must_fail('A s''offre du quota', $q$select public.assistant_consume('00000000-0000-0000-0000-00000000000a', 9999)$q$);
select tests.must_fail('A écrit un retour', $q$insert into public.assistant_feedback (query_id, reason) select id, 'faux' from public.assistant_queries limit 1$q$);
select tests.must_count('A voit son profil (créé à l''inscription)', 'select * from public.profiles', 1);
select tests.must_count('A ne voit pas le profil de B', $q$select * from public.profiles where id = '00000000-0000-0000-0000-00000000000b'$q$, 0);
select tests.must_fail('A coche une étape pour B', $q$insert into public.step_progress (user_id, step_id) values ('00000000-0000-0000-0000-00000000000b', 'visa')$q$);
select tests.must_fail('A se donne une note de mentor', $q$insert into public.mentors (user_id, first_name, last_name, city, rating) values (auth.uid(), 'A', 'A', 'Paris', 5)$q$);
select tests.must_fail('A s''affiche tout seul comme mentor', $q$insert into public.mentors (user_id, first_name, last_name, city, is_active) values (auth.uid(), 'A', 'A', 'Paris', true)$q$);
select tests.must_fail('A envoie une fiche sans avoir accepté la charte', $q$insert into public.mentors (user_id, first_name, last_name, city) values (auth.uid(), 'A', 'A', 'Paris')$q$);
select tests.must_fail('A, 17 ans, accepte la charte', $q$select public.accept_mentor_charter(extract(year from now())::int - 17, public.mentor_charter_version())$q$);
select tests.must_fail('A accepte une ancienne charte', $q$select public.accept_mentor_charter(1999, '2020-01-01')$q$);
select tests.must_fail('A écrit sa ligne de confiance à la main', $q$insert into public.mentor_trust (user_id, birth_year, charter_version) values (auth.uid(), 1999, public.mentor_charter_version())$q$);
select public.accept_mentor_charter(1999, public.mentor_charter_version());
select tests.must_count('A voit sa charte acceptée', 'select * from public.mentor_trust where birth_year = 1999 and verified_at is null', 1);
select tests.must_fail('A se déclare vérifié', $q$update public.mentor_trust set verified_at = now(), verified_proof = 'linkedin', verified_by = 'Moi' where user_id = auth.uid()$q$);
select tests.must_fail('A change son année de naissance à la main', 'update public.mentor_trust set birth_year = 1990 where user_id = auth.uid()');
select public.accept_mentor_charter(1985, public.mentor_charter_version());
select tests.must_count('réaccepter la charte ne change pas l''année notée', 'select * from public.mentor_trust where birth_year = 1999', 1);
insert into public.mentors (user_id, first_name, last_name, city) values (auth.uid(), 'A', 'A', 'Paris');
select tests.must_count('A voit sa fiche mentor en attente', 'select * from public.mentors where not is_active', 1);
select tests.must_fail('A gonfle le nombre de membres', 'update public.groups set members_count = 9999');
select tests.must_fail('A publie dans un groupe sans en être membre', $q$insert into public.posts (group_id, body) select id, 'spam' from public.groups where id = '00000000-0000-0000-0000-0000000000c1'$q$);
insert into public.group_members (group_id) select id from public.groups where id = '00000000-0000-0000-0000-0000000000c1';
select tests.must_count('le compteur suit l''adhésion', $q$select * from public.groups where id = '00000000-0000-0000-0000-0000000000c1' and members_count = 1$q$, 1);
insert into public.posts (group_id, body) select id, 'Salut !' from public.groups where id = '00000000-0000-0000-0000-0000000000c1';
select tests.must_count('A lit le fil de son groupe', 'select * from public.posts_with_author', 1);
rollback;

-- ───────────── compte B : ne voit pas la fiche mentor en attente de A ─────────────
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.accept_mentor_charter(1999, public.mentor_charter_version());
insert into public.mentors (user_id, first_name, last_name, city) values (auth.uid(), 'A', 'A', 'Paris');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select tests.must_count('B ne voit pas un mentor non validé', 'select * from public.mentors', 0);
select tests.must_count('B ne voit ni l''âge ni la vérification de A', 'select * from public.mentor_trust', 0);
rollback;

-- ───────────── mentors vérifiés : pas de mise en ligne sans preuve vue ─────────────
begin;
set local role anon;
select tests.must_fail('anon accepte la charte', $q$select public.accept_mentor_charter(1999, '2026-10-24')$q$);
select tests.must_fail('anon lit les vérifications', 'select * from public.mentor_trust');
rollback;
begin;
insert into public.mentors (id, user_id, first_name, last_name, city) values
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-00000000000d', 'Nadia', 'Daoud', 'Lille');
insert into public.mentor_trust (user_id, birth_year, charter_version) values ('00000000-0000-0000-0000-00000000000d', 1998, public.mentor_charter_version());
set local role service_role;
select tests.must_fail('le serveur valide une fiche non vérifiée', $q$update public.mentors set is_active = true where id = '00000000-0000-0000-0000-0000000000e3'$q$);
select tests.must_fail('vérification sans preuve ni nom', $q$update public.mentor_trust set verified_at = now() where user_id = '00000000-0000-0000-0000-00000000000d'$q$);
select tests.must_fail('preuve inconnue', $q$update public.mentor_trust set verified_at = now(), verified_proof = 'passeport', verified_by = 'Aymane' where user_id = '00000000-0000-0000-0000-00000000000d'$q$);
update public.mentor_trust set verified_at = now(), verified_proof = 'carte_etudiante', verified_by = 'Aymane' where user_id = '00000000-0000-0000-0000-00000000000d';
update public.mentors set is_active = true where id = '00000000-0000-0000-0000-0000000000e3';
select tests.must_count('vérifiée, la fiche est validée', $q$select * from public.mentors where id = '00000000-0000-0000-0000-0000000000e3' and is_active$q$, 1);
update public.mentors set is_active = false where id = '00000000-0000-0000-0000-0000000000e3';
update public.mentor_trust set verified_at = null, verified_proof = null, verified_by = null;
update public.mentors set city = 'Lyon' where id = '00000000-0000-0000-0000-0000000000e3';
select tests.must_count('une fiche suspendue se modifie sans vérification', $q$select * from public.mentors where id = '00000000-0000-0000-0000-0000000000e3' and city = 'Lyon' and not is_active$q$, 1);
reset role;
rollback;

-- ───────────── photos de profil (bucket avatars) ─────────────
select tests.must_count('le bucket avatars est privé', $q$select 1 from storage.buckets where id = 'avatars' and not public$q$, 1);
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-00000000000a/m1abc2.jpg');
select tests.must_fail('A dépose une photo dans le dossier de B',
  $q$insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-00000000000b/pirate.jpg')$q$);
select tests.must_fail('A dépose une photo à la racine du bucket', $q$insert into storage.objects (bucket_id, name) values ('avatars', 'pirate.jpg')$q$);
update public.profiles set avatar_url = '00000000-0000-0000-0000-00000000000a/m1abc2.jpg' where id = auth.uid();
select tests.must_fail('A met un lien externe comme photo',
  $q$update public.profiles set avatar_url = 'https://pirate.example/pixel.jpg' where id = auth.uid()$q$);
select tests.must_fail('A pointe sa photo vers le dossier de B',
  $q$update public.profiles set avatar_url = '00000000-0000-0000-0000-00000000000b/m1abc2.jpg' where id = auth.uid()$q$);
select tests.must_count('A voit sa photo', $q$select * from storage.objects where bucket_id = 'avatars'$q$, 1);
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select tests.must_count('B ne voit pas la photo de A', $q$select * from storage.objects where bucket_id = 'avatars'$q$, 0);
delete from storage.objects where bucket_id = 'avatars';
update storage.objects set name = '00000000-0000-0000-0000-00000000000b/vol.jpg' where bucket_id = 'avatars';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select tests.must_count('B n''a ni supprimé ni renommé la photo de A',
  $q$select * from storage.objects where name = '00000000-0000-0000-0000-00000000000a/m1abc2.jpg'$q$, 1);
set local role anon;
set local request.jwt.claims = '{}';
select tests.must_count('anon ne voit aucune photo', $q$select * from storage.objects where bucket_id = 'avatars'$q$, 0);
select tests.must_fail('anon dépose une photo', $q$insert into storage.objects (bucket_id, name) values ('avatars', 'anon/x.jpg')$q$);
rollback;

-- ───────────── display_name : « Prénom N. », seulement si groupe commun ou mentor validé ─────────────
begin;
update public.profiles set first_name = 'Aymen', last_name = 'Amri' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set first_name = 'Salma', last_name = 'Benali' where id = '00000000-0000-0000-0000-00000000000b';
update public.profiles set first_name = 'Yassine', last_name = 'Kadiri' where id = '00000000-0000-0000-0000-00000000000c';
update public.profiles set first_name = 'Nadia', last_name = 'Daoud' where id = '00000000-0000-0000-0000-00000000000d';
insert into public.mentors (user_id, first_name, last_name, city, is_active) values
  ('00000000-0000-0000-0000-00000000000c', 'Yassine', 'Kadiri', 'Lyon', true),
  ('00000000-0000-0000-0000-00000000000d', 'Nadia', 'Daoud', 'Lille', false);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select tests.must_count('hors groupe : le nom de B est masqué (null)', $q$select 1 where public.display_name('00000000-0000-0000-0000-00000000000b') is null$q$, 1);
select tests.must_count('mentor validé : « Yassine K. »', $q$select 1 where public.display_name('00000000-0000-0000-0000-00000000000c') = 'Yassine K.'$q$, 1);
select tests.must_count('mentor en attente : null', $q$select 1 where public.display_name('00000000-0000-0000-0000-00000000000d') is null$q$, 1);
reset role;
insert into public.group_members (group_id, user_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000b');
set local role authenticated;
select tests.must_count('même groupe : « Salma B. », jamais le nom complet', $q$select 1 where public.display_name('00000000-0000-0000-0000-00000000000b') = 'Salma B.'$q$, 1);
insert into public.posts (group_id, body) values ('00000000-0000-0000-0000-0000000000c1', 'Salut !');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
insert into public.comments (post_id, body) select id, 'Bienvenue !' from public.posts;
select tests.must_count('le fil affiche « Aymen A. » et le commentaire de « Salma B. »',
  $q$select 1 from public.posts_with_author where author_name = 'Aymen A.' and comments -> 0 ->> 'author' = 'Salma B.'$q$, 1);
reset role;
delete from public.group_members where user_id = '00000000-0000-0000-0000-00000000000b';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select tests.must_count('B a quitté le groupe : son commentaire reste signé « Membre DALILI »',
  $q$select 1 from public.posts_with_author where comments -> 0 ->> 'author' = 'Membre DALILI'$q$, 1);
rollback;

-- ───────────── commentaires : membres du groupe, auteur et heure fixés par la base, chacun supprime le sien ─────────────
begin;
update public.profiles set first_name = 'Aymen', last_name = 'Amri' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set first_name = 'Salma', last_name = 'Bennani' where id = '00000000-0000-0000-0000-00000000000b';
insert into public.group_members (group_id, user_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000b');
insert into public.posts (id, group_id, author_id, body) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000a', 'Qui a fait sa CAF ?');
set local role anon;
select tests.must_fail('anon lit les commentaires', 'select * from public.comments_with_author');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
insert into public.comments (post_id, body) values ('00000000-0000-0000-0000-0000000000a1', '  Moi, je t''explique !  ');
select tests.must_count('B commente : nom affichable, texte nettoyé, c''est le sien',
  $q$select * from public.comments_with_author where author_name = 'Salma B.' and body = 'Moi, je t''explique !' and is_mine and not is_post_author$q$, 1);
select tests.must_fail('B commente au nom de A',
  $q$insert into public.comments (post_id, body, author_id) values ('00000000-0000-0000-0000-0000000000a1', 'Faux', '00000000-0000-0000-0000-00000000000a')$q$);
select tests.must_fail('B antidate un commentaire',
  $q$insert into public.comments (post_id, body, created_at) values ('00000000-0000-0000-0000-0000000000a1', 'Hier', now() - interval '1 day')$q$);
select tests.must_fail('B commente avec des espaces seulement', $q$insert into public.comments (post_id, body) values ('00000000-0000-0000-0000-0000000000a1', '   ')$q$);
select tests.must_fail('B modifie son commentaire', $q$update public.comments set body = 'Autre chose'$q$);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into public.comments (post_id, body) values ('00000000-0000-0000-0000-0000000000a1', 'Merci Salma !');
select tests.must_count('A voit les deux, le sien marqué « auteur du post »',
  $q$select * from public.comments_with_author where (author_name = 'Aymen A.' and is_post_author and is_mine) or (author_name = 'Salma B.' and not is_mine)$q$, 2);
delete from public.comments where body = 'Moi, je t''explique !';
select tests.must_count('A ne peut pas supprimer le commentaire de B', $q$select * from public.comments_with_author where author_name = 'Salma B.'$q$, 1);
delete from public.comments where body = 'Merci Salma !';
select tests.must_count('A supprime le sien', $q$select * from public.comments_with_author where author_name = 'Aymen A.'$q$, 0);
insert into public.comments (post_id, body) select '00000000-0000-0000-0000-0000000000a1', 'c' || g from generate_series(1, 10) g;
select tests.must_fail('A, 10 commentaires en une minute : le 11e attend', $q$insert into public.comments (post_id, body) values ('00000000-0000-0000-0000-0000000000a1', 'Encore')$q$);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select tests.must_count('C, hors du groupe, ne voit aucun commentaire', 'select * from public.comments_with_author', 0);
select tests.must_fail('C commente sans être membre', $q$insert into public.comments (post_id, body) values ('00000000-0000-0000-0000-0000000000a1', 'Coucou')$q$);
reset role;
rollback;

-- ───────────── écoles partenaires : fiches publiées seulement, intérêts privés, gardés par DALILI ─────────────
begin;
-- L'identifiant de l'école, comme si on l'avait deviné.
create temp table school_ids on commit drop as select id from public.partner_schools where slug = 'digital-campus-nantes';
grant select on school_ids to authenticated;
set local role anon;
select tests.must_fail('anon lit les écoles', 'select * from public.partner_schools');
select tests.must_fail('anon lit les intérêts', 'select * from public.school_leads');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select tests.must_count('Digital Campus Nantes n''est pas encore publiée : invisible', 'select * from public.partner_schools', 0);
select tests.must_fail('A se manifeste pour une école non publiée',
  $q$insert into public.school_leads (school_id) select id from school_ids$q$);
select tests.must_fail('A publie l''école lui-même', 'update public.partner_schools set is_published = true');
reset role;
update public.partner_schools set is_published = true where slug = 'digital-campus-nantes';
set local role authenticated;
select tests.must_count('publiée : A voit la fiche et ses 6 formations',
  $q$select * from public.partner_schools where slug = 'digital-campus-nantes' and jsonb_array_length(programs) = 6$q$, 1);
insert into public.school_leads (school_id, program, message)
  values ((select id from public.partner_schools where slug = 'digital-campus-nantes'), ' Bachelor UI & Web design ', '   ');
select tests.must_count('A se manifeste : formation nettoyée, mot vide = aucun mot',
  $q$select id from public.school_leads where program = 'Bachelor UI & Web design' and message is null$q$, 1);
select tests.must_fail('A se manifeste deux fois pour la même école',
  $q$insert into public.school_leads (school_id) select id from school_ids$q$);
select tests.must_fail('A se manifeste au nom de B',
  $q$insert into public.school_leads (school_id, student_id) select id, '00000000-0000-0000-0000-00000000000b' from school_ids$q$);
select tests.must_fail('A se marque « recontacté » lui-même', $q$update public.school_leads set status = 'contacted'$q$);
select tests.must_fail('A lit le suivi de l''équipe', 'select status, handled_by from public.school_leads');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select tests.must_count('B ne voit pas l''intérêt de A', 'select id from public.school_leads', 0);
delete from public.school_leads;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select tests.must_count('B n''a pas pu retirer la demande de A', 'select id from public.school_leads', 1);
delete from public.school_leads;
select tests.must_count('A retire sa demande', 'select id from public.school_leads', 0);
reset role;
set local role service_role;
select tests.must_count('le serveur du site voit l''école, même non publiée', $q$select * from public.partner_schools where slug = 'digital-campus-nantes'$q$, 1);
reset role;
rollback;

-- ───────────── mentorat : une réservation est une demande que le mentor accepte ou décline ─────────────
begin;
update public.profiles set first_name = 'Aymen', last_name = 'Amri', origin_city = 'Casablanca', country = 'MA' where id = '00000000-0000-0000-0000-00000000000a';
insert into public.mentors (id, user_id, first_name, last_name, city, is_active) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000c', 'Yassine', 'Kadiri', 'Lyon', true),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-00000000000d', 'Nadia', 'Daoud', 'Lille', false);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into public.bookings (id, student_id, mentor_id, starts_at, topic)
  values ('00000000-0000-0000-0000-0000000000f1', auth.uid(), '00000000-0000-0000-0000-0000000000e1', now() + interval '2 days', 'Visa');
select tests.must_count('une demande naît « en attente »', $q$select * from public.bookings where status = 'pending'$q$, 1);
select tests.must_fail('A se confirme lui-même un rendez-vous',
  $q$insert into public.bookings (student_id, mentor_id, starts_at, status) values (auth.uid(), '00000000-0000-0000-0000-0000000000e1', now() + interval '3 days', 'confirmed')$q$);
select tests.must_fail('A demande un moment déjà passé',
  $q$insert into public.bookings (student_id, mentor_id, starts_at) values (auth.uid(), '00000000-0000-0000-0000-0000000000e1', now() - interval '1 hour')$q$);
select tests.must_fail('A demande à un mentor non validé',
  $q$insert into public.bookings (student_id, mentor_id, starts_at) values (auth.uid(), '00000000-0000-0000-0000-0000000000e2', now() + interval '2 days')$q$);
select tests.must_fail('A accepte sa propre demande', $q$update public.bookings set status = 'confirmed' where id = '00000000-0000-0000-0000-0000000000f1'$q$);
select tests.must_fail('A change la date de sa demande', $q$update public.bookings set starts_at = now() + interval '5 days' where id = '00000000-0000-0000-0000-0000000000f1'$q$);
select tests.must_fail('A appelle le garde à la main', 'select public.bookings_guard()');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select tests.must_count('B ne voit aucune demande', 'select * from public.mentor_requests()', 0);
update public.bookings set status = 'cancelled' where id = '00000000-0000-0000-0000-0000000000f1';

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select tests.must_count('B n''a rien pu annuler', $q$select * from public.mentor_requests() where status = 'pending'$q$, 1);
select tests.must_count('le mentor voit « Aymen A. », de Casablanca, et rien d''autre',
  $q$select * from public.mentor_requests() where student_name = 'Aymen A.' and student_city = 'Casablanca' and student_country = 'MA'$q$, 1);
select tests.must_fail('le mentor change le sujet', $q$update public.bookings set topic = 'Autre' where id = '00000000-0000-0000-0000-0000000000f1'$q$);
select tests.must_fail('le mentor marque fait un appel pas encore accepté', $q$update public.bookings set status = 'done' where id = '00000000-0000-0000-0000-0000000000f1'$q$);
update public.bookings set status = 'confirmed' where id = '00000000-0000-0000-0000-0000000000f1';
select tests.must_count('le mentor accepte', $q$select * from public.mentor_requests() where status = 'confirmed'$q$, 1);
update public.mentors set available_this_week = false where user_id = auth.uid();

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select tests.must_fail('A demande à un mentor en pause',
  $q$insert into public.bookings (student_id, mentor_id, starts_at) values (auth.uid(), '00000000-0000-0000-0000-0000000000e1', now() + interval '4 days')$q$);
update public.bookings set status = 'cancelled' where id = '00000000-0000-0000-0000-0000000000f1';
select tests.must_count('A annule son rendez-vous', $q$select * from public.bookings where status = 'cancelled'$q$, 1);
select tests.must_fail('A rouvre un rendez-vous annulé', $q$update public.bookings set status = 'pending' where id = '00000000-0000-0000-0000-0000000000f1'$q$);
reset role;
set local role anon;
select tests.must_fail('anon lit les demandes', 'select * from public.mentor_requests()');
rollback;

-- ───────────── signaler : seuls les fondateurs lisent, la base retrouve qui est signalé ─────────────
begin;
insert into public.mentors (id, user_id, first_name, last_name, city, is_active) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000c', 'Yassine', 'Kadiri', 'Lyon', true),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-00000000000d', 'Nadia', 'Daoud', 'Lille', false);
insert into public.bookings (id, student_id, mentor_id, starts_at, status) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000e1', now() + interval '2 days', 'pending');
set local role anon;
select tests.must_fail('anon signale', $q$select public.report_user('autre', null, '00000000-0000-0000-0000-0000000000e1')$q$);
select tests.must_fail('anon lit les signalements', 'select * from public.mentorat_reports');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select tests.must_count('A signale le mentor depuis sa fiche',
  $q$select * from public.report_user('argent', '  Il m''a demandé 50 €  ', '00000000-0000-0000-0000-0000000000e1') r(v) where v = 'sent'$q$, 1);
select tests.must_count('A le resignale : déjà ouvert, rien de neuf',
  $q$select * from public.report_user('harcelement', null, '00000000-0000-0000-0000-0000000000e1') r(v) where v = 'already'$q$, 1);
select tests.must_count('… et par la demande, c''est la même personne : déjà ouvert',
  $q$select * from public.report_user('autre', null, null, '00000000-0000-0000-0000-0000000000f1') r(v) where v = 'already'$q$, 1);
select tests.must_fail('A relit les signalements', 'select * from public.mentorat_reports');
select tests.must_fail('A écrit un signalement à la main',
  $q$insert into public.mentorat_reports (reporter_id, reporter_role, reported_id, reason) values (auth.uid(), 'student', '00000000-0000-0000-0000-00000000000c', 'autre')$q$);
select tests.must_fail('A signale une fiche non validée, sans demande entre eux', $q$select public.report_user('autre', null, '00000000-0000-0000-0000-0000000000e2')$q$);
select tests.must_fail('A signale sans dire qui', $q$select public.report_user('autre')$q$);
select tests.must_fail('A choisit un motif inconnu', $q$select public.report_user('spam', null, '00000000-0000-0000-0000-0000000000e1')$q$);
select tests.must_fail('A écrit plus de 500 caractères', $q$select public.report_user('autre', repeat('x', 501), '00000000-0000-0000-0000-0000000000e1')$q$);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select tests.must_fail('B signale par une demande qui n''est pas la sienne', $q$select public.report_user('autre', null, null, '00000000-0000-0000-0000-0000000000f1')$q$);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select tests.must_count('le mentor signale l''étudiant de sa demande',
  $q$select * from public.report_user('donnees', 'Veut mon numéro perso', null, '00000000-0000-0000-0000-0000000000f1') r(v) where v = 'sent'$q$, 1);
select tests.must_fail('le mentor se signale lui-même', $q$select public.report_user('autre', null, '00000000-0000-0000-0000-0000000000e1')$q$);
reset role;

select tests.must_count('la base a retrouvé les bonnes personnes, et nettoyé le mot',
  $q$select * from public.mentorat_reports where
     (reporter_role = 'student' and reporter_id = '00000000-0000-0000-0000-00000000000a' and reported_id = '00000000-0000-0000-0000-00000000000c' and reason = 'argent' and comment = 'Il m''a demandé 50 €')
     or (reporter_role = 'mentor' and reporter_id = '00000000-0000-0000-0000-00000000000c' and reported_id = '00000000-0000-0000-0000-00000000000a' and booking_id = '00000000-0000-0000-0000-0000000000f1')$q$, 2);

insert into public.mentorat_reports (reporter_id, reporter_role, reported_id, reason, status, handled_at, handled_by)
  select '00000000-0000-0000-0000-00000000000b', 'student', '00000000-0000-0000-0000-00000000000d', 'autre', 'dismissed', now(), 'Test'
  from generate_series(1, 10);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select tests.must_fail('B, 10 signalements aujourd''hui : le 11e attend demain', $q$select public.report_user('autre', null, '00000000-0000-0000-0000-0000000000e1')$q$);
reset role;

set local role service_role;
select tests.must_count('le serveur du site lit les signalements ouverts', $q$select * from public.mentorat_reports where status = 'open'$q$, 2);
select tests.must_fail('le serveur classe un signalement sans dire qui', $q$update public.mentorat_reports set status = 'handled', handled_at = now() where status = 'open'$q$);
update public.mentorat_reports set status = 'handled', handled_at = now(), handled_by = 'Aymane' where reporter_role = 'student' and status = 'open';
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select tests.must_count('traité, A peut signaler à nouveau la même personne',
  $q$select * from public.report_user('harcelement', null, '00000000-0000-0000-0000-0000000000e1') r(v) where v = 'sent'$q$, 1);
reset role;

delete from auth.users where id = '00000000-0000-0000-0000-00000000000c';
select tests.must_count('le mentor supprime son compte : les signalements restent',
  $q$select * from public.mentorat_reports where reporter_role = 'mentor' and reporter_id is null
     union all select * from public.mentorat_reports where reporter_role = 'student' and reporter_id = '00000000-0000-0000-0000-00000000000a' and reported_id is null$q$, 3);
rollback;

-- ───────────── bloquer : dans les deux sens, les demandes en cours annulées, personne ne lit les blocages ─────────────
begin;
update public.profiles set first_name = 'Aymen', last_name = 'Amri' where id = '00000000-0000-0000-0000-00000000000a';
insert into public.mentors (id, user_id, first_name, last_name, city, is_active) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000c', 'Yassine', 'Kadiri', 'Lyon', true),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-00000000000d', 'Nadia', 'Daoud', 'Lille', true);
insert into public.bookings (id, student_id, mentor_id, starts_at, status) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000e1', now() + interval '2 days', 'confirmed'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000e1', now() + interval '3 days', 'pending'),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000e1', now() + interval '2 days', 'pending'),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000e2', now() + interval '2 days', 'pending');
set local role anon;
select tests.must_fail('anon bloque', $q$select public.block_user('00000000-0000-0000-0000-0000000000e1')$q$);
select tests.must_fail('anon lit les blocages', 'select * from public.mentorat_blocks');
select tests.must_fail('anon sonde un blocage', $q$select public.blocked_with('00000000-0000-0000-0000-00000000000c')$q$);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select tests.must_fail('B bloque par une demande qui n''est pas la sienne', $q$select public.block_user(null, '00000000-0000-0000-0000-0000000000f1')$q$);

-- Le mentor C bloque l'étudiant A depuis une demande reçue.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select tests.must_fail('le mentor se bloque lui-même', $q$select public.block_user('00000000-0000-0000-0000-0000000000e1')$q$);
select public.block_user(null, '00000000-0000-0000-0000-0000000000f2');
select public.block_user(null, '00000000-0000-0000-0000-0000000000f2');
select tests.must_count('bloquer deux fois ne crée qu''un blocage', 'select * from public.my_blocks()', 1);
select tests.must_count('le mentor retrouve « Aymen A. » dans ses blocages', $q$select * from public.my_blocks() where name = 'Aymen A.' and not is_mentor$q$, 1);
select tests.must_count('le mentor ne voit plus les demandes de A', $q$select * from public.mentor_requests() where id in ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2')$q$, 0);
select tests.must_count('… mais toujours celle de B', $q$select * from public.mentor_requests() where id = '00000000-0000-0000-0000-0000000000f3' and status = 'pending'$q$, 1);
select tests.must_fail('le mentor lit les blocages à la main', 'select * from public.mentorat_blocks');
select tests.must_fail('le mentor écrit un blocage à la main',
  $q$insert into public.mentorat_blocks (blocker_id, blocked_id) values (auth.uid(), '00000000-0000-0000-0000-00000000000b')$q$);
select tests.must_count('blocked_with ne sonde qu''autour de soi : rien entre A et D', $q$select 1 where public.blocked_with('00000000-0000-0000-0000-00000000000d')$q$, 0);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select tests.must_count('les demandes en cours entre A et le mentor sont annulées, par le mentor',
  $q$select * from public.bookings where id in ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2') and status = 'cancelled' and cancelled_by = 'mentor'$q$, 2);
select tests.must_count('… pas celle de A avec un autre mentor', $q$select * from public.bookings where id = '00000000-0000-0000-0000-0000000000f4' and status = 'pending'$q$, 1);
select tests.must_count('A ne voit plus la fiche du mentor qui l''a bloqué', $q$select * from public.mentors where id = '00000000-0000-0000-0000-0000000000e1'$q$, 0);
select tests.must_count('… mais toujours les autres mentors', $q$select * from public.mentors where id = '00000000-0000-0000-0000-0000000000e2'$q$, 1);
select tests.must_fail('A redemande un appel au mentor qui l''a bloqué',
  $q$insert into public.bookings (student_id, mentor_id, starts_at) values (auth.uid(), '00000000-0000-0000-0000-0000000000e1', now() + interval '4 days')$q$);
select tests.must_count('A ne voit pas le blocage dont il est l''objet', 'select * from public.my_blocks()', 0);
reset role;
select public.unblock_user(k.id) from public.mentorat_blocks k where k.blocker_id = '00000000-0000-0000-0000-00000000000c';
select tests.must_count('A ne peut pas lever le blocage posé par le mentor', $q$select * from public.mentorat_blocks where blocker_id = '00000000-0000-0000-0000-00000000000c'$q$, 1);

-- L'étudiant A bloque la mentor D depuis sa fiche.
set local role authenticated;
select public.block_user('00000000-0000-0000-0000-0000000000e2');
select tests.must_count('A bloque une mentor : elle disparaît de sa liste', $q$select * from public.mentors where id = '00000000-0000-0000-0000-0000000000e2'$q$, 0);
select tests.must_count('… sa demande en attente est annulée, par l''étudiant',
  $q$select * from public.bookings where id = '00000000-0000-0000-0000-0000000000f4' and status = 'cancelled' and cancelled_by = 'student'$q$, 1);
select tests.must_count('A retrouve « Nadia D. », mentor, dans ses blocages', $q$select * from public.my_blocks() where name = 'Nadia D.' and is_mentor$q$, 1);
reset role;

select tests.must_count('deux blocages enregistrés', $q$select * from public.mentorat_blocks$q$, 2);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select tests.must_count('B voit toujours les deux mentors', $q$select * from public.mentors where id in ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2')$q$, 2);

-- Débloquer.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.unblock_user(b.id) from public.my_blocks() b;
select tests.must_count('A débloque la mentor : elle revient', $q$select * from public.mentors where id = '00000000-0000-0000-0000-0000000000e2'$q$, 1);
select tests.must_count('… et la demande annulée ne revient pas', $q$select * from public.bookings where id = '00000000-0000-0000-0000-0000000000f4' and status = 'cancelled'$q$, 1);
select tests.must_count('le blocage du mentor C, lui, tient toujours', $q$select * from public.mentors where id = '00000000-0000-0000-0000-0000000000e1'$q$, 0);
reset role;
rollback;

-- ───────────── messagerie : ouverte quand le mentor accepte, lue seulement par les deux participants ─────────────
begin;
update public.profiles set first_name = 'Aymen', last_name = 'Amri' where id = '00000000-0000-0000-0000-00000000000a';
insert into public.mentors (id, user_id, first_name, last_name, city, is_active) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000c', 'Yassine', 'Kadiri', 'Lyon', true);
insert into public.mentor_trust (user_id, birth_year, charter_version, verified_at, verified_proof, verified_by)
  values ('00000000-0000-0000-0000-00000000000c', 1998, public.mentor_charter_version(), now(), 'linkedin', 'Aymane');
insert into public.bookings (id, student_id, mentor_id, starts_at, status) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000e1', now() + interval '2 days', 'pending');
set local role anon;
select tests.must_fail('anon lit les messages', 'select * from public.messages');
select tests.must_fail('anon liste des conversations', 'select * from public.my_conversations()');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select tests.must_count('demande en attente : pas encore de conversation', 'select * from public.my_conversations()', 0);
select tests.must_fail('A crée une conversation à la main',
  $q$insert into public.conversations (student_id, mentor_id) values (auth.uid(), '00000000-0000-0000-0000-0000000000e1')$q$);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
update public.bookings set status = 'confirmed' where id = '00000000-0000-0000-0000-0000000000f1';

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select tests.must_count('le mentor accepte : la conversation s''ouvre, avec son nom',
  $q$select * from public.my_conversations() where as_role = 'student' and other_name = 'Yassine Kadiri' and can_write and unread = 0$q$, 1);
select tests.must_count('A la retrouve depuis la demande', $q$select 1 where public.conversation_for_booking('00000000-0000-0000-0000-0000000000f1') is not null$q$, 1);
insert into public.messages (conversation_id, body) select id, '  Salut Yassine !  ' from public.my_conversations();
select tests.must_count('A écrit : son nom et l''heure viennent de la base, le texte est nettoyé',
  $q$select * from public.messages where sender_id = auth.uid() and body = 'Salut Yassine !'$q$, 1);
select tests.must_fail('A écrit au nom du mentor',
  $q$insert into public.messages (conversation_id, body, sender_id) select id, 'Faux', '00000000-0000-0000-0000-00000000000c' from public.my_conversations()$q$);
select tests.must_fail('A antidate un message',
  $q$insert into public.messages (conversation_id, body, created_at) select id, 'Hier', now() - interval '1 day' from public.my_conversations()$q$);
select tests.must_fail('A envoie un message vide', $q$insert into public.messages (conversation_id, body) select id, '   ' from public.my_conversations()$q$);
select tests.must_fail('A envoie plus de 2000 caractères', $q$insert into public.messages (conversation_id, body) select id, repeat('x', 2001) from public.my_conversations()$q$);
select tests.must_fail('A modifie son message', $q$update public.messages set body = 'Autre chose'$q$);
select tests.must_fail('A lit les conversations à la main', 'select * from public.conversations');
select tests.must_fail('A marque lu à la place du mentor', 'update public.conversations set mentor_read_at = now()');

reset role;
-- L'identifiant de la conversation, comme si B l'avait deviné.
create temp table conv_ids on commit drop as select id from public.conversations;
grant select on conv_ids to authenticated;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select tests.must_count('B ne voit aucune conversation', 'select * from public.my_conversations()', 0);
select tests.must_count('B ne lit aucun message', 'select * from public.messages', 0);
select tests.must_count('B ne retrouve pas la conversation depuis la demande', $q$select 1 where public.conversation_for_booking('00000000-0000-0000-0000-0000000000f1') is not null$q$, 0);
select tests.must_fail('B écrit dans la conversation de A', $q$insert into public.messages (conversation_id, body) select id, 'Coucou' from conv_ids$q$);
select public.mark_conversation_read(id) from conv_ids;

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select tests.must_count('le mentor voit « Aymen A. » et 1 message non lu (B n''a rien pu marquer lu)',
  $q$select * from public.my_conversations() where as_role = 'mentor' and other_name = 'Aymen A.' and unread = 1 and last_body = 'Salut Yassine !' and not last_from_me$q$, 1);
select public.mark_conversation_read(id) from public.my_conversations();
select tests.must_count('le mentor a lu : plus de non lu', 'select * from public.my_conversations() where unread = 0', 1);
insert into public.messages (conversation_id, body) select id, 'Salut Aymen, dis-moi tout.' from public.my_conversations();

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select tests.must_count('A voit la réponse, non lue', $q$select * from public.my_conversations() where unread = 1 and last_body = 'Salut Aymen, dis-moi tout.'$q$, 1);
insert into public.messages (conversation_id, body) select c.id, 'm' || g from public.my_conversations() c, generate_series(1, 29) g;
select tests.must_fail('A, 30 messages en une minute : le 31e attend', $q$insert into public.messages (conversation_id, body) select id, 'Encore' from public.my_conversations()$q$);
reset role;

-- Mentor suspendu : la conversation reste lisible, plus personne n'y écrit.
delete from public.messages where body ~ '^m[0-9]+$';
update public.mentors set is_active = false where id = '00000000-0000-0000-0000-0000000000e1';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select tests.must_count('mentor suspendu : A relit la conversation', 'select * from public.messages', 2);
select tests.must_fail('mentor suspendu : A ne peut plus écrire', $q$insert into public.messages (conversation_id, body) select id, 'Tu es là ?' from public.my_conversations()$q$);
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select tests.must_fail('mentor suspendu : il ne peut plus écrire', $q$insert into public.messages (conversation_id, body) select id, 'Je reviens' from public.my_conversations()$q$);
reset role;

-- Blocage : la conversation disparaît pour les deux.
update public.mentors set is_active = true where id = '00000000-0000-0000-0000-0000000000e1';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.block_user('00000000-0000-0000-0000-0000000000e1');
select tests.must_count('A bloque le mentor : plus de conversation', 'select * from public.my_conversations()', 0);
select tests.must_count('… ni de messages', 'select * from public.messages', 0);
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select tests.must_count('… pour le mentor non plus', 'select * from public.messages', 0);
select tests.must_fail('le mentor bloqué n''écrit plus', $q$insert into public.messages (conversation_id, body) select id, 'Pourquoi ?' from conv_ids$q$);
select tests.must_count('le canal temps réel lui est fermé', $q$select 1 from conv_ids where public.is_conversation_topic('conv:' || id)$q$, 0);
select tests.must_count('la conversation ne se retrouve plus depuis la demande', $q$select 1 where public.conversation_for_booking('00000000-0000-0000-0000-0000000000f1') is not null$q$, 0);
reset role;
rollback;

-- ───────────── notifications : les téléphones et le journal des alertes ─────────────
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.register_push_token('ExponentPushToken[telephone-1]', 'ios');
select tests.must_count('A voit le jeton de son téléphone', 'select * from public.push_tokens', 1);
select tests.must_fail('A écrit un jeton à la main pour B',
  $q$insert into public.push_tokens (token, user_id, platform) values ('ExponentPushToken[x]', '00000000-0000-0000-0000-00000000000b', 'ios')$q$);
select tests.must_fail('A enregistre un jeton qui n''est pas un jeton Expo', $q$select public.register_push_token('https://pirate.example', 'ios')$q$);
select tests.must_fail('A lit le journal des alertes', 'select * from public.notification_events');
select tests.must_fail('A écrit dans le journal des alertes',
  $q$insert into public.notification_events (subject_id, event) values (gen_random_uuid(), 'booking_created')$q$);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select tests.must_count('B ne voit pas le jeton de A', 'select * from public.push_tokens', 0);
delete from public.push_tokens where token = 'ExponentPushToken[telephone-1]';
select public.register_push_token('ExponentPushToken[telephone-1]', 'ios');
select tests.must_count('B se connecte sur le même téléphone : le jeton passe à B', 'select * from public.push_tokens', 1);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select tests.must_count('A ne reçoit plus rien sur ce téléphone', 'select * from public.push_tokens', 0);
reset role;
set local role anon;
select tests.must_fail('anon enregistre un jeton', $q$select public.register_push_token('ExponentPushToken[y]', 'ios')$q$);
select tests.must_fail('anon lit les jetons', 'select * from public.push_tokens');
reset role;
set local role service_role;
insert into public.notification_events (subject_id, event) values ('00000000-0000-0000-0000-0000000000f9', 'booking_created');
select tests.must_fail('le serveur n''envoie pas deux fois la même alerte',
  $q$insert into public.notification_events (subject_id, event) values ('00000000-0000-0000-0000-0000000000f9', 'booking_created')$q$);
rollback;

-- ───────────── webhook : la base prévient le site, « annulée par qui » ─────────────
-- Faux coffre et faux pg_net : les appels sont enregistrés au lieu d'être envoyés.
create schema if not exists vault;
create table vault.decrypted_secrets (name text primary key, decrypted_secret text);
create schema if not exists net;
create table tests.webhook_calls (url text, body jsonb, headers jsonb);
create function net.http_post(url text, body jsonb, headers jsonb, timeout_milliseconds int) returns bigint
  language sql as $$ insert into tests.webhook_calls values (url, body, headers) returning 1 $$;
grant select on tests.webhook_calls to authenticated;

begin;
insert into vault.decrypted_secrets values ('notify_webhook_url', 'https://site.test/api/hooks/notify'), ('notify_webhook_secret', 'secret-test');
insert into public.mentors (id, user_id, first_name, last_name, city, is_active) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000c', 'Yassine', 'Kadiri', 'Lyon', true),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-00000000000d', 'Nadia', 'Daoud', 'Lille', false);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into public.bookings (id, student_id, mentor_id, starts_at, topic) values
  ('00000000-0000-0000-0000-0000000000f1', auth.uid(), '00000000-0000-0000-0000-0000000000e1', now() + interval '2 days', 'Visa'),
  ('00000000-0000-0000-0000-0000000000f2', auth.uid(), '00000000-0000-0000-0000-0000000000e1', now() + interval '3 days', 'CAF');
select tests.must_count('nouvelle demande : la base prévient le site, avec le secret',
  $q$select * from tests.webhook_calls where body ->> 'event' = 'booking_created' and headers ->> 'x-webhook-secret' = 'secret-test' and url = 'https://site.test/api/hooks/notify'$q$, 2);
select tests.must_count('le webhook n''envoie ni nom, ni sujet, ni date : seulement l''événement et l''identifiant',
  $q$select * from tests.webhook_calls where (select count(*) from jsonb_object_keys(body)) <> 2$q$, 0);
select tests.must_fail('A écrit « annulée par le mentor » à la main', $q$update public.bookings set cancelled_by = 'mentor' where id = '00000000-0000-0000-0000-0000000000f1'$q$);
select tests.must_fail('A appelle le webhook à la main', 'select public.notify_webhook()');
update public.bookings set status = 'cancelled' where id = '00000000-0000-0000-0000-0000000000f2';
select tests.must_count('A annule : « annulée par l''étudiant »', $q$select * from public.bookings where id = '00000000-0000-0000-0000-0000000000f2' and cancelled_by = 'student'$q$, 1);
select tests.must_count('… et le site est prévenu d''une annulation', $q$select * from tests.webhook_calls where body ->> 'event' = 'booking_cancelled'$q$, 1);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
update public.bookings set status = 'cancelled' where id = '00000000-0000-0000-0000-0000000000f1';
select tests.must_count('le mentor décline : « annulée par le mentor » et réponse envoyée',
  $q$select * from tests.webhook_calls where body ->> 'event' = 'booking_answered' and body ->> 'id' = '00000000-0000-0000-0000-0000000000f1'$q$, 1);
update public.bookings set topic = topic where id = '00000000-0000-0000-0000-0000000000f1';
select tests.must_count('une mise à jour sans changement de statut ne prévient personne', $q$select * from tests.webhook_calls$q$, 4);

reset role;
insert into public.mentor_trust (user_id, birth_year, charter_version, verified_at, verified_proof, verified_by)
  values ('00000000-0000-0000-0000-00000000000d', 1998, public.mentor_charter_version(), now(), 'linkedin', 'Aymane');
update public.mentors set is_active = true where id = '00000000-0000-0000-0000-0000000000e2';
select tests.must_count('fiche validée : le site est prévenu', $q$select * from tests.webhook_calls where body ->> 'event' = 'mentor_validated'$q$, 1);
update public.mentors set city = 'Lille' where id = '00000000-0000-0000-0000-0000000000e2';
select tests.must_count('une fiche déjà validée qu''on modifie ne prévient plus', $q$select * from tests.webhook_calls where body ->> 'event' = 'mentor_validated'$q$, 1);

-- Sans secret (copie locale, base de test) : rien ne part, et la réservation passe quand même.
delete from vault.decrypted_secrets;
delete from tests.webhook_calls;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into public.bookings (student_id, mentor_id, starts_at) values (auth.uid(), '00000000-0000-0000-0000-0000000000e1', now() + interval '5 days');
select tests.must_count('sans secret, la demande est enregistrée et rien ne part', $q$select * from tests.webhook_calls$q$, 0);
reset role;
rollback;

-- Le webhook en panne (pg_net absent) ne bloque jamais une réservation.
begin;
drop function net.http_post(text, jsonb, jsonb, int);
insert into vault.decrypted_secrets values ('notify_webhook_url', 'https://site.test/api/hooks/notify'), ('notify_webhook_secret', 'secret-test');
insert into public.mentors (id, user_id, first_name, last_name, city, is_active) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000c', 'Yassine', 'Kadiri', 'Lyon', true);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into public.bookings (student_id, mentor_id, starts_at) values (auth.uid(), '00000000-0000-0000-0000-0000000000e1', now() + interval '2 days');
select tests.must_count('webhook en panne : la demande est quand même enregistrée', 'select * from public.bookings', 1);
reset role;
rollback;

-- Un message prévient le site (le site décide ensuite s'il alerte : une fois par série non lue).
begin;
insert into vault.decrypted_secrets values ('notify_webhook_url', 'https://site.test/api/hooks/notify'), ('notify_webhook_secret', 'secret-test');
insert into public.mentors (id, user_id, first_name, last_name, city, is_active) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000c', 'Yassine', 'Kadiri', 'Lyon', true);
insert into public.bookings (id, student_id, mentor_id, starts_at, status) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000e1', now() + interval '2 days', 'pending');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
update public.bookings set status = 'confirmed' where id = '00000000-0000-0000-0000-0000000000f1';
select tests.must_count('le canal temps réel est ouvert aux deux participants',
  $q$select 1 from (select ('conv:' || id) t from public.my_conversations()) x where public.is_conversation_topic(x.t)$q$, 1);
select tests.must_count('un canal mal formé est refusé, sans erreur', $q$select 1 where public.is_conversation_topic('conv:pas-un-uuid')$q$, 0);
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into public.messages (conversation_id, body) select id, 'Merci !' from public.my_conversations();
select tests.must_count('nouveau message : la base prévient le site, sans le texte',
  $q$select * from tests.webhook_calls where body ->> 'event' = 'message_created' and not (body ? 'body')$q$, 1);
reset role;
rollback;

-- ───────────── serveur du site (clé service) ─────────────
begin;
set local role service_role;
select tests.must_count('quota : 1re question acceptée', $q$select * from public.assistant_consume('00000000-0000-0000-0000-00000000000a', 2) where allowed$q$, 1);
select tests.must_count('quota : 2e question acceptée', $q$select * from public.assistant_consume('00000000-0000-0000-0000-00000000000a', 2) where allowed$q$, 1);
select tests.must_count('quota : 3e question refusée', $q$select * from public.assistant_consume('00000000-0000-0000-0000-00000000000a', 2) where not allowed and used = 2$q$, 1);
select tests.must_count('quota : B a son propre compteur', $q$select * from public.assistant_consume('00000000-0000-0000-0000-00000000000b', 2) where allowed$q$, 1);
select public.assistant_record_usage('00000000-0000-0000-0000-00000000000a', 1200, 300, 0.0027);
select tests.must_count('coûts enregistrés', $q$select * from public.assistant_usage where input_tokens = 1200 and cost_usd = 0.0027$q$, 1);
select tests.must_count('le site lit toujours la waitlist', 'select * from public.waitlist', 1);
insert into public.assistant_feedback (query_id, reason) select id, 'faux' from public.assistant_queries limit 1;
rollback;

\o
\echo 'Tous les tests de sécurité passent ✓'
