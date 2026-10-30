-- Une demande d'appel à la fois par étudiant (30/10/2026). Décision des fondateurs : tant qu'un étudiant a une
-- demande en attente ou un appel accepté pas encore passé, il ne peut pas en faire une autre (même mentor ou autre).
-- Une demande en attente bloque jusqu'à son heure (sans réponse, elle expire) ; un appel accepté, jusqu'à la fin de
-- la salle (2 heures après le début). Refusée ou annulée : l'étudiant peut redemander tout de suite.

create function public.bookings_one_at_a_time()
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
      and ((b.status = 'pending' and b.starts_at > now()) or (b.status = 'confirmed' and b.starts_at > now() - interval '2 hours'))
  ) then
    raise exception 'Tu as déjà une demande d''appel en cours. Attends qu''elle soit passée, ou annule-la, pour en faire une autre.'
      using errcode = 'DLL01';
  end if;
  return new;
end $$;
revoke all on function public.bookings_one_at_a_time() from public, anon, authenticated;
create trigger bookings_one_at_a_time before insert on public.bookings for each row execute function public.bookings_one_at_a_time();
