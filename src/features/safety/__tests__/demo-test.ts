import { blockUser, fetchMyBlocks, sendReport, unblockUser } from '../api';

// Sans clés Supabase (tests) : signaler et bloquer ne partent nulle part, et le disent.
describe('signaler et bloquer en mode démo', () => {
  it('rien n’est envoyé, et l’app le sait', async () => {
    await expect(sendReport({ mentorId: 'm1' }, 'argent', 'test')).resolves.toBe('demo');
    await expect(blockUser({ bookingId: 'b1' })).resolves.toBe('demo');
  });

  it('pas de blocage enregistré, et débloquer ne fait rien', async () => {
    await expect(fetchMyBlocks()).resolves.toEqual([]);
    await expect(unblockUser('x')).resolves.toBeUndefined();
  });
});
