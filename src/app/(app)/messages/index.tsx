import { Lock, MessageCircle } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { ConversationRow } from '@/features/messages/components/ConversationRow';
import { useConversations } from '@/features/messages/hooks';
import { useProfile } from '@/features/profile/store';
import { useRoleTheme } from '@/theme';
import { enter, rise } from '@/theme/motion';
import { palette, radius, shadow } from '@/theme/tokens';

/** Messages : tes conversations dans le rôle actif (étudiant ou mentor), la plus récente en haut. */
export default function Messages() {
  const role = useProfile((s) => s.profile.activeRole);
  const theme = useRoleTheme();
  const q = useConversations();
  const list = (q.data ?? []).filter((c) => c.asRole === role);

  return (
    <Screen top={theme.top} padded={false} header={<AppHeader back hideActions />}>
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        <Animated.View entering={rise()} style={{ gap: 4 }}>
          <Text variant="hero">Messages</Text>
          <Text variant="body" color={palette.subtle}>
            {role === 'mentor' ? 'Avec les étudiants que tu accompagnes.' : 'Avec les mentors qui ont accepté ton appel.'}
          </Text>
        </Animated.View>
        {q.isError ? (
          <Animated.View entering={rise()} style={[styles.card, styles.state]}>
            <Text variant="small" color={palette.subtle} style={{ flex: 1 }}>
              Impossible de charger tes messages. Vérifie ta connexion.
            </Text>
            <PressableScale onPress={() => void q.refetch()} hitSlop={6} style={styles.retry} accessibilityLabel="Réessayer">
              <Text variant="smallStrong" color={theme.accent}>
                Réessayer
              </Text>
            </PressableScale>
          </Animated.View>
        ) : !q.isPending && !list.length ? (
          <Animated.View entering={rise()} style={[styles.card, styles.empty]}>
            <IconTile icon={MessageCircle} tone={role === 'mentor' ? 'green' : 'blue'} size={52} radius={17} />
            <Text variant="h3" align="center">
              Pas encore de conversation
            </Text>
            <Text variant="small" color={palette.subtle} align="center">
              {role === 'mentor'
                ? 'Quand tu acceptes une demande d’appel, tu peux écrire à l’étudiant ici, avant et après l’appel.'
                : 'Quand un mentor accepte ton appel, vous pouvez vous écrire ici, avant et après l’appel.'}
            </Text>
          </Animated.View>
        ) : !list.length ? null : (
          <>
            <View style={styles.card}>
              {list.map((c, i) => (
                <Animated.View key={c.id} entering={enter(i + 1)} style={i > 0 && styles.sep}>
                  <ConversationRow c={c} />
                </Animated.View>
              ))}
            </View>
            <Animated.View entering={rise(200)} style={styles.privacy}>
              <Lock size={12} color={palette.muted} />
              <Text variant="caption" color={palette.muted}>
                Tes conversations ne sont visibles que par vous deux.
              </Text>
            </Animated.View>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, backgroundColor: palette.surface, overflow: 'hidden', ...shadow.sm },
  state: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  empty: { alignItems: 'center', gap: 10, padding: 24 },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
});
