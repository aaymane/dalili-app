import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/**
 * Photos et fichiers envoyés depuis l'app (supabase/migrations/20261101120000_photos_et_pieces_jointes.sql) :
 * couvertures des groupes et des événements, photos des publications, pièces jointes de la messagerie.
 * Trois buckets privés : on n'affiche un fichier qu'avec un lien temporaire.
 */
export type Bucket = 'covers' | 'post-photos' | 'message-files';

/** Limites des buckets : 5 Mo pour les photos, 10 Mo pour les pièces jointes. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/** Un nom de fichier que la base accepte (`[a-z0-9]{6,32}`), unique en pratique. */
export const fileName = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/**
 * Réduit une photo (largeur max) et la réencode en JPEG : plus légère, et sans métadonnées
 * (position GPS, appareil, date). Renvoie l'adresse locale du fichier prêt à partir.
 */
export async function prepareJpeg(pickedUri: string, width = 1600) {
  const ctx = ImageManipulator.manipulate(pickedUri).resize({ width, height: null });
  const image = await ctx.renderAsync();
  const out = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  ctx.release();
  image.release();
  return out.uri;
}

/** Envoie un fichier local dans un bucket. */
export async function uploadFile(bucket: Bucket, path: string, localUri: string, contentType: 'image/jpeg' | 'application/pdf') {
  if (!supabase) throw new Error('Pas de serveur');
  const body = Platform.OS === 'web' ? await (await fetch(localUri)).arrayBuffer() : await new File(localUri).arrayBuffer();
  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType, upsert: false });
  if (error) throw error;
}

/** Retire des fichiers (sans erreur si la base le refuse : un fichier orphelin ne gêne personne). */
export async function removeFiles(bucket: Bucket, paths: string[]) {
  if (!supabase || !paths.length) return;
  await supabase.storage.from(bucket).remove(paths);
}

/**
 * Liens temporaires pour plusieurs fichiers d'un coup (listes). Un chemin absent ou refusé n'a pas de lien.
 * L'image garde le chemin comme clé de cache : le lien change, la photo n'est pas retéléchargée.
 */
export async function signedUrls(bucket: Bucket, paths: string[], expiresIn = 86_400): Promise<Record<string, string>> {
  if (!supabase || !paths.length) return {};
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, expiresIn);
  if (error) return {};
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}

/** Lien temporaire d'un seul fichier (une pièce jointe qu'on ouvre). */
export async function signedUrl(bucket: Bucket, path: string, expiresIn = 3_600) {
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  return error ? null : data.signedUrl;
}
