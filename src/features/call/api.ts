/**
 * Appels vidéo mentor ↔ étudiant avec Daily. L'app ne parle jamais à Daily avec une clé : elle demande au site
 * (`/api/v1/call`) une salle privée et un jeton personnel, que le site ne donne qu'à l'étudiant et au mentor
 * de ce rendez-vous confirmé, de 15 minutes avant à 2 heures après l'heure.
 * Sans Supabase ou sans session (mode démo) : l'écran d'appel reste un aperçu.
 */
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

export type CallInfo = { url: string; token: string; role: 'student' | 'mentor'; otherName: string; topic: string; startsAt: string };

export type CallAccess =
  | ({ kind: 'ready' } & CallInfo)
  /** Étudiant arrivé avant son mentor : c'est le mentor qui ouvre le salon, l'app réessaie toute seule. */
  | { kind: 'waiting' }
  /** Trop tôt : la salle s'ouvre 15 minutes avant. */
  | { kind: 'early'; opensAt: string }
  /** Refus expliqué par le site, en français (terminé, plus confirmé, vidéo pas encore ouverte…). */
  | { kind: 'unavailable'; message?: string }
  | { kind: 'offline' }
  | { kind: 'demo' };

export async function requestCall(bookingId: string): Promise<CallAccess> {
  if (!supabase) return { kind: 'demo' };
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { kind: 'demo' };
  try {
    const res = await fetch(`${env.siteUrl}/api/v1/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ bookingId }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) return { kind: 'ready', ...(json as CallInfo) };
    if (res.status === 425 && json.opensAt) return { kind: 'early', opensAt: json.opensAt };
    if (res.status === 423) return { kind: 'waiting' };
    return { kind: 'unavailable', message: json.error };
  } catch {
    return { kind: 'offline' };
  }
}
