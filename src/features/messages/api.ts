/**
 * Messagerie mentor ↔ étudiant. Une conversation s'ouvre quand le mentor accepte une demande d'appel ;
 * seuls les deux participants la lisent (supabase/migrations/20261029100000_messagerie.sql).
 * Sans Supabase ou sans session (mode démo) : une conversation d'exemple par rôle, sur le téléphone (`local.ts`).
 */
import { supabase } from '@/lib/supabase';

import { DEMO_CONVERSATIONS, useLocalMessages } from './local';

export type Conversation = {
  id: string;
  /** Ton rôle dans cette conversation. */
  asRole: 'student' | 'mentor';
  mentorId: string;
  /** La dernière demande d'appel entre vous : pour signaler ou bloquer depuis la conversation. */
  bookingId: string | null;
  /** Le nom de sa fiche pour un mentor, « Prénom N. » pour un étudiant ; null si pas encore de prénom. */
  otherName: string | null;
  /** Faux quand la fiche du mentor est suspendue : la conversation reste lisible. */
  canWrite: boolean;
  lastBody: string | null;
  lastFromMe: boolean;
  lastMessageAt: string | null;
  unread: number;
};

export type Message = {
  id: string;
  conversationId: string;
  mine: boolean;
  body: string;
  createdAt: string;
  /** Envoi en cours (affiché tout de suite), ou raté (à renvoyer). */
  pending?: boolean;
  failed?: boolean;
};

/** Refus de la base (trop de messages d'un coup) : l'écran l'explique dans la langue en cours. */
export class MessageRefused extends Error {}

async function me() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

const toMessage = (r: Record<string, any>, uid: string): Message => ({
  id: r.id,
  conversationId: r.conversation_id,
  mine: r.sender_id === uid,
  body: r.body,
  createdAt: r.created_at,
});

function demoConversations(): Conversation[] {
  const { messages, read } = useLocalMessages.getState();
  return (['student', 'mentor'] as const).map((role) => {
    const c = DEMO_CONVERSATIONS[role];
    const list = messages[c.id] ?? [];
    const last = list[list.length - 1];
    const seen = read[c.id] ?? '';
    return {
      id: c.id,
      asRole: role,
      mentorId: c.mentorId,
      bookingId: null,
      otherName: c.otherName,
      canWrite: true,
      lastBody: last?.body ?? null,
      lastFromMe: !!last?.mine,
      lastMessageAt: last?.createdAt ?? null,
      unread: list.filter((m) => !m.mine && m.createdAt > seen).length,
    };
  });
}

export async function fetchConversations(): Promise<Conversation[]> {
  const uid = await me();
  if (!supabase || !uid) return demoConversations();
  const { data, error } = await supabase.rpc('my_conversations');
  if (error) throw error;
  return (data ?? []).map((r: Record<string, any>) => ({
    id: r.id,
    asRole: r.as_role,
    mentorId: r.mentor_id,
    bookingId: r.booking_id,
    otherName: r.other_name,
    canWrite: !!r.can_write,
    lastBody: r.last_body,
    lastFromMe: !!r.last_from_me,
    lastMessageAt: r.last_message_at,
    unread: r.unread ?? 0,
  }));
}

/** Les 200 derniers messages, du plus ancien au plus récent. */
export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const uid = await me();
  if (!supabase || !uid) return useLocalMessages.getState().messages[conversationId] ?? [];
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).reverse().map((r) => toMessage(r, uid));
}

export async function sendMessage(conversationId: string, body: string): Promise<Message> {
  const uid = await me();
  if (!supabase || !uid) {
    const m: Message = { id: `local-${Date.now()}`, conversationId, mine: true, body: body.trim(), createdAt: new Date().toISOString() };
    useLocalMessages.getState().add(m);
    demoReply(conversationId);
    return m;
  }
  const { data, error } = await supabase.from('messages').insert({ conversation_id: conversationId, body }).select('id, conversation_id, sender_id, body, created_at').single();
  if (error) throw error.code === '23514' && error.message.startsWith('Doucement') ? new MessageRefused() : error;
  return toMessage(data, uid);
}

export async function markConversationRead(conversationId: string) {
  const uid = await me();
  if (!supabase || !uid) return useLocalMessages.getState().markRead(conversationId);
  await supabase.rpc('mark_conversation_read', { cid: conversationId });
}

/** La conversation d'une demande d'appel acceptée (carte « Appel confirmé », demande acceptée côté mentor). */
export async function conversationForBooking(bookingId: string, role: 'student' | 'mentor'): Promise<string | null> {
  const uid = await me();
  if (!supabase || !uid) return DEMO_CONVERSATIONS[role].id;
  const { data, error } = await supabase.rpc('conversation_for_booking', { p_booking_id: bookingId });
  if (error) throw error;
  return (data as string | null) ?? null;
}

/**
 * Le temps réel d'une conversation ouverte : les nouveaux messages de l'autre, et « en train d'écrire ».
 * Canal privé `conv:<id>` : la base n'y laisse entrer que les deux participants.
 */
export function subscribeToConversation(conversationId: string, on: { message: (m: Message) => void; typing: () => void }) {
  let closed = false;
  let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
  void (async () => {
    const uid = await me();
    if (!supabase || !uid || closed) return;
    await supabase.realtime.setAuth();
    if (closed) return;
    channel = supabase
      .channel(`conv:${conversationId}`, { config: { private: true, broadcast: { self: false } } })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (p) => {
        const m = toMessage(p.new, uid);
        if (!m.mine) on.message(m);
      })
      .on('broadcast', { event: 'typing' }, () => on.typing())
      .subscribe();
  })();
  return {
    /** « J'écris » : envoyé au plus toutes les 2 secondes par l'écran. */
    typing: () => void channel?.send({ type: 'broadcast', event: 'typing', payload: {} }),
    close: () => {
      closed = true;
      if (channel && supabase) void supabase.removeChannel(channel);
    },
  };
}

/** Mode démo : après ton premier message, l'autre « écrit » puis répond. */
function demoReply(conversationId: string) {
  const store = useLocalMessages.getState();
  const mine = (store.messages[conversationId] ?? []).filter((m) => m.mine).length;
  if (mine !== 1) return;
  setTimeout(() => useLocalMessages.getState().setTyping(conversationId, true), 900);
  setTimeout(() => {
    const s = useLocalMessages.getState();
    s.setTyping(conversationId, false);
    s.add({
      id: `local-reply-${Date.now()}`,
      conversationId,
      mine: false,
      body: 'Top, merci ! On voit tout ça ensemble pendant l’appel 🙂',
      createdAt: new Date().toISOString(),
    });
  }, 3200);
}
