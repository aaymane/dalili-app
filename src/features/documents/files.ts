import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Les fichiers du coffre sur le téléphone. Avec un compte, rien n'y reste : les copies temporaires (photo prise,
 * scan, aperçu ouvert) sont effacées dès qu'elles ne servent plus. En mode démo, le coffre vit ici, dans le dossier
 * privé de l'app (`dalili-vault`), et disparaît à la déconnexion.
 */

const native = Platform.OS !== 'web';

/** Le dossier du coffre en mode démo. */
export function demoDir() {
  const dir = new Directory(Paths.document, 'dalili-vault');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Le dossier des aperçus ouverts (copies le temps de la lecture). */
function viewDir() {
  const dir = new Directory(Paths.cache, 'dalili-vault-view');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Les octets d'un fichier local (ou d'une adresse `blob:` sur le web). */
export async function readBytes(uri: string): Promise<Uint8Array> {
  if (!native) return new Uint8Array(await (await fetch(uri)).arrayBuffer());
  return new File(uri).bytes();
}

/** Écrit un document du coffre démo ; renvoie son adresse locale. */
export async function writeDemoFile(name: string, bytes: Uint8Array) {
  const file = new File(demoDir(), name);
  if (!file.exists) file.create();
  await file.write(bytes);
  return file.uri;
}

export const demoFileUri = (name: string) => (native ? new File(demoDir(), name).uri : '');

/**
 * Efface une copie temporaire, seulement si elle est dans les dossiers de l'app (jamais une photo de la galerie).
 * Sans erreur : une copie oubliée part avec le cache.
 */
export function discard(uri?: string | null) {
  if (!native || !uri) return;
  // Sur iPhone, tout le conteneur de l'app (Documents, Library/Caches, tmp où le scanner pose ses pages).
  const container = Paths.document.uri.replace(/Documents\/?$/, '');
  const inside = [Paths.cache.uri, Paths.document.uri, container].some((root) => uri.startsWith(root));
  if (!inside) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Déjà parti.
  }
}

/** Vide un dossier de l'app sans erreur. */
function empty(dir: () => Directory) {
  if (!native) return;
  try {
    const d = dir();
    for (const item of d.list()) item.delete();
  } catch {
    // Rien à vider.
  }
}

/** Les aperçus ouverts : effacés en quittant le coffre. */
export const clearViews = () => empty(viewDir);
/** Le coffre démo : effacé à la déconnexion. */
export const clearDemoFiles = () => empty(demoDir);

/** Un nom de fichier lisible pour l'aperçu (« Passeport.pdf »), sans caractère interdit. */
export function readableName(title: string, ext: 'pdf' | 'jpg') {
  const base = title.replace(/[\\/:*?"<>|\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'document';
  return `${base}.${ext}`;
}

/**
 * Ouvre un fichier dans l'aperçu du téléphone : Quick Look sur iPhone (zoom, partage, impression),
 * l'app de lecture choisie sur Android. `remoteUrl` : un lien temporaire, téléchargé d'abord dans le cache.
 */
export async function previewFile(source: { localUri: string } | { remoteUrl: string }, title: string, ext: 'pdf' | 'jpg') {
  const mimeType = ext === 'pdf' ? 'application/pdf' : 'image/jpeg';
  let file: File;
  if ('remoteUrl' in source) {
    clearViews();
    file = await File.downloadFileAsync(source.remoteUrl, new File(viewDir(), readableName(title, ext)), { idempotent: true });
  } else {
    file = new File(source.localUri);
  }
  await file.preview({ title, mimeType });
}
