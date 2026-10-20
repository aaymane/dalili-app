-- =====================================================================
-- Durcissement du schéma de l'app (20261017000000_init.sql), avant sa
-- première application sur dalili.web.
-- =====================================================================

-- 1. Fonctions security definer : search_path vide (tout est déjà qualifié public.*).
alter function public.handle_new_user() set search_path = '';
alter function public.display_name(uuid) set search_path = '';
alter function public.is_member(uuid) set search_path = '';
alter function public.bump_count() set search_path = '';

-- 2. Mentors : un compte ne peut pas se donner une note, des séances ou des avis,
--    ni s'afficher tout seul. Une nouvelle fiche attend la validation de l'équipe.
alter table public.mentors alter column is_active set default false;
revoke insert, update on public.mentors from anon, authenticated;
grant insert (user_id, first_name, last_name, headline, study, city, origin, quote, specialties, languages, journey, available_this_week, avatar_color, response_hours)
  on public.mentors to authenticated;
grant update (first_name, last_name, headline, study, city, origin, quote, specialties, languages, journey, available_this_week, avatar_color, response_hours)
  on public.mentors to authenticated;
create policy "mentors : le mentor voit sa fiche" on public.mentors for select to authenticated using (auth.uid() = user_id);

-- 3. Compteurs tenus par les triggers : non modifiables à la main.
revoke insert, update on public.groups from anon, authenticated;
grant insert (name, city, description, tags, privacy, cover_from, cover_to, emoji, created_by) on public.groups to authenticated;
grant update (name, description, tags, privacy, cover_from, cover_to, emoji) on public.groups to authenticated;

revoke insert, update on public.events from anon, authenticated;
grant insert (group_id, title, city, place, address, starts_at, description, capacity, price, link, privacy, needs_approval, cover_from, cover_to, emoji, created_by)
  on public.events to authenticated;
grant update (title, place, address, starts_at, description, capacity, price, link, privacy, needs_approval, cover_from, cover_to, emoji)
  on public.events to authenticated;

-- 4. Réservations : on ne change pas de mentor ni d'étudiant après coup.
revoke update on public.bookings from anon, authenticated;
grant update (status, starts_at, topic) on public.bookings to authenticated;

-- 5. Aucune table de l'app n'est accessible sans compte.
revoke all on public.profiles, public.step_progress, public.custom_steps, public.mentors, public.bookings,
  public.groups, public.group_members, public.posts, public.post_likes, public.comments,
  public.events, public.event_attendees, public.ai_messages, public.posts_with_author
  from anon;
