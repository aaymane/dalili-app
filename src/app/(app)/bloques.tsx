import { Ban, ShieldCheck } from 'lucide-react-native';
import { Alert, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { toast } from '@/components/feedback/Toast';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { isDemoMode } from '@/features/auth/store';
import type { Block } from '@/features/safety/api';
import { useMyBlocks, useUnblock } from '@/features/safety/hooks';
import { useT } from '@/i18n';
import { formatDayMonth } from '@/lib/date';
import { enter, leave, reflow, rise } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

/** Personnes bloquées : celles que tu as bloquées dans le mentorat, à débloquer quand tu veux. */
export default function Bloques() {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const blocks = useMyBlocks();
  const unblock = useUnblock();
  const list = blocks.data ?? [];

  const askUnblock = (b: Block) => {
    const name = b.name ?? t('blocked.thisPerson');
    Alert.alert(t('blocked.unblockTitle', { name }), t('blocked.unblockText'), [
      { text: t('blocked.keep'), style: 'cancel' },
      {
        text: t('blocked.unblock'),
        onPress: () =>
          unblock.mutate(b.id, {
            onSuccess: () => toast(t('blocked.unblocked', { name })),
            onError: () => toast(t('blocked.failed'), 'info'),
          }),
      },
    ]);
  };

  return (
    <Screen padded={false} header={<AppHeader back />}>
      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        <Text variant="hero">{t('blocked.title')}</Text>
        <Text variant="body" color={c.subtle}>
          {t('blocked.intro')}
        </Text>

        {blocks.isError ? (
          <Animated.View entering={rise()} style={[styles.card, styles.state]}>
            <Text variant="small" color={c.subtle} style={{ flex: 1 }}>
              {t('blocked.loadError')}
            </Text>
            <PressableScale onPress={() => void blocks.refetch()} hitSlop={6} style={styles.retry} accessibilityLabel={t('common.retry')}>
              <Text variant="smallStrong" color={c.electric}>
                {t('common.retry')}
              </Text>
            </PressableScale>
          </Animated.View>
        ) : !blocks.isPending && !list.length ? (
          <Animated.View entering={rise()} style={[styles.card, styles.state]}>
            <IconTile icon={ShieldCheck} tone="green" size={44} radius={14} />
            <Text variant="small" color={c.subtle} style={{ flex: 1 }}>
              {isDemoMode ? t('blocked.emptyDemo') : t('blocked.empty')}
            </Text>
          </Animated.View>
        ) : (
          <Animated.View layout={reflow} style={styles.card}>
            {list.map((b, i) => (
              <Animated.View key={b.id} entering={enter(i)} exiting={leave} layout={reflow} style={[styles.row, i > 0 && styles.sep]}>
                <Avatar name={b.name ?? '?'} size={42} color={c.muted} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{b.name ?? t('blocked.noName')}</Text>
                  <Text variant="caption" color={c.muted}>
                    {t(b.isMentor ? 'blocked.mentorSince' : 'blocked.studentSince', { date: formatDayMonth(b.createdAt) })}
                  </Text>
                </View>
                <PressableScale onPress={() => askUnblock(b)} hitSlop={4} style={styles.unblock} accessibilityLabel={t('blocked.unblockA11y', { name: b.name ?? t('blocked.thisPerson') })}>
                  <Ban size={14} color={c.subtle} />
                  <Text variant="smallStrong" color={c.subtle}>
                    {t('blocked.unblock')}
                  </Text>
                </PressableScale>
              </Animated.View>
            ))}
          </Animated.View>
        )}
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  card: { borderRadius: radius.xl, backgroundColor: c.surface, overflow: 'hidden', ...shadow.sm },
  state: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
  unblock: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: c.bg },
}));
