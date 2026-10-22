-- Photos de profil : un bucket PRIVÉ, un dossier par compte (`<user_id>/<nom>.jpg`).
-- Pour l'instant, seul le propriétaire lit sa photo. Les autres membres la verront
-- plus tard, avec la même règle que `display_name` (groupe commun ou mentor validé).
-- Les fichiers arrivent déjà réduits à 512 px et réencodés en JPEG par l'app, ce qui retire
-- les métadonnées (position GPS, appareil, date).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 1048576, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "avatars : lecture du sien" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars : ajout dans son dossier" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars : remplacement du sien" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars : suppression du sien" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- `avatar_url` garde le CHEMIN dans le bucket, jamais une adresse web : personne ne peut y
-- mettre un lien externe (pixel espion qui révélerait l'adresse IP de ceux qui voient la photo).
alter table public.profiles add constraint profiles_avatar_chemin
  check (avatar_url is null or avatar_url ~ ('^' || id::text || '/[a-z0-9]{6,32}\.jpg$'));
