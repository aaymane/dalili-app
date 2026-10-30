import { emptyProfile } from '@/features/profile/types';

import { mergeJourney, mergeProfile } from '../merge';

describe('synchronisation : le serveur gagne', () => {
  it('le profil en ligne remplace celui du téléphone', () => {
    const local = { ...emptyProfile, firstName: 'Yasmine', destinationCity: 'Lyon', arrivalDate: '2026-09-01' };
    const merged = mergeProfile(local, local, { firstName: 'Yasmine', destinationCity: 'Nantes', arrivalDate: null });
    expect(merged.destinationCity).toBe('Nantes');
    // « Je ne sais pas encore » choisi sur un autre téléphone.
    expect(merged.arrivalDate).toBeNull();
  });

  it('un vide en ligne n’efface ni le prénom ni le pays', () => {
    const local = { ...emptyProfile, firstName: 'Yasmine', country: 'MA' as const };
    const merged = mergeProfile(local, local, { firstName: '', country: null });
    expect(merged.firstName).toBe('Yasmine');
    expect(merged.country).toBe('MA');
  });

  it('un champ modifié pendant la relecture garde la valeur du téléphone', () => {
    const before = { ...emptyProfile, destinationCity: 'Lyon' };
    const now = { ...before, destinationCity: 'Lille' };
    expect(mergeProfile(before, now, { destinationCity: 'Nantes' }).destinationCity).toBe('Lille');
  });

  it('étapes : le serveur gagne, une étape seulement locale est gardée et renvoyée', () => {
    const local = { overrides: { visa: true, cvec: true }, custom: [] };
    const merged = mergeJourney(local, local, { overrides: { visa: false }, custom: [] });
    expect(merged.overrides).toEqual({ visa: false, cvec: true });
    expect(merged.toPush).toEqual(['cvec']);
  });

  it('étapes : un geste pendant la relecture l’emporte et n’est pas renvoyé deux fois', () => {
    const before = { overrides: { visa: false }, custom: [] };
    const now = { overrides: { visa: true, caf: true }, custom: [] };
    const merged = mergeJourney(before, now, { overrides: { visa: false, caf: false }, custom: [] });
    expect(merged.overrides).toEqual({ visa: true, caf: true });
    expect(merged.toPush).toEqual([]);
  });

  it('tâches perso : la liste en ligne fait foi, le téléphone garde ses identifiants', () => {
    const local = {
      overrides: {},
      custom: [
        { id: 'custom-1', title: 'Banque', date: '2026-11-10', done: false },
        { id: 'custom-2', title: 'Supprimée ailleurs', date: '2026-11-12', done: false },
      ],
    };
    const server = {
      overrides: {},
      custom: [
        { id: 'custom-a', title: 'Banque', date: '2026-11-10', done: true },
        { id: 'custom-b', title: 'Ajoutée ailleurs', date: '2026-11-20', done: false },
      ],
    };
    expect(mergeJourney(local, local, server).custom).toEqual([
      { id: 'custom-1', title: 'Banque', date: '2026-11-10', done: true },
      { id: 'custom-b', title: 'Ajoutée ailleurs', date: '2026-11-20', done: false },
    ]);
  });

  it('tâches perso : ajoutée, cochée ou retirée pendant la relecture, le téléphone l’emporte', () => {
    const before = {
      overrides: {},
      custom: [
        { id: 'custom-1', title: 'Banque', date: '2026-11-10', done: false },
        { id: 'custom-2', title: 'Assurance', date: '2026-11-11', done: false },
      ],
    };
    const now = {
      overrides: {},
      custom: [
        { id: 'custom-1', title: 'Banque', date: '2026-11-10', done: true },
        { id: 'custom-3', title: 'Nouvelle', date: '2026-11-15', done: false },
      ],
    };
    const server = { overrides: {}, custom: before.custom.map((c) => ({ ...c, id: `srv-${c.id}` })) };
    expect(mergeJourney(before, now, server).custom).toEqual([
      { id: 'custom-1', title: 'Banque', date: '2026-11-10', done: true },
      { id: 'custom-3', title: 'Nouvelle', date: '2026-11-15', done: false },
    ]);
  });
});
