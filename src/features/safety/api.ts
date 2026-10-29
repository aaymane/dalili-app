/**
 * Signaler ou bloquer une personne du mentorat : un étudiant et son mentor, dans un sens ou dans l'autre.
 * La base retrouve elle-même la personne et vérifie le lien (voir supabase/migrations/20261028120000_signalements_mentorat.sql
 * et 20261028150000_blocages_mentorat.sql). Seuls les fondateurs lisent les signalements ; personne ne lit les blocages.
 * Sans Supabase ou sans session (mode démo) : rien n'est envoyé.
 */
import { supabase } from '@/lib/supabase';

export type ReportReason = 'harcelement' | 'argent' | 'donnees' | 'faux_profil' | 'autre';

/** Depuis la fiche d'un mentor (`mentorId`), ou depuis une demande entre vous deux (`bookingId`). Sert aussi à bloquer. */
export type ReportTarget = { mentorId: string; bookingId?: undefined } | { bookingId: string; mentorId?: undefined };

/** `already` : ton signalement précédent sur cette personne est encore entre les mains de l'équipe. */
export type ReportResult = 'sent' | 'already' | 'demo';

/** Refus de la base (trop de signalements aujourd'hui, personne qu'on ne peut pas bloquer…) : l'écran l'explique dans la langue en cours. */
export class SafetyRefused extends Error {
  constructor(readonly kind: 'tooMany' | 'cantBlock' | 'other') {
    super(kind);
  }
}

// La base répond en français : on reconnaît le motif à son début.
const refusedKind = (message: string) => (message.startsWith('Tu as déjà envoyé beaucoup') ? 'tooMany' : message.startsWith('Cette personne ne peut pas') ? 'cantBlock' : 'other');

const refused = (error: { code?: string; message: string }) => (error.code === '23514' ? new SafetyRefused(refusedKind(error.message)) : error);

async function online() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ? supabase : null;
}

export async function sendReport(target: ReportTarget, reason: ReportReason, comment: string): Promise<ReportResult> {
  const db = await online();
  if (!db) return 'demo';
  const { data, error } = await db.rpc('report_user', {
    p_reason: reason,
    p_comment: comment.trim() || null,
    p_mentor_id: target.mentorId ?? null,
    p_booking_id: target.bookingId ?? null,
  });
  if (error) throw refused(error);
  return data === 'already' ? 'already' : 'sent';
}

/** Bloquer : vous ne vous voyez plus, plus aucune demande ne passe, celles en cours sont annulées. */
export async function blockUser(target: ReportTarget): Promise<'blocked' | 'demo'> {
  const db = await online();
  if (!db) return 'demo';
  const { error } = await db.rpc('block_user', { p_mentor_id: target.mentorId ?? null, p_booking_id: target.bookingId ?? null });
  if (error) throw refused(error);
  return 'blocked';
}

/** « Prénom N. » de la personne, ou null si elle n'a pas de prénom. */
export type Block = { id: string; name: string | null; isMentor: boolean; createdAt: string };

export async function fetchMyBlocks(): Promise<Block[]> {
  const db = await online();
  if (!db) return [];
  const { data, error } = await db.rpc('my_blocks');
  if (error) throw error;
  return (data ?? []).map((b: Record<string, any>) => ({ id: b.id, name: b.name, isMentor: !!b.is_mentor, createdAt: b.created_at }));
}

export async function unblockUser(id: string) {
  const db = await online();
  if (!db) return;
  const { error } = await db.rpc('unblock_user', { p_id: id });
  if (error) throw error;
}
