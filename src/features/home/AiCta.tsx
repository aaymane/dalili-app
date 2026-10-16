import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowRight, Sparkles } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { gradients, radius, shadow } from '@/theme/tokens';

/** Bandeau « Demande à l'IA de Dalili ». */
export function AiCta({ prompt }: { prompt?: string }) {
  return (
    <PressableScale onPress={() => router.navigate({ pathname: '/(app)/(tabs)/ia', params: prompt ? { q: prompt } : {} })} haptic="press">
      <LinearGradient colors={gradients.ai} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.icon}>
          <Sparkles size={18} color="#fff" fill="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="h3" color="#fff">
            Demande à l’IA de Dalili
          </Text>
          <Text variant="small" color="rgba(255,255,255,0.75)" numberOfLines={1}>
            Visa, CAF, banque — je t’aide en 30 secondes
          </Text>
        </View>
        <ArrowRight size={20} color="#fff" />
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.xl, ...shadow.glow, shadowColor: '#5B5CF0' },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
});
