-- Communauté animée par les mentors (30/10/2026). Décision des fondateurs : seuls les mentors validés créent les
-- groupes et les événements de leur ville ; les étudiants les rejoignent, publient et commentent (règles inchangées).
-- Les groupes et événements déjà créés restent tels quels ; l'équipe (clé service) peut toujours en créer.

drop policy "groupes : création" on public.groups;
create policy "groupes : création par un mentor validé" on public.groups for insert to authenticated with check (
  auth.uid() = created_by
  and exists (select 1 from public.mentors m where m.user_id = auth.uid() and m.is_active)
);

drop policy "événements : création" on public.events;
create policy "événements : création par un mentor validé" on public.events for insert to authenticated with check (
  auth.uid() = created_by
  and exists (select 1 from public.mentors m where m.user_id = auth.uid() and m.is_active)
);
