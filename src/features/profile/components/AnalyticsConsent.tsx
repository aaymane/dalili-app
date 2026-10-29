import { useSegments } from 'expo-router';
import { BarChart3 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { Button } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { Text } from '@/components/ui/Text';
import { countryOf } from '@/features/journey/steps';
import { useProfile } from '@/features/profile/store';
import { analyticsAvailable, setAnalyticsContext, trackScreen, useAnalyticsConsent } from '@/lib/analytics';
import { useTheme } from '@/theme/scheme';

/** Chaque écran ouvert (par son modèle de route) et le contexte rôle + pays, si l'utilisateur a dit oui. */
export function useAnalyticsTracking() {
  const segments = useSegments();
  const route = segments.join('/');
  const consent = useAnalyticsConsent((s) => s.consent);
  const role = useProfile((s) => s.profile.activeRole);
  const country = useProfile((s) => countryOf(s.profile));

  useEffect(() => {
    if (consent === 'yes') setAnalyticsContext(role, country ?? null);
  }, [consent, role, country]);

  useEffect(() => {
    if (consent === 'yes') trackScreen(route.split('/'));
  }, [route, consent]);
}

/**
 * La question, posée une seule fois, après l'onboarding et un court instant sur l'accueil :
 * aider DALILI avec des statistiques anonymes. Fermer la feuille vaut « non merci ».
 */
export function AnalyticsConsentSheet() {
  const { c } = useTheme();
  const consent = useAnalyticsConsent((s) => s.consent);
  const setConsent = useAnalyticsConsent((s) => s.setConsent);
  const onboarded = useProfile((s) => s.onboardingDone);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!analyticsAvailable || consent !== 'unknown' || !onboarded) return;
    const t = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(t);
  }, [consent, onboarded]);

  const answer = (yes: boolean) => {
    setConsent(yes ? 'yes' : 'no');
    setVisible(false);
  };

  if (!analyticsAvailable) return null;
  return (
    <BottomSheet visible={visible} onClose={() => answer(false)}>
      <View style={{ gap: 16 }}>
        <IconTile icon={BarChart3} tone="blue" size={52} radius={17} />
        <View style={{ gap: 6 }}>
          <Text variant="h2">Tu nous aides à améliorer DALILI ?</Text>
          <Text variant="body" color={c.subtle}>
            Des statistiques anonymes : quels écrans servent, quelles étapes bloquent. Jamais ton nom, ton email, tes messages ni tes questions à Dalili IA.
          </Text>
        </View>
        <View style={{ gap: 10 }}>
          <Button label="Oui, j’aide" onPress={() => answer(true)} />
          <Button label="Non merci" variant="ghost" onPress={() => answer(false)} />
        </View>
        <Text variant="caption" color={c.muted} align="center">
          Tu peux changer d’avis quand tu veux, dans Profil › Confidentialité.
        </Text>
      </View>
    </BottomSheet>
  );
}
