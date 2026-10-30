-- Candidature mentor (30/10/2026). Décision des fondateurs : un compte est étudiant OU mentor, jamais les deux.
-- On ne devient mentor qu'une fois en France, en envoyant son titre de séjour et son certificat de scolarité ;
-- l'équipe les regarde dans l'admin du site, valide ou refuse (avec un motif), puis les fichiers sont supprimés.
-- Change la règle du 24/10 « aucune copie de preuve » : les documents existent le temps de la vérification, pas plus.

-- 1. Les documents : un bucket PRIVÉ, un dossier par compte. Le candidat dépose, voit et retire les siens ;
--    personne d'autre ne les lit, sauf le serveur du site (clé service) pendant la vérification.
--    L'app envoie des JPEG réencodés (métadonnées et position GPS retirées), 5 Mo au plus.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mentor-documents', 'mentor-documents', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "documents mentor : lecture des siens" on storage.objects for select to authenticated
  using (bucket_id = 'mentor-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "documents mentor : dépôt dans son dossier" on storage.objects for insert to authenticated
  with check (bucket_id = 'mentor-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "documents mentor : retrait des siens" on storage.objects for delete to authenticated
  using (bucket_id = 'mentor-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 2. Quels documents ont été envoyés (un de chaque sorte). Le chemin pointe toujours dans son propre dossier.
create table public.mentor_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('titre_sejour', 'certificat_scolarite')),
  path text not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind),
  constraint mentor_documents_chemin check (path ~ ('^' || user_id::text || '/[a-z0-9_-]{6,40}\.jpg$'))
);
alter table public.mentor_documents enable row level security;
revoke all on public.mentor_documents from anon, authenticated;
grant select, insert, delete on public.mentor_documents to authenticated;
create policy "documents mentor : les siens" on public.mentor_documents for select to authenticated using (auth.uid() = user_id);
create policy "documents mentor : envoyer les siens" on public.mentor_documents for insert to authenticated with check (auth.uid() = user_id);
create policy "documents mentor : retirer les siens" on public.mentor_documents for delete to authenticated using (auth.uid() = user_id);

-- 3. Refus motivé : écrit par le serveur du site seulement, lu par le candidat (règle de lecture déjà en place).
alter table public.mentor_trust add column rejected_at timestamptz;
alter table public.mentor_trust add column rejected_reason text check (char_length(rejected_reason) <= 300);

-- 4. Recandidater efface le refus précédent (même règles que la version du 24/10).
create or replace function public.accept_mentor_charter(p_birth_year int, p_version text)
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
  on conflict (user_id) do update
    set charter_version = excluded.charter_version, charter_accepted_at = now(), rejected_at = null, rejected_reason = null;
end $$;
revoke all on function public.accept_mentor_charter(int, text) from public, anon;
grant execute on function public.accept_mentor_charter(int, text) to authenticated;

-- 5. Une fiche ne part que si : charte en vigueur, vit en France (profil : « en France » ou date d'arrivée passée),
--    et les deux documents envoyés. Les fiches déjà existantes ne sont pas touchées (règle d'insertion seulement).
drop policy "mentors : devenir mentor, charte acceptée" on public.mentors;
create policy "mentors : candidature complète, en France" on public.mentors for insert to authenticated with check (
  auth.uid() = user_id
  and exists (select 1 from public.mentor_trust t where t.user_id = auth.uid() and t.charter_version = public.mentor_charter_version())
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.situation = 'in_france' or p.arrival_date <= current_date)
  )
  and (select count(distinct d.kind) from public.mentor_documents d where d.user_id = auth.uid()) = 2
);
