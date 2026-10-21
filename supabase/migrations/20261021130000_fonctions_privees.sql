-- =====================================================================
-- Fonctions privées : plus aucune fonction « security definer » appelable
-- sans compte, et display_name ne révèle plus le nom de n'importe qui.
-- Corrige les avertissements de l'advisor après M1 (anon_security_definer_function_executable).
-- =====================================================================

-- 1. display_name : « Prénom N. » (jamais le nom complet), et seulement si
--    l'appelant partage un groupe avec la personne, ou si c'est un mentor validé.
--    Sinon null. Le prénom vide donne aussi null.
create or replace function public.display_name(uid uuid)
returns text language sql stable security definer set search_path = '' as $$
  select nullif(trim(p.first_name), '') || coalesce(' ' || upper(left(nullif(trim(p.last_name), ''), 1)) || '.', '')
  from public.profiles p
  where p.id = uid
    and auth.uid() is not null
    and (
      exists (
        select 1
        from public.group_members mine
        join public.group_members theirs on theirs.group_id = mine.group_id
        where mine.user_id = auth.uid() and theirs.user_id = uid
      )
      or exists (select 1 from public.mentors m where m.user_id = uid and m.is_active)
    );
$$;

-- 2. Le fil garde un nom affichable : « Membre DALILI » quand le nom est masqué
--    (par exemple un auteur qui a quitté le groupe). Mêmes colonnes qu'avant.
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
  ), '[]'::json) as comments
from public.posts p;

-- 3. Droits d'exécution. Les déclencheurs n'ont pas besoin d'EXECUTE pour se
--    déclencher ; display_name et is_member servent aux règles d'accès et à la vue,
--    lues par les comptes connectés uniquement.
revoke execute on function public.handle_new_user(), public.bump_count() from public, anon, authenticated;
revoke execute on function public.display_name(uuid), public.is_member(uuid) from public, anon;
grant execute on function public.display_name(uuid), public.is_member(uuid) to authenticated;
