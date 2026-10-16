import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChevronRight, Globe2, Home } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoOrb } from '@/components/brand/LogoOrb';
import { NightBackground } from '@/components/layout/NightBackground';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useProfile } from '@/features/profile/store';
import { palette } from '@/theme/tokens';

function SituationCard({ title, text, badge, colors, icon, onPress, delay }: { title: string; text: string; badge: string; colors: [string, string]; icon: ReactNode; onPress: () => void; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(16)}>
      <PressableScale onPress={onPress} haptic="press" style={styles.card}>
        <LinearGradient colors={colors} style={styles.tile}>
          {icon}
        </LinearGradient>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="h3" color="#fff">
            {title}
          </Text>
          <Text variant="small" color="rgba(255,255,255,0.6)">
            {text}
          </Text>
          <View style={[styles.badge, { borderColor: colors[0] }]}>
            <View style={[styles.badgeDot, { backgroundColor: colors[0] }]} />
            <Text variant="caption" color={colors[0]} style={{ fontSize: 9.5, letterSpacing: 0.6 }}>
              {badge}
            </Text>
          </View>
        </View>
        <ChevronRight size={18} color="rgba(255,255,255,0.5)" />
      </PressableScale>
    </Animated.View>
  );
}

/** « Où vis-tu en ce moment ? » — aiguille vers le parcours Étudiant ou Mentor/Hôte. */
export default function Situation() {
  const insets = useSafeAreaInsets();
  const update = useProfile((s) => s.update);
  return (
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom + 20 }}>
      <NightBackground />
      <View style={styles.hero}>
        <Animated.View entering={FadeInUp.springify()}>
          <LogoOrb size={120} />
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(120)} style={{ alignItems: 'center', gap: 8 }}>
          <Text variant="overline" color="#7FA6FF">
            DALILI
          </Text>
          <Text variant="hero" color="#fff" align="center">
            Où vis-tu{'\n'}en ce moment ?
          </Text>
          <Text variant="small" color="rgba(255,255,255,0.55)" align="center">
            On adapte toute l’expérience selon ta situation
          </Text>
        </Animated.View>
      </View>
      <View style={{ gap: 14, paddingHorizontal: 20, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <SituationCard
          title="Je vis à l’étranger"
          text="J’arrive bientôt en France pour mes études"
          badge="ÉTUDIANT"
          colors={['#5B8BFF', '#1F56F5']}
          icon={<Globe2 size={26} color="#fff" />}
          delay={250}
          onPress={() => {
            update({ situation: 'abroad', activeRole: 'student', roles: ['student'] });
            router.push('/(onboarding)/student-setup');
          }}
        />
        <SituationCard
          title="Je vis déjà en France"
          text="Je peux aider les nouveaux arrivants"
          badge="MENTOR · HÔTE"
          colors={['#34D399', palette.mentor]}
          icon={<Home size={26} color="#fff" />}
          delay={340}
          onPress={() => {
            update({ situation: 'in_france' });
            router.push('/(onboarding)/mentor-setup');
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tile: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
});
