/**
 * Coffre « Mes documents » (supabase/migrations/20261108120000_coffre_documents.sql) : bucket privé `vault`, un
 * dossier par compte, et la table `vault_documents` que seul le propriétaire lit et modifie. L'app envoie le fichier,
 * puis le titre, la rubrique et le chemin ; la base vérifie que le fichier est là et lit sa taille elle-même.
 * Sans Supabase ou sans session (mode démo) : tout reste sur le téléphone (`store.ts`, `files.ts`).
 */
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { fileName, removeFiles, signedUrl, uploadBytes } from '@/data/media';
import { supabase } from '@/lib/supabase';

import type { Prepared } from './capture';
import type { Category } from './categories';
import { demoFileUri, previewFile, writeDemoFile, discard } from './files';
import { useVaultDemo, type VaultDoc } from './store';

export type { VaultDoc } from './store';

/** Les mêmes limites que la base : 200 documents et 250 Mo par compte. */
export const VAULT_LIMITS = { count: 200, bytes: 250 * 1024 * 1024 };

/** Coffre plein : l'écran l'explique (retirer de vieux documents). */
export class VaultFull extends Error {}

const COLUMNS = 'id, category, kind, title, file_type, file_size, created_at, file_path';

async function session() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ? { sb: supabase, uid: data.session.user.id } : null;
}

const toDoc = (r: Record<string, any>): VaultDoc => ({
  id: r.id,
  category: r.category,
  kind: r.kind ?? null,
  title: r.title,
  type: r.file_type,
  size: r.file_size,
  createdAt: r.created_at,
  path: r.file_path,
});

const extOf = (doc: Pick<VaultDoc, 'type'>) => (doc.type === 'application/pdf' ? 'pdf' : 'jpg');

/** Tes documents, du plus récent au plus ancien. */
export async function listDocuments(): Promise<VaultDoc[]> {
  const s = await session();
  if (!s) return useVaultDemo.getState().docs;
  const { data, error } = await s.sb.from('vault_documents').select(COLUMNS).order('created_at', { ascending: false });
  if (error) throw error;
  const docs = (data ?? []).map(toDoc);
  void cleanOrphans(s.uid, docs);
  return docs;
}

/** Vérifie la place avant d'envoyer (la base le revérifie). */
export function hasRoom(existing: VaultDoc[], size: number) {
  const used = existing.reduce((a, d) => a + d.size, 0);
  return existing.length < VAULT_LIMITS.count && used + size <= VAULT_LIMITS.bytes;
}

export type NewDocument = { file: Prepared; title: string; category: Category; kind: string | null };

/** Range un document : le fichier part d'abord, la fiche ensuite ; si la fiche est refusée, le fichier est retiré. */
export async function addDocument(input: NewDocument, existing: VaultDoc[]): Promise<VaultDoc> {
  const { file } = input;
  if (!hasRoom(existing, file.bytes.length)) throw new VaultFull();
  const title = input.title.trim().slice(0, 80);
  const name = `${fileName()}.${extOf(file)}`;

  const s = await session();
  if (!s) {
    await writeDemoFile(name, file.bytes);
    const doc: VaultDoc = {
      id: `demo-${name}`,
      category: input.category,
      kind: input.kind,
      title,
      type: file.type,
      size: file.bytes.length,
      createdAt: new Date().toISOString(),
      path: name,
    };
    useVaultDemo.getState().add(doc);
    return doc;
  }

  const path = `${s.uid}/${name}`;
  await uploadBytes('vault', path, file.bytes, file.type);
  const { data, error } = await s.sb
    .from('vault_documents')
    .insert({ category: input.category, kind: input.kind, title, file_path: path, file_type: file.type, file_size: file.bytes.length })
    .select(COLUMNS)
    .single();
  if (error) {
    await removeFiles('vault', [path]);
    throw error.hint === 'vault_full' ? new VaultFull() : error;
  }
  return toDoc(data);
}

/** Renommer, changer de rubrique (le fichier ne change jamais). */
export async function updateDocument(id: string, patch: Partial<Pick<VaultDoc, 'title' | 'category' | 'kind'>>) {
  const clean = { ...patch, ...(patch.title !== undefined ? { title: patch.title.trim().slice(0, 80) } : {}) };
  const s = await session();
  if (!s) return useVaultDemo.getState().update(id, clean);
  const { error } = await s.sb.from('vault_documents').update(clean).eq('id', id);
  if (error) throw error;
}

/** Retire un document : la fiche d'abord (il disparaît pour de bon), puis le fichier. */
export async function deleteDocument(doc: VaultDoc) {
  const s = await session();
  if (!s) {
    discard(demoFileUri(doc.path));
    return useVaultDemo.getState().remove(doc.id);
  }
  const { error } = await s.sb.from('vault_documents').delete().eq('id', doc.id);
  if (error) throw error;
  await removeFiles('vault', [doc.path]);
}

/** Lien temporaire (5 minutes) pour afficher une photo du coffre ; en mode démo, le fichier local. */
export async function documentUrl(doc: VaultDoc): Promise<string | null> {
  const s = await session();
  if (!s) return demoFileUri(doc.path) || null;
  return signedUrl('vault', doc.path, 300);
}

/**
 * Ouvre un document dans l'aperçu du téléphone (Quick Look sur iPhone : zoom, partage, impression). La copie
 * téléchargée reste dans le cache de l'app le temps de la lecture, puis s'efface en quittant le coffre.
 */
export async function openDocument(doc: VaultDoc): Promise<boolean> {
  const s = await session();
  const ext = extOf(doc);
  if (!s) {
    const local = demoFileUri(doc.path);
    if (!local) return false;
    await previewFile({ localUri: local }, doc.title, ext);
    return true;
  }
  const url = await signedUrl('vault', doc.path, 300);
  if (!url) return false;
  if (Platform.OS === 'web') {
    await WebBrowser.openBrowserAsync(url);
    return true;
  }
  try {
    await previewFile({ remoteUrl: url }, doc.title, ext);
  } catch {
    // Pas d'aperçu possible (Android sans lecteur de PDF) : le navigateur intégré.
    await WebBrowser.openBrowserAsync(url);
  }
  return true;
}

/**
 * Un envoi coupé (réseau perdu entre le fichier et la fiche) laisse parfois un fichier sans fiche : invisible,
 * mais il prend de la place. On les retire une fois par session, s'ils ont plus d'une heure (pas un envoi en cours).
 */
let cleaned = false;
async function cleanOrphans(uid: string, docs: VaultDoc[]) {
  if (cleaned || !supabase) return;
  cleaned = true;
  const { data } = await supabase.storage.from('vault').list(uid, { limit: 1000 });
  const known = new Set(docs.map((d) => d.path));
  const hourAgo = Date.now() - 3_600_000;
  const orphans = (data ?? [])
    .filter((f) => f.name && !known.has(`${uid}/${f.name}`) && (!f.created_at || new Date(f.created_at).getTime() < hourAgo))
    .map((f) => `${uid}/${f.name}`);
  await removeFiles('vault', orphans);
}
