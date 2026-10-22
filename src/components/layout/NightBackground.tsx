import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { TiltingStarField } from '@/components/brand/StarField';
import { gradients } from '@/theme/tokens';

/**
 * Fond nuit des moments de marque (bienvenue, onboarding, chargement) : dégradé bleu profond et ciel étoilé
 * qui suit l'inclinaison du téléphone. `ignite` : les étoiles s'allument depuis le centre (ouverture de l'app).
 */
export function NightBackground({ ignite = false }: { ignite?: boolean }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={gradients.night} style={StyleSheet.absoluteFill} />
      <TiltingStarField ignite={ignite} />
    </View>
  );
}
