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
insert into public.mentors (user_id, first_name, last_name, city) values (auth.uid(), 'A', 'A', 'Paris');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select tests.must_count('B ne voit pas un mentor non validé', 'select * from public.mentors', 0);
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
