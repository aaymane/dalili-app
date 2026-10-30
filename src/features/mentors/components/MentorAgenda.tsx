import { CalendarCheck2, Hourglass, History, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { RefreshControl, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { SafetySheet } from '@/features/safety/components/SafetySheet';
import { useT } from '@/i18n';
import { useRoleTheme } from '@/theme';
import { enter, leave, reflow, rise } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

import type { MentorRequest } from '../api';
import { splitMentorAgenda } from '../appointments';
import { useMentorRequests } from '../hooks';
import { RequestCard } from './RequestCard';

type Tab = 'toHandle' | 'upcoming' | 'history';
const EMPTY_ICON: Record<Tab, LucideIcon> = { toHandle: Hourglass, upcoming: CalendarCheck2, history: History };

/** Agenda du mentor : les demandes à traiter, les appels acceptés à venir, puis l'historique. */
export function MentorAgenda() {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const theme = useRoleTheme();
  const requests = useMentorRequests();
  const groups = splitMentorAgenda(requests.data ?? []);
  const [tab, setTab] = useState<Tab>(() => (groups.toHandle.length ? 'toHandle' : 'upcoming'));
  const [reported, setReported] = useState<MentorRequest | null>(null);
  const [reporting, setReporting] = useState(false);
  const list = groups[tab];

  return (
    <Screen
      top={theme.top}
      tabBar
      padded={false}
      header={<AppHeader />}
      scrollProps={{ refreshControl: <RefreshControl refreshing={requests.isRefetching} onRefresh={() => void requests.refetch()} tintColor={theme.accent} /> }}>
      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        <Animated.View entering={enter(0)} style={{ gap: 6 }}>
          <Text variant="hero">{t('agenda.title')}</Text>
          <Text variant="body" color={c.subtle}>
            {groups.toHandle.length ? t('agenda.subPending', { count: groups.toHandle.length }) : t('agenda.subClear')}
          </Text>
        </Animated.View>
        <Animated.View entering={enter(1)}>
          <Segmented
            accent={theme.accent}
            value={tab}
            onChange={setTab}
            options={[
              { value: 'toHandle', label: groups.toHandle.length ? `${t('agenda.toHandle')} · ${groups.toHandle.length}` : t('agenda.toHandle') },
              { value: 'upcoming', label: t('agenda.upcoming') },
              { value: 'history', label: t('agenda.history') },
            ]}
          />
        </Animated.View>

        {requests.isError && !requests.data ? (
          <Animated.View entering={rise()} style={[styles.card, styles.state]}>
            <Text variant="small" color={c.subtle} style={{ flex: 1 }}>
              {t('common.offline')}
            </Text>
            <PressableScale onPress={() => void requests.refetch()} hitSlop={6} style={styles.retry} accessibilityLabel={t('common.retry')}>
              <Text variant="smallStrong" color={theme.accent}>
                {t('common.retry')}
              </Text>
            </PressableScale>
          </Animated.View>
        ) : !requests.isPending && !list.length ? (
          <Animated.View key={`empty-${tab}`} entering={rise()} style={[styles.card, styles.empty]}>
            <IconTile icon={EMPTY_ICON[tab]} tone="green" size={52} radius={17} />
            <Text variant="h3" align="center">
              {t(`agenda.empty.${tab}.title`)}
            </Text>
            <Text variant="small" color={c.subtle} align="center">
              {t(`agenda.empty.${tab}.text`)}
            </Text>
          </Animated.View>
        ) : (
          <Animated.View key={tab} layout={reflow} style={styles.card}>
            {list.map((r, i) => (
              <Animated.View key={r.id} entering={enter(i)} exiting={leave} layout={reflow}>
                <RequestCard
                  r={r}
                  first={i === 0}
                  onReport={(x) => {
                    setReported(x);
                    setReporting(true);
                  }}
                />
              </Animated.View>
            ))}
          </Animated.View>
        )}
      </View>
      <SafetySheet visible={reporting} onClose={() => setReporting(false)} target={reported ? { bookingId: reported.id } : null} name={reported?.student ?? t('mentorHome.thisStudent')} />
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  card: { borderRadius: radius.xl, backgroundColor: c.surface, overflow: 'hidden', ...shadow.sm },
  state: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  empty: { alignItems: 'center', gap: 10, padding: 24 },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
}));
