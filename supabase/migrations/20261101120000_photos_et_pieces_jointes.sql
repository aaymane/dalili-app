-- Photos et pièces jointes (01/11/2026). Décisions des fondateurs :
-- 1. Couvertures : seul le créateur d'un groupe ou d'un événement dépose (ou change) sa photo ; tous les comptes
--    connectés la voient. Sans photo, l'app garde les couleurs et l'emoji.
-- 2. Photos dans les publications des groupes, comme le texte : lues seulement par les membres du groupe.
-- 3. Pièces jointes dans la messagerie mentor ↔ étudiant (photos et PDF, dans les deux sens) : lues seulement par les
--    deux participants (un blocage coupe l'accès), supprimées après 30 jours, et avec le compte.
-- Trois buckets PRIVÉS. Les photos arrivent réduites et réencodées en JPEG par l'app (métadonnées retirées).
-- Storage ne suit pas les suppressions en cascade : c'est le site (clé service) qui retire les fichiers, chaque jour
-- pour les pièces jointes de plus de 30 jours, et à la suppression d'un compte.

-- ───────────── 1. Couvertures des groupes et des événements ─────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Le CHEMIN dans le bucket, jamais une adresse web (pas de pixel espion), et toujours dans le dossier du groupe ou
-- de l'événement : `groups/<id>/<nom>.jpg`, `events/<id>/<nom>.jpg`. Posée après la création (l'id vient de la base).
alter table public.groups add column cover_path text;
alter table public.groups add constraint groups_cover_chemin
  check (cover_path is null or cover_path ~ ('^groups/' || id::text || '/[a-z0-9]{6,32}\.jpg$'));
alter table public.events add column cover_path text;
alter table public.events add constraint events_cover_chemin
  check (cover_path is null or cover_path ~ ('^events/' || id::text || '/[a-z0-9]{6,32}\.jpg$'));
-- Les règles « le créateur modifie » existent déjà : il manquait seulement le droit sur la colonne.
grant update (cover_path) on public.groups to authenticated;
grant update (cover_path) on public.events to authenticated;

-- Le dossier `groups/<id>/` ou `events/<id>/` appartient au créateur de ce groupe ou de cet événement.
create function public.owns_cover_folder(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and case (storage.foldername(object_name))[1]
    when 'groups' then exists (select 1 from public.groups g where g.id::text = (storage.foldername(object_name))[2] and g.created_by = auth.uid())
    when 'events' then exists (select 1 from public.events e where e.id::text = (storage.foldername(object_name))[2] and e.created_by = auth.uid())
    else false
  end;
$$;
revoke all on function public.owns_cover_folder(text) from public, anon;
grant execute on function public.owns_cover_folder(text) to authenticated;

create policy "couvertures : lues par les comptes connectés" on storage.objects for select to authenticated
  using (bucket_id = 'covers');
create policy "couvertures : déposées par le créateur" on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and public.owns_cover_folder(name));
create policy "couvertures : remplacées par le créateur" on storage.objects for update to authenticated
  using (bucket_id = 'covers' and public.owns_cover_folder(name))
  with check (bucket_id = 'covers' and public.owns_cover_folder(name));
create policy "couvertures : supprimées par le créateur" on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and public.owns_cover_folder(name));

-- ───────────── 2. Photos dans les publications des groupes ─────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-photos', 'post-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Une publication a du texte, une photo, ou les deux. La photo est dans le dossier du groupe et de son auteur :
-- `<groupe>/<auteur>/<nom>.jpg`.
alter table public.posts add column image_path text;
alter table public.posts alter column body set default '';
alter table public.posts drop constraint posts_body_check;
alter table public.posts add constraint posts_contenu
  check (char_length(body) <= 4000 and (char_length(trim(body)) >= 1 or image_path is not null));
alter table public.posts add constraint posts_photo_chemin
  check (image_path is null or image_path ~ ('^' || group_id::text || '/' || author_id::text || '/[a-z0-9]{6,32}\.jpg$'));

-- Le fil montre la photo (ajoutée en dernière colonne : la vue garde les autres telles quelles).
create or replace view public.posts_with_author with (security_invoker = true) as
select
  p.id,
  p.group_id,
  p.body,
  p.created_at,
  coalesce(public.display_name(p.author_id), 'Membre DALILI') as author_name,
  '#3D78FF' as author_color,
  (select count(*) from public.post_likes l where l.post_id = p.id)::int as likes_count,
  coalesce((
    select json_agg(json_build_object('author', coalesce(public.display_name(c.author_id), 'Membre DALILI'), 'body', c.body, 'isAuthor', c.author_id = p.author_id) order by c.created_at)
    from public.comments c where c.post_id = p.id
  ), '[]'::json) as comments,
  p.image_path
from public.posts p;

-- Lire : membre du groupe (même règle que le texte). Déposer : membre, dans son propre dossier. Supprimer : la sienne.
create function public.can_see_post_photo(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.groups g where g.id::text = (storage.foldername(object_name))[1] and public.is_member(g.id));
$$;
revoke all on function public.can_see_post_photo(text) from public, anon;
grant execute on function public.can_see_post_photo(text) to authenticated;

create policy "photos des publications : lues par les membres" on storage.objects for select to authenticated
  using (bucket_id = 'post-photos' and public.can_see_post_photo(name));
