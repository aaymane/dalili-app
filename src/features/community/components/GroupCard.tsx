import { router } from 'expo-router';
import { Users } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { toast } from '@/components/feedback/Toast';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { remoteJoinGroup } from '@/data/api';
import type { EventWithState, GroupWithState } from '@/data/hooks';
import { useLocalDb } from '@/data/local-db';
import { formatLong, formatTime } from '@/lib/date';
import { palette, radius, shadow } from '@/theme/tokens';

import { Cover } from './Cover';

export function useJoinGroup() {
  const toggle = useLocalDb((s) => s.toggleGroup);
  return (g: { id: string; name: string; isMember: boolean }) => {
    toggle(g.id);
    remoteJoinGroup(g.id, !g.isMember).catch(() => {});
    if (!g.isMember) toast(`Bienvenue dans « ${g.name} » 🎉`);
  };
}

export function GroupCard({ g }: { g: GroupWithState }) {
  const join = useJoinGroup();
  return (
    <PressableScale scaleTo={0.98} onPress={() => router.push({ pathname: '/(app)/groupe/[id]', params: { id: g.id } })} style={styles.card}>
      <Cover colors={g.cover} emoji={g.emoji} label="GROUPE" height={130} radius={18} />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text variant="h3">{g.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Users size={12} color={palette.muted} />
            <Text variant="caption" color={palette.muted}>
              {g.members} membres
            </Text>
          </View>
        </View>
        <Button label={g.isMember ? 'Membre' : 'Rejoindre'} size="sm" full={false} variant={g.isMember ? 'secondary' : 'primary'} onPress={() => join(g)} />
      </View>
    </PressableScale>
  );
}

export function EventCard({ e }: { e: EventWithState }) {
  return (
    <PressableScale scaleTo={0.98} onPress={() => router.push({ pathname: '/(app)/evenement/[id]', params: { id: e.id } })} style={styles.card}>
      <Cover colors={e.cover} emoji={e.emoji} label="ÉVÉNEMENT" labelColor="#7A5AF8" height={130} radius={18} />
      <View style={styles.row}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="h3">{e.title}</Text>
          <Text variant="caption" color={palette.subtle}>
            📍 {e.city} · {formatLong(e.startsAt)} · {formatTime(e.startsAt)}
          </Text>
          <Text variant="caption" color={palette.muted}>
            {e.attendees}/{e.capacity} personnes
          </Text>
        </View>
        <Button
          label={e.isGoing ? 'Inscrit' : 'Rejoindre'}
          size="sm"
          full={false}
          variant={e.isGoing ? 'secondary' : 'primary'}
          onPress={() => router.push({ pathname: '/(app)/evenement/[id]', params: { id: e.id } })}
        />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { padding: 8, borderRadius: radius.xl, backgroundColor: '#fff', ...shadow.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, paddingTop: 12 },
});
