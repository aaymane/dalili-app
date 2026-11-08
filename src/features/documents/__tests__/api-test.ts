import { addDocument, deleteDocument, hasRoom, listDocuments, updateDocument, VAULT_LIMITS, VaultFull } from '../api';
import type { Prepared } from '../capture';
import { CATEGORIES, SUGGESTIONS } from '../categories';
import { discard, writeDemoFile } from '../files';
import { useVaultDemo, type VaultDoc } from '../store';

// Le disque du téléphone est simulé : on vérifie ce que le coffre en fait, pas le système de fichiers.
jest.mock('../files', () => ({
  writeDemoFile: jest.fn(async (name: string) => `file:///demo/${name}`),
  demoFileUri: (name: string) => `file:///demo/${name}`,
  discard: jest.fn(),
  previewFile: jest.fn(),
  clearViews: jest.fn(),
  clearDemoFiles: jest.fn(),
  readBytes: jest.fn(),
}));

const scan = (size = 1000): Prepared => ({ bytes: new Uint8Array(size), type: 'application/pdf', source: 'scan', pages: 2 });
const docOf = (size: number) => ({ size }) as VaultDoc;

// Mode démo (pas de clés Supabase en test) : le coffre vit sur le téléphone.
describe('coffre « Mes documents »', () => {
  beforeEach(() => {
    useVaultDemo.getState().reset();
    jest.clearAllMocks();
  });

  it('range, renomme, déplace puis supprime un document', async () => {
    const doc = await addDocument({ file: scan(), title: '  Passeport  ', category: 'identity', kind: 'passport' }, []);
    expect(doc).toMatchObject({ title: 'Passeport', category: 'identity', kind: 'passport', type: 'application/pdf', size: 1000 });
    // Le même format de nom que la base exige : `[a-z0-9]{6,32}.pdf`.
    expect(doc.path).toMatch(/^[a-z0-9]{6,32}\.pdf$/);
    expect(writeDemoFile).toHaveBeenCalledWith(doc.path, expect.any(Uint8Array));
    expect(await listDocuments()).toHaveLength(1);

    await updateDocument(doc.id, { title: 'Passeport marocain', category: 'other', kind: null });
    expect((await listDocuments())[0]).toMatchObject({ title: 'Passeport marocain', category: 'other', kind: null });

    await deleteDocument((await listDocuments())[0]);
    expect(await listDocuments()).toHaveLength(0);
    expect(discard).toHaveBeenCalledWith(`file:///demo/${doc.path}`);
  });

  it('le plus récent en premier, et un nom trop long est coupé à 80 caractères', async () => {
    await addDocument({ file: scan(), title: 'Ancien', category: 'studies', kind: null }, []);
    const recent = await addDocument({ file: { ...scan(), type: 'image/jpeg', source: 'camera' }, title: 'x'.repeat(120), category: 'money', kind: null }, []);
    expect(recent.path).toMatch(/\.jpg$/);
    expect(recent.title).toHaveLength(80);
    expect((await listDocuments()).map((d) => d.category)).toEqual(['money', 'studies']);
  });

  it('refuse quand le coffre est plein (200 documents ou 250 Mo)', async () => {
    const full = Array.from({ length: VAULT_LIMITS.count }, () => docOf(1));
    await expect(addDocument({ file: scan(), title: 'Un de trop', category: 'other', kind: null }, full)).rejects.toBeInstanceOf(VaultFull);
    expect(writeDemoFile).not.toHaveBeenCalled();
    expect(hasRoom([docOf(VAULT_LIMITS.bytes - 10)], 11)).toBe(false);
    expect(hasRoom([docOf(VAULT_LIMITS.bytes - 10)], 10)).toBe(true);
  });

  it('les papiers conseillés vont dans une rubrique connue, avec un identifiant accepté par la base', () => {
    for (const s of SUGGESTIONS) {
      expect(CATEGORIES).toContain(s.category);
      expect(s.id).toMatch(/^[a-z][a-z-]{1,31}$/);
    }
  });
});
