import { router, Stack } from 'expo-router';
import { useEffect } from 'react';

import { useJourneyStore } from '@/features/journey/store';
import { palette } from '@/theme/tokens';

/** Le visa vient d'être coché : on ouvre le déblocage du billet une fois la fiche de l'étape refermée. */
function useTicketUnlock() {
  const pending = useJourneyStore((s) => s.ticketPending);
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => router.push('/(app)/billet'), 1000);
    return () => clearTimeout(t);
  }, [pending]);
}

export default function AppLayout() {
  useTicketUnlock();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="etape/[id]"
        options={{ presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetCornerRadius: 30, sheetGrabberVisible: true, contentStyle: { backgroundColor: '#fff' } }}
      />
      <Stack.Screen name="role" options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', sheetCornerRadius: 30, sheetGrabberVisible: true, contentStyle: { backgroundColor: '#fff' } }} />
      <Stack.Screen name="appel/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      {/* Écran normal (pas une modale native) : les confettis de la racine passent par-dessus. */}
      <Stack.Screen name="billet" options={{ animation: 'fade', gestureEnabled: false, contentStyle: { backgroundColor: palette.navyDeep } }} />
    </Stack>
  );
}
