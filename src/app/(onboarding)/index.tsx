import { router } from 'expo-router';
import { ArrowRight, Pencil, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { LogoMark } from '@/components/brand/Logo';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { AvatarSheet } from '@/features/profile/components/AvatarSheet';
import { useProfile } from '@/features/profile/store';
import { gradients, palette, shadow } from '@/theme/tokens';
import { pop, rise } from '@/theme/motion';

/** « Compte créé » — accueil personnalisé + photo de profil. */
export default function Welcome() {
  const profile = useProfile((s) => s.profile);
  const [sheet, setSheet] = useState(false);
  const name = profile.firstName || 'toi';

  return (
    <Screen top={gradients.sky} bg="#fff" footer={<Button label="Allons-y" icon={<ArrowRight size={18} color="#fff" />} onPress={() => router.push('/(onboarding)/situation')} />}>
      <View style={styles.wrap}>
        <Animated.View entering={pop()}>
          <PressableScale
            onPress={() => setSheet(true)}
            accessibilityRole="button"
            accessibilityLabel={profile.avatarUri ? 'Changer ta photo de profil' : 'Ajouter une photo de profil'}>
            <Avatar name={`${profile.firstName} ${profile.lastName}`} uri={profile.avatarUri} size={132} color={palette.electricLight} />
            <View style={styles.plus}>
              {profile.avatarUri ? <Pencil size={16} color="#fff" strokeWidth={2.5} /> : <Plus size={18} color="#fff" strokeWidth={3} />}
            </View>
          </PressableScale>
        </Animated.View>
        <Animated.View entering={rise(150)} style={{ alignItems: 'center', gap: 6 }}>
          <View style={styles.created}>
            <Text variant="smallStrong" color={palette.mentor}>
              Compte créé
            </Text>
            <View style={styles.square} />
          </View>
          <Text variant="hero" align="center" style={{ fontSize: 32, lineHeight: 38 }}>
            Bienvenue,{'\n'}
            <Text variant="hero" color={palette.electric} style={{ fontSize: 32, lineHeight: 38 }}>
              {name.toUpperCase()}.
            </Text>
          </Text>
          <Text variant="body" color={palette.subtle} align="center" style={{ maxWidth: 300 }}>
            Encore quelques questions et on configure <Text variant="bodyStrong" color={palette.electric}>DALILI</Text> rien que pour toi.
          </Text>
        </Animated.View>
        <Animated.View entering={rise(320)} style={{ marginTop: 30 }}>
          <LogoMark size={120} />
        </Animated.View>
      </View>

      <AvatarSheet visible={sheet} onClose={() => setSheet(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 22, paddingTop: 36 },
  plus: {
    position: 'absolute',
    right: 4,
    bottom: 8,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.navyInk,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.md,
  },
  created: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  square: { width: 10, height: 10, borderRadius: 2, backgroundColor: palette.mentor },
});
