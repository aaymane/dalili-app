-- Candidature mentor : photo OU PDF (30/10/2026). Le premier document est le titre de séjour ou le visa (VLS-TS),
-- le second le certificat de scolarité ; beaucoup d'étudiants les ont en PDF (téléchargés sur le site de l'école ou
-- de l'ANEF). Le bucket accepte donc aussi le PDF (toujours 5 Mo au plus, toujours privé).

update storage.buckets set allowed_mime_types = array['image/jpeg', 'application/pdf'] where id = 'mentor-documents';

alter table public.mentor_documents drop constraint mentor_documents_chemin;
alter table public.mentor_documents add constraint mentor_documents_chemin
  check (path ~ ('^' || user_id::text || '/[a-z0-9_-]{6,40}\.(jpg|pdf)$'));
