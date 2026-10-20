-- Les 7 pays couverts par les guides dalili.study (+ « autre »).
-- Remplace la contrainte de 20261017000000_init.sql (MA, DZ, TN, other).
alter table public.profiles drop constraint if exists profiles_country_check;
alter table public.profiles
  add constraint profiles_country_check check (country in ('MA', 'DZ', 'TN', 'SN', 'CI', 'CM', 'LB', 'other'));
