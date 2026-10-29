import { fetchConversations, fetchMessages, markConversationRead, sendMessage } from '../api';
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
});
