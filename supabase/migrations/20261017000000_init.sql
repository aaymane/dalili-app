-- =====================================================================
-- DALILI — schéma initial
-- Toutes les tables ont la Row Level Security (RLS) activée.
-- Règle d'or : un utilisateur ne lit/écrit QUE ce qui le concerne.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- PROFILS ----------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  gender text check (gender in ('male', 'female', 'other')),
  country text check (country in ('MA', 'DZ', 'TN', 'other')),
  origin_city text,
  birth_date date,
  avatar_url text,
  situation text check (situation in ('abroad', 'in_france')),
  study_level text check (study_level in ('bac', 'licence', 'master', 'doctorat')),
  campus_status text check (campus_status in ('not_started', 'in_progress', 'accepted', 'enrolled')),
  destination_city text,
  arrival_date date,
  housing text check (housing in ('none', 'searching', 'found')),
  concerns text[] not null default '{}',
  roles text[] not null default '{student}',
  active_role text not null default 'student' check (active_role in ('student', 'mentor', 'host')),
  mentor_city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profil : lecture du sien" on public.profiles for select using (auth.uid() = id);
create policy "profil : création du sien" on public.profiles for insert with check (auth.uid() = id);
create policy "profil : mise à jour du sien" on public.profiles for update using (auth.uid() = id);

-- Crée automatiquement un profil vide à l'inscription.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nom public minimal (pour afficher les auteurs de posts sans exposer le profil complet).
create or replace function public.display_name(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(first_name || ' ' || last_name), ''), 'Membre DALILI') from public.profiles where id = uid;
$$;

-- ---------- PARCOURS-QUÊTE --------------------------------------------
create table public.step_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  step_id text not null,
  done boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, step_id)
);
alter table public.step_progress enable row level security;
create policy "étapes : tout sur les siennes" on public.step_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.custom_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title text not null check (char_length(title) between 1 and 120),
  due_date date not null,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, title, due_date)
);
alter table public.custom_steps enable row level security;
create policy "tâches perso : tout sur les siennes" on public.custom_steps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- MENTORS & RÉSERVATIONS ------------------------------------
create table public.mentors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  first_name text not null,
  last_name text not null,
  headline text,
  study text,
  city text not null,
  origin text,
  rating numeric(2, 1) not null default 5.0,
  sessions_count int not null default 0,
  response_hours int not null default 24,
  quote text,
  specialties text[] not null default '{}',
  languages text[] not null default '{fr}',
  journey jsonb not null default '[]',
  reviews jsonb not null default '[]',
  available_this_week boolean not null default true,
  avatar_color text default '#3D78FF',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.mentors enable row level security;
create policy "mentors : visibles par les connectés" on public.mentors for select to authenticated using (is_active);
create policy "mentors : le mentor gère sa fiche" on public.mentors for update using (auth.uid() = user_id);
create policy "mentors : devenir mentor" on public.mentors for insert with check (auth.uid() = user_id);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  mentor_id uuid not null references public.mentors (id) on delete cascade,
  starts_at timestamptz not null,
  topic text not null default 'Question générale',
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'cancelled', 'done')),
  created_at timestamptz not null default now()
);
alter table public.bookings enable row level security;
create policy "rdv : l'étudiant voit les siens" on public.bookings for select using (auth.uid() = student_id);
create policy "rdv : le mentor voit les siens" on public.bookings for select using (exists (select 1 from public.mentors m where m.id = mentor_id and m.user_id = auth.uid()));
create policy "rdv : l'étudiant réserve" on public.bookings for insert with check (auth.uid() = student_id);
create policy "rdv : l'étudiant annule" on public.bookings for update using (auth.uid() = student_id);
create policy "rdv : le mentor répond" on public.bookings for update using (exists (select 1 from public.mentors m where m.id = mentor_id and m.user_id = auth.uid()));
create index bookings_mentor_idx on public.bookings (mentor_id, starts_at);

-- ---------- COMMUNAUTÉ --------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  city text not null,
  description text not null default '',
  tags text[] not null default '{}',
  privacy text not null default 'public' check (privacy in ('public', 'private')),
  cover_from text default '#3D78FF',
  cover_to text default '#1F2850',
  emoji text default '👋',
  members_count int not null default 0,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.groups enable row level security;
