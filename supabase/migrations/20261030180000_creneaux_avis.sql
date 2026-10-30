-- Créneaux du mentor et avis des étudiants (30/10/2026).
-- Créneaux : le mentor choisit ses horaires de la semaine (heure de Paris) ; l'étudiant demande un appel sur un
-- créneau libre, le mentor accepte toujours. Un mentor sans créneau garde l'ancien fonctionnement (l'étudiant propose).
-- Avis : après un appel passé, l'étudiant le note (1 à 5) avec un mot. La base tient la note du mentor et publie les
-- derniers avis sur sa fiche, avec le prénom seulement.

-- 1. Créneaux hebdomadaires. Lus par les comptes connectés pour les mentors validés (comme leur fiche) ;
--    le mentor ajoute et retire les siens (pas de modification : on retire puis on ajoute).
create table public.mentor_slots (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.mentors (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = dimanche, comme extract(dow)
  start_time time not null check (start_time between '07:00' and '22:30' and extract(second from start_time) = 0 and extract(minute from start_time)::int % 15 = 0),
  created_at timestamptz not null default now(),
  unique (mentor_id, weekday, start_time)
);
create index mentor_slots_mentor_idx on public.mentor_slots (mentor_id);
alter table public.mentor_slots enable row level security;
revoke all on public.mentor_slots from anon, authenticated;
grant select, delete on public.mentor_slots to authenticated;
grant insert (mentor_id, weekday, start_time) on public.mentor_slots to authenticated;
create policy "créneaux : visibles pour les mentors validés" on public.mentor_slots for select to authenticated using (
  exists (select 1 from public.mentors m where m.id = mentor_id and (m.user_id = auth.uid() or (m.is_active and not public.blocked_with(m.user_id))))
);
create policy "créneaux : le mentor ajoute les siens" on public.mentor_slots for insert to authenticated with check (
  exists (select 1 from public.mentors m where m.id = mentor_id and m.user_id = auth.uid())
);
-- 60 créneaux au plus par mentor : de quoi couvrir une semaine chargée, pas de quoi remplir la table.
-- (Un déclencheur, pas la règle : une règle qui relit sa propre table tourne en rond.)
create function public.mentor_slots_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.mentor_slots s where s.mentor_id = new.mentor_id) >= 60 then
    raise exception '60 créneaux au plus.' using errcode = 'check_violation';
  end if;
  return new;
end $$;
revoke all on function public.mentor_slots_limit() from public, anon, authenticated;
create trigger mentor_slots_limit before insert on public.mentor_slots for each row execute function public.mentor_slots_limit();
create policy "créneaux : le mentor retire les siens" on public.mentor_slots for delete to authenticated using (
  exists (select 1 from public.mentors m where m.id = mentor_id and m.user_id = auth.uid())
);

-- 2. Une demande vers un mentor qui a des créneaux doit tomber sur l'un d'eux (heure de Paris).
create function public.bookings_match_slot()
returns trigger language plpgsql set search_path = '' as $$
declare
  paris timestamp := new.starts_at at time zone 'Europe/Paris';
begin
  if exists (select 1 from public.mentor_slots s where s.mentor_id = new.mentor_id)
     and not exists (
       select 1 from public.mentor_slots s
       where s.mentor_id = new.mentor_id and s.weekday = extract(dow from paris)::int and s.start_time = paris::time
     ) then
    raise exception 'Ce mentor n''est pas disponible à cette heure : choisis un de ses créneaux.' using errcode = 'check_violation';
  end if;
  return new;
end $$;
revoke all on function public.bookings_match_slot() from public, anon, authenticated;
create trigger bookings_match_slot before insert on public.bookings for each row execute function public.bookings_match_slot();

-- 3. Jamais deux demandes en cours sur la même heure chez le même mentor (en attente ou acceptées).
create unique index bookings_one_per_slot on public.bookings (mentor_id, starts_at) where status in ('pending', 'confirmed');

-- 4. Les heures déjà prises d'un mentor (30 prochains jours), pour griser les créneaux : seulement l'heure,
--    jamais qui a demandé. Les règles de lecture cachent les demandes des autres, d'où le mode security definer.
create function public.mentor_busy_times(p_mentor_id uuid)
returns setof timestamptz language sql stable security definer set search_path = '' as $$
  select b.starts_at from public.bookings b
  where b.mentor_id = p_mentor_id and b.status in ('pending', 'confirmed')
    and b.starts_at between now() and now() + interval '30 days'
    and auth.uid() is not null
$$;
revoke all on function public.mentor_busy_times(uuid) from public, anon;
grant execute on function public.mentor_busy_times(uuid) to authenticated;

-- 5. Avis : un par rendez-vous, par l'étudiant de ce rendez-vous, une fois l'appel passé (fait, ou accepté et
--    commencé depuis 30 minutes). Lus par leur auteur et par le mentor concerné ; le public lit la fiche du mentor.
create table public.mentor_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  mentor_id uuid not null references public.mentors (id) on delete cascade,
  student_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 500),
  created_at timestamptz not null default now()
);
create index mentor_reviews_mentor_idx on public.mentor_reviews (mentor_id, created_at desc);
alter table public.mentor_reviews enable row level security;
revoke all on public.mentor_reviews from anon, authenticated;
grant select on public.mentor_reviews to authenticated;
grant insert (booking_id, mentor_id, rating, comment) on public.mentor_reviews to authenticated;
create policy "avis : l'auteur et le mentor les lisent" on public.mentor_reviews for select to authenticated using (
  auth.uid() = student_id or exists (select 1 from public.mentors m where m.id = mentor_id and m.user_id = auth.uid())
);
create policy "avis : l'étudiant note son appel passé" on public.mentor_reviews for insert to authenticated with check (
  auth.uid() = student_id
  and exists (
    select 1 from public.bookings b
    where b.id = booking_id and b.student_id = auth.uid() and b.mentor_id = mentor_reviews.mentor_id
      and (b.status = 'done' or (b.status = 'confirmed' and b.starts_at < now() - interval '30 minutes'))
  )
);

-- 6. La base tient la fiche : note moyenne, nombre d'avis, et les 5 derniers avis (prénom, texte, note).
--    Les colonnes rating, sessions_count et reviews ne sont pas modifiables par les comptes (droits du 20/10).
create function public.mentor_reviews_publish()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.mentors m set
    rating = coalesce((select round(avg(r.rating)::numeric, 1) from public.mentor_reviews r where r.mentor_id = new.mentor_id), m.rating),
    sessions_count = greatest(m.sessions_count, (select count(*) from public.mentor_reviews r where r.mentor_id = new.mentor_id)),
    reviews = coalesce((
      select jsonb_agg(jsonb_build_object('author', x.author, 'text', x.comment, 'rating', x.rating) order by x.created_at desc)
      from (
        select coalesce(nullif(trim(p.first_name), ''), 'Étudiant·e') as author, r.comment, r.rating, r.created_at
        from public.mentor_reviews r left join public.profiles p on p.id = r.student_id
        where r.mentor_id = new.mentor_id and nullif(trim(r.comment), '') is not null
        order by r.created_at desc limit 5
      ) x
    ), '[]'::jsonb)
  where m.id = new.mentor_id;
  return new;
end $$;
revoke all on function public.mentor_reviews_publish() from public, anon, authenticated;
create trigger mentor_reviews_publish after insert on public.mentor_reviews for each row execute function public.mentor_reviews_publish();
