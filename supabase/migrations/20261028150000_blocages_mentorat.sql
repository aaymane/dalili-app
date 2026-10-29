-- Sécurité du mentorat, 3e partie (28/10/2026) : bloquer.
-- Un étudiant bloque un mentor, un mentor bloque un étudiant. L'effet vaut dans les deux sens : vous ne vous voyez plus
-- (fiche mentor masquée, demandes reçues masquées), plus aucune demande ne passe entre vous, et celles en cours sont
-- annulées. La personne bloquée n'est pas prévenue : elle voit seulement une demande annulée, comme d'habitude.

-- 1. Les blocages. Personne ne les lit directement : la liste « Personnes bloquées » passe par my_blocks(),
--    qui ne donne que « Prénom N. » (jamais l'identifiant du compte bloqué).
create table public.mentorat_blocks (
  id uuid not null unique default gen_random_uuid(),
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint mentorat_blocks_not_self check (blocker_id <> blocked_id)
);
alter table public.mentorat_blocks enable row level security;
revoke all on public.mentorat_blocks from anon, authenticated;
-- Aucune règle : seules les fonctions ci-dessous y touchent.
create index mentorat_blocks_blocked on public.mentorat_blocks (blocked_id, blocker_id);

-- 2. Un blocage entre toi et cette personne, dans un sens ou dans l'autre ? Sert aux règles d'accès.
--    Toujours par rapport à toi : on ne peut pas sonder les blocages entre deux autres personnes.
create function public.blocked_with(other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select other is not null and auth.uid() is not null and exists (
    select 1 from public.mentorat_blocks k
    where (k.blocker_id = auth.uid() and k.blocked_id = other) or (k.blocker_id = other and k.blocked_id = auth.uid())
  );
$$;
revoke all on function public.blocked_with(uuid) from public, anon;
grant execute on function public.blocked_with(uuid) to authenticated;

-- 3. Bloquer. Comme pour signaler, la base retrouve elle-même la personne et vérifie le lien :
--    - p_booking_id : une demande entre vous deux ;
--    - p_mentor_id : la fiche d'un mentor validé, ou d'un mentor avec qui tu as une demande.
--    Les demandes en attente ou acceptées entre vous deux sont annulées (le garde des réservations note qui annule).
create function public.block_user(p_mentor_id uuid default null, p_booking_id uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  v_other uuid;
  v_student uuid;
  v_active boolean;
begin
  if me is null then
    raise exception 'Connexion requise.' using errcode = 'insufficient_privilege';
  end if;

  if p_booking_id is not null then
    select b.student_id, m.user_id into v_student, v_other
    from public.bookings b join public.mentors m on m.id = b.mentor_id
    where b.id = p_booking_id;
    if not found then
      raise exception 'Demande introuvable.' using errcode = 'insufficient_privilege';
    end if;
    if me = v_other then
      v_other := v_student;
    elsif me is distinct from v_student then
      raise exception 'Non autorisé.' using errcode = 'insufficient_privilege';
    end if;
  elsif p_mentor_id is not null then
    select m.user_id, m.is_active into v_other, v_active from public.mentors m where m.id = p_mentor_id;
    if not found or not (v_active or exists (
      select 1 from public.bookings b where b.mentor_id = p_mentor_id and b.student_id = me
    )) then
      raise exception 'Non autorisé.' using errcode = 'insufficient_privilege';
    end if;
  else
    raise exception 'Dis-nous qui tu bloques.' using errcode = 'check_violation';
  end if;

  if v_other is null then
    raise exception 'Cette personne ne peut pas être bloquée : signale-la plutôt à l''équipe.' using errcode = 'check_violation';
  end if;
  if v_other = me then
    raise exception 'Tu ne peux pas te bloquer toi-même.' using errcode = 'check_violation';
  end if;

  insert into public.mentorat_blocks (blocker_id, blocked_id) values (me, v_other) on conflict do nothing;

  update public.bookings b set status = 'cancelled'
  where b.status in ('pending', 'confirmed')
    and exists (
      select 1 from public.mentors m
      where m.id = b.mentor_id
        and ((b.student_id = me and m.user_id = v_other) or (b.student_id = v_other and m.user_id = me))
    );
end $$;
revoke all on function public.block_user(uuid, uuid) from public, anon;
grant execute on function public.block_user(uuid, uuid) to authenticated;

-- 4. Tes blocages, pour les retrouver dans le Profil : « Prénom N. » (le nom de sa fiche si c'est un mentor).
create function public.my_blocks()
returns table (id uuid, name text, is_mentor boolean, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select
    k.id,
    coalesce(
      nullif(trim(m.first_name), '') || coalesce(' ' || upper(left(nullif(trim(m.last_name), ''), 1)) || '.', ''),
      nullif(trim(p.first_name), '') || coalesce(' ' || upper(left(nullif(trim(p.last_name), ''), 1)) || '.', '')
    ),
    m.id is not null,
    k.created_at
  from public.mentorat_blocks k
  left join public.mentors m on m.user_id = k.blocked_id
  left join public.profiles p on p.id = k.blocked_id
  where k.blocker_id = auth.uid()
  order by k.created_at desc;
$$;
revoke all on function public.my_blocks() from public, anon;
grant execute on function public.my_blocks() to authenticated;

-- 5. Débloquer : seulement tes propres blocages. Les demandes annulées ne reviennent pas.
create function public.unblock_user(p_id uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.mentorat_blocks k where k.id = p_id and k.blocker_id = auth.uid();
$$;
revoke all on function public.unblock_user(uuid) from public, anon;
grant execute on function public.unblock_user(uuid) to authenticated;

-- 6. Les règles qui appliquent le blocage.
--    Fiches mentor : un mentor bloqué (ou qui t'a bloqué) disparaît de ta liste.
drop policy "mentors : visibles par les connectés" on public.mentors;
create policy "mentors : visibles par les connectés, sauf blocage" on public.mentors for select to authenticated
  using (is_active and not public.blocked_with(user_id));

--    Demandes : plus aucune entre deux personnes bloquées (mêmes conditions qu'avant, plus le blocage).
drop policy "rdv : l'étudiant demande" on public.bookings;
create policy "rdv : l'étudiant demande" on public.bookings for insert to authenticated with check (
  auth.uid() = student_id
  and status = 'pending'
  and starts_at > now()
  and exists (
    select 1 from public.mentors m
    where m.id = mentor_id and m.is_active and m.available_this_week and m.user_id is distinct from auth.uid()
      and not public.blocked_with(m.user_id)
  )
);

--    Demandes reçues : le mentor ne voit plus celles d'un étudiant bloqué. Mêmes colonnes qu'avant.
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
    and not public.blocked_with(b.student_id)
  order by b.starts_at;
$$;
