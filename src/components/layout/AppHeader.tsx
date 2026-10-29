import { router } from 'expo-router';
import { Bell, ChevronLeft, MessageCircle } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { LogoMark } from '@/components/brand/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useUnreadCount } from '@/features/messages/hooks';
import { RoleSwitch } from '@/features/profile/components/RoleSwitch';
import { useProfile } from '@/features/profile/store';
import { palette, shadow } from '@/theme/tokens';

type Props = {
  back?: boolean;
  title?: string;
  pill?: string;
  onBack?: () => void;
  hideActions?: boolean;
  /** Bascule Étudiant / Mentor (accueils), visible seulement pour qui a les deux rôles. */
  roleSwitch?: boolean;
};

/** En-tête commun : logo (ou retour) à gauche, messages, notifications et avatar à droite. */
export function AppHeader({ back, title, pill, onBack, hideActions, roleSwitch }: Props) {
  const profile = useProfile((s) => s.profile);
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {back ? (
          <PressableScale onPress={onBack ?? (() => router.back())} style={styles.round} accessibilityLabel="Retour">
            <ChevronLeft size={20} color={palette.navy} />
          </PressableScale>
        ) : (
          <PressableScale onPress={() => router.navigate('/(app)/(tabs)')} accessibilityLabel="Accueil" haptic={false}>
            <LogoMark size={30} />
          </PressableScale>
        )}
        {pill ? (
          <View style={styles.pill}>
            <Text variant="smallStrong" color={palette.electric}>
              {pill}
            </Text>
          </View>
        ) : title ? (
          <Text variant="h3" numberOfLines={1}>
            {title}
          </Text>
        ) : roleSwitch ? (
          <RoleSwitch />
        ) : null}
      </View>
      {!hideActions && (
        <View style={styles.actions}>
          <MessagesButton />
          <PressableScale onPress={() => router.push('/(app)/notifications')} style={styles.round} accessibilityLabel="Notifications">
            <Bell size={18} color={palette.navy} />
            <View style={styles.badge} />
          </PressableScale>
          <PressableScale onPress={() => router.navigate('/(app)/(tabs)/profil')} accessibilityLabel="Mon profil">
            <Avatar name={`${profile.firstName} ${profile.lastName}`} uri={profile.avatarUri} size={38} ring="#fff" />
          </PressableScale>
        </View>
      )}
    </View>
  );
}

/** Messages, avec le nombre de non lus du rôle actif. */
function MessagesButton() {
  const unread = useUnreadCount();
  return (
    <PressableScale
      onPress={() => router.push('/(app)/messages')}
      style={styles.round}
      accessibilityLabel={unread ? `Messages, ${unread} non lu${unread > 1 ? 's' : ''}` : 'Messages'}>
      <MessageCircle size={18} color={palette.navy} />
      {unread ? (
        <View style={styles.count}>
          <Text variant="caption" color={palette.white} style={{ fontSize: 10, lineHeight: 12 }}>
            {unread > 9 ? '9+' : unread}
          </Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  round: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  count: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.danger, borderWidth: 1.5, borderColor: '#fff' },
  badge: { position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: 4, backgroundColor: palette.danger, borderWidth: 1.5, borderColor: '#fff' },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5, borderColor: 'rgba(1,77,248,0.35)', backgroundColor: 'rgba(255,255,255,0.6)' },
});
