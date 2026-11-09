-- Photos de profil visibles par les autres (09/11/2026) : l'app est plus vivante quand on voit les visages.
-- Annoncé dès le 22/10 (20261022120000_photos_profil.sql) : on voit la photo de quelqu'un quand on voit déjà
-- son nom, c'est-à-dire :
--   - on est dans un même groupe ;
--   - c'est un mentor validé (sa fiche est publique pour les comptes) ;
--   - on a une demande d'appel ensemble (l'étudiant et son mentor, dans les deux sens).
-- Jamais pour anon, jamais après un blocage (dans un sens ou dans l'autre), et seulement la photo actuelle :
-- les anciennes restent visibles par leur seul propriétaire, le temps que l'app les retire.

-- 1. Qui peut voir qui. Interne : appelée seulement par les fonctions ci-dessous, jamais par l'API.
create function public.can_see_person(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and uid is not null and (
    uid = auth.uid()
    or (
      not public.blocked_with(uid)
      and (
        exists (
          select 1 from public.group_members mine
          join public.group_members theirs on theirs.group_id = mine.group_id
          where mine.user_id = auth.uid() and theirs.user_id = uid
        )
        or exists (select 1 from public.mentors m where m.user_id = uid and m.is_active)
        or exists (
          select 1 from public.bookings b join public.mentors m on m.id = b.mentor_id
          where (b.student_id = auth.uid() and m.user_id = uid) or (b.student_id = uid and m.user_id = auth.uid())
        )
      )
    )
  );
$$;
revoke all on function public.can_see_person(uuid) from public, anon, authenticated;

-- 2. Le chemin de la photo (dans le bucket privé `avatars`), ou null si on ne doit pas la voir.
--    Les vues et les fonctions de l'app l'appellent ; l'app en fait un lien temporaire.
create function public.avatar_of(uid uuid)
returns text language sql stable security definer set search_path = '' as $$
  select p.avatar_url from public.profiles p where p.id = uid and p.avatar_url is not null and public.can_see_person(uid);
$$;
revoke all on function public.avatar_of(uuid) from public, anon;
grant execute on function public.avatar_of(uuid) to authenticated;

-- Plusieurs d'un coup (les fiches des mentors). Avec les droits de l'appelant : seule `avatar_of` décide.
create function public.avatars_of(p_users uuid[])
returns table (user_id uuid, avatar_path text) language sql stable security invoker set search_path = '' as $$
  select u, public.avatar_of(u) from unnest(p_users[1:200]) as u where public.avatar_of(u) is not null;
$$;
revoke all on function public.avatars_of(uuid[]) from public, anon;
grant execute on function public.avatars_of(uuid[]) to authenticated;

-- 3. Le fichier lui-même : lisible par ceux qui voient la personne, et seulement la photo actuelle du profil.
--    Le dossier est vérifié avant la conversion (un nom mal formé ne casse jamais la lecture du bucket).
create policy "avatars : la photo actuelle, lue par ceux qui voient la personne" on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and case
      when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.avatar_of(((storage.foldername(name))[1])::uuid) = name
      else false
    end
  );

-- 4. Le fil et les commentaires : la photo de l'auteur (dernière colonne, les autres ne bougent pas).
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
    select json_agg(json_build_object(
      'author', coalesce(public.display_name(c.author_id), 'Membre DALILI'),
      'body', c.body,
      'isAuthor', c.author_id = p.author_id,
      'avatar', public.avatar_of(c.author_id)
    ) order by c.created_at)
    from public.comments c where c.post_id = p.id
  ), '[]'::json) as comments,
  p.image_path,
  public.avatar_of(p.author_id) as author_avatar
from public.posts p;

create or replace view public.comments_with_author with (security_invoker = true) as
select
  c.id,
  c.post_id,
  c.body,
  c.created_at,
  coalesce(public.display_name(c.author_id), 'Membre DALILI') as author_name,
  c.author_id = p.author_id as is_post_author,
  c.author_id = auth.uid() as is_mine,
  public.avatar_of(c.author_id) as author_avatar
from public.comments c
join public.posts p on p.id = c.post_id;

-- 5. Les conversations : la photo de l'autre (le mentor pour l'étudiant, l'étudiant pour le mentor).
--    Une colonne de plus : la fonction est recréée, avec les mêmes droits.
drop function public.my_conversations();
create function public.my_conversations()
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
  unread int,
  other_avatar text
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
        and x.created_at > case when c.student_id = auth.uid() then c.student_read_at else c.mentor_read_at end),
    public.avatar_of(case when c.student_id = auth.uid() then m.user_id else c.student_id end)
  from public.conversations c
  join public.mentors m on m.id = c.mentor_id
  left join public.profiles p on p.id = c.student_id
  left join lateral (
    select x.body, x.attachment_name, x.sender_id from public.messages x where x.conversation_id = c.id order by x.created_at desc limit 1
  ) last on true
  where public.is_conversation_member(c.id)
  order by coalesce(c.last_message_at, c.created_at) desc;
$$;
revoke all on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated;

-- 6. Les demandes reçues par le mentor : la photo de l'étudiant (agenda, accueil, appel).
drop function public.mentor_requests();
create function public.mentor_requests()
returns table (
  id uuid,
  starts_at timestamptz,
  topic text,
  status text,
  created_at timestamptz,
  student_name text,
  student_city text,
  student_country text,
  student_avatar text
)
language sql stable security definer set search_path = '' as $$
  select
    b.id,
    b.starts_at,
    b.topic,
    b.status,
    b.created_at,
    nullif(trim(p.first_name), '') || coalesce(' ' || upper(left(nullif(trim(p.last_name), ''), 1)) || '.', ''),
    nullif(trim(p.origin_city), ''),
    p.country,
    public.avatar_of(b.student_id)
  from public.bookings b
  join public.mentors m on m.id = b.mentor_id and m.user_id = auth.uid()
  left join public.profiles p on p.id = b.student_id
  where auth.uid() is not null
    and b.starts_at > now() - interval '60 days'
    and not public.blocked_with(b.student_id)
  order by b.starts_at;
$$;
revoke all on function public.mentor_requests() from public, anon;
grant execute on function public.mentor_requests() to authenticated;
