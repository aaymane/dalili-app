import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

const native = Platform.OS !== 'web';
const folder = () => new Directory(Paths.document, 'avatars');

/**
 * Prépare la photo choisie et la garde sur le téléphone.
 * Réduite à 512 px et réencodée en JPEG : ça retire les métadonnées (position GPS, appareil, date).
 * Rangée dans les documents de l'app : le système peut vider le cache, pas ce dossier.
 */
export async function prepareAvatar(pickedUri: string) {
  const ctx = ImageManipulator.manipulate(pickedUri).resize({ width: 512, height: null });
  const image = await ctx.renderAsync();
  const out = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.82 });
  ctx.release();
  image.release();

  const name = `${Date.now().toString(36)}.jpg`;
  if (!native) return { uri: out.uri, name };
  const dir = folder();
  dir.create({ idempotent: true, intermediates: true });
  const dest = new File(dir, name);
  await new File(out.uri).move(dest);
  dir.list().forEach((f) => f.uri !== dest.uri && f.delete());
  return { uri: dest.uri, name };
}

/** Range sur le téléphone une photo déjà envoyée (reconnexion sur un nouveau téléphone). */
export async function saveRemoteAvatar(url: string, name: string) {
  const dir = folder();
  dir.create({ idempotent: true, intermediates: true });
  const dest = new File(dir, name);
  if (dest.exists) return dest.uri;
  const file = await File.downloadFileAsync(url, dest);
  dir.list().forEach((f) => f.uri !== file.uri && f.delete());
  return file.uri;
}

/** Retrouve la photo après une mise à jour de l'app : sur iOS, le chemin du dossier de l'app change. */
export function localAvatarUri(uri: string | null) {
  if (!native || !uri?.includes('/avatars/')) return uri;
  const file = new File(folder(), uri.split('/').pop() ?? '');
  return file.exists ? file.uri : null;
}

/** Supprime la photo gardée sur le téléphone (changement de compte, réinitialisation). */
export function clearLocalAvatars() {
  if (!native) return;
  const dir = folder();
  if (dir.exists) dir.delete();
}
