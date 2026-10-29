import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { daysFromToday, formatDayMonth, formatTime, relativeDays } from '@/lib/date';
import { useRoleTheme } from '@/theme';
import { palette } from '@/theme/tokens';

import type { Conversation } from '../api';

/** « 14h32 » aujourd'hui, « hier », « il y a 3 jours », puis la date. */
export const when = (iso: string) => {
  const n = daysFromToday(iso);
  return n === 0 ? formatTime(iso) : n >= -6 ? relativeDays(iso) : formatDayMonth(iso);
};

export const nameOf = (c: Conversation) => c.otherName ?? (c.asRole === 'mentor' ? 'Un·e étudiant·e' : 'Ton mentor');

export function ConversationRow({ c }: { c: Conversation }) {
  const theme = useRoleTheme();
  const name = nameOf(c);
  const unread = c.unread > 0;
  const preview = c.lastBody ? `${c.lastFromMe ? 'Toi : ' : ''}${c.lastBody}` : 'Dis bonjour 👋';
  return (
    <PressableScale
      onPress={() => router.push({ pathname: '/(app)/messages/[id]', params: { id: c.id } })}
      scaleTo={0.985}
      style={styles.row}
      accessibilityLabel={`${name}. ${unread ? `${c.unread} message${c.unread > 1 ? 's' : ''} non lu${c.unread > 1 ? 's' : ''}. ` : ''}${preview}`}>
      <Avatar name={name} size={48} color={c.asRole === 'student' ? palette.mentor : palette.electricLight} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.top}>
          <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
            {name}
          </Text>
          {c.lastMessageAt ? (
            <Text variant="caption" color={unread ? theme.accent : palette.muted}>
              {when(c.lastMessageAt)}
            </Text>
          ) : null}
        </View>
        <View style={styles.top}>
          <Text variant="small" color={unread ? palette.navy : palette.subtle} numberOfLines={1} style={{ flex: 1, fontWeight: unread ? '600' : undefined }}>
            {preview}
          </Text>
          {unread ? (
            <View style={[styles.badge, { backgroundColor: theme.accent }]}>
              <Text variant="caption" color={palette.white} style={{ fontSize: 11 }}>
                {c.unread > 9 ? '9+' : c.unread}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 72 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
