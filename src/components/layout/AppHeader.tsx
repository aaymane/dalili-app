import { router } from 'expo-router';
import { Bell, MessageCircle } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { LogoMark } from '@/components/brand/Logo';
import { useScrollY } from '@/components/motion/scroll';
import { Avatar } from '@/components/ui/Avatar';
import { ChevronLeft } from '@/components/ui/DirIcons';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useUnreadCount } from '@/features/messages/hooks';
import { useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';
import { makeStyles, useTheme } from '@/theme/scheme';

type Props = {
  back?: boolean;
  title?: string;
  pill?: string;
  onBack?: () => void;
  hideActions?: boolean;
};

/** En-tête commun : logo (ou retour) à gauche, messages, notifications et avatar à droite. */
export function AppHeader({ back, title, pill, onBack, hideActions }: Props) {
  const { c } = useTheme();
  const styles = useStyles();
  const profile = useProfile((s) => s.profile);
  const t = useT();
  const scrollY = useScrollY();
  // Dès qu'on défile, un liseré sépare l'en-tête du contenu qui passe dessous (rien en haut de page).
  const edge = useAnimatedStyle(() => ({ opacity: interpolate(scrollY?.get() ?? 0, [0, 24], [0, 1], Extrapolation.CLAMP) }));
  return (
    <View style={styles.row}>
      <Animated.View pointerEvents="none" style={[styles.edge, edge]} />
      <View style={styles.left}>
        {back ? (
          <PressableScale onPress={onBack ?? (() => router.back())} style={styles.round} accessibilityLabel={t('common.back')}>
            <ChevronLeft size={20} color={c.navy} />
          </PressableScale>
        ) : (
          <PressableScale onPress={() => router.navigate('/(app)/(tabs)')} accessibilityLabel={t('common.home')} haptic={false}>
            <LogoMark size={30} />
          </PressableScale>
        )}
        {pill ? (
          <View style={styles.pill}>
            <Text variant="smallStrong" color={c.electric}>
              {pill}
            </Text>
          </View>
        ) : title ? (
          <Text variant="h3" numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </View>
      {!hideActions && (
        <View style={styles.actions}>
          <MessagesButton />
          <PressableScale onPress={() => router.push('/(app)/notifications')} style={styles.round} accessibilityLabel={t('common.notifications')}>
            <Bell size={18} color={c.navy} />
            <View style={styles.badge} />
          </PressableScale>
          <PressableScale onPress={() => router.navigate('/(app)/(tabs)/profil')} accessibilityLabel={t('common.myProfile')}>
            <Avatar name={`${profile.firstName} ${profile.lastName}`} uri={profile.avatarUri} size={38} ring="#fff" />
          </PressableScale>
        </View>
      )}
    </View>
  );
}

/** Messages, avec le nombre de non lus du rôle actif. */
function MessagesButton() {
  const { c } = useTheme();
  const styles = useStyles();
  const unread = useUnreadCount();
  const t = useT();
  return (
    <PressableScale
      onPress={() => router.push('/(app)/messages')}
      style={styles.round}
      accessibilityLabel={unread ? t('common.messagesUnread', { count: unread }) : t('common.messages')}>
      <MessageCircle size={18} color={c.navy} />
      {unread ? (
        <View style={styles.count}>
          <Text variant="caption" color={c.white} style={{ fontSize: 10, lineHeight: 12 }}>
            {unread > 9 ? '9+' : unread}
          </Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

const useStyles = makeStyles(({ c, shadow, scheme }) => ({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, zIndex: 1 },
  edge: { position: 'absolute', left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth, backgroundColor: c.lineStrong },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  round: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  count: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: c.danger, borderWidth: 1.5, borderColor: c.card },
  badge: { position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: 4, backgroundColor: c.danger, borderWidth: 1.5, borderColor: c.card },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5, borderColor: 'rgba(1,77,248,0.35)', backgroundColor: scheme === 'dark' ? 'rgba(20,27,49,0.7)' : 'rgba(255,255,255,0.6)' },
}));
