-- Écoles partenaires (29/10/2026).
-- Une école partenaire a sa fiche dans Explorer ; un étudiant dit « Je suis intéressé·e ».
-- Choix du 29/10 : la demande reste chez DALILI (les fondateurs la voient dans l'admin et recontactent l'étudiant) ;
-- rien n'est transmis à l'école. Une fiche n'est visible qu'une fois publiée (après l'accord écrit de l'école
-- pour ses photos et son logo).

-- 1. Les écoles. Écrites seulement par le serveur du site (clé service) ; lues par les comptes connectés, si publiées.
create table public.partner_schools (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  name text not null,
  city text not null,
  tagline text,
  description text,
  address text,
  transport text[] not null default '{}',
  website text check (website ~ '^https://'),
  logo_url text check (logo_url ~ '^https://'),
  cover_url text check (cover_url ~ '^https://'),
  photos text[] not null default '{}',
  -- [{ "name": "Bachelor UI & Web design", "level": "Bac+3", "format": "Alternance dès la 2e année" }]
  programs jsonb not null default '[]',
  -- [{ "value": "92,4 %", "label": "choisissent l'alternance" }]
  facts jsonb not null default '[]',
  source_checked_on date,
  is_published boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.partner_schools enable row level security;
revoke all on public.partner_schools from anon, authenticated;
grant select on public.partner_schools to authenticated;
create policy "écoles : les fiches publiées, pour les connectés" on public.partner_schools for select to authenticated using (is_published);

-- 2. « Je suis intéressé·e ». Une demande par étudiant et par école. L'étudiant la voit et peut la retirer ;
--    il n'écrit que l'école, la formation et un mot. Le reste (qui, quand, suivi) vient de la base.
create table public.school_leads (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.partner_schools (id) on delete cascade,
  student_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  program text check (char_length(program) <= 120),
  message text check (char_length(message) <= 500),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  handled_by text check (char_length(handled_by) between 2 and 40),
  created_at timestamptz not null default now(),
  unique (school_id, student_id)
);
alter table public.school_leads enable row level security;
revoke all on public.school_leads from anon, authenticated;
grant select (id, school_id, program, message, created_at) on public.school_leads to authenticated;
grant insert (school_id, program, message) on public.school_leads to authenticated;
grant delete on public.school_leads to authenticated;
create policy "intérêts : l'étudiant voit les siens" on public.school_leads for select to authenticated using (auth.uid() = student_id);
create policy "intérêts : l'étudiant se manifeste pour une école publiée" on public.school_leads for insert to authenticated with check (
  auth.uid() = student_id
  and exists (select 1 from public.partner_schools s where s.id = school_id and s.is_published)
);
create policy "intérêts : l'étudiant retire le sien" on public.school_leads for delete to authenticated using (auth.uid() = student_id);
create index school_leads_status_created on public.school_leads (status, created_at desc);

-- 3. Texte nettoyé (vide = pas de mot).
create function public.school_leads_before_insert()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.program := nullif(trim(new.program), '');
  new.message := nullif(trim(new.message), '');
  return new;
end $$;
revoke all on function public.school_leads_before_insert() from public, anon, authenticated;
create trigger school_leads_before_insert before insert on public.school_leads for each row execute function public.school_leads_before_insert();

-- 4. Première école : Digital Campus Nantes, d'après son site officiel (relevé le 29/10/2026), NON publiée :
--    on la publie (is_published = true) une fois l'accord écrit de l'école reçu, avec ses photos dans notre stockage.
insert into public.partner_schools (slug, name, city, tagline, description, address, transport, website, programs, facts, source_checked_on, sort)
values (
  'digital-campus-nantes',
  'Digital Campus Nantes',
  'Nantes',
  'L’école du digital, de la communication et du design',
  'Un campus à taille humaine de 2 200 m² sur 6 niveaux, dans le quartier universitaire de Nantes. Des Bachelors et des Mastères certifiés RNCP, en alternance dès la 2e année de Bachelor.',
  'Central Green, 5-7 route de la Jonelière, bâtiment I, 44300 Nantes',
  array['Tram 2 · arrêt « Facultés »', 'Bus 75 · arrêt « Facultés »', 'Bus 80, E5 et C20 · arrêt « Fac de lettres »', 'Vélos : local sur le campus et station Bicloo « Facultés »'],
  'https://www.digital-campus.fr/ecole/nantes',
  '[
    {"name": "Bachelor digital (1re année)", "level": "Bac+1", "format": "Initial"},
    {"name": "Bachelor Chef de projet digital", "level": "Bac+3", "format": "Alternance dès la 2e année"},
    {"name": "Bachelor UI & Web design", "level": "Bac+3", "format": "Alternance dès la 2e année"},
    {"name": "Mastère Brand Content", "level": "Bac+5", "format": "Alternance"},
    {"name": "Mastère Direction Artistique Digitale", "level": "Bac+5", "format": "Alternance"},
    {"name": "Mastère Lead Product Design", "level": "Bac+5", "format": "Alternance"}
  ]'::jsonb,
  '[
    {"value": "92,4 %", "label": "des étudiants choisissent l’alternance"},
    {"value": "82 %", "label": "de placement"},
    {"value": "1 080", "label": "entreprises ont engagé un de leurs apprentis en 2023"}
  ]'::jsonb,
  '2026-10-29',
  1
);
