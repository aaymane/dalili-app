/**
 * Synchronisation de bout en bout côté app : le vrai `useAuth.init()`, la vraie relecture et les vraies fonctions
 * `api.ts`, contre un faux Supabase en mémoire (la RLS, elle, est testée sur un vrai Postgres : supabase/tests/rls.sql).
 * Deux « téléphones » du même compte se partagent le serveur.
 */
import { useJourneyStore } from '@/features/journey/store';
import { useProfile } from '@/features/profile/store';
import { emptyProfile } from '@/features/profile/types';

import { useAuth } from '../store';

// `jest.mock` est remonté avant les imports par Jest : les modules lisent le faux Supabase.
type Row = Record<string, unknown>;

const USER = { id: 'user-a', email: 'a@test.local' };
const mockDb: Record<string, Row[]> = { profiles: [], step_progress: [], custom_steps: [] };
let mockListeners: ((event: string, session: unknown) => void)[] = [];
let mockSession: { user: typeof USER; access_token: string } | null = null;

/** Requête minimale : select/eq/order/maybeSingle/upsert/update/delete/match, « await »-able comme supabase-js. */
function mockQuery(table: string) {
  let filters: Row = {};
  let op: { kind: 'select' | 'upsert' | 'update' | 'delete'; row?: Row; conflict?: string[] } = { kind: 'select' };
  const rows = () => mockDb[table].filter((r) => Object.entries(filters).every(([k, v]) => r[k] === v));
  const run = () => {
    if (op.kind === 'upsert') {
      const row = op.row!;
      const keys = op.conflict ?? ['id'];
      const found = mockDb[table].find((r) => keys.every((k) => r[k] === row[k]));
      if (found) Object.assign(found, row);
      else mockDb[table].push({ id: `srv-${mockDb[table].length + 1}`, ...row });
      return { data: null, error: null };
    }
    if (op.kind === 'update') {
      rows().forEach((r) => Object.assign(r, op.row));
      return { data: null, error: null };
    }
    if (op.kind === 'delete') {
      const gone = new Set(rows());
      mockDb[table] = mockDb[table].filter((r) => !gone.has(r));
      return { data: null, error: null };
    }
    return { data: rows().map((r) => ({ ...r })), error: null };
  };
  const q = {
    select: () => q,
    eq: (k: string, v: unknown) => ((filters = { ...filters, [k]: v }), q),
    match: (m: Row) => ((filters = { ...filters, ...m }), q),
    order: () => q,
    upsert: (row: Row, opts?: { onConflict?: string }) => ((op = { kind: 'upsert', row, conflict: opts?.onConflict?.split(',') }), q),
    update: (row: Row) => ((op = { kind: 'update', row }), q),
    delete: () => ((op = { kind: 'delete' }), q),
    maybeSingle: async () => ({ data: (run().data as Row[])[0] ?? null, error: null }),
    then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(run()).then(ok, ko),
  };
  return q;
}

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockQuery(table),
    auth: {
      getSession: async () => ({ data: { session: mockSession } }),
      getUser: async () => ({ data: { user: mockSession?.user ?? null } }),
      onAuthStateChange: (cb: (event: string, s: unknown) => void) => {
        mockListeners.push(cb);
        return { data: { subscription: { unsubscribe: () => (mockListeners = mockListeners.filter((l) => l !== cb)) } } };
      },
      signOut: async () => {
        mockSession = null;
        mockListeners.forEach((l) => l('SIGNED_OUT', null));
      },
    },
    storage: { from: () => ({ createSignedUrl: async () => ({ data: null, error: new Error('pas de photo') }) }) },
  },
}));
jest.mock('@/lib/env', () => ({ ...jest.requireActual('@/lib/env'), isSupabaseConfigured: true }));

const flush = async () => {
  for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));
};

/** Ouvre l'app sur un téléphone : le téléphone garde ce qu'il avait (même compte), puis `init()` comme au lancement. */
async function launch() {
  const stop = useAuth.getState().init();
  await flush();
  return stop;
}

