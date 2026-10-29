-- Commentaires sur les posts de la communauté (29/10/2026).
-- La table et ses règles de lecture et d'écriture (membres du groupe) existent depuis la migration init.
-- Ici : une vue pour l'écran du post, supprimer son propre commentaire, et l'app ne choisit plus ni l'auteur ni l'heure.

-- 1. Les commentaires d'un post, avec ce que l'écran affiche. Respecte les règles de l'appelant (security_invoker) :
--    seuls les membres du groupe les voient. « Prénom N. », ou « Membre DALILI » si le nom est masqué.
create view public.comments_with_author with (security_invoker = true) as
select
  c.id,
  c.post_id,
  c.body,
  c.created_at,
  coalesce(public.display_name(c.author_id), 'Membre DALILI') as author_name,
  c.author_id = p.author_id as is_post_author,
  c.author_id = auth.uid() as is_mine
from public.comments c
join public.posts p on p.id = c.post_id;
revoke all on public.comments_with_author from anon, authenticated;
grant select on public.comments_with_author to authenticated;

-- 2. Écrire : seulement le post et le texte. L'auteur (auth.uid()) et l'heure viennent de la base. Rien ne se modifie.
revoke insert, update on public.comments from authenticated;
grant insert (post_id, body) on public.comments to authenticated;

-- 3. Supprimer son propre commentaire.
create policy "commentaires : l'auteur supprime" on public.comments for delete to authenticated using (auth.uid() = author_id);

-- 4. Texte nettoyé (un commentaire d'espaces est refusé par la contrainte) et 10 commentaires par minute au plus.
create function public.comments_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.comments x where x.author_id = new.author_id and x.created_at > now() - interval '1 minute') >= 10 then
    raise exception 'Doucement : attends un peu avant de commenter à nouveau.' using errcode = 'check_violation';
  end if;
  new.body := trim(new.body);
  return new;
end $$;
revoke all on function public.comments_before_insert() from public, anon, authenticated;
create trigger comments_before_insert before insert on public.comments for each row execute function public.comments_before_insert();
