-- Messagerie mentor ↔ étudiant (29/10/2026).
-- Une conversation s'ouvre quand le mentor accepte une demande d'appel (choix du 29/10 : pas de message avant le oui).
-- Seuls les deux participants la lisent. Un blocage la masque aux deux ; un mentor suspendu ne peut plus écrire.
-- Temps réel : les nouveaux messages (filtrés par ces mêmes règles) et « en train d'écrire » sur un canal privé.

-- 1. Les conversations : une par étudiant et par mentor, créées par la base, jamais par l'app.
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  mentor_id uuid not null references public.mentors (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  student_read_at timestamptz not null default now(),
  mentor_read_at timestamptz not null default now(),
  unique (student_id, mentor_id)
);
alter table public.conversations enable row level security;
revoke all on public.conversations from anon, authenticated;
-- Aucune règle : la liste passe par my_conversations() (noms affichables, non lus), le « lu » par mark_conversation_read().
create index conversations_mentor on public.conversations (mentor_id);

-- 2. Les messages.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  -- L'heure réelle, pas celle du début de la transaction : deux messages envoyés d'un coup gardent leur ordre.
  created_at timestamptz not null default clock_timestamp()
);
alter table public.messages enable row level security;
revoke all on public.messages from anon, authenticated;
create index messages_conversation_created on public.messages (conversation_id, created_at desc);

-- 3. Qui en fait partie. Un blocage (dans un sens ou dans l'autre) sort les deux de la conversation.
create function public.is_conversation_member(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.conversations c
    join public.mentors m on m.id = c.mentor_id
    where c.id = cid
      and (c.student_id = auth.uid() or m.user_id = auth.uid())
      and not public.blocked_with(case when c.student_id = auth.uid() then m.user_id else c.student_id end)
  );
$$;
revoke all on function public.is_conversation_member(uuid) from public, anon;
grant execute on function public.is_conversation_member(uuid) to authenticated;

-- Écrire : membre, et le mentor est toujours validé (une fiche suspendue n'écrit plus et ne reçoit plus).
create function public.can_write_conversation(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_conversation_member(cid) and exists (
    select 1 from public.conversations c join public.mentors m on m.id = c.mentor_id where c.id = cid and m.is_active
  );
$$;
revoke all on function public.can_write_conversation(uuid) from public, anon;
grant execute on function public.can_write_conversation(uuid) to authenticated;

-- 4. Lire et écrire les messages. L'app n'envoie que la conversation et le texte : l'auteur et l'heure viennent de la base.
grant select on public.messages to authenticated;
grant insert (conversation_id, body) on public.messages to authenticated;
create policy "messages : les deux participants lisent" on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id));
create policy "messages : les deux participants écrivent" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.can_write_conversation(conversation_id));

-- 5. Après chaque message : l'heure du dernier message, et l'auteur a forcément lu jusque-là.
--    Garde-fou : 30 messages par minute au plus.
create function public.messages_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.messages x where x.sender_id = new.sender_id and x.created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Doucement : attends un peu avant d''envoyer d''autres messages.' using errcode = 'check_violation';
  end if;
  new.body := trim(new.body);
  return new;
end $$;
revoke all on function public.messages_before_insert() from public, anon, authenticated;
create trigger messages_before_insert before insert on public.messages for each row execute function public.messages_before_insert();

create function public.messages_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations c set
    last_message_at = new.created_at,
    student_read_at = case when c.student_id = new.sender_id then new.created_at else c.student_read_at end,
    mentor_read_at = case when c.student_id = new.sender_id then c.mentor_read_at else new.created_at end
  where c.id = new.conversation_id;
  return new;
end $$;
revoke all on function public.messages_after_insert() from public, anon, authenticated;
create trigger messages_after_insert after insert on public.messages for each row execute function public.messages_after_insert();

-- 6. La conversation s'ouvre quand le mentor accepte (et pour les demandes déjà acceptées avant cette migration).
create function public.bookings_open_conversation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.conversations (student_id, mentor_id) values (new.student_id, new.mentor_id) on conflict do nothing;
  return new;
end $$;
revoke all on function public.bookings_open_conversation() from public, anon, authenticated;
create trigger bookings_open_conversation after update of status on public.bookings
  for each row when (new.status = 'confirmed' and old.status is distinct from 'confirmed')
  execute function public.bookings_open_conversation();

insert into public.conversations (student_id, mentor_id)
  select distinct b.student_id, b.mentor_id from public.bookings b where b.status in ('confirmed', 'done')
  on conflict do nothing;

