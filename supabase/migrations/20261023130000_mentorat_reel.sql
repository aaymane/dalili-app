-- Mentorat réel (23/10/2026).
-- Une réservation est une DEMANDE : l'étudiant propose un moment, le mentor accepte ou décline selon ce qu'il
-- fait à ce moment-là. Pas de créneaux fixes : le mentor dit seulement s'il prend des demandes
-- (`mentors.available_this_week`, l'interrupteur de son espace).

comment on column public.mentors.available_this_week is
  'Le mentor prend des demandes en ce moment (interrupteur « Je prends des demandes / En pause » de son espace).';

-- 1. Une réservation naît « en attente ».
alter table public.bookings alter column status set default 'pending';

-- 2. L'étudiant demande seulement : à un mentor validé qui prend des demandes, pour plus tard, jamais à lui-même.
drop policy "rdv : l'étudiant réserve" on public.bookings;
create policy "rdv : l'étudiant demande" on public.bookings for insert to authenticated with check (
  auth.uid() = student_id
  and status = 'pending'
  and starts_at > now()
  and exists (
    select 1 from public.mentors m
    where m.id = mentor_id and m.is_active and m.available_this_week and m.user_id is distinct from auth.uid()
  )
);

-- 3. Qui change quoi. Les règles d'accès disent QUELLES lignes on touche ; ce garde dit COMMENT :
--    - le mentor accepte, décline, annule ou marque l'appel fait, sans toucher à la date ni au sujet ;
--    - l'étudiant ne fait qu'annuler sa demande ou son rendez-vous.
--    La clé service (serveur du site, sans auth.uid()) n'est pas concernée. Refus = « permission refusée » (42501).
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
      return new;
    end if;
    raise exception 'Passage de « % » à « % » non permis.', old.status, new.status using errcode = 'insufficient_privilege';
  end if;
  if me = old.student_id then
    if new.starts_at is distinct from old.starts_at or new.topic is distinct from old.topic then
      raise exception 'Une demande envoyée ne se modifie pas : annule-la et refais-en une.' using errcode = 'insufficient_privilege';
    end if;
    if new.status = old.status or (old.status in ('pending', 'confirmed') and new.status = 'cancelled') then
      return new;
    end if;
    raise exception 'Tu peux seulement annuler ta demande.' using errcode = 'insufficient_privilege';
  end if;
  raise exception 'Non autorisé.' using errcode = 'insufficient_privilege';
end $$;
revoke all on function public.bookings_guard() from public, anon, authenticated;
create trigger bookings_guard before update on public.bookings for each row execute function public.bookings_guard();

-- 4. Les demandes reçues par le mentor connecté, avec ce qu'il lui faut pour décider, et rien de plus :
--    « Prénom N. », ville et pays d'origine. Les profils restent invisibles autrement (RLS).
--    Les 60 derniers jours et tout ce qui est à venir.
create or replace function public.mentor_requests()
returns table (
  id uuid,
  starts_at timestamptz,
  topic text,
  status text,
  created_at timestamptz,
  student_name text,
  student_city text,
  student_country text
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
    p.country
  from public.bookings b
  join public.mentors m on m.id = b.mentor_id and m.user_id = auth.uid()
  left join public.profiles p on p.id = b.student_id
  where auth.uid() is not null
    and b.starts_at > now() - interval '60 days'
  order by b.starts_at;
$$;
revoke all on function public.mentor_requests() from public, anon;
grant execute on function public.mentor_requests() to authenticated;
