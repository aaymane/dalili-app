import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Hourglass, MessageCircle, Video } from 'lucide-react-native';
import { Alert, StyleSheet, View } from 'react-native';

import { toast } from '@/components/feedback/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useCancelBooking } from '@/data/hooks';
import { useOpenFromBooking } from '@/features/messages/hooks';
import type { Booking, Mentor } from '@/data/types';
import { daysFromToday, formatLong, formatTime } from '@/lib/date';
import { gradients, palette, radius, shadow } from '@/theme/tokens';

/**
 * Ta prochaine demande ou ton prochain appel, sur l'accueil :
 * « en attente » tant que le mentor n'a pas répondu (annulable), puis l'appel confirmé.
 */
export function BookingCard({ booking, mentor }: { booking: Booking; mentor: Mentor }) {
  const cancel = useCancelBooking();
  const open = useOpenFromBooking();
  const write = () =>
    open.mutate(
      { bookingId: booking.id, role: 'student' },
      {
        onSuccess: (id) => (id ? router.push({ pathname: '/(app)/messages/[id]', params: { id } }) : toast('La conversation s’ouvre dans un instant. Réessaie.', 'info')),
        onError: () => toast('Pas de connexion. Réessaie dans un instant.', 'info'),
      },
    );
  const when = `${formatLong(booking.startsAt)} · ${formatTime(booking.startsAt)}`;

  const askCancel = () =>
    Alert.alert('Annuler ta demande ?', `${mentor.firstName} ne la verra plus. Tu pourras en refaire une quand tu veux.`, [
      { text: 'Garder', style: 'cancel' },
      {
        text: 'Annuler la demande',
        style: 'destructive',
        onPress: () => cancel.mutate(booking.id, { onError: () => toast('Pas annulée. Vérifie ta connexion et réessaie.', 'info') }),
      },
    ]);

  if (booking.status === 'pending') {
    return (
      <View style={styles.pending} accessible accessibilityLabel={`Demande envoyée à ${mentor.firstName} pour le ${when}. En attente de sa réponse.`}>
        <View style={styles.row}>
          <IconTile icon={Hourglass} tone="amber" size={46} radius={15} />
          <View style={{ flex: 1 }}>
            <Text variant="h3">Demande envoyée à {mentor.firstName}</Text>
            <Text variant="small" color={palette.subtle}>
              {when}
            </Text>
          </View>
        </View>
        <Text variant="small" color={palette.subtle}>
          {mentor.firstName} répond selon ses disponibilités. Sa réponse arrive ici.
        </Text>
        <PressableScale onPress={askCancel} hitSlop={6} style={{ alignSelf: 'flex-start' }} accessibilityLabel="Annuler la demande">
          <Text variant="smallStrong" color={palette.subtle}>
            Annuler la demande
          </Text>
        </PressableScale>
      </View>
    );
  }

  return (
    <LinearGradient colors={gradients.hero} style={styles.slide}>
      <View style={styles.row}>
        <Avatar name={`${mentor.firstName} ${mentor.lastName}`} color={mentor.avatarColor} size={46} />
        <View style={{ flex: 1 }}>
          <Text variant="h3" color={palette.white}>
            Appel avec {mentor.firstName}
          </Text>
          <Text variant="small" color="rgba(255,255,255,0.65)">
            {when}
          </Text>
        </View>
        <View style={styles.live}>
          <View style={styles.liveDot} />
          <Text variant="caption" color="#FF8A8A">
            {daysFromToday(booking.startsAt) === 0 ? 'Aujourd’hui' : 'Confirmé'}
          </Text>
        </View>
      </View>
      <PressableScale onPress={() => router.push({ pathname: '/(app)/appel/[id]', params: { id: booking.id } })} style={styles.cta}>
        <Video size={15} color={palette.white} />
        <Text variant="smallStrong" color={palette.white}>
          Rejoindre l’appel
        </Text>
      </PressableScale>
      <PressableScale onPress={write} disabled={open.isPending} style={styles.write} accessibilityLabel={`Écrire à ${mentor.firstName}`}>
        <MessageCircle size={15} color={palette.white} />
        <Text variant="smallStrong" color={palette.white}>
          Écrire à {mentor.firstName}
        </Text>
      </PressableScale>
      <PressableScale onPress={askCancel} hitSlop={6} style={{ alignSelf: 'center', marginTop: 10 }} accessibilityLabel="Annuler le rendez-vous">
        <Text variant="caption" color="rgba(255,255,255,0.6)">
          Annuler le rendez-vous
        </Text>
      </PressableScale>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pending: { gap: 10, padding: 16, borderRadius: radius.xl, backgroundColor: palette.surface, ...shadow.sm },
  slide: { borderRadius: radius.xxl, padding: 18, ...shadow.md },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 999, marginTop: 14, backgroundColor: palette.electric },
  write: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 999, marginTop: 8, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' },
  live: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(229,72,77,0.15)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6B6B' },
});
