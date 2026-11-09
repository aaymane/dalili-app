import { canStillEdit, deleteMessage, editMessage, fetchConversations, fetchMessages, markConversationRead, sendMessage } from '../api';
import { DEMO_CONVERSATIONS, useLocalMessages } from '../local';

// Sans clés Supabase (tests) : la messagerie tourne en mode démo, sur le téléphone.
describe('messagerie en mode démo', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('montre une conversation d’exemple par rôle, avec un message non lu', async () => {
    const list = await fetchConversations();
    expect(list.map((c) => c.asRole).sort()).toEqual(['mentor', 'student']);
    expect(list.every((c) => c.unread === 1)).toBe(true);
  });

  it('« lu » remet le compteur à zéro', async () => {
    await markConversationRead(DEMO_CONVERSATIONS.student.id);
    const student = (await fetchConversations()).find((c) => c.asRole === 'student');
    expect(student?.unread).toBe(0);
  });

  it('ton premier message reçoit une réponse, précédée de « en train d’écrire »', async () => {
    const id = DEMO_CONVERSATIONS.mentor.id;
    const before = (await fetchMessages(id)).length;
    const mine = await sendMessage(id, '  Salut !  ');
    expect(mine).toMatchObject({ mine: true, body: 'Salut !' });

    jest.advanceTimersByTime(1000);
    expect(useLocalMessages.getState().typing[id]).toBe(true);
    jest.advanceTimersByTime(2500);
    expect(useLocalMessages.getState().typing[id]).toBe(false);
    const after = await fetchMessages(id);
    expect(after).toHaveLength(before + 2);
    expect(after[after.length - 1].mine).toBe(false);
  });

  it('un PDF part sans texte et garde son nom, sa taille et le fichier du téléphone', async () => {
    const id = DEMO_CONVERSATIONS.student.id;
    const attachment = { path: null, name: 'attestation.pdf', type: 'application/pdf' as const, size: 240_000, localUri: 'file:///cache/attestation.pdf' };
    const sent = await sendMessage(id, '', attachment);
    expect(sent).toMatchObject({ mine: true, body: '', attachment });
    expect((await fetchMessages(id)).some((m) => m.attachment?.name === 'attestation.pdf')).toBe(true);
  });

  it('tu modifies ton message (« modifié ») puis le supprimes : il disparaît', async () => {
    const id = DEMO_CONVERSATIONS.student.id;
    const sent = await sendMessage(id, 'Salut Yasine');
    await editMessage(sent, 'Salut Yassine');
    const edited = (await fetchMessages(id)).find((m) => m.id === sent.id);
    expect(edited).toMatchObject({ body: 'Salut Yassine' });
    expect(edited?.editedAt).toBeTruthy();
    await deleteMessage(sent);
    expect((await fetchMessages(id)).some((m) => m.id === sent.id)).toBe(false);
  });

  it('un message se modifie pendant 15 minutes, pas après', () => {
    const now = Date.parse('2026-11-09T12:00:00Z');
    const m = (minutes: number) => ({ id: 'x', conversationId: 'c', mine: true, body: 'x', createdAt: new Date(now - minutes * 60_000).toISOString() });
    expect(canStillEdit(m(14), now)).toBe(true);
    expect(canStillEdit(m(16), now)).toBe(false);
  });
});
