import { Platform } from 'react-native';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/lib/storage';

/**
 * Verrou du coffre : Face ID, empreinte ou code du téléphone (expo-local-authentication). Activé par défaut quand le
 * téléphone a un code. Le coffre se referme quand on le quitte ou que l'app passe en arrière-plan.
 */

export type LockKind = 'faceId' | 'fingerprint' | 'passcode';
/** `none` : aucun code sur le téléphone ; `unavailable` : module absent de ce build (ou web). */
export type LockSupport = LockKind | 'none' | 'unavailable';

type LocalAuth = typeof import('expo-local-authentication');
let mod: LocalAuth | null | undefined;

async function localAuth(): Promise<LocalAuth | null> {
  if (mod !== undefined) return mod;
  if (Platform.OS === 'web') return (mod = null);
  try {
    mod = await import('expo-local-authentication');
  } catch {
    mod = null;
  }
  return mod;
}

/** Ce que le téléphone sait faire pour verrouiller. */
export async function lockSupport(): Promise<LockSupport> {
  const m = await localAuth();
  if (!m) return 'unavailable';
  try {
    const level = await m.getEnrolledLevelAsync();
    if (level === m.SecurityLevel.NONE) return 'none';
    if (level >= m.SecurityLevel.BIOMETRIC_WEAK) {
      const types = await m.supportedAuthenticationTypesAsync();
      if (types.includes(m.AuthenticationType.FACIAL_RECOGNITION)) return 'faceId';
      if (types.includes(m.AuthenticationType.FINGERPRINT)) return 'fingerprint';
    }
    return 'passcode';
  } catch {
    return 'unavailable';
  }
}

export const canLock = (s: LockSupport | 'checking'): s is LockKind => s === 'faceId' || s === 'fingerprint' || s === 'passcode';

/** Le temps d'un scan, d'une photo ou de l'invite Face ID, l'app quitte l'écran sans refermer le coffre. */
let busy = 0;
export async function keepOpen<T>(fn: () => Promise<T>): Promise<T> {
  busy++;
  try {
    return await fn();
  } finally {
    setTimeout(() => {
      busy--;
    }, 1000);
  }
}
export const isBusy = () => busy > 0;

/** Demande Face ID (ou le code du téléphone si Face ID échoue). */
export async function authenticate(promptMessage: string, cancelLabel: string): Promise<boolean> {
  const m = await localAuth();
  if (!m) return false;
  return keepOpen(async () => {
    try {
      const r = await m.authenticateAsync({ promptMessage, cancelLabel, disableDeviceFallback: false });
      return r.success;
    } catch {
      return false;
    }
  });
}

/** Le choix de verrouiller, gardé sur le téléphone. */
export const useVaultLockPref = create<{ enabled: boolean; setEnabled: (v: boolean) => void }>()(
  persist((set) => ({ enabled: true, setEnabled: (enabled) => set({ enabled }) }), { name: 'dalili.vault-lock', storage: persistStorage }),
);

/** Ouvert ou fermé, pour cette visite du coffre seulement (jamais gardé). */
export const useVaultSession = create<{ unlocked: boolean }>(() => ({ unlocked: false }));
export const lockVault = () => useVaultSession.setState({ unlocked: false });
export const unlockVault = () => useVaultSession.setState({ unlocked: true });