create policy "groupes : visibles par les connectés" on public.groups for select to authenticated using (true);
create policy "groupes : création" on public.groups for insert to authenticated with check (auth.uid() = created_by);
create policy "groupes : le créateur modifie" on public.groups for update using (auth.uid() = created_by);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
alter table public.group_members enable row level security;
create policy "membres : visibles par les connectés" on public.group_members for select to authenticated using (true);
create policy "membres : rejoindre" on public.group_members for insert with check (auth.uid() = user_id);
create policy "membres : quitter" on public.group_members for delete using (auth.uid() = user_id);

create or replace function public.is_member(gid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.group_members where group_id = gid and user_id = auth.uid());
$$;

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
alter table public.posts enable row level security;
-- « Contenu réservé aux membres »
create policy "posts : lisibles par les membres" on public.posts for select using (public.is_member(group_id));
create policy "posts : publier si membre" on public.posts for insert with check (auth.uid() = author_id and public.is_member(group_id));
create policy "posts : l'auteur supprime" on public.posts for delete using (auth.uid() = author_id);

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  primary key (post_id, user_id)
);
alter table public.post_likes enable row level security;
create policy "likes : lecture" on public.post_likes for select to authenticated using (true);
create policy "likes : aimer" on public.post_likes for insert with check (auth.uid() = user_id);
create policy "likes : retirer" on public.post_likes for delete using (auth.uid() = user_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
alter table public.comments enable row level security;
create policy "commentaires : lisibles par les membres" on public.comments for select using (exists (select 1 from public.posts p where p.id = post_id and public.is_member(p.group_id)));
create policy "commentaires : écrire si membre" on public.comments for insert with check (auth.uid() = author_id and exists (select 1 from public.posts p where p.id = post_id and public.is_member(p.group_id)));

-- Vue pratique pour le fil d'actualité (respecte la RLS de l'appelant).
create view public.posts_with_author with (security_invoker = true) as
select
  p.id,
  p.group_id,
  p.body,
  p.created_at,
  public.display_name(p.author_id) as author_name,
  '#3D78FF' as author_color,
  (select count(*) from public.post_likes l where l.post_id = p.id)::int as likes_count,
  coalesce((
    select json_agg(json_build_object('author', public.display_name(c.author_id), 'body', c.body, 'isAuthor', c.author_id = p.author_id) order by c.created_at)
    from public.comments c where c.post_id = p.id
  ), '[]'::json) as comments
from public.posts p;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups (id) on delete set null,
  title text not null check (char_length(title) between 2 and 100),
  city text not null,
  place text,
  address text,
  starts_at timestamptz not null,
  description text not null default '',
  capacity int not null default 30 check (capacity > 0),
  price text not null default 'free' check (price in ('free', 'paid')),
  link text,
  privacy text not null default 'public' check (privacy in ('public', 'private')),
  needs_approval boolean not null default false,
  cover_from text default '#7A5AF8',
  cover_to text default '#1F2850',
  emoji text default '🎉',
  attendees_count int not null default 0,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.events enable row level security;
create policy "événements : visibles par les connectés" on public.events for select to authenticated using (privacy = 'public' or (group_id is not null and public.is_member(group_id)) or created_by = auth.uid());
create policy "événements : création" on public.events for insert to authenticated with check (auth.uid() = created_by);
create policy "événements : le créateur modifie" on public.events for update using (auth.uid() = created_by);
create index events_city_date_idx on public.events (city, starts_at);

create table public.event_attendees (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table public.event_attendees enable row level security;
create policy "participants : lecture" on public.event_attendees for select to authenticated using (true);
create policy "participants : s'inscrire" on public.event_attendees for insert with check (auth.uid() = user_id);
create policy "participants : se désinscrire" on public.event_attendees for delete using (auth.uid() = user_id);

-- Compteurs maintenus automatiquement.
create or replace function public.bump_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'group_members' then
    update public.groups set members_count = members_count + (case when tg_op = 'INSERT' then 1 else -1 end)
      where id = coalesce(new.group_id, old.group_id);
  elsif tg_table_name = 'event_attendees' then
    update public.events set attendees_count = attendees_count + (case when tg_op = 'INSERT' then 1 else -1 end)
      where id = coalesce(new.event_id, old.event_id);
  end if;
  return null;
end $$;
create trigger group_members_count after insert or delete on public.group_members for each row execute function public.bump_count();
create trigger event_attendees_count after insert or delete on public.event_attendees for each row execute function public.bump_count();

-- ---------- DALILI IA --------------------------------------------------
create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.ai_messages enable row level security;
create policy "ia : historique personnel" on public.ai_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index ai_messages_user_idx on public.ai_messages (user_id, created_at desc);
