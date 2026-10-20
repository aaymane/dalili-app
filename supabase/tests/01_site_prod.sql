-- Schéma actuel du projet du site (dalili.web, aiyyvgdrtaxvtedcuxnn), relevé le 20/10/2026.
-- = table waitlist (créée depuis le Dashboard) + les 5 migrations appliquées
--   (20260622213151 → 20260925153701). Sert uniquement aux tests locaux.

create function public.set_updated_at() returns trigger language plpgsql as $$
  begin
    new.updated_at = now();
    return new;
  end;
$$;

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null constraint waitlist_email_unique unique,
  source text not null default 'website',
  status text not null default 'pending' check (status in ('pending', 'invited', 'converted', 'unsubscribed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb,
  simulateur_data jsonb
);
create index idx_waitlist_created_at on public.waitlist (created_at desc);
create index idx_waitlist_status on public.waitlist (status);
create index idx_waitlist_email on public.waitlist (lower(email));
create trigger trg_waitlist_updated_at before update on public.waitlist for each row execute function public.set_updated_at();
alter table public.waitlist enable row level security;
create policy waitlist_deny_anon_select on public.waitlist for select to anon using (false);
create policy waitlist_public_insert on public.waitlist for insert to anon, authenticated with check (true);

create view public.waitlist_stats with (security_invoker = on) as
  select count(*) as total,
    count(*) filter (where status = 'pending') as pending,
    count(*) filter (where status = 'invited') as invited,
    count(*) filter (where status = 'converted') as converted,
    count(*) filter (where created_at >= now() - interval '7 days') as last_7_days,
    count(*) filter (where created_at >= now() - interval '30 days') as last_30_days
  from public.waitlist;

create table public.content_chunks (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type = any (array['blog_section','blog_faq','ville_section','ville_faq','universite_section','universite_faq'])),
  slug text not null,
  title text not null,
  url text not null,
  category text,
  cluster text,
  heading text not null,
  content text not null,
  content_hash text not null,
  updated_date date,
  embedding extensions.vector(1024),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index idx_content_chunks_identity on public.content_chunks (slug, source_type, heading);
alter table public.content_chunks enable row level security;

create function public.match_content_chunks(query_embedding extensions.vector(1024), match_count int default 6)
returns table (id uuid, slug text, title text, url text, category text, heading text, content text, similarity float)
language sql stable set search_path = public, extensions as $$
  select id, slug, title, url, category, heading, content, 1 - (embedding <=> query_embedding) as similarity
  from public.content_chunks order by embedding <=> query_embedding limit match_count;
$$;

create table public.assistant_rate_limits (
  ip_hash text primary key,
  window_start timestamptz not null default now(),
  request_count int not null default 1
);
alter table public.assistant_rate_limits enable row level security;

create table public.assistant_queries (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  retrieved_chunk_ids uuid[] not null default '{}',
  top_similarity float,
  fallback_triggered boolean not null default false,
  created_at timestamptz not null default now(),
  retrieval_query text
);
create index idx_assistant_queries_created_at on public.assistant_queries (created_at desc);
alter table public.assistant_queries enable row level security;

-- Données factices pour les tests de lecture.
insert into public.waitlist (email, simulateur_data) values ('secret@example.com', '{"ville":"Paris"}');
insert into public.assistant_queries (question, fallback_triggered) values ('question test', true);
