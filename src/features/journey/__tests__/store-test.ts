import { useJourneyStore } from '../store';

// Mode démo (pas de clés Supabase en test) : l'enregistrement en ligne ne fait rien, le téléphone garde tout.
describe('parcours', () => {
  beforeEach(() => useJourneyStore.getState().reset());

  it('coche et décoche une étape', () => {
    useJourneyStore.getState().toggle('cvec', true);
    expect(useJourneyStore.getState().overrides.cvec).toBe(true);
    useJourneyStore.getState().toggle('cvec', false);
    expect(useJourneyStore.getState().overrides.cvec).toBe(false);
  });

  it('cocher le visa ouvre le billet une seule fois', () => {
    const s = useJourneyStore.getState();
    s.toggle('visa', true);
    expect(useJourneyStore.getState().ticketPending).toBe(true);
    useJourneyStore.getState().markTicketSeen();
    useJourneyStore.getState().toggle('visa', false);
    useJourneyStore.getState().toggle('visa', true);
    expect(useJourneyStore.getState().ticketPending).toBe(false);
  });

  it('ajoute, coche et retire une tâche perso', () => {
    const item = useJourneyStore.getState().addCustom('  Ouvrir un compte  ', '2026-11-10');
    expect(item.title).toBe('Ouvrir un compte');
    useJourneyStore.getState().toggleCustom(item.id);
    expect(useJourneyStore.getState().custom[0].done).toBe(true);
    useJourneyStore.getState().removeCustom(item.id);
    expect(useJourneyStore.getState().custom).toHaveLength(0);
  });

  it('ne célèbre une phase qu’une fois', () => {
    useJourneyStore.getState().markCelebrated('before');
    useJourneyStore.getState().markCelebrated('before');
    expect(useJourneyStore.getState().celebrated).toEqual(['before']);
  });
});
