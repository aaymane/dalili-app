-- Sécurité du mentorat, 1re partie (24/10/2026) : charte acceptée, mentors majeurs, vérifiés par l'équipe.
-- Ces informations vivent à part, dans `mentor_trust` : la fiche `mentors` est lisible par tous les connectés,
-- l'année de naissance et la vérification ne doivent pas y apparaître.

-- 1. La charte en vigueur. Son texte est dans l'app (src/features/mentors/charter.ts). Le changer = une nouvelle
--    migration qui remplace cette fonction par une nouvelle version ; chaque mentor la réaccepte.
create function public.mentor_charter_version() returns text
language sql immutable set search_path = '' as $$ select '2026-10-24' $$;

-- 2. Charte, âge et vérification. Le mentor lit sa ligne, et n'écrit que par accept_mentor_charter().
--    La vérification n'est écrite que par le serveur du site (clé service) : la preuve vue, la date, qui l'a vue.
--    Aucune copie de la preuve n'est jamais stockée.
create table public.mentor_trust (
  user_id uuid primary key references auth.users (id) on delete cascade,
  birth_year smallint not null check (birth_year between 1930 and 2100),
  charter_version text not null,
  charter_accepted_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_proof text check (verified_proof in ('carte_etudiante', 'linkedin', 'titre_sejour')),
  verified_by text check (char_length(verified_by) between 2 and 40),
  constraint mentor_trust_verification_complete
    check ((verified_at is null) = (verified_proof is null) and (verified_at is null) = (verified_by is null))
);
alter table public.mentor_trust enable row level security;
revoke all on public.mentor_trust from anon, authenticated;
grant select on public.mentor_trust to authenticated;
create policy "confiance : le mentor voit la sienne" on public.mentor_trust for select to authenticated using (auth.uid() = user_id);

-- 3. Accepter la charte : 18 ans au moins, déclarés. On ne demande que l'année de naissance (moins de données).
--    Né l'année « en cours − 18 » passe : la case « J'ai 18 ans ou plus » couvre ces quelques mois.
--    L'année n'est notée qu'une fois : réaccepter une nouvelle version de la charte ne la change pas.
create function public.accept_mentor_charter(p_birth_year int, p_version text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Connexion requise.' using errcode = 'insufficient_privilege';
  end if;
  if p_version is distinct from public.mentor_charter_version() then
    raise exception 'Cette charte n''est plus à jour : mets l''app à jour.' using errcode = 'check_violation';
  end if;
  if p_birth_year is null or p_birth_year < 1930 or p_birth_year > extract(year from now())::int - 18 then
    raise exception 'Il faut avoir 18 ans ou plus pour être mentor.' using errcode = 'check_violation';
  end if;
  insert into public.mentor_trust (user_id, birth_year, charter_version)
  values (auth.uid(), p_birth_year, p_version)
  on conflict (user_id) do update set charter_version = excluded.charter_version, charter_accepted_at = now();
end $$;
revoke all on function public.accept_mentor_charter(int, text) from public, anon;
grant execute on function public.accept_mentor_charter(int, text) to authenticated;

-- 4. Pas de fiche sans la charte en vigueur acceptée.
drop policy "mentors : devenir mentor" on public.mentors;
create policy "mentors : devenir mentor, charte acceptée" on public.mentors for insert to authenticated with check (
  auth.uid() = user_id
  and exists (select 1 from public.mentor_trust t where t.user_id = auth.uid() and t.charter_version = public.mentor_charter_version())
);

-- 5. Pas de mise en ligne sans vérification : une fiche ne passe « validée » que si l'équipe a vu une preuve.
--    La règle vaut aussi pour la clé service : c'est la base qui la tient, pas seulement la page admin.
--    Les fiches déjà validées avant cette migration restent en ligne ; l'admin les montre « à vérifier ».
create function public.mentors_require_verification()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.mentor_trust t where t.user_id = new.user_id and t.verified_at is not null) then
    raise exception 'Vérifie d''abord le mentor (preuve vue) avant de valider sa fiche.' using errcode = 'check_violation';
  end if;
  return new;
end $$;
revoke all on function public.mentors_require_verification() from public, anon, authenticated;
create trigger mentors_require_verification before update of is_active on public.mentors
  for each row when (new.is_active and not old.is_active) execute function public.mentors_require_verification();
