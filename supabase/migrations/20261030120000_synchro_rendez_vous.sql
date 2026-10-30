-- Synchronisation complète et « Mes rendez-vous » (30/10/2026).
-- Aucune table nouvelle : profiles, step_progress, custom_steps et bookings ont déjà leur RLS
-- (chacun ne lit et n'écrit que ses lignes ; l'étudiant ne lit que ses rendez-vous, le mentor les siens).
-- step_progress (clé primaire user_id, step_id) et custom_steps (unique user_id, title, due_date) sont déjà indexées par compte.
-- Il manquait l'index de la liste « Mes rendez-vous » : les rendez-vous d'un étudiant, triés par date.

create index if not exists bookings_student_idx on public.bookings (student_id, starts_at);