create policy "photos des publications : déposées par un membre, dans son dossier" on storage.objects for insert to authenticated
  with check (bucket_id = 'post-photos' and (storage.foldername(name))[2] = (select auth.uid())::text and public.can_see_post_photo(name));
create policy "photos des publications : supprimées par leur auteur" on storage.objects for delete to authenticated
  using (bucket_id = 'post-photos' and (storage.foldername(name))[2] = (select auth.uid())::text);

-- ───────────── 3. Pièces jointes de la messagerie ─────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('message-files', 'message-files', false, 10485760, array['image/jpeg', 'application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Un message a du texte, une pièce jointe, ou les deux. Après 30 jours, le site retire le fichier et efface
-- `attachment_path` : le nom reste, l'app affiche « Fichier supprimé après 30 jours ».
alter table public.messages
  add column attachment_path text,
  add column attachment_name text,
  add column attachment_type text,
  add column attachment_size int;
alter table public.messages alter column body set default '';
alter table public.messages drop constraint messages_body_check;
alter table public.messages add constraint messages_contenu
  check (char_length(body) <= 2000 and (char_length(trim(body)) >= 1 or attachment_name is not null));
alter table public.messages add constraint messages_piece_jointe check (
  (attachment_name is null and attachment_path is null and attachment_type is null and attachment_size is null)
  or (
    char_length(attachment_name) between 1 and 120
    and attachment_type in ('image/jpeg', 'application/pdf')
    and attachment_size between 1 and 10485760
    and (attachment_path is null or (
      attachment_path ~ ('^' || conversation_id::text || '/[a-z0-9]{6,32}\.(jpg|pdf)$')
      and (attachment_type = 'application/pdf') = (attachment_path like '%.pdf')
    ))
  )
);
grant insert (attachment_path, attachment_name, attachment_type, attachment_size) on public.messages to authenticated;
-- À l'envoi, une pièce jointe a toujours son fichier (seul le site l'efface, après 30 jours).
drop policy "messages : les deux participants écrivent" on public.messages;
create policy "messages : les deux participants écrivent" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.can_write_conversation(conversation_id) and (attachment_name is null or attachment_path is not null));
-- La tâche quotidienne du site retrouve vite les fichiers à retirer.
create index messages_pieces_jointes on public.messages (created_at) where attachment_path is not null;

-- Le dossier d'un fichier est l'identifiant de sa conversation : `<conversation>/<nom>.jpg|pdf`.
create function public.conversation_of_object(object_name text)
returns uuid language sql stable security definer set search_path = '' as $$
  select c.id from public.conversations c where c.id::text = (storage.foldername(object_name))[1];
$$;
revoke all on function public.conversation_of_object(text) from public, anon;
grant execute on function public.conversation_of_object(text) to authenticated;

create policy "pièces jointes : lues par les deux participants" on storage.objects for select to authenticated
  using (bucket_id = 'message-files' and coalesce(public.is_conversation_member(public.conversation_of_object(name)), false));
create policy "pièces jointes : déposées par un participant qui peut écrire" on storage.objects for insert to authenticated
  with check (bucket_id = 'message-files' and coalesce(public.can_write_conversation(public.conversation_of_object(name)), false));
create policy "pièces jointes : retirées par celui qui les a déposées" on storage.objects for delete to authenticated
  using (bucket_id = 'message-files' and owner = (select auth.uid()));

-- La liste des conversations montre « 📎 nom du fichier » quand le dernier message n'est qu'une pièce jointe.
create or replace function public.my_conversations()
returns table (
  id uuid,
  as_role text,
  mentor_id uuid,
  booking_id uuid,
  other_name text,
  can_write boolean,
  last_body text,
  last_from_me boolean,
  last_message_at timestamptz,
  unread int
)
language sql stable security definer set search_path = '' as $$
  select
    c.id,
    case when c.student_id = auth.uid() then 'student' else 'mentor' end,
    c.mentor_id,
    (select b.id from public.bookings b where b.student_id = c.student_id and b.mentor_id = c.mentor_id order by b.created_at desc limit 1),
    case when c.student_id = auth.uid()
      then nullif(trim(m.first_name || ' ' || coalesce(m.last_name, '')), '')
      else nullif(trim(p.first_name), '') || coalesce(' ' || upper(left(nullif(trim(p.last_name), ''), 1)) || '.', '')
    end,
    m.is_active,
    case when last.body = '' and last.attachment_name is not null then '📎 ' || last.attachment_name else last.body end,
    last.sender_id = auth.uid(),
    c.last_message_at,
    (select count(*)::int from public.messages x
      where x.conversation_id = c.id and x.sender_id <> auth.uid()
        and x.created_at > case when c.student_id = auth.uid() then c.student_read_at else c.mentor_read_at end)
  from public.conversations c
  join public.mentors m on m.id = c.mentor_id
  left join public.profiles p on p.id = c.student_id
  left join lateral (
    select x.body, x.attachment_name, x.sender_id from public.messages x where x.conversation_id = c.id order by x.created_at desc limit 1
  ) last on true
  where public.is_conversation_member(c.id)
  order by coalesce(c.last_message_at, c.created_at) desc;
$$;
