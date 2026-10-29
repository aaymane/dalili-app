import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { View } from 'react-native';

import { ArrowRight } from '@/components/ui/DirIcons';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

/** Bandeau « Demande à l'IA de Dalili ». */
export function AiCta({ prompt }: { prompt?: string }) {
  const { gradients } = useTheme();
  const styles = useStyles();
  const t = useT();
  return (
    <PressableScale onPress={() => router.navigate({ pathname: '/(app)/(tabs)/ia', params: prompt ? { q: prompt } : {} })} haptic="press">
      <LinearGradient colors={gradients.ai} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.icon}>
          <Sparkles size={18} color="#fff" fill="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="h3" color="#fff">
            {t('home.askAi')}
          </Text>
          <Text variant="small" color="rgba(255,255,255,0.75)" numberOfLines={1}>
            {t('home.askAiSub')}
          </Text>
        </View>
        <ArrowRight size={20} color="#fff" />
      </LinearGradient>
    </PressableScale>
  );
}

const useStyles = makeStyles(({ shadow }) => ({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.xl, ...shadow.glow, shadowColor: '#5B5CF0' },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
}));
