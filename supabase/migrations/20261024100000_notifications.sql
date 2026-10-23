-- Notifications (24/10/2026).
-- Chaque téléphone donne son jeton Expo ; c'est le serveur du site (clé service) qui envoie, après avoir vérifié
-- en base que l'événement a bien eu lieu. Le journal empêche d'envoyer deux fois la même alerte.

-- 1. Les téléphones. Un jeton appartient au dernier compte connecté sur ce téléphone.
create table public.push_tokens (
  token text primary key check (token like 'ExponentPushToken[%]' or token like 'ExpoPushToken[%]'),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;
revoke all on public.push_tokens from anon, authenticated;
grant select, delete on public.push_tokens to authenticated;
create policy "jetons : voir les siens" on public.push_tokens for select to authenticated using (auth.uid() = user_id);
create policy "jetons : retirer les siens" on public.push_tokens for delete to authenticated using (auth.uid() = user_id);

-- Enregistrer le jeton de ce téléphone pour le compte connecté. Si un autre compte s'était connecté avant sur
-- ce téléphone, le jeton passe au compte actuel : on ne prévient jamais l'ancien compte sur un téléphone qui n'est plus le sien.
create or replace function public.register_push_token(p_token text, p_platform text)
returns void language sql security definer set search_path = '' as $$
  insert into public.push_tokens (token, user_id, platform)
  select p_token, auth.uid(), p_platform
  where auth.uid() is not null
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
$$;
revoke all on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

-- 2. Le journal des alertes envoyées : une demande (ou une fiche mentor) ne déclenche qu'une fois chaque événement.
--    Réservé au serveur : aucune règle, donc rien n'est lisible ni modifiable avec la clé publique.
create table public.notification_events (
  subject_id uuid not null,
  event text not null check (event in ('booking_created', 'booking_confirmed', 'booking_declined', 'booking_cancelled', 'mentor_validated')),
  created_at timestamptz not null default now(),
  primary key (subject_id, event)
);
alter table public.notification_events enable row level security;
revoke all on public.notification_events from anon, authenticated;
