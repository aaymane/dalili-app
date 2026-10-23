/**
 * Dalili IA — UN seul cerveau : celui du site dalili.study (lib/assistant/answer.ts).
 * L'app n'invente aucune réponse : tout vient des guides, avec les sources citées.
 *
 * - Compte connecté (Supabase configuré) → /api/v1/assistant : session vérifiée côté
 *   serveur, quota par compte, réponse en streaming, contexte pays + étape.
 * - Mode démo (aucune clé) → /api/assistant, le point d'accès public du site, avec les
 *   mêmes limites qu'un visiteur. Même cerveau, mêmes sources.
 */
import { fetch } from 'expo/fetch';

import type { CountryCode } from '@/data/content';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

export type SourceRef = { title: string; url: string; category: string | null; slug?: string };
export type AssistantFlag = 'legal' | 'stress' | 'complex' | 'distress';
/** Action déterministe : le serveur la déduit des guides cités, le modèle n'en invente aucune. */
export type AssistantAction = { type: 'step'; stepId: string; title: string };

export type AssistantEvent =
  | { type: 'meta'; queryId: string; lang: string }
  | { type: 'text'; delta: string }
  | { type: 'sources'; sources: SourceRef[] }
  | { type: 'actions'; actions: AssistantAction[] }
  | { type: 'flags'; flags: AssistantFlag[] }
  | { type: 'fallback'; message: string; suggestions: SourceRef[]; queryId?: string }
  | { type: 'error'; message: string };

export type HistoryMessage = { role: 'user' | 'assistant'; content: string };

export class AssistantError extends Error {
  constructor(
    message: string,
    readonly kind: 'offline' | 'quota' | 'auth' | 'server',
  ) {
    super(message);
  }
}

/** Le slug d'un guide à partir de son URL (`/blog/slug`), pour l'ouvrir dans l'app. */
export const slugOf = (s: SourceRef) => s.slug ?? s.url.match(/\/blog\/([^/?#]+)/)?.[1] ?? null;

async function accessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Pose une question et transmet chaque événement au fil de l'eau.
 * Les erreurs de transport (réseau, quota, session) sont levées en `AssistantError`.
 */
export async function askAssistant(
  input: { question: string; history: HistoryMessage[]; context: { country: CountryCode | null; stepId: string | null } },
  onEvent: (e: AssistantEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = await accessToken();
  if (supabase && !token) throw new AssistantError('Connecte-toi pour discuter avec Dalili.', 'auth');

  const url = token ? `${env.siteUrl}/api/v1/assistant` : `${env.siteUrl}/api/assistant`;
  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(token ? input : { question: input.question, history: input.history }),
      signal,
    });
  } catch {
    if (signal?.aborted) return;
    throw new AssistantError('Pas de réseau. Ta question est gardée : renvoie-la dès que tu as du réseau.', 'offline');
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    const message = body?.error ?? 'Dalili ne répond pas pour le moment. Réessaie dans un instant.';
    throw new AssistantError(message, res.status === 429 ? 'quota' : res.status === 401 ? 'auth' : 'server');
  }
  if (!res.body) throw new AssistantError('Réponse vide. Réessaie dans un instant.', 'server');

  // NDJSON : un objet JSON par ligne, découpé n'importe où par le réseau.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });
    let nl = buffer.indexOf('\n');
    while (nl >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) {
        try {
          onEvent(JSON.parse(line) as AssistantEvent);
        } catch {
          // ligne illisible : ignorée plutôt que de casser la réponse
        }
      }
      nl = buffer.indexOf('\n');
    }
    if (done) break;
  }
  if (buffer.trim()) {
    try {
      onEvent(JSON.parse(buffer) as AssistantEvent);
    } catch {
      // idem
    }
  }
}

export type FeedbackReason = 'faux' | 'incomplet' | 'pas_clair' | 'autre';

/**
 * 👎 « Cette réponse est fausse » : lié à la question journalisée, jamais à la personne.
 * Mode démo (pas de compte) : rien n'est envoyé, on le dit.
 */
export async function sendFeedback(queryId: string, reason: FeedbackReason, comment: string): Promise<'sent' | 'demo' | 'failed'> {
  const token = await accessToken();
  if (!token) return 'demo';
  try {
    const res = await fetch(`${env.siteUrl}/api/v1/assistant/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ queryId, reason, comment: comment.trim() || undefined }),
    });
    return res.ok ? 'sent' : 'failed';
  } catch {
    return 'failed';
  }
}

/** « On l'ajoute à nos guides » : signale la question refusée (déjà anonymisée) à l'équipe. */
export async function requestGuide(queryId: string): Promise<boolean> {
  try {
    const res = await fetch(`${env.siteUrl}/api/v1/assistant/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queryId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
