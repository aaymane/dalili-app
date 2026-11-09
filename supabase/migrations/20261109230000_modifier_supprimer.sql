-- Modifier ou supprimer ce qu'on a écrit (09/11/2026), comme sur Instagram : appui long sur son message, son
-- commentaire ou sa publication. Seul l'auteur le peut, et c'est la base qui le vérifie (jamais seulement l'écran).
--   - publication et commentaire : le texte se modifie à tout moment, « modifié » s'affiche ; ils se suppriment
--     (déjà permis à leur auteur) ;
--   - message : le texte se modifie pendant 15 minutes, tant que la conversation est ouverte ; il se supprime pour
--     les deux, à tout moment.
-- Sécurité de la messagerie (mentor ↔ étudiant) : l'ancienne version d'un message modifié ou supprimé est gardée
-- 30 jours, lisible par l'équipe seulement (en cas de signalement), puis effacée. La page Confidentialité le dit.

-- 1. Le texte change, rien d'autre : nettoyé, et l'heure de la modification notée par la base.
create function public.stamp_edit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.body is distinct from old.body then
    new.body := trim(new.body);
    new.edited_at := now();
  end if;
  return new;
end $$;
revoke all on function public.stamp_edit() from public, anon, authenticated;

-- 2. Publications. Jusqu'ici, les comptes avaient le droit de modifier toute la ligne, mais aucune règle ne le
--    permettait : on ne rend que la colonne du texte, à son auteur.
alter table public.posts add column edited_at timestamptz;
revoke update on public.posts from anon, authenticated;
grant update (body) on public.posts to authenticated;
create policy "posts : l'auteur modifie la sienne" on public.posts for update to authenticated
  using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);
create trigger posts_stamp_edit before update on public.posts for each row execute function public.stamp_edit();

-- 3. Commentaires.
alter table public.comments add column edited_at timestamptz;
grant update (body) on public.comments to authenticated;
create policy "commentaires : l'auteur modifie le sien" on public.comments for update to authenticated
  using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);
create trigger comments_stamp_edit before update on public.comments for each row execute function public.stamp_edit();

-- 4. Le fil et les commentaires disent « à toi » et « modifié » (colonnes ajoutées en dernier).
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
  public.avatar_of(p.author_id) as author_avatar,
  p.author_id = (select auth.uid()) as is_mine,
  p.edited_at
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
  public.avatar_of(c.author_id) as author_avatar,
  c.edited_at
from public.comments c
join public.posts p on p.id = c.post_id;

-- 5. Messages : l'ancienne version, gardée 30 jours pour l'équipe. Aucune règle : ni l'app ni les comptes n'y
--    lisent ni n'y écrivent, seul le serveur (clé secrète). Effacée avec la conversation ou le compte.
create table public.message_history (
  id bigint generated always as identity primary key,
  message_id uuid not null,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  action text not null check (action in ('edited', 'deleted')),
  body text not null,
  attachment_name text,
  sent_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.message_history enable row level security;
revoke all on public.message_history from anon, authenticated;
create index message_history_created on public.message_history (created_at);
create index message_history_conversation on public.message_history (conversation_id, created_at desc);

-- Rien n'est gardé si la conversation ou le compte sont en train d'être effacés (suppression en cascade).
create function public.keep_message_version(m public.messages, p_action text)
returns void language sql security definer set search_path = '' as $$
  insert into public.message_history (message_id, conversation_id, sender_id, action, body, attachment_name, sent_at)
  select m.id, m.conversation_id, m.sender_id, p_action, m.body, m.attachment_name, m.created_at
  where exists (select 1 from public.conversations c where c.id = m.conversation_id)
    and exists (select 1 from auth.users u where u.id = m.sender_id);
  delete from public.message_history where created_at < now() - interval '30 days';
$$;
revoke all on function public.keep_message_version(public.messages, text) from public, anon, authenticated;

alter table public.messages add column edited_at timestamptz;
grant update (body) on public.messages to authenticated;
grant delete on public.messages to authenticated;
create policy "messages : l'auteur modifie le sien" on public.messages for update to authenticated
  using (sender_id = (select auth.uid())) with check (sender_id = (select auth.uid()));
create policy "messages : l'auteur supprime le sien" on public.messages for delete to authenticated
  using (sender_id = (select auth.uid()));

-- Modifier : 15 minutes après l'envoi, conversation encore ouverte (ni blocage ni fiche suspendue).
-- La tâche quotidienne du site (pièces jointes de plus de 30 jours) ne change pas le texte : elle passe.
create function public.messages_before_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.body is not distinct from old.body then
    return new;
  end if;
  if auth.uid() is null or auth.uid() <> old.sender_id then
    raise exception 'Seul l''auteur modifie son message.' using errcode = 'insufficient_privilege';
  end if;
  if old.created_at < now() - interval '15 minutes' then
    raise exception 'Un message se modifie pendant 15 minutes seulement.' using errcode = 'check_violation';
  end if;
  if not public.can_write_conversation(old.conversation_id) then
    raise exception 'Cette conversation est fermée.' using errcode = 'insufficient_privilege';
  end if;
  perform public.keep_message_version(old, 'edited');
  new.body := trim(new.body);
  new.edited_at := now();
  return new;
end $$;
revoke all on function public.messages_before_update() from public, anon, authenticated;
create trigger messages_before_update before update on public.messages for each row execute function public.messages_before_update();

-- Supprimer : l'auteur seulement (la règle ci-dessus) ; la version est gardée. Une suppression qui n'est pas
-- son geste (compte effacé par le site, conversation supprimée) ne garde rien.
create function public.messages_before_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and auth.uid() = old.sender_id then
    perform public.keep_message_version(old, 'deleted');
  end if;
  return old;
end $$;
revoke all on function public.messages_before_delete() from public, anon, authenticated;
create trigger messages_before_delete before delete on public.messages for each row execute function public.messages_before_delete();
