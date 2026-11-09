-- Le visage des étudiants qui laissent un avis (09/11/2026) : sur la fiche du mentor et sur ses cartes dans
-- l'espace étudiant, un avis montre la photo de son auteur, comme son prénom. La feuille d'avis le dit avant l'envoi.
-- Seuls les avis publiés comptent (avec un texte, sur un mentor validé) : une note sans texte reste anonyme.
-- Les deux avis existants (30/10 et 09/11) viennent des comptes de test de l'équipe.

-- 1. Qui peut voir qui : la règle du 09/11 (photos_visibles), plus l'auteur d'un avis publié.
create or replace function public.can_see_person(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and uid is not null and (
    uid = auth.uid()
    or (
      not public.blocked_with(uid)
      and (
        exists (
          select 1 from public.group_members mine
          join public.group_members theirs on theirs.group_id = mine.group_id
          where mine.user_id = auth.uid() and theirs.user_id = uid
        )
        or exists (select 1 from public.mentors m where m.user_id = uid and m.is_active)
        or exists (
          select 1 from public.bookings b join public.mentors m on m.id = b.mentor_id
          where (b.student_id = auth.uid() and m.user_id = uid) or (b.student_id = uid and m.user_id = auth.uid())
        )
        or exists (
          select 1 from public.mentor_reviews r join public.mentors m on m.id = r.mentor_id and m.is_active
          where r.student_id = uid and nullif(trim(r.comment), '') is not null
        )
      )
    )
  );
$$;
revoke all on function public.can_see_person(uuid) from public, anon, authenticated;

-- 2. La fiche du mentor garde les 5 derniers avis publiés, chacun avec son identifiant d'avis (jamais celui de
--    l'étudiant) : l'app retrouve ainsi la photo de l'auteur. Une seule écriture, pour le déclencheur et le rattrapage.
create function public.mentor_reviews_card(p_mentor uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((
    select jsonb_agg(jsonb_build_object('id', x.id, 'author', x.author, 'text', x.comment, 'rating', x.rating) order by x.created_at desc)
    from (
      select r.id, coalesce(nullif(trim(p.first_name), ''), 'Étudiant·e') as author, r.comment, r.rating, r.created_at
      from public.mentor_reviews r left join public.profiles p on p.id = r.student_id
      where r.mentor_id = p_mentor and nullif(trim(r.comment), '') is not null
      order by r.created_at desc limit 5
    ) x
  ), '[]'::jsonb);
$$;
revoke all on function public.mentor_reviews_card(uuid) from public, anon, authenticated;

create or replace function public.mentor_reviews_publish()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.mentors m set
    rating = coalesce((select round(avg(r.rating)::numeric, 1) from public.mentor_reviews r where r.mentor_id = new.mentor_id), m.rating),
    sessions_count = greatest(m.sessions_count, (select count(*) from public.mentor_reviews r where r.mentor_id = new.mentor_id)),
    reviews = public.mentor_reviews_card(new.mentor_id)
  where m.id = new.mentor_id;
  return new;
end $$;
revoke all on function public.mentor_reviews_publish() from public, anon, authenticated;

-- Rattrapage : les fiches qui ont déjà des avis reçoivent les identifiants (le texte, la note et le prénom ne changent pas).
update public.mentors m set reviews = public.mentor_reviews_card(m.id)
where exists (select 1 from public.mentor_reviews r where r.mentor_id = m.id);

-- 3. Les photos des auteurs, à partir des identifiants d'avis de la fiche. Seulement les avis publiés,
--    jamais après un blocage (la règle du point 1 décide, à travers `avatar_of`).
create function public.review_avatars(p_reviews uuid[])
returns table (review_id uuid, avatar_path text) language sql stable security definer set search_path = '' as $$
  select r.id, public.avatar_of(r.student_id)
  from public.mentor_reviews r
  join public.mentors m on m.id = r.mentor_id and m.is_active
  where r.id = any (p_reviews[1:100])
    and nullif(trim(r.comment), '') is not null
    and public.avatar_of(r.student_id) is not null;
$$;
revoke all on function public.review_avatars(uuid[]) from public, anon;
grant execute on function public.review_avatars(uuid[]) to authenticated;
