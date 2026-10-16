import { Montserrat_500Medium } from '@expo-google-fonts/montserrat/500Medium';
import { Montserrat_600SemiBold } from '@expo-google-fonts/montserrat/600SemiBold';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat/700Bold';
import { Montserrat_900Black } from '@expo-google-fonts/montserrat/900Black';
import { OpenSans_400Regular } from '@expo-google-fonts/open-sans/400Regular';
import { OpenSans_600SemiBold } from '@expo-google-fonts/open-sans/600SemiBold';
import { OpenSans_700Bold } from '@expo-google-fonts/open-sans/700Bold';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConfettiLayer } from '@/components/feedback/Confetti';
import { ToastHost } from '@/components/feedback/Toast';
import { useAuth } from '@/features/auth/store';
import { GlossarySheetHost } from '@/features/guides/components/GlossarySheet';
import { useProfile } from '@/features/profile/store';
import { queryClient } from '@/lib/query';
import { useHydrated } from '@/lib/useHydrated';
import { palette } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_900Black,
    OpenSans_400Regular,
    OpenSans_600SemiBold,
    OpenSans_700Bold,
  });
  const hydrated = useHydrated();
  const status = useAuth((s) => s.status);
  const init = useAuth((s) => s.init);
  const onboardingDone = useProfile((s) => s.onboardingDone);

  useEffect(() => {
    if (hydrated) return init();
  }, [hydrated, init]);

  const ready = fontsLoaded && hydrated && status !== 'loading';
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: palette.navyDeep }} />;

  const signedIn = status === 'signedIn';

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: palette.bg } }}>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          <Stack.Protected guard={signedIn && !onboardingDone}>
            <Stack.Screen name="(onboarding)" />
          </Stack.Protected>
          <Stack.Protected guard={signedIn && onboardingDone}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
        </Stack>
        <GlossarySheetHost />
        <ConfettiLayer />
        <ToastHost />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
