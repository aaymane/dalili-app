import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Prépare la photo d'un document avant l'envoi : 1 600 px de large (lisible, sous 5 Mo) et réencodée en JPEG,
 * ce qui retire les métadonnées (position GPS, appareil, date).
 */
export async function prepareDocument(pickedUri: string) {
  const ctx = ImageManipulator.manipulate(pickedUri).resize({ width: 1600, height: null });
  const image = await ctx.renderAsync();
  const out = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  ctx.release();
  image.release();
  return out.uri;
}
