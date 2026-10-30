import { router } from 'expo-router';
import { BellRing, CalendarClock, Hourglass, PartyPopper, Video, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useMentors, useMyBookings } from '@/data/hooks';
import { useJourney } from '@/features/journey/store';
import { appointmentState, splitMentorAgenda } from '@/features/mentors/appointments';
import { useMentorRequests } from '@/features/mentors/hooks';
import { useProfile } from '@/features/profile/store';
import { useRoleTheme } from '@/theme';
import { useT } from '@/i18n';
import { daysFromToday, formatLong, formatTime } from '@/lib/date';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius, type Tone } from '@/theme/tokens';
import { rise } from '@/theme/motion';

type N = { id: string; icon: LucideIcon; tone: Tone; title: string; sub: string; onPress?: () => void; urgent?: boolean };

/**
 * Centre de notifications. Étudiant : échéances proches, demandes et rendez-vous. Mentor : demandes à traiter et
 * appels à venir (il n'a pas de parcours).
 */
export default function Notifications() {
  const { c } = useTheme();
  const theme = useRoleTheme();
  const isMentor = useProfile((s) => s.profile.activeRole === 'mentor');
  const requests = useMentorRequests({ enabled: isMentor });
  const t = useT();
  const styles = useStyles();
  const j = useJourney();
  const [since] = useState(() => Date.now());
  const bookings = useMyBookings().data.filter((b) => (b.status === 'pending' || b.status === 'confirmed') && new Date(b.startsAt).getTime() > since);
  const { data: mentors = [] } = useMentors();

  const agenda = splitMentorAgenda(requests.data ?? []);
  const mentorItems: N[] = [
    ...agenda.toHandle.map((r) => ({
      id: r.id,
      icon: Hourglass,
      tone: 'amber' as const,
      title: t('notifications.newRequest', { name: r.student ?? t('mentorHome.aStudent') }),
      sub: `${formatLong(r.startsAt)} · ${formatTime(r.startsAt)} · ${r.topic}`,
      urgent: daysFromToday(r.startsAt) <= 1,
      onPress: () => router.navigate('/(app)/(tabs)/agenda'),
    })),
    ...agenda.upcoming.map((r) => ({
      id: r.id,
      icon: Video,
      tone: 'green' as const,
      title: t('notifications.callWith', { name: r.student ?? t('mentorHome.aStudent') }),
      sub: `${formatLong(r.startsAt)} · ${formatTime(r.startsAt)} · ${r.topic}`,
      onPress: appointmentState(r) === 'live' ? () => router.push({ pathname: '/(app)/appel/[id]', params: { id: r.id } }) : () => router.navigate('/(app)/(tabs)/agenda'),
    })),
    { id: 'welcome', icon: PartyPopper, tone: 'violet', title: t('notifications.welcomeMentorTitle'), sub: t('notifications.welcomeMentorText') },
  ];

  const studentItems: N[] = [
    ...bookings.map((b) => {
      const name = mentors.find((x) => x.id === b.mentorId)?.firstName ?? t('notifications.yourMentor');
      return {
        id: b.id,
        icon: b.status === 'pending' ? Hourglass : Video,
        tone: b.status === 'pending' ? ('amber' as const) : ('green' as const),
        title: b.status === 'pending' ? t('notifications.requestSent', { name }) : t('notifications.callWith', { name }),
        sub: `${formatLong(b.startsAt)} · ${formatTime(b.startsAt)} · ${b.status === 'pending' ? t('notifications.waitingAnswer') : b.topic}`,
        onPress: b.status === 'pending' ? () => router.navigate('/(app)/(tabs)') : () => router.push({ pathname: '/(app)/appel/[id]', params: { id: b.id } }),
      };
    }),
    ...j.upcoming
      .filter((u) => daysFromToday(u.date) <= 30)
      .slice(0, 6)
      .map((u) => {
        const d = daysFromToday(u.date);
        return {
          id: u.kind === 'official' ? u.step.id : u.custom.id,
          icon: CalendarClock,
          tone: d <= 7 ? ('red' as const) : ('blue' as const),
          title: u.kind === 'official' ? u.step.title : u.custom.title,
          sub: d < 0 ? t('notifications.late', { count: -d }) : d === 0 ? t('notifications.today') : t('notifications.dueIn', { count: d }),
          urgent: d <= 7,
          onPress: u.kind === 'official' ? () => router.push({ pathname: '/(app)/etape/[id]', params: { id: u.step.id } }) : undefined,
        };
      }),
    { id: 'welcome', icon: PartyPopper, tone: 'violet', title: t('notifications.welcomeTitle'), sub: t('notifications.welcomeText') },
  ];
  const items = isMentor ? mentorItems : studentItems;

  return (
    <Screen top={theme.top} padded={false} header={<AppHeader back title={t('common.notifications')} hideActions />}>
      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        {items.map((n, i) => (
          <Animated.View key={n.id} entering={rise(i * 50)}>
            <PressableScale onPress={n.onPress ?? (() => {})} style={[styles.row, n.urgent && { borderColor: c.dangerSoft, borderWidth: 1.5 }]}>
              <IconTile icon={n.icon} tone={n.tone} size={42} radius={13} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{n.title}</Text>
                <Text variant="caption" color={n.urgent ? c.danger : c.muted}>
                  {n.sub}
                </Text>
              </View>
              {n.urgent ? <BellRing size={16} color={c.danger} /> : null}
            </PressableScale>
          </Animated.View>
        ))}
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.xl, backgroundColor: c.card, borderWidth: 1.5, borderColor: 'transparent', ...shadow.sm },
}));
