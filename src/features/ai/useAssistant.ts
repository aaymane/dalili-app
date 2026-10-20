import { useRef, useState } from 'react';

import { useLocalDb } from '@/data/local-db';
import { countryOf } from '@/features/journey/steps';
import { useJourney } from '@/features/journey/store';
import { useProfile } from '@/features/profile/store';
import { haptics } from '@/lib/haptics';

import { askAssistant, AssistantError, requestGuide, type AssistantFlag, type HistoryMessage, type SourceRef } from './api';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** pending = la question part (l'Âme réfléchit) · streaming = les mots arrivent. */
  status: 'pending' | 'streaming' | 'done' | 'error';
  sources?: SourceRef[];
  /** Refus : « Je n'ai pas cette information dans nos guides ». */
  fallback?: boolean;
  flags?: AssistantFlag[];
  queryId?: string;
  requested?: boolean;
  errorKind?: AssistantError['kind'];
  /** Question à renvoyer (erreur réseau). */
  retry?: string;
};

/** Historique envoyé au cerveau : uniquement les échanges réussis, en paires question → réponse. */
function historyOf(messages: ChatMessage[]): HistoryMessage[] {
  const out: HistoryMessage[] = [];
  for (let i = 1; i < messages.length; i++) {
    const a = messages[i];
    const q = messages[i - 1];
    if (a.role === 'assistant' && q.role === 'user' && a.status === 'done' && !a.fallback && a.content) {
      out.push({ role: 'user', content: q.content }, { role: 'assistant', content: a.content });
    }
  }
  return out.slice(-6);
}

/** Conversation avec Dalili IA : envoi, streaming, refus, et l'état de l'Âme qui en découle. */
export function useAssistant() {
  const profile = useProfile((s) => s.profile);
  const j = useJourney();
  const setAiHistory = useLocalDb((s) => s.setAiHistory);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const busy = useRef(false);

  const patchLast = (patch: (m: ChatMessage) => ChatMessage) =>
    setMessages((list) => {
      const next = [...list];
      next[next.length - 1] = patch(next[next.length - 1]);
      return next;
    });

  const ask = async (raw: string) => {
    const question = raw.trim().slice(0, 300);
    if (!question || busy.current) return;
    busy.current = true;
    haptics.press();
    const history = historyOf(messages);
    setMessages((list) => [
      ...list,
      { id: `u${Date.now()}`, role: 'user', content: question, status: 'done' },
      { id: `a${Date.now()}`, role: 'assistant', content: '', status: 'pending' },
    ]);

    try {
      await askAssistant({ question, history, context: { country: countryOf(profile), stepId: j.current?.step.id ?? null } }, (e) => {
        switch (e.type) {
          case 'meta':
            patchLast((m) => ({ ...m, queryId: e.queryId }));
            break;
          case 'text':
            patchLast((m) => ({ ...m, status: 'streaming', content: m.content + e.delta }));
            break;
          case 'sources':
            patchLast((m) => ({ ...m, sources: e.sources }));
            break;
          case 'flags':
            patchLast((m) => ({ ...m, flags: e.flags }));
            break;
          case 'fallback':
            patchLast((m) => ({ ...m, fallback: true, content: e.message, sources: e.suggestions, queryId: e.queryId ?? m.queryId }));
            break;
          case 'error':
            patchLast((m) => ({ ...m, status: 'error', errorKind: 'server', content: e.message, retry: question }));
            break;
        }
      });
      patchLast((m) => (m.status === 'error' ? m : { ...m, status: 'done' }));
      haptics.select();
    } catch (err) {
      const e = err instanceof AssistantError ? err : new AssistantError('Dalili ne répond pas pour le moment.', 'server');
      haptics.warning();
      patchLast((m) => ({ ...m, status: 'error', errorKind: e.kind, content: e.message, retry: e.kind === 'offline' || e.kind === 'server' ? question : undefined }));
    } finally {
      busy.current = false;
      setMessages((list) => {
        setAiHistory(list.filter((m) => m.status === 'done').map((m) => ({ role: m.role, content: m.content })));
        return list;
      });
    }
  };

  /** « On l'ajoute à nos guides ». */
  const request = async (id: string) => {
    const m = messages.find((x) => x.id === id);
    if (!m?.queryId) return false;
    const ok = await requestGuide(m.queryId);
    if (ok) setMessages((list) => list.map((x) => (x.id === id ? { ...x, requested: true } : x)));
    return ok;
  };

  const last = messages[messages.length - 1];
  const thinking = last?.status === 'pending';
  const streaming = last?.status === 'streaming';
  return { messages, ask, request, thinking, streaming, busy: thinking || streaming };
}
