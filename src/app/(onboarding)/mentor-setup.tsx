import { router } from 'expo-router';
import { ArrowRight, ChevronRight, GraduationCap, Home, LifeBuoy } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight, FadeOutLeft } from 'react-native-reanimated';

import { Screen } from '@/components/layout/Screen';
import { StepHeader } from '@/components/layout/StepHeader';
import { Button } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Tag } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import { CityPicker } from '@/features/profile/components/CityPicker';
import { useProfile } from '@/features/profile/store';
import { gradients, palette, radius, shadow } from '@/theme/tokens';

/** Parcours « Je vis déjà en France » : ville → comment aider (Mentor / Hôte / j'ai besoin d'aide). */
export default function MentorSetup() {
  const profile = useProfile((s) => s.profile);
  const update = useProfile((s) => s.update);
  const [i, setI] = useState(0);

  return (
    <Screen
      top={i === 0 ? gradients.mint : gradients.lilac}
      bg="#fff"
      padded={false}
      header={
        <StepHeader
          animKey={i}
          overline={`Étape ${i + 1} / 2 · DALILI`}
          title={i === 0 ? 'Dans quelle ville\nvis-tu ?' : 'Comment veux-tu\naider ?'}
          subtitle={i === 0 ? 'On te connecte aux étudiants qui arrivent près de chez toi.' : 'Tu pourras faire les deux plus tard, depuis ton profil.'}
          step={i}
          total={2}
          accent={palette.mentor}
          onBack={() => (i ? setI(0) : router.back())}
        />
      }
      footer={i === 0 ? <Button label="Continuer" accent={gradients.mentor} icon={<ArrowRight size={18} color="#fff" />} disabled={!profile.mentorCity} onPress={() => setI(1)} /> : undefined}>
      <Animated.View key={i} entering={FadeInRight.springify().damping(18)} exiting={FadeOutLeft.duration(140)} style={{ paddingHorizontal: 20, gap: 14 }}>
        {i === 0 ? (
          <CityPicker allowUnknown={false} value={profile.mentorCity} onChange={(c) => update({ mentorCity: c, destinationCity: c })} />
        ) : (
          <>
            <Animated.View entering={FadeInDown.delay(80).springify()}>
              <PressableScale
                haptic="press"
                onPress={() => {
                  update({ roles: ['mentor', 'student'], activeRole: 'mentor' });
                  router.replace({ pathname: '/(onboarding)/loading', params: { role: 'mentor' } });
                }}
                style={[styles.choice, { backgroundColor: '#E8EEFF' }]}>
                <IconTile size={56} colors={['#5B8BFF', '#1F56F5']} radius={18}>
                  <GraduationCap size={26} color="#fff" />
                </IconTile>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="h3" color={palette.electric}>
                    Devenir Mentor
                  </Text>
                  <Text variant="small" color={palette.subtle}>
                    Guide les étudiants : démarches, conseils, ton expérience
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <Tag label="Visa" />
                    <Tag label="Logement" />
                    <Tag label="CV" />
                  </View>
                </View>
                <ChevronRight size={18} color={palette.electric} />
              </PressableScale>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(160).springify()}>
              <View style={[styles.choice, { backgroundColor: '#E3F7EF', opacity: 0.85 }]}>
                <IconTile size={56} colors={['#34D399', palette.mentor]} radius={18}>
                  <Home size={26} color="#fff" />
                </IconTile>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="h3" color={palette.mentor}>
                    Devenir Hôte
                  </Text>
                  <Text variant="small" color={palette.subtle}>
                    Cette fonctionnalité arrive bientôt
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <Tag label="Hébergement" color="#0F7A55" bg="#C9EEDD" />
                    <Tag label="Accueil" color="#0F7A55" bg="#C9EEDD" />
                  </View>
                </View>
              </View>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).springify()}>
              <PressableScale
                onPress={() => {
                  update({ roles: ['student'], activeRole: 'student', destinationCity: profile.mentorCity });
                  router.push('/(onboarding)/student-setup');
                }}
                style={styles.help}>
                <LifeBuoy size={18} color={palette.electric} />
                <Text variant="smallStrong" color={palette.electric} style={{ flex: 1 }}>
                  En fait, je viens d’arriver et j’ai besoin d’aide
                </Text>
                <ChevronRight size={16} color={palette.electric} />
              </PressableScale>
            </Animated.View>
          </>
        )}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  choice: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.xl, ...shadow.sm },
  help: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.lg, borderWidth: 1.5, borderColor: '#D6E0FF', borderStyle: 'dashed' },
});
