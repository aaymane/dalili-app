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
import { useT } from '@/i18n';
import { useRoleTheme } from '@/theme';
import { enter, rise } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

/** Messages : tes conversations dans le rôle actif (étudiant ou mentor), la plus récente en haut. */
export default function Messages() {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const role = useProfile((s) => s.profile.activeRole);
  const theme = useRoleTheme();
  const q = useConversations();
  const list = (q.data ?? []).filter((c) => c.asRole === role);

  return (
    <Screen top={theme.top} padded={false} header={<AppHeader back hideActions />}>
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        <Animated.View entering={rise()} style={{ gap: 4 }}>
          <Text variant="hero">{t('messages.title')}</Text>
          <Text variant="body" color={c.subtle}>
            {role === 'mentor' ? t('messages.subMentor') : t('messages.subStudent')}
          </Text>
        </Animated.View>
        {q.isError ? (
          <Animated.View entering={rise()} style={[styles.card, styles.state]}>
            <Text variant="small" color={c.subtle} style={{ flex: 1 }}>
              {t('messages.loadError')}
            </Text>
            <PressableScale onPress={() => void q.refetch()} hitSlop={6} style={styles.retry} accessibilityLabel={t('common.retry')}>
              <Text variant="smallStrong" color={theme.accent}>
                {t('common.retry')}
              </Text>
            </PressableScale>
          </Animated.View>
        ) : !q.isPending && !list.length ? (
          <Animated.View entering={rise()} style={[styles.card, styles.empty]}>
            <IconTile icon={MessageCircle} tone={role === 'mentor' ? 'green' : 'blue'} size={52} radius={17} />
            <Text variant="h3" align="center">
              {t('messages.emptyTitle')}
            </Text>
            <Text variant="small" color={c.subtle} align="center">
              {role === 'mentor' ? t('messages.emptyMentor') : t('messages.emptyStudent')}
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
              <Lock size={12} color={c.muted} />
              <Text variant="caption" color={c.muted}>
                {t('messages.private')}
              </Text>
            </Animated.View>
          </>
        )}
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  card: { borderRadius: radius.xl, backgroundColor: c.surface, overflow: 'hidden', ...shadow.sm },
  state: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  empty: { alignItems: 'center', gap: 10, padding: 24 },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
}));
