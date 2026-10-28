/**
 * Signaler une personne du mentorat : un étudiant signale un mentor, un mentor signale un étudiant.
 * La base retrouve elle-même qui est signalé et vérifie le lien (voir
 * supabase/migrations/20261028120000_signalements_mentorat.sql). Seuls les fondateurs lisent les signalements.
 * Sans Supabase ou sans session (mode démo) : rien n'est envoyé.
 */
import { supabase } from '@/lib/supabase';

export type ReportReason = 'harcelement' | 'argent' | 'donnees' | 'faux_profil' | 'autre';

/** Depuis la fiche d'un mentor (`mentorId`), ou depuis une demande entre vous deux (`bookingId`). */
export type ReportTarget = { mentorId: string; bookingId?: undefined } | { bookingId: string; mentorId?: undefined };

/** `already` : ton signalement précédent sur cette personne est encore entre les mains de l'équipe. */
export type ReportResult = 'sent' | 'already' | 'demo';

/** Refus expliqué par la base (trop de signalements aujourd'hui, toi-même…) : le message s'affiche tel quel. */
export class ReportRefused extends Error {}

export async function sendReport(target: ReportTarget, reason: ReportReason, comment: string): Promise<ReportResult> {
  if (!supabase) return 'demo';
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return 'demo';
  const { data, error } = await supabase.rpc('report_user', {
    p_reason: reason,
    p_comment: comment.trim() || null,
    p_mentor_id: target.mentorId ?? null,
    p_booking_id: target.bookingId ?? null,
  });
  if (error) throw error.code === '23514' ? new ReportRefused(error.message) : error;
  return data === 'already' ? 'already' : 'sent';
}
