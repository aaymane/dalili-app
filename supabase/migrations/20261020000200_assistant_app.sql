-- =====================================================================
-- Assistant unique : l'app appelle dalili.study/api/v1/assistant.
-- Quota par compte, suivi des coûts, retours « cette réponse est fausse ».
-- Tout est réservé à la clé service (le serveur du site) : RLS sans policy.
-- =====================================================================

-- 1. Journal : on sait d'où vient la question et ce qu'elle a coûté.
--    Toujours AUCUN identifiant de personne (ni compte, ni IP) : le journal
--    reste anonyme, le quota vit dans une table à part.
alter table public.assistant_queries
  add column if not exists channel text not null default 'site' check (channel in ('site', 'app')),
  add column if not exists lang text,
  add column if not exists country text,
  add column if not exists step_id text,
  add column if not exists model text,
  add column if not exists input_tokens int,
  add column if not exists output_tokens int,
  add column if not exists cost_usd numeric(10, 6),
  add column if not exists requested boolean not null default false;
comment on column public.assistant_queries.requested is 'L''étudiant a touché « On l''ajoute à nos guides » après un refus.';
create index if not exists idx_assistant_queries_refusals on public.assistant_queries (created_at desc) where fallback_triggered;

-- 2. Quota et coûts par compte et par jour (aucun texte de question ici).
create table public.assistant_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'Europe/Paris')::date,
  questions int not null default 0,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd numeric(10, 6) not null default 0,
  primary key (user_id, day)
);
alter table public.assistant_usage enable row level security;

-- Réserve une question si le quota du jour n'est pas atteint (atomique).
create function public.assistant_consume(p_user uuid, p_limit int)
returns table (allowed boolean, used int)
language plpgsql security definer set search_path = '' as $$
declare
  v_used int;
begin
  insert into public.assistant_usage as u (user_id, questions) values (p_user, 1)
  on conflict (user_id, day) do update set questions = u.questions + 1
    where u.questions < p_limit
  returning u.questions into v_used;
  if v_used is null then
    select u.questions into v_used from public.assistant_usage u
      where u.user_id = p_user and u.day = (now() at time zone 'Europe/Paris')::date;
    return query select false, coalesce(v_used, p_limit);
  else
    return query select true, v_used;
  end if;
end $$;

-- Ajoute les jetons et le coût d'une réponse au compteur du jour.
create function public.assistant_record_usage(p_user uuid, p_input int, p_output int, p_cost numeric)
returns void language sql security definer set search_path = '' as $$
  update public.assistant_usage
     set input_tokens = input_tokens + p_input, output_tokens = output_tokens + p_output, cost_usd = cost_usd + p_cost
   where user_id = p_user and day = (now() at time zone 'Europe/Paris')::date;
$$;

revoke execute on function public.assistant_consume(uuid, int), public.assistant_record_usage(uuid, int, int, numeric)
  from public, anon, authenticated;
grant execute on function public.assistant_consume(uuid, int), public.assistant_record_usage(uuid, int, int, numeric)
  to service_role;

-- 3. « Cette réponse est fausse » : relié à la question, jamais à la personne.
create table public.assistant_feedback (
  id uuid primary key default gen_random_uuid(),
  query_id uuid not null references public.assistant_queries (id) on delete cascade,
  reason text not null check (reason in ('faux', 'incomplet', 'pas_clair', 'autre')),
  comment text check (char_length(comment) <= 500),
  channel text not null default 'app' check (channel in ('site', 'app')),
  created_at timestamptz not null default now()
);
alter table public.assistant_feedback enable row level security;
create index assistant_feedback_query_idx on public.assistant_feedback (query_id);

revoke all on public.assistant_usage, public.assistant_feedback from anon, authenticated;
