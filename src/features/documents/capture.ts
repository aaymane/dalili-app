import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { MAX_VAULT_BYTES, prepareJpeg } from '@/data/media';
import { pickDocument, pickPhoto } from '@/lib/pick';

import { discard, readBytes } from './files';
import { jpegsToPdf } from './pdf';

/**
 * Faire entrer un papier dans le coffre : le scanner (bords détectés, perspective redressée, plusieurs pages),
 * l'appareil photo, la galerie, ou un fichier. Tout ressort prêt à envoyer : les photos réencodées en JPEG
 * (position GPS, appareil et date retirés), un scan de plusieurs pages assemblé en un seul PDF.
 */

export type Source = 'scan' | 'camera' | 'library' | 'file';

export type Prepared = {
  bytes: Uint8Array;
  type: 'image/jpeg' | 'application/pdf';
  source: Source;
  /** Le nom du fichier importé (sans extension), pour proposer un titre. */
  fileName?: string;
  /** Nombre de pages d'un scan. */
  pages?: number;
  /** Une image locale pour l'aperçu avant d'enregistrer (première page d'un scan, photo). */
  preview?: string;
};

export type CaptureResult = Prepared | null | 'denied' | 'unavailable' | 'unsupported' | 'tooBig' | 'failed';

/** Au-delà, un scan devient trop lourd (≈ 300 Ko par page). */
export const MAX_SCAN_PAGES = 20;
/** Largeur des pages et des photos : un A4 reste lisible, le fichier reste léger. */
const WIDTH = 1600;

const asFileUri = (p: string) => (/^(file|content|data|blob|https?):/.test(p) ? p : `file://${p}`);

/**
 * Le scanner du téléphone (VisionKit sur iPhone, ML Kit sur Android). `'unavailable'` : cette version de l'app
 * ne l'a pas encore (Expo Go, ancien build, web) : l'écran propose l'appareil photo à la place.
 */
async function scanPages(): Promise<string[] | null | 'denied' | 'unavailable'> {
  if (Platform.OS === 'web') return 'unavailable';
  let mod: typeof import('react-native-document-scanner-plugin');
  try {
    mod = await import('react-native-document-scanner-plugin');
  } catch {
    return 'unavailable';
  }
  // Android : le scanner de Google n'a pas besoin de la permission ; iPhone : on la demande avant.
  if (Platform.OS === 'ios' && !(await ImagePicker.requestCameraPermissionsAsync()).granted) return 'denied';
  const res = await mod.default
    .scanDocument({ croppedImageQuality: 85, maxNumDocuments: MAX_SCAN_PAGES, responseType: mod.ResponseType.ImageFilePath })
    .catch(() => null);
  if (!res || res.status === mod.ScanDocumentResponseStatus.Cancel || !res.scannedImages?.length) return null;
  return res.scannedImages.map(asFileUri);
}

async function jpegBytes(uri: string) {
  const ready = await prepareJpeg(uri, WIDTH);
  return { ready, bytes: await readBytes(ready) };
}

export async function capture(source: Source): Promise<CaptureResult> {
  try {
    if (source === 'scan') {
      const pages = await scanPages();
      if (!pages || typeof pages === 'string') return pages;
      const kept = pages.slice(0, MAX_SCAN_PAGES);
      const jpegs: Uint8Array[] = [];
      let preview: string | undefined;
      for (const [i, page] of kept.entries()) {
        const { ready, bytes } = await jpegBytes(page);
        jpegs.push(bytes);
        if (i === 0) preview = ready;
        else discard(ready);
      }
      pages.forEach(discard);
      const bytes = jpegsToPdf(jpegs);
      if (bytes.length > MAX_VAULT_BYTES) {
        discard(preview);
        return 'tooBig';
      }
      return { bytes, type: 'application/pdf', source, pages: kept.length, preview };
    }

    if (source === 'camera' || source === 'library') {
      const photo = await pickPhoto(source);
      if (!photo || photo === 'denied') return photo;
      const { ready, bytes } = await jpegBytes(photo.uri);
      discard(photo.uri);
      return { bytes, type: 'image/jpeg', source, preview: ready, fileName: source === 'library' ? photo.name.replace(/\.jpg$/i, '') : undefined };
    }

    const picked = await pickDocument();
    if (!picked || typeof picked === 'string') return picked;
    const fileName = picked.name.replace(/\.[a-z0-9]+$/i, '');
    if (picked.kind === 'image') {
      const { ready, bytes } = await jpegBytes(picked.uri);
      discard(picked.uri);
      return { bytes, type: 'image/jpeg', source, preview: ready, fileName };
    }
    if (picked.size > MAX_VAULT_BYTES) {
      discard(picked.uri);
      return 'tooBig';
    }
    const bytes = await readBytes(picked.uri);
    discard(picked.uri);
    // Un vrai PDF commence par « %PDF- » : on n'envoie pas un autre fichier renommé.
    const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
    if (!isPdf) return 'unsupported';
    if (bytes.length > MAX_VAULT_BYTES) return 'tooBig';
    return { bytes, type: 'application/pdf', source, fileName };
  } catch {
    return 'failed';
  }
}

/** Oublie l'aperçu local d'un document préparé (enregistré ou abandonné). */
export const discardPrepared = (p?: Prepared | null) => discard(p?.preview);
