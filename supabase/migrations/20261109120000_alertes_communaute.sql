-- Cœurs, alertes de la communauté et un téléphone par compte (09/11/2026).
-- Constats du test à deux téléphones du 09/11 :
--   - les cœurs n'arrivaient jamais dans la base (l'app ne les gardait que sur le téléphone) : `post_likes` sert
--     enfin, et devient réservée aux membres du groupe, comme les publications et les commentaires ;
--   - des alertes arrivaient « depuis Expo Go » : un compte gardait le jeton de chaque app où il s'était connecté.
--     Désormais un compte reçoit ses alertes sur un seul téléphone : le dernier où l'app a été ouverte ;
--   - un cœur ou un commentaire ne prévenait personne : la base prévient le site, qui alerte l'auteur une fois.

-- 1. Cœurs : seuls les membres du groupe voient qui aime, et seuls eux peuvent aimer.
--    (Le compteur du fil, `posts_with_author`, lit avec les droits de l'appelant : un membre compte tous les cœurs.)
drop policy "likes : lecture" on public.post_likes;
drop policy "likes : aimer" on public.post_likes;
create policy "likes : lus par les membres" on public.post_likes for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and public.is_member(p.group_id)));
create policy "likes : aimer si membre" on public.post_likes for insert to authenticated
  with check ((select auth.uid()) = user_id and exists (select 1 from public.posts p where p.id = post_id and public.is_member(p.group_id)));

-- 2. Un téléphone par compte : à chaque ouverture de l'app, le jeton de ce téléphone remplace les autres jetons
--    du compte (Expo Go, ancienne installation, ancien téléphone). Le reste ne change pas : un jeton passe au
--    dernier compte connecté sur ce téléphone, seuls les jetons Expo sont acceptés.
create or replace function public.register_push_token(p_token text, p_platform text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    return;
  end if;
  delete from public.push_tokens where user_id = me and token <> p_token;
  insert into public.push_tokens (token, user_id, platform)
  values (p_token, me, p_platform)
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end $$;
revoke all on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

-- 3. Le journal des alertes connaît les cœurs (une fois par personne et par publication) et les commentaires.
alter table public.notification_events drop constraint notification_events_event_check;
alter table public.notification_events add constraint notification_events_event_check
  check (event in ('booking_created', 'booking_confirmed', 'booking_declined', 'booking_cancelled', 'mentor_validated',
                   'message_created', 'call_started', 'post_liked', 'comment_created'));

-- 4. Le webhook. Un cœur n'a pas d'identifiant propre : il envoie la publication et qui l'aime. Un commentaire
--    envoie son identifiant. Toujours ni texte ni nom : le site relit tout en base avant d'alerter.
--    Une erreur ici ne bloque JAMAIS un cœur, un commentaire, un message ni une réservation.
create or replace function public.notify_webhook()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_event text;
  v_id uuid;
  v_by uuid;
  v_body jsonb;
  v_url text;
  v_secret text;
begin
  -- Chaque branche ne lit que les colonnes de sa table (un cœur n'a pas de colonne `id`).
  if tg_table_name = 'bookings' then
    v_id := new.id;
    if tg_op = 'INSERT' and new.status = 'pending' then
      v_event := 'booking_created';
    elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
      if new.status = 'confirmed' or (new.status = 'cancelled' and new.cancelled_by = 'mentor') then
        v_event := 'booking_answered';
      elsif new.status = 'cancelled' and new.cancelled_by = 'student' then
        v_event := 'booking_cancelled';
      end if;
    end if;
  elsif tg_table_name = 'mentors' then
    v_id := new.id;
    if tg_op = 'UPDATE' and new.is_active and not old.is_active then
      v_event := 'mentor_validated';
    end if;
  elsif tg_table_name = 'messages' and tg_op = 'INSERT' then
    v_id := new.id;
    v_event := 'message_created';
  elsif tg_table_name = 'post_likes' and tg_op = 'INSERT' then
    v_id := new.post_id;
    v_by := new.user_id;
    v_event := 'post_liked';
  elsif tg_table_name = 'comments' and tg_op = 'INSERT' then
    v_id := new.id;
    v_event := 'comment_created';
  end if;
  if v_event is null then
    return new;
  end if;

  begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'notify_webhook_url';
    select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'notify_webhook_secret';
    if v_url is null or v_secret is null then
      return new;
    end if;
    v_body := jsonb_build_object('event', v_event, 'id', v_id);
    if v_by is not null then
      v_body := v_body || jsonb_build_object('by', v_by);
    end if;
    perform net.http_post(
      url := v_url,
      body := v_body,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
      timeout_milliseconds := 5000
    );
  exception when others then
    raise warning 'notify_webhook (%, %) : %', v_event, v_id, sqlerrm;
  end;
  return new;
end $$;
revoke all on function public.notify_webhook() from public, anon, authenticated;

-- Un cœur retiré puis remis ne prévient qu'une fois (journal du site) ; un double tap n'insère rien (clé primaire).
create trigger post_likes_notify after insert on public.post_likes for each row execute function public.notify_webhook();
create trigger comments_notify after insert on public.comments for each row execute function public.notify_webhook();
