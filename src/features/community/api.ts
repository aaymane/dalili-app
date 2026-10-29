/**
 * Commentaires d'un post. Seuls les membres du groupe les lisent et en écrivent ; chacun supprime les siens
 * (supabase/migrations/20261029150000_commentaires.sql). L'app n'envoie que le post et le texte.
 * Sans Supabase ou sans session (mode démo) : les commentaires d'exemple, plus les tiens, sur le téléphone.
 */
import { demoPosts } from '@/data/demo';
import { useLocalDb } from '@/data/local-db';
import { displayName, useProfile } from '@/features/profile/store';
import { supabase } from '@/lib/supabase';

export type Comment = {
  id: string;
  postId: string;
  author: string;
  body: string;
  createdAt: string;
  isPostAuthor: boolean;
  mine: boolean;
  /** Envoi en cours (affiché tout de suite), ou raté (à renvoyer). */
  pending?: boolean;
  failed?: boolean;
};

/** Refus expliqué par la base (trop de commentaires d'un coup) : le message s'affiche tel quel. */
export class CommentRefused extends Error {}

async function online() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ? supabase : null;
}

/** Ton nom tel que les autres le voient : « Prénom N. ». */
export function myName() {
  const p = useProfile.getState().profile;
  const last = p.lastName.trim();
  return `${displayName(p)}${last ? ` ${last[0].toUpperCase()}.` : ''}`;
}

const toComment = (r: Record<string, any>): Comment => ({
  id: r.id,
  postId: r.post_id,
  author: r.author_name,
  body: r.body,
  createdAt: r.created_at,
  isPostAuthor: !!r.is_post_author,
  mine: !!r.is_mine,
});

function demoComments(postId: string): Comment[] {
  const post = demoPosts.find((p) => p.id === postId);
  const base = (post?.comments ?? []).map((c, i) => ({
    id: `${postId}-c${i}`,
    postId,
    author: c.author,
    body: c.body,
    createdAt: post?.createdAt ?? new Date().toISOString(),
    isPostAuthor: !!c.isAuthor,
    mine: false,
  }));
  const mine = useLocalDb
    .getState()
    .comments.filter((c) => c.postId === postId)
    .map((c) => ({ ...c, isPostAuthor: false, mine: true }));
  return [...base, ...mine];
}

export async function fetchComments(postId: string): Promise<Comment[]> {
  const db = await online();
  if (!db) return demoComments(postId);
  const { data, error } = await db.from('comments_with_author').select('*').eq('post_id', postId).order('created_at');
  if (error) throw error;
  return (data ?? []).map(toComment);
}

export async function sendComment(postId: string, body: string): Promise<Comment> {
  const db = await online();
  if (!db) {
    const c = { id: `local-${Date.now()}`, postId, author: myName(), body: body.trim(), createdAt: new Date().toISOString() };
    useLocalDb.getState().addComment(c);
    return { ...c, isPostAuthor: false, mine: true };
  }
  const { data, error } = await db.from('comments').insert({ post_id: postId, body }).select('id').single();
  if (error) throw error.code === '23514' && error.message.startsWith('Doucement') ? new CommentRefused(error.message) : error;
  const { data: row, error: readError } = await db.from('comments_with_author').select('*').eq('id', data.id).single();
  if (readError) throw readError;
  return toComment(row);
}

export async function deleteComment(id: string) {
  const db = await online();
  if (!db) return useLocalDb.getState().removeComment(id);
  const { error } = await db.from('comments').delete().eq('id', id);
  if (error) throw error;
}
