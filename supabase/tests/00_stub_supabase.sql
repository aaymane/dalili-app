-- Imitation minimale de Supabase pour tester les migrations dans un Postgres nu (Docker).
-- Ne JAMAIS appliquer en prod : Supabase fournit déjà tout ça.
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema extensions;
create extension if not exists pgcrypto schema extensions;
create extension if not exists vector schema extensions;
alter database postgres set search_path = "$user", public, extensions;
set search_path = "$user", public, extensions;

create schema auth;
create table auth.users (
  id uuid primary key default extensions.gen_random_uuid(),
  email text,
  email_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Même lecture des claims que Supabase (request.jwt.claims posé par PostgREST).
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;
create function auth.email() returns text language sql stable as $$
  select auth.jwt() ->> 'email'
$$;

grant usage on schema public, extensions, auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
grant select on auth.users to service_role;

-- Privilèges par défaut de Supabase : l'API voit les nouvelles tables, la RLS filtre.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- Storage : seulement ce qu'il faut pour tester les règles d'accès (les limites de taille et de
-- type sont appliquées par l'API Storage, pas par la base).
create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default extensions.gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid default auth.uid(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects to anon, authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;
grant execute on all functions in schema storage to anon, authenticated, service_role;
