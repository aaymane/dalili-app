import * as ImagePicker from 'expo-image-picker';

export type PickedPhoto = { uri: string; name: string };
export type PickedPdf = { uri: string; name: string; size: number };

/**
 * Une photo depuis l'appareil photo ou la galerie. `null` : annulé ; `'denied'` : l'accès à l'appareil photo est
 * refusé (l'écran explique où le rendre dans les Réglages).
 */
export async function pickPhoto(source: 'camera' | 'library'): Promise<PickedPhoto | null | 'denied'> {
  if (source === 'camera' && !(await ImagePicker.requestCameraPermissionsAsync()).granted) return 'denied';
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  const asset = res.canceled ? null : res.assets[0];
  if (!asset) return null;
  // Toujours un .jpg : la photo est réencodée en JPEG avant l'envoi.
  const base = (asset.fileName ?? 'photo').replace(/\.[a-z0-9]+$/i, '');
  return { uri: asset.uri, name: `${base}.jpg` };
}

/**
 * Un PDF depuis les fichiers du téléphone. `'unavailable'` : ce build de l'app n'a pas encore le sélecteur de
 * fichiers (module chargé au moment du choix, comme pour les documents mentor).
 */
export async function pickPdf(): Promise<PickedPdf | null | 'unavailable'> {
  let DocumentPicker: typeof import('expo-document-picker');
  try {
    DocumentPicker = await import('expo-document-picker');
  } catch {
    return 'unavailable';
  }
  const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true }).catch(() => null);
  const asset = !res || res.canceled ? null : res.assets[0];
  if (!asset) return null;
  return { uri: asset.uri, name: asset.name || 'document.pdf', size: asset.size ?? 0 };
}
