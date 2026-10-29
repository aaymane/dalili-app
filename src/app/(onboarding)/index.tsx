import { router } from 'expo-router';
import { Pencil, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Trans } from 'react-i18next';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { LogoMark } from '@/components/brand/Logo';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ArrowRight } from '@/components/ui/DirIcons';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { AvatarSheet } from '@/features/profile/components/AvatarSheet';
import { useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';
import { makeStyles, useTheme } from '@/theme/scheme';
import { pop, rise } from '@/theme/motion';

/** « Compte créé » — accueil personnalisé + photo de profil. */
export default function Welcome() {
  const { c, gradients } = useTheme();
  const styles = useStyles();
  const profile = useProfile((s) => s.profile);
  const [sheet, setSheet] = useState(false);
  const t = useT();
  const name = profile.firstName || t('onboarding.welcome.you');

  return (
    <Screen top={gradients.sky} bg="#fff" footer={<Button label={t('onboarding.welcome.cta')} icon={<ArrowRight size={18} color="#fff" />} onPress={() => router.push('/(onboarding)/situation')} />}>
      <View style={styles.wrap}>
        <Animated.View entering={pop()}>
          <PressableScale
            onPress={() => setSheet(true)}
            accessibilityRole="button"
            accessibilityLabel={profile.avatarUri ? t('onboarding.welcome.changePhoto') : t('profile.addPhoto')}>
            <Avatar name={`${profile.firstName} ${profile.lastName}`} uri={profile.avatarUri} size={132} color={c.electricLight} />
            <View style={styles.plus}>
              {profile.avatarUri ? <Pencil size={16} color="#fff" strokeWidth={2.5} /> : <Plus size={18} color="#fff" strokeWidth={3} />}
            </View>
          </PressableScale>
        </Animated.View>
        <Animated.View entering={rise(150)} style={{ alignItems: 'center', gap: 6 }}>
          <View style={styles.created}>
            <Text variant="smallStrong" color={c.mentor}>
              {t('onboarding.welcome.created')}
            </Text>
            <View style={styles.square} />
          </View>
          <Text variant="hero" align="center" style={{ fontSize: 32, lineHeight: 38 }}>
            {t('onboarding.welcome.hello')}
            {'\n'}
            <Text variant="hero" color={c.electric} style={{ fontSize: 32, lineHeight: 38 }}>
              {name.toUpperCase()}.
            </Text>
          </Text>
          <Text variant="body" color={c.subtle} align="center" style={{ maxWidth: 300 }}>
            <Trans i18nKey="onboarding.welcome.intro" components={{ brand: <Text variant="bodyStrong" color={c.electric} /> }} />
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

const useStyles = makeStyles(({ c, shadow }) => ({
  wrap: { alignItems: 'center', gap: 22, paddingTop: 36 },
  plus: {
    position: 'absolute',
    end: 4,
    bottom: 8,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.navyInk,
    borderWidth: 3,
    borderColor: c.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.md,
  },
  created: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  square: { width: 10, height: 10, borderRadius: 2, backgroundColor: c.mentor },
}));
