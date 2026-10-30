-- Fin d'appel (30/10/2026). Décision des fondateurs : un appel dure 30 minutes ; le salon ferme 45 minutes après
-- l'heure (15 minutes de marge), ou tout de suite quand le mentor termine l'appel (le site passe alors le
-- rendez-vous en « done » avec la clé service). Dès que l'appel est fini, l'étudiant peut le noter et redemander.
-- Avant : un appel accepté bloquait une nouvelle demande pendant 2 heures.

create or replace function public.bookings_one_at_a_time()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Le serveur du site (clé service) et les scripts de l'équipe ne passent pas par cette règle.
  if auth.uid() is null then
    return new;
  end if;
  -- Deux demandes envoyées au même instant : la seconde attend la première, puis voit qu'elle existe.
  perform pg_advisory_xact_lock(hashtext('bookings_one_at_a_time:' || new.student_id::text));
  if exists (
    select 1 from public.bookings b
    where b.student_id = new.student_id
      and ((b.status = 'pending' and b.starts_at > now()) or (b.status = 'confirmed' and b.starts_at > now() - interval '45 minutes'))
  ) then
    raise exception 'Tu as déjà une demande d''appel en cours. Attends qu''elle soit passée, ou annule-la, pour en faire une autre.'
      using errcode = 'DLL01';
  end if;
  return new;
end $$;
revoke all on function public.bookings_one_at_a_time() from public, anon, authenticated;
