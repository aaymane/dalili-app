import { Stack } from 'expo-router';

import { VaultGate } from '@/features/documents/components/VaultGate';
import { useCelebrateWhenReady } from '@/features/documents/hooks';
import { useTheme } from '@/theme/scheme';

/** Le coffre « Mes documents » : tous ses écrans derrière le même verrou (Face ID ou code du téléphone). */
export default function VaultLayout() {
  const { c } = useTheme();
  useCelebrateWhenReady();
  return (
    <VaultGate>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
    </VaultGate>
  );
}
