-- Coffre « Mes documents » (08/11/2026). L'étudiant scanne, photographie ou importe ses papiers (passeport,
-- attestations, bail…) et les range dans des rubriques. Règles :
-- 1. Un bucket PRIVÉ `vault`, un dossier par compte : `<compte>/<nom>.jpg|pdf`. Seul le propriétaire lit, dépose et
--    retire ses fichiers ; personne ne remplace un fichier (pas de règle de mise à jour). Ni les mentors, ni les
--    autres étudiants, ni les visiteurs n'y ont accès. Les photos arrivent réencodées en JPEG par l'app (position
--    GPS, appareil et date retirés) ; les scans de plusieurs pages arrivent en un seul PDF.
-- 2. Une table `vault_documents` : le titre, la rubrique, le chemin. L'app n'écrit que ces champs : le propriétaire,
--    les dates et la taille viennent de la base (la taille est lue dans le stockage, pas déclarée par l'app).
--    Un document n'existe que si son fichier est déjà déposé dans le dossier du compte.
-- 3. Limites par compte : 200 documents et 250 Mo (20 Mo par fichier), pour que le stockage du projet tienne.
-- 4. Storage ne suit pas les suppressions en cascade : c'est le site (clé service) qui vide le dossier à la
--    suppression du compte (`/api/v1/account`). Les lignes partent en cascade avec le compte.

-- ───────────── 1. Les fichiers ─────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vault', 'vault', false, 20971520, array['image/jpeg', 'application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Place restante dans le dossier du compte (fichiers déjà déposés, y compris ceux pas encore rangés).
-- Un peu plus large que la limite des documents : un envoi raté laisse parfois un fichier que l'app retire ensuite.
create function public.vault_has_room()
returns boolean language sql stable security definer set search_path = '' as $$
  select count(*) < 220 and coalesce(sum((o.metadata ->> 'size')::bigint), 0) < 262144000
  from storage.objects o
  where o.bucket_id = 'vault' and o.name like (select auth.uid())::text || '/%';
$$;
revoke all on function public.vault_has_room() from public, anon;
grant execute on function public.vault_has_room() to authenticated;

create policy "coffre : fichiers lus par leur propriétaire" on storage.objects for select to authenticated
  using (bucket_id = 'vault' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "coffre : fichiers déposés dans son dossier, s'il reste de la place" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'vault'
    and name ~ ('^' || (select auth.uid())::text || '/[a-z0-9]{6,32}\.(jpg|pdf)$')
    and public.vault_has_room()
  );
create policy "coffre : fichiers retirés par leur propriétaire" on storage.objects for delete to authenticated
  using (bucket_id = 'vault' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ───────────── 2. Les documents rangés ─────────────
create table public.vault_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- La rubrique : identité et visa, études, logement, argent, santé, travail et stage, autres.
  category text not null check (category in ('identity', 'studies', 'housing', 'money', 'health', 'work', 'other')),
  -- Le document conseillé auquel il répond (« passport », « cvec »…), pour cocher la liste « À préparer ».
  kind text check (kind is null or kind ~ '^[a-z][a-z-]{1,31}$'),
  title text not null check (char_length(title) <= 80 and char_length(trim(title)) >= 1),
  file_path text not null unique,
  file_type text not null check (file_type in ('image/jpeg', 'application/pdf')),
  file_size int not null check (file_size between 1 and 20971520),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vault_documents_chemin check (
    file_path ~ ('^' || user_id::text || '/[a-z0-9]{6,32}\.(jpg|pdf)$')
    and (file_type = 'application/pdf') = (file_path like '%.pdf')
  )
);
comment on table public.vault_documents is 'Coffre « Mes documents » : les papiers de l''étudiant, lus et modifiés par lui seul.';

create index vault_documents_user_idx on public.vault_documents (user_id, created_at desc);

alter table public.vault_documents enable row level security;
revoke all on public.vault_documents from anon, authenticated;
grant select, delete on public.vault_documents to authenticated;
grant insert (category, kind, title, file_path, file_type, file_size) on public.vault_documents to authenticated;
-- On renomme et on change de rubrique ; le fichier, lui, ne change jamais.
grant update (category, kind, title) on public.vault_documents to authenticated;

create policy "coffre : je lis mes documents" on public.vault_documents for select to authenticated
  using (user_id = (select auth.uid()));
create policy "coffre : je range dans mon coffre" on public.vault_documents for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "coffre : je renomme ou déplace mes documents" on public.vault_documents for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "coffre : je retire mes documents" on public.vault_documents for delete to authenticated
  using (user_id = (select auth.uid()));

-- Le fichier doit être déjà déposé ; sa taille vient du stockage ; limites par compte ; dates fixées par la base.
create function public.vault_documents_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_size bigint;
  v_type text;
begin
  select (o.metadata ->> 'size')::bigint, split_part(o.metadata ->> 'mimetype', ';', 1) into v_size, v_type
  from storage.objects o
  where o.bucket_id = 'vault' and o.name = new.file_path;
  if not found then
    raise exception 'Le fichier n''est pas arrivé dans le coffre.' using errcode = 'check_violation';
  end if;
  if v_type is not null and v_type <> '' and v_type <> new.file_type then
    raise exception 'Le type du fichier ne correspond pas.' using errcode = 'check_violation';
  end if;
  if v_size is not null then
    new.file_size := v_size;
  end if;
  -- Deux envois en même temps depuis le même compte passent l'un après l'autre.
  perform pg_advisory_xact_lock(hashtext('vault:' || new.user_id::text));
  if (select count(*) from public.vault_documents d where d.user_id = new.user_id) >= 200 then
    raise exception 'Coffre plein : 200 documents au plus.' using errcode = 'check_violation', hint = 'vault_full';
  end if;
  if (select coalesce(sum(d.file_size), 0) from public.vault_documents d where d.user_id = new.user_id) + new.file_size > 262144000 then
    raise exception 'Coffre plein : 250 Mo au plus.' using errcode = 'check_violation', hint = 'vault_full';
  end if;
  new.created_at := now();
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.vault_documents_guard() from public, anon, authenticated;

create trigger vault_documents_guard before insert on public.vault_documents
  for each row execute function public.vault_documents_guard();
create trigger vault_documents_updated_at before update on public.vault_documents
  for each row execute function public.set_updated_at();
