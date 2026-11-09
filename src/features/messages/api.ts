/**
 * Messagerie mentor ↔ étudiant. Une conversation s'ouvre quand le mentor accepte une demande d'appel ;
 * seuls les deux participants la lisent (supabase/migrations/20261029100000_messagerie.sql).
 * Sans Supabase ou sans session (mode démo) : une conversation d'exemple par rôle, sur le téléphone (`local.ts`).
 */
import { File } from 'expo-file-system';

import { avatarUrls, fileName, prepareJpeg, removeFiles, uploadFile } from '@/data/media';
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
  /** La photo de l'autre (chemin dans `avatars`, lien temporaire). Absente en démo, ou après un blocage. */
  otherAvatarPath?: string | null;
  otherAvatarUrl?: string | null;
};

/**
 * Une pièce jointe : photo (JPEG) ou PDF. `path` est effacé par le site après 30 jours (le nom reste).
 * `localUri` : le fichier sur ce téléphone (envoi en cours, ou mode démo).
 */
export type Attachment = { path: string | null; name: string; type: 'image/jpeg' | 'application/pdf'; size: number; localUri?: string };

/** Ce que l'écran a choisi : une photo (appareil, galerie) ou un PDF. */
export type PickedFile = { uri: string; name: string; type: Attachment['type']; size?: number };

export type Message = {
  id: string;
  conversationId: string;
  mine: boolean;
  body: string;
  attachment?: Attachment;
  createdAt: string;
  /** Heure de la dernière modification (« modifié » s'affiche). */
  editedAt?: string | null;
  /** Envoi en cours (affiché tout de suite), ou raté (à renvoyer). */
  pending?: boolean;
  failed?: boolean;
};

/** Un message se modifie pendant 15 minutes après l'envoi (la base refuse ensuite). */
export const EDIT_WINDOW_MS = 15 * 60_000;
export const canStillEdit = (m: Message, now = Date.now()) => now - new Date(m.createdAt).getTime() < EDIT_WINDOW_MS - 5_000;

/** Refus de la base (trop de messages d'un coup) : l'écran l'explique dans la langue en cours. */
export class MessageRefused extends Error {}

async function me() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

const COLUMNS = 'id, conversation_id, sender_id, body, created_at, edited_at, attachment_path, attachment_name, attachment_type, attachment_size';

const toMessage = (r: Record<string, any>, uid: string): Message => ({
  id: r.id,
  conversationId: r.conversation_id,
  mine: r.sender_id === uid,
  body: r.body ?? '',
  attachment: r.attachment_name ? { path: r.attachment_path ?? null, name: r.attachment_name, type: r.attachment_type, size: r.attachment_size ?? 0 } : undefined,
  createdAt: r.created_at,
  editedAt: r.edited_at ?? null,
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
  const urls = await avatarUrls((data ?? []).map((r: Record<string, any>) => r.other_avatar));
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
    otherAvatarPath: r.other_avatar ?? null,
    otherAvatarUrl: r.other_avatar ? (urls[r.other_avatar] ?? null) : null,
  }));
}

/** Les 200 derniers messages, du plus ancien au plus récent. */
export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const uid = await me();
  if (!supabase || !uid) return useLocalMessages.getState().messages[conversationId] ?? [];
  const { data, error } = await supabase
    .from('messages')
    .select(COLUMNS)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).reverse().map((r) => toMessage(r, uid));
}

/** Une photo est réduite et réencodée (sans métadonnées) ; un PDF part tel quel. */
export async function prepareAttachment(file: PickedFile): Promise<Attachment> {
  if (file.type === 'application/pdf') return { path: null, name: file.name, type: file.type, size: file.size ?? 0, localUri: file.uri };
  const uri = await prepareJpeg(file.uri);
  return { path: null, name: file.name, type: 'image/jpeg', size: new File(uri).size ?? 0, localUri: uri };
}

/**
 * Envoyer un message : du texte, une pièce jointe, ou les deux. Le fichier part d'abord dans le dossier de la
 * conversation ; si la base refuse le message, il est retiré.
 */
export async function sendMessage(conversationId: string, body: string, attachment?: Attachment): Promise<Message> {
  const uid = await me();
  if (!supabase || !uid) {
    const m: Message = { id: `local-${Date.now()}`, conversationId, mine: true, body: body.trim(), attachment, createdAt: new Date().toISOString() };
    useLocalMessages.getState().add(m);
    demoReply(conversationId);
    return m;
  }
  let path: string | null = null;
  if (attachment?.localUri) {
    path = `${conversationId}/${fileName()}.${attachment.type === 'application/pdf' ? 'pdf' : 'jpg'}`;
    await uploadFile('message-files', path, attachment.localUri, attachment.type);
  }
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      body,
      ...(attachment && path ? { attachment_path: path, attachment_name: attachment.name.slice(0, 120), attachment_type: attachment.type, attachment_size: attachment.size } : {}),
    })
    .select(COLUMNS)
    .single();
  if (error) {
    if (path) await removeFiles('message-files', [path]);
    throw error.code === '23514' && error.message.startsWith('Doucement') ? new MessageRefused() : error;
  }
  return toMessage(data, uid);
}

/**
 * Modifier ton message (le texte seulement, 15 minutes après l'envoi). La base vérifie que c'est le tien, garde
 * l'ancienne version pour l'équipe et note l'heure. Mode démo : sur le téléphone.
 */
export async function editMessage(m: Message, body: string): Promise<void> {
  const uid = await me();
  if (!supabase || !uid) return useLocalMessages.getState().edit(m.conversationId, m.id, body);
  const { data, error } = await supabase.from('messages').update({ body }).eq('id', m.id).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('not-allowed');
}

/** Supprimer ton message, pour vous deux. Sa pièce jointe part avec lui. Mode démo : sur le téléphone. */
export async function deleteMessage(m: Message): Promise<void> {
  const uid = await me();
  if (!supabase || !uid) return useLocalMessages.getState().remove(m.conversationId, m.id);
  const { data, error } = await supabase.from('messages').delete().eq('id', m.id).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('not-allowed');
  if (m.attachment?.path) await removeFiles('message-files', [m.attachment.path]).catch(() => {});
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
export function subscribeToConversation(conversationId: string, on: { message: (m: Message) => void; typing: () => void; changed: () => void }) {
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
      // L'autre a modifié ou supprimé un message : on relit la conversation (le contenu ne passe pas par le canal).
      .on('broadcast', { event: 'changed' }, () => on.changed())
      .subscribe();
  })();
  return {
    /** « J'écris » : envoyé au plus toutes les 2 secondes par l'écran. */
    typing: () => void channel?.send({ type: 'broadcast', event: 'typing', payload: {} }),
    changed: () => void channel?.send({ type: 'broadcast', event: 'changed', payload: {} }),
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
