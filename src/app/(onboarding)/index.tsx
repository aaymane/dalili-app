import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { ArrowRight, Camera, ImageIcon, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';

import { LogoMark } from '@/components/brand/Logo';
import { BottomSheet } from '@/components/feedback/BottomSheet';
import { toast } from '@/components/feedback/Toast';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useProfile } from '@/features/profile/store';
import { gradients, palette, shadow } from '@/theme/tokens';

/** « Compte créé » — accueil personnalisé + photo de profil. */
export default function Welcome() {
  const profile = useProfile((s) => s.profile);
  const update = useProfile((s) => s.update);
  const [sheet, setSheet] = useState(false);
  const name = profile.firstName || 'toi';

  const pick = async (camera: boolean) => {
    setSheet(false);
    try {
      if (camera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return toast('Autorise l’appareil photo dans les réglages.', 'info');
      }
      const res = camera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      if (!res.canceled && res.assets[0]) {
        update({ avatarUri: res.assets[0].uri });
        toast('Belle photo !');
      }
    } catch {
      toast('Impossible d’ouvrir la photo.', 'info');
    }
  };

  return (
    <Screen top={gradients.sky} bg="#fff" footer={<Button label="Allons-y" icon={<ArrowRight size={18} color="#fff" />} onPress={() => router.push('/(onboarding)/situation')} />}>
      <View style={styles.wrap}>
        <Animated.View entering={ZoomIn.springify().damping(12)}>
          <PressableScale onPress={() => setSheet(true)} accessibilityLabel="Ajouter une photo de profil">
            <Avatar name={`${profile.firstName} ${profile.lastName}`} uri={profile.avatarUri} size={132} color={palette.electricLight} />
            <View style={styles.plus}>
              <Plus size={18} color="#fff" strokeWidth={3} />
            </View>
          </PressableScale>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(150)} style={{ alignItems: 'center', gap: 6 }}>
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
        <Animated.View entering={FadeInDown.delay(320).springify()} style={{ marginTop: 30 }}>
          <LogoMark size={120} />
        </Animated.View>
      </View>

      <BottomSheet visible={sheet} onClose={() => setSheet(false)}>
        <View style={{ gap: 12 }}>
          <Button label="Prendre une photo" variant="secondary" iconLeft={<Camera size={18} color={palette.navy} />} onPress={() => pick(true)} />
          <Button label="Choisir dans la galerie" variant="secondary" iconLeft={<ImageIcon size={18} color={palette.navy} />} onPress={() => pick(false)} />
          <Button label="Annuler" variant="secondary" onPress={() => setSheet(false)} />
        </View>
      </BottomSheet>
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
