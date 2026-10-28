-- Sécurité du mentorat, 2e partie (28/10/2026) : signaler.
-- Un étudiant signale un mentor (sa fiche, ou l'appel qu'ils ont prévu) ; un mentor signale un étudiant (une demande reçue).
-- Seuls les fondateurs lisent les signalements, depuis l'admin du site (clé service). Personne d'autre, ni la personne
-- signalée, ni celle qui signale : l'app n'en a pas besoin, et un signalement ne doit jamais fuiter.

-- 1. Les signalements. Ils survivent à la suppression d'un compte (la personne disparaît, le motif reste) :
--    un mentor qui supprime son compte ne doit pas effacer ce qu'on lui reproche.
create table public.mentorat_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users (id) on delete set null,
  reporter_role text not null check (reporter_role in ('student', 'mentor')),
  reported_id uuid references auth.users (id) on delete set null,
  mentor_id uuid references public.mentors (id) on delete set null,
  booking_id uuid references public.bookings (id) on delete set null,
  reason text not null check (reason in ('harcelement', 'argent', 'donnees', 'faux_profil', 'autre')),
  comment text check (char_length(comment) <= 500),
  status text not null default 'open' check (status in ('open', 'handled', 'dismissed')),
  handled_at timestamptz,
  handled_by text check (char_length(handled_by) between 2 and 40),
  created_at timestamptz not null default now(),
  constraint mentorat_reports_handled_complete
    check ((status = 'open') = (handled_at is null) and (handled_at is null) = (handled_by is null))
);
alter table public.mentorat_reports enable row level security;
revoke all on public.mentorat_reports from anon, authenticated;
-- Aucune règle : seuls report_user() et le serveur du site y touchent.

-- Un seul signalement ouvert par personne qui signale et par personne signalée (la fiche si le mentor n'a pas de compte).
create unique index mentorat_reports_one_open
  on public.mentorat_reports (reporter_id, coalesce(reported_id, mentor_id)) where status = 'open';
create index mentorat_reports_reporter_created on public.mentorat_reports (reporter_id, created_at);
create index mentorat_reports_status_created on public.mentorat_reports (status, created_at desc);

-- 2. Signaler. La base retrouve elle-même qui est signalé, et vérifie le lien :
--    - p_booking_id : une demande entre vous deux (l'étudiant signale le mentor, le mentor signale l'étudiant) ;
--    - p_mentor_id : la fiche d'un mentor validé, ou d'un mentor avec qui tu as une demande.
--    Renvoie 'sent', ou 'already' si ton signalement précédent sur cette personne est encore ouvert.
create function public.report_user(p_reason text, p_comment text default null, p_mentor_id uuid default null, p_booking_id uuid default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  v_role text;
  v_reported uuid;
  v_mentor uuid;
  v_student uuid;
  v_active boolean;
  v_comment text := nullif(trim(p_comment), '');
  n int;
begin
  if me is null then
    raise exception 'Connexion requise.' using errcode = 'insufficient_privilege';
  end if;
  if (select count(*) from public.mentorat_reports r where r.reporter_id = me and r.created_at > now() - interval '1 day') >= 10 then
    raise exception 'Tu as déjà envoyé beaucoup de signalements aujourd''hui. Écris-nous si c''est urgent.' using errcode = 'check_violation';
  end if;

  if p_booking_id is not null then
    select b.student_id, b.mentor_id, m.user_id into v_student, v_mentor, v_reported
    from public.bookings b join public.mentors m on m.id = b.mentor_id
    where b.id = p_booking_id;
    if not found then
      raise exception 'Demande introuvable.' using errcode = 'insufficient_privilege';
    end if;
    if me = v_student then
      v_role := 'student';
    elsif me = v_reported then
      v_role := 'mentor';
      v_reported := v_student;
    else
      raise exception 'Non autorisé.' using errcode = 'insufficient_privilege';
    end if;
  elsif p_mentor_id is not null then
    select m.user_id, m.is_active into v_reported, v_active from public.mentors m where m.id = p_mentor_id;
    if not found or not (v_active or exists (
      select 1 from public.bookings b where b.mentor_id = p_mentor_id and b.student_id = me
    )) then
      raise exception 'Non autorisé.' using errcode = 'insufficient_privilege';
    end if;
    v_role := 'student';
    v_mentor := p_mentor_id;
  else
    raise exception 'Dis-nous qui tu signales.' using errcode = 'check_violation';
  end if;

  if v_reported = me then
    raise exception 'Tu ne peux pas te signaler toi-même.' using errcode = 'check_violation';
  end if;

  insert into public.mentorat_reports (reporter_id, reporter_role, reported_id, mentor_id, booking_id, reason, comment)
  values (me, v_role, v_reported, v_mentor, p_booking_id, p_reason, v_comment)
  on conflict (reporter_id, coalesce(reported_id, mentor_id)) where status = 'open' do nothing;
  get diagnostics n = row_count;
  return case when n = 1 then 'sent' else 'already' end;
end $$;
revoke all on function public.report_user(text, text, uuid, uuid) from public, anon;
grant execute on function public.report_user(text, text, uuid, uuid) to authenticated;
