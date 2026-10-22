import { router } from 'expo-router';
import { BellRing, CalendarClock, PartyPopper, Video } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useMentors } from '@/data/hooks';
import { useLocalDb } from '@/data/local-db';
import { useJourney } from '@/features/journey/store';
import { daysFromToday, formatLong, formatTime } from '@/lib/date';
import { gradients, palette, radius, shadow } from '@/theme/tokens';
import { rise } from '@/theme/motion';

type N = { id: string; icon: ReactNode; colors: [string, string]; title: string; sub: string; onPress?: () => void; urgent?: boolean };

/** Centre de notifications : échéances proches, rendez-vous, bienvenue. */
export default function Notifications() {
  const j = useJourney();
  const bookings = useLocalDb((s) => s.bookings).filter((b) => b.status === 'confirmed');
  const { data: mentors = [] } = useMentors();

  const items: N[] = [
    ...bookings.map((b) => {
      const m = mentors.find((x) => x.id === b.mentorId);
      return {
        id: b.id,
        icon: <Video size={18} color="#fff" />,
        colors: ['#34D399', palette.mentor] as [string, string],
        title: `Appel avec ${m?.firstName ?? 'ton mentor'}`,
        sub: `${formatLong(b.startsAt)} · ${formatTime(b.startsAt)} · ${b.topic}`,
        onPress: () => router.push({ pathname: '/(app)/appel/[id]', params: { id: b.id } }),
      };
    }),
    ...j.upcoming
      .filter((u) => daysFromToday(u.date) <= 30)
      .slice(0, 6)
      .map((u) => {
        const d = daysFromToday(u.date);
        return {
          id: u.kind === 'official' ? u.step.id : u.custom.id,
          icon: <CalendarClock size={18} color="#fff" />,
          colors: (d <= 7 ? ['#FB7185', '#E11D48'] : ['#7FA6FF', '#3D78FF']) as [string, string],
          title: u.kind === 'official' ? u.step.title : u.custom.title,
          sub: d < 0 ? `En retard de ${-d} j` : d === 0 ? "C'est aujourd'hui" : `Échéance dans ${d} jours`,
          urgent: d <= 7,
          onPress: u.kind === 'official' ? () => router.push({ pathname: '/(app)/etape/[id]', params: { id: u.step.id } }) : undefined,
        };
      }),
    { id: 'welcome', icon: <PartyPopper size={18} color="#fff" />, colors: ['#C084FC', '#7A5AF8'], title: 'Bienvenue sur DALILI 💙', sub: 'Ton parcours est prêt. On avance ensemble, une étape à la fois.' },
  ];

  return (
    <Screen top={gradients.roleTop.student} padded={false} header={<AppHeader back title="Notifications" hideActions />}>
      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        {items.map((n, i) => (
          <Animated.View key={n.id} entering={rise(i * 50)}>
            <PressableScale onPress={n.onPress ?? (() => {})} style={[styles.row, n.urgent && { borderColor: '#FBD5D5', borderWidth: 1.5 }]}>
              <IconTile size={42} colors={n.colors} radius={13}>
                {n.icon}
              </IconTile>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{n.title}</Text>
                <Text variant="caption" color={n.urgent ? palette.danger : palette.muted}>
                  {n.sub}
                </Text>
              </View>
              {n.urgent ? <BellRing size={16} color={palette.danger} /> : null}
            </PressableScale>
          </Animated.View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.xl, backgroundColor: '#fff', borderWidth: 1.5, borderColor: 'transparent', ...shadow.sm },
});
