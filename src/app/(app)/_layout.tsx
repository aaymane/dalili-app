import { Stack } from 'expo-router';

import { palette } from '@/theme/tokens';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="etape/[id]"
        options={{ presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetCornerRadius: 30, sheetGrabberVisible: true, contentStyle: { backgroundColor: '#fff' } }}
      />
      <Stack.Screen name="role" options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', sheetCornerRadius: 30, sheetGrabberVisible: true, contentStyle: { backgroundColor: '#fff' } }} />
      <Stack.Screen name="appel/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
    </Stack>
  );
}
