-- Notifications par webhook (24/10/2026).
-- C'est la base qui prévient le site quand une demande d'appel change ou qu'une fiche mentor est validée :
-- l'alerte ne dépend plus de l'app (fermée juste après le geste, réseau coupé…). L'appel depuis l'app reste en secours ;
-- le journal `notification_events` ne laisse passer qu'une alerte par événement.
-- L'adresse du site et le secret partagé vivent dans le coffre (Vault), jamais dans une migration ni dans le dépôt :
--   notify_webhook_url    → https://dalili.study/api/hooks/notify
--   notify_webhook_secret → généré dans la base, recopié dans Vercel (NOTIFY_WEBHOOK_SECRET, Production seulement)
-- Sans ces deux secrets (base de test, copie locale), rien n'est envoyé.

-- 1. Appels HTTP depuis la base (file d'attente traitée après l'enregistrement).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net with schema extensions;
  end if;
end $$;

-- 2. Qui a annulé : l'étudiant (il annule) ou le mentor (il décline ou annule). Rempli par le garde, jamais à la main.
alter table public.bookings add column cancelled_by text check (cancelled_by in ('student', 'mentor'));

create or replace function public.bookings_guard()
returns trigger language plpgsql set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    return new;
  end if;
  if exists (select 1 from public.mentors m where m.id = old.mentor_id and m.user_id = me) then
    if new.starts_at is distinct from old.starts_at or new.topic is distinct from old.topic then
      raise exception 'Le mentor ne change ni la date ni le sujet d''une demande.' using errcode = 'insufficient_privilege';
    end if;
    if new.status = old.status
      or (old.status = 'pending' and new.status in ('confirmed', 'cancelled'))
      or (old.status = 'confirmed' and new.status in ('cancelled', 'done')) then
      if new.status = 'cancelled' and old.status <> 'cancelled' then
        new.cancelled_by := 'mentor';
      end if;
      return new;
    end if;
    raise exception 'Passage de « % » à « % » non permis.', old.status, new.status using errcode = 'insufficient_privilege';
  end if;
  if me = old.student_id then
    if new.starts_at is distinct from old.starts_at or new.topic is distinct from old.topic then
      raise exception 'Une demande envoyée ne se modifie pas : annule-la et refais-en une.' using errcode = 'insufficient_privilege';
    end if;
    if new.status = old.status or (old.status in ('pending', 'confirmed') and new.status = 'cancelled') then
      if new.status = 'cancelled' and old.status <> 'cancelled' then
        new.cancelled_by := 'student';
      end if;
      return new;
    end if;
    raise exception 'Tu peux seulement annuler ta demande.' using errcode = 'insufficient_privilege';
  end if;
  raise exception 'Non autorisé.' using errcode = 'insufficient_privilege';
end $$;

-- 3. Le webhook. Il n'envoie que le type d'événement et l'identifiant : le site relit tout en base avant d'alerter.
--    Une erreur ici ne bloque JAMAIS une réservation ni une validation (elle est seulement notée dans le journal).
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
  elsif tg_table_name = 'mentors' and tg_op = 'UPDATE' and new.is_active and not old.is_active then
    v_event := 'mentor_validated';
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

create trigger bookings_notify after insert or update of status on public.bookings
  for each row execute function public.notify_webhook();
create trigger mentors_notify after update of is_active on public.mentors
  for each row execute function public.notify_webhook();