-- 7. Tes conversations : l'autre personne (« Prénom N. » pour un étudiant, le nom de sa fiche pour un mentor),
--    ton rôle dans la conversation, le dernier message, le nombre de messages non lus, et la dernière demande
--    d'appel entre vous (pour signaler ou bloquer depuis la conversation).
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
    last.body,
    last.sender_id = auth.uid(),
    c.last_message_at,
    (select count(*)::int from public.messages x
      where x.conversation_id = c.id and x.sender_id <> auth.uid()
        and x.created_at > case when c.student_id = auth.uid() then c.student_read_at else c.mentor_read_at end)
  from public.conversations c
  join public.mentors m on m.id = c.mentor_id
  left join public.profiles p on p.id = c.student_id
  left join lateral (
    select x.body, x.sender_id from public.messages x where x.conversation_id = c.id order by x.created_at desc limit 1
  ) last on true
  where public.is_conversation_member(c.id)
  order by coalesce(c.last_message_at, c.created_at) desc;
$$;
revoke all on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated;

-- 8. « Lu » : seulement ta propre colonne.
create function public.mark_conversation_read(cid uuid)
returns void language sql security definer set search_path = '' as $$
  update public.conversations c set
    student_read_at = case when c.student_id = auth.uid() then clock_timestamp() else c.student_read_at end,
    mentor_read_at = case when c.student_id = auth.uid() then c.mentor_read_at else clock_timestamp() end
  where c.id = cid and public.is_conversation_member(cid);
$$;
revoke all on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- 9. Depuis une demande d'appel (carte « Appel confirmé », demande acceptée côté mentor) : sa conversation, si tu en fais partie.
create function public.conversation_for_booking(p_booking_id uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select c.id from public.bookings b
  join public.conversations c on c.student_id = b.student_id and c.mentor_id = b.mentor_id
  where b.id = p_booking_id and public.is_conversation_member(c.id);
$$;
revoke all on function public.conversation_for_booking(uuid) from public, anon;
grant execute on function public.conversation_for_booking(uuid) to authenticated;

-- 10. Alerte sur le téléphone : la base prévient le site (même webhook que les demandes d'appel, voir
--     20261024120000_notifications_webhook.sql). Le site n'alerte qu'une fois par série de messages non lus.
alter table public.notification_events drop constraint notification_events_event_check;
alter table public.notification_events add constraint notification_events_event_check
  check (event in ('booking_created', 'booking_confirmed', 'booking_declined', 'booking_cancelled', 'mentor_validated', 'message_created'));

create or replace function public.notify_webhook()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_event text;
  v_url text;
  v_secret text;
begin
  if tg_table_name = 'bookings' then
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
    -- Imbriqué : un message n'a pas de colonne is_active, la condition ne doit être lue que pour une fiche.
    if tg_op = 'UPDATE' and new.is_active and not old.is_active then
      v_event := 'mentor_validated';
    end if;
  elsif tg_table_name = 'messages' and tg_op = 'INSERT' then
    v_event := 'message_created';
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
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object('event', v_event, 'id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
      timeout_milliseconds := 5000
    );
  exception when others then
    raise warning 'notify_webhook (%, %) : %', v_event, new.id, sqlerrm;
  end;
  return new;
end $$;
revoke all on function public.notify_webhook() from public, anon, authenticated;
create trigger messages_notify after insert on public.messages for each row execute function public.notify_webhook();

-- 11. Temps réel (absent de la base de test locale : ignoré si Realtime n'est pas là).
--     - les nouveaux messages arrivent sur l'écran ouvert (Realtime applique la règle de lecture ci-dessus) ;
--     - canal privé « conv:<id> » : seuls les deux participants le rejoignent (« en train d'écrire »).
create function public.is_conversation_topic(topic text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when topic ~ '^conv:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then public.is_conversation_member(substr(topic, 6)::uuid)
    else false
  end;
$$;
revoke all on function public.is_conversation_topic(text) from public, anon;
grant execute on function public.is_conversation_topic(text) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if to_regclass('realtime.messages') is not null then
    create policy "conversation : les deux participants écoutent" on realtime.messages for select to authenticated
      using (public.is_conversation_topic(realtime.topic()));
    create policy "conversation : les deux participants signalent qu'ils écrivent" on realtime.messages for insert to authenticated
      with check (public.is_conversation_topic(realtime.topic()));
  end if;
end $$;
