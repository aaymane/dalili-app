-- =====================================================================
-- Durcissement du projet du site (dalili.web) avant d'y accueillir l'app.
-- Voir docs/SUPABASE.md §1. Additive : aucune donnée modifiée.
-- =====================================================================

-- 1. La waitlist n'accepte plus d'insertion publique. Le site insère avec la clé
--    service (supabaseAdmin), qui ignore la RLS. Sans ça, n'importe qui pourrait
--    inscrire l'email d'un autre avec de faux résultats d'outils, ensuite proposés
--    en pré-remplissage à la vraie personne (M5).
drop policy if exists waitlist_public_insert on public.waitlist;

-- 2. TRUNCATE n'est pas filtré par la RLS. Ni l'API ni l'app n'en ont besoin.
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke truncate, trigger, references on tables from anon, authenticated;

-- 3. search_path figé (avertissement de l'advisor « function_search_path_mutable »).
alter function public.set_updated_at() set search_path = '';
