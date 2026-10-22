import AsyncStorage from '@react-native-async-storage/async-storage';
import * as aesjs from 'aes-js';
import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Stockage chiffré de la session Supabase (modèle recommandé par Supabase pour Expo).
 * La session (jetons de connexion) est chiffrée en AES-256 et rangée dans AsyncStorage ;
 * seule la clé, trop petite pour la limite d'environ 2 Ko du trousseau, va dans SecureStore.
 * Une nouvelle clé à chaque écriture : jamais deux chiffrements avec la même clé.
 * La clé reste sur CE téléphone (pas de copie dans une sauvegarde iCloud) et ne se lit
 * que téléphone déverrouillé.
 */
const keyOptions: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

// UTF-8 exact, emojis compris (celui d'aes-js abîme les caractères sur 4 octets).
const toBytes = (s: string) => {
  const enc = encodeURIComponent(s);
  const bytes: number[] = [];
  for (let i = 0; i < enc.length; i++) {
    if (enc[i] === '%') {
      bytes.push(parseInt(enc.slice(i + 1, i + 3), 16));
      i += 2;
    } else bytes.push(enc.charCodeAt(i));
  }
  return Uint8Array.from(bytes);
};
const fromBytes = (b: Uint8Array) => decodeURIComponent(Array.from(b, (x) => `%${x.toString(16).padStart(2, '0')}`).join(''));

async function encrypt(key: string, value: string) {
  const secret = getRandomBytes(32);
  const cipher = new aesjs.ModeOfOperation.ctr(secret, new aesjs.Counter(1));
  const encrypted = cipher.encrypt(toBytes(value));
  await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(secret), keyOptions);
  return aesjs.utils.hex.fromBytes(encrypted);
}

function decrypt(secretHex: string, value: string) {
  const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(secretHex), new aesjs.Counter(1));
  return fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(value)));
}

export const secureSessionStorage = {
  async getItem(key: string) {
    const stored = await AsyncStorage.getItem(key);
    if (!stored) return null;
    const secret = await SecureStore.getItemAsync(key, keyOptions);
    if (secret) return decrypt(secret, stored);
    // Session gardée en clair par une ancienne version de l'app : on la chiffre au passage.
    if (stored.startsWith('{') || stored.startsWith('"')) {
      await secureSessionStorage.setItem(key, stored);
      return stored;
    }
    // Clé perdue (téléphone restauré depuis une sauvegarde) : session illisible, on repart à zéro.
    await AsyncStorage.removeItem(key);
    return null;
  },
  async setItem(key: string, value: string) {
    await AsyncStorage.setItem(key, await encrypt(key, value));
  },
  async removeItem(key: string) {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key, keyOptions);
  },
};