beforeEach(() => {
  mockDb.profiles = [{ id: USER.id, first_name: 'Yasmine', last_name: 'B.', situation: 'abroad', destination_city: 'Lyon', arrival_date: '2027-09-01', concerns: [], roles: ['student'], active_role: 'student', country: 'MA' }];
  mockDb.step_progress = [];
  mockDb.custom_steps = [];
  mockListeners = [];
  mockSession = { user: USER, access_token: 'jeton' };
  useJourneyStore.getState().reset();
  useProfile.setState({ profile: { ...emptyProfile, firstName: 'Yasmine', destinationCity: 'Lyon' }, onboardingDone: true });
  useAuth.setState({ ownerId: USER.id, status: 'loading', user: null });
});

// Un test qui échoue avec les faux minuteurs ne doit pas casser les suivants.
afterEach(() => jest.useRealTimers());

describe('synchronisation à la connexion', () => {
  it('même compte : l’app s’ouvre tout de suite, puis prend ce qui a changé sur l’autre téléphone', async () => {
    // L'autre téléphone a coché le visa, ajouté une tâche et changé de ville.
    mockDb.step_progress.push({ user_id: USER.id, step_id: 'visa', done: true });
    mockDb.custom_steps.push({ id: 'uuid-1', user_id: USER.id, title: 'Ouvrir un compte', due_date: '2026-11-10', done: false });
    mockDb.profiles[0].destination_city = 'Nantes';

    const stop = await launch();
    expect(useAuth.getState().status).toBe('signedIn');
    expect(useJourneyStore.getState().overrides.visa).toBe(true);
    expect(useJourneyStore.getState().custom).toEqual([{ id: 'custom-uuid-1', title: 'Ouvrir un compte', date: '2026-11-10', done: false }]);
    expect(useProfile.getState().profile.destinationCity).toBe('Nantes');
    stop();
  });

  it('conflit : le serveur gagne', async () => {
    useJourneyStore.setState({ overrides: { visa: true } });
    mockDb.step_progress.push({ user_id: USER.id, step_id: 'visa', done: false });
    const stop = await launch();
    expect(useJourneyStore.getState().overrides.visa).toBe(false);
    stop();
  });

  it('une étape cochée hors ligne sur ce téléphone est renvoyée au serveur', async () => {
    useJourneyStore.setState({ overrides: { cvec: true } });
    const stop = await launch();
    expect(useJourneyStore.getState().overrides.cvec).toBe(true);
    expect(mockDb.step_progress).toEqual([expect.objectContaining({ user_id: USER.id, step_id: 'cvec', done: true })]);
    stop();
  });

  it('le profil reçu du serveur n’est pas renvoyé (pas d’écho)', async () => {
    mockDb.profiles[0].destination_city = 'Nantes';
    const before = { ...mockDb.profiles[0] };
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
    const stop = useAuth.getState().init();
    await jest.runAllTimersAsync();
    expect(useProfile.getState().profile.destinationCity).toBe('Nantes');
    expect(mockDb.profiles[0]).toEqual(before); // aucun upsert (il aurait changé updated_at)
    stop();
  });

  it('une seule relecture par session, pas à chaque rafraîchissement du jeton', async () => {
    const stop = await launch();
    mockDb.step_progress.push({ user_id: USER.id, step_id: 'caf', done: true });
    mockListeners.forEach((l) => l('TOKEN_REFRESHED', mockSession));
    await flush();
    expect(useJourneyStore.getState().overrides.caf).toBeUndefined();
    stop();
  });

  it('se reconnecter au même compte relit le serveur', async () => {
    const stop = await launch();
    await useAuth.getState().signOut();
    await flush();
    expect(useAuth.getState().status).toBe('signedOut');
    mockDb.step_progress.push({ user_id: USER.id, step_id: 'caf', done: true });
    mockSession = { user: USER, access_token: 'jeton-2' };
    mockListeners.forEach((l) => l('SIGNED_IN', mockSession));
    await flush();
    expect(useAuth.getState().status).toBe('signedIn');
    expect(useJourneyStore.getState().overrides.caf).toBe(true);
    stop();
  });

  it('cocher une étape sur ce téléphone l’enregistre en ligne pour l’autre', async () => {
    const stop = await launch();
    useJourneyStore.getState().toggle('logement', true);
    await flush();
    expect(mockDb.step_progress).toEqual([expect.objectContaining({ user_id: USER.id, step_id: 'logement', done: true })]);
    stop();
  });
});
