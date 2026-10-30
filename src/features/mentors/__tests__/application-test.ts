import { useLocalDb } from '@/data/local-db';

import { approveDemoApplication, createMyMentor, fetchMyApplication, fetchMyMentor, uploadMentorDocument } from '../api';

// La photo est réencodée sur le téléphone : en test, on garde l'image telle quelle.
jest.mock('../documents', () => ({ prepareDocument: async (uri: string) => uri }));

// Mode démo (pas de clés Supabase en test) : la candidature vit sur le téléphone.
describe('candidature mentor (démo)', () => {
  beforeEach(() => useLocalDb.getState().reset());

  it('pas de fiche mentor avant la candidature : un compte reste étudiant', async () => {
    expect(await fetchMyMentor()).toBeNull();
    expect(await fetchMyApplication()).toEqual({ documents: [], status: 'none', rejectedReason: null });
  });

  it('documents, envoi, vérification, puis validation', async () => {
    await uploadMentorDocument('titre_sejour', { uri: 'file:///sejour.jpg' });
    await uploadMentorDocument('titre_sejour', { uri: 'file:///visa.pdf', pdf: true });
    await uploadMentorDocument('certificat_scolarite', { uri: 'file:///scol.jpg' });
    expect((await fetchMyApplication()).documents).toEqual(['titre_sejour', 'certificat_scolarite']);

    await createMyMentor({ firstName: 'Salma', lastName: 'B.', city: 'Lyon', origin: 'Casablanca', birthYear: 2000 });
    expect((await fetchMyApplication()).status).toBe('pending');
    expect((await fetchMyMentor())?.isActive).toBe(false);

    approveDemoApplication();
    expect((await fetchMyApplication()).status).toBe('approved');
    expect((await fetchMyMentor())?.isActive).toBe(true);
  });
});
