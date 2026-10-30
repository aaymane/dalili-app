-- Le mentor lance l'appel (30/10/2026). Décision des fondateurs : c'est le mentor qui ouvre le salon.
-- Quand il demande l'accès à la salle (route /api/v1/call du site), le serveur note l'heure ici et prévient
-- l'étudiant (« Yassine t'attend dans le salon »). Avant ça, l'étudiant attend dans la salle d'attente de l'app.

-- 1. L'heure où le mentor a ouvert le salon. Écrite par le serveur du site seulement : les comptes ne peuvent
--    modifier que status, starts_at et topic (droits du 20/10), et une demande naît toujours sans salon ouvert.
alter table public.bookings add column call_started_at timestamptz;

create function public.bookings_not_started()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.call_started_at := null;
  return new;
end $$;
revoke all on function public.bookings_not_started() from public, anon, authenticated;
create trigger bookings_not_started before insert on public.bookings for each row execute function public.bookings_not_started();

-- 2. L'alerte « ton mentor t'attend » n'est envoyée qu'une fois par appel (journal des alertes du site).
alter table public.notification_events drop constraint notification_events_event_check;
alter table public.notification_events add constraint notification_events_event_check
  check (event in ('booking_created', 'booking_confirmed', 'booking_declined', 'booking_cancelled', 'mentor_validated', 'message_created', 'call_started'));
