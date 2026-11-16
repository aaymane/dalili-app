import { router } from 'expo-router';
import { Check, Flag, MessageCircle, Video, X } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ReduceMotion, withSpring, withTiming } from 'react-native-reanimated';

import { celebrate } from '@/components/feedback/Confetti';
import { toast } from '@/components/feedback/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useOpenFromBooking } from '@/features/messages/hooks';
import { useT } from '@/i18n';
import { daysFromToday, formatDayMonth, formatTime, relativeDays } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { pop } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { fonts, palette, radius } from '@/theme/tokens';

import type { MentorRequest } from '../api';
import { appointmentState } from '../appointments';
import { useAnswerRequest } from '../hooks';

const AVATAR_TONES = [palette.electricLight, palette.aiIndigo, palette.mentor, palette.host];
const avatarTone = (name: string) => AVATAR_TONES[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_TONES.length];

/** Le temps de voir le tampon se poser avant que la demande quitte la liste des « à traiter ». */
const STAMP_MS = 750;

/** Le tampon arrive de haut, plus grand, et s'écrase sur la carte : un vrai coup de tampon (moment de célébration). */
const stampIn = () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 1.7 }] },
    animations: {
      opacity: withTiming(1, { duration: 120, reduceMotion: ReduceMotion.System }),
      transform: [{ scale: withSpring(1, { duration: 420, dampingRatio: 0.55, reduceMotion: ReduceMotion.System }) }],
    },
  };
};

/** « ACCEPTÉ », penché, à l'encre verte du mentor : le vocabulaire du voyage (DIRECTION.md §2). */
function Stamp({ label }: { label: string }) {
  const { tones } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.stampWrap} pointerEvents="none">
      <Animated.View entering={stampIn} style={[styles.stamp, { borderColor: tones.green.ink }]}>
        <Text style={[styles.stampText, { color: tones.green.ink }]}>{label}</Text>
      </Animated.View>
    </View>
  );
}

/** « demain », « dans 3 jours », puis la date au-delà d'une semaine. */
const when = (iso: string) => (Math.abs(daysFromToday(iso)) <= 6 ? relativeDays(iso) : formatDayMonth(iso));

/**
 * Une demande reçue par le mentor, dans l'accueil et l'agenda : à traiter (accepter, décliner), acceptée (rejoindre
 * l'appel quand la salle est ouverte, écrire), ou passée (son état). Le drapeau ouvre « Signaler / Bloquer ».
 */
export function RequestCard({ r, first, onReport }: { r: MentorRequest; first?: boolean; onReport: (r: MentorRequest) => void }) {
  const { c, tones } = useTheme();
  const t = useT();
  const styles = useStyles();
  const answer = useAnswerRequest();
  const open = useOpenFromBooking();
  // Accepté : le tampon se pose, puis la réponse part (la carte quitte « à traiter » une fois le tampon vu).
  const [stamped, setStamped] = useState(false);
  const state = appointmentState(r);
  const name = r.student ?? t('mentorHome.aStudent');
  const nameA11y = r.student ?? t('mentorHome.thisStudent');
  // Bouton plein : vert foncé, texte de la couleur du fond (contraste AA en clair comme en sombre).
  const solid = { backgroundColor: tones.green.ink };

  const send = (ok: boolean) =>
    answer.mutate(
      { id: r.id, status: ok ? 'confirmed' : 'cancelled' },
      {
        onSuccess: () => toast(ok ? t('mentorHome.accepted') : t('mentorHome.declined'), ok ? 'success' : 'info'),
        onError: () => {
          setStamped(false);
          toast(t('common.notSaved'), 'info');
        },
      },
    );

  const reply = (ok: boolean) => {
    if (!ok) return send(false);
    if (stamped) return;
    setStamped(true);
    haptics.success();
    celebrate();
    setTimeout(() => send(true), STAMP_MS);
  };

  const write = () =>
    open.mutate(
      { bookingId: r.id, role: 'mentor' },
      {
        onSuccess: (id) => (id ? router.push({ pathname: '/(app)/messages/[id]', params: { id } }) : toast(t('mentorHome.convoSoon'), 'info')),
        onError: () => toast(t('common.offlineRetry'), 'info'),
      },
    );

  const past = state === 'done' || state === 'cancelled' || state === 'expired';

  return (
    <View style={[styles.card, !first && styles.sep, past && { opacity: 0.75 }]}>
      {stamped ? <Stamp label={t('mentorHome.stamp')} /> : null}
      <View style={styles.top}>
        <Avatar name={name} size={46} color={avatarTone(r.student ?? r.id)} uri={r.studentAvatarUrl} cacheKey={r.studentAvatarPath} />
        <View style={{ flex: 1, gap: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="small" color={c.subtle} numberOfLines={2}>
            {r.topic}
          </Text>
          {r.city ? (
            <Text variant="caption" color={c.muted}>
              {t('mentorHome.from', { city: r.city })}
            </Text>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text variant="smallStrong">{when(r.startsAt)}</Text>
          <Text variant="small" color={c.subtle}>
            {formatTime(r.startsAt)}
          </Text>
          {past ? (
            <View style={styles.pill}>
              <Text variant="caption" color={c.muted}>
                {t(`appointments.state.${state}`)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {past ? null : (
        <View style={styles.actions}>
          {state === 'pending' ? (
            <>
              <PressableScale haptic="press" onPress={() => reply(true)} disabled={answer.isPending || stamped} style={[styles.btn, solid]} accessibilityLabel={t('mentorHome.acceptA11y', { name: nameA11y })}>
                <Check size={16} color={c.bg} strokeWidth={2.6} />
                <Text variant="smallStrong" color={c.bg}>
                  {t('mentorHome.accept')}
                </Text>
              </PressableScale>
              <PressableScale onPress={() => reply(false)} disabled={answer.isPending || stamped} style={[styles.btn, styles.ghost]} accessibilityLabel={t('mentorHome.declineA11y', { name: nameA11y })}>
                <X size={15} color={c.subtle} />
                <Text variant="smallStrong" color={c.subtle}>
                  {t('mentorHome.decline')}
                </Text>
              </PressableScale>
            </>
          ) : (
            <>
              {state === 'live' ? (
                <PressableScale
                  haptic="press"
                  onPress={() => router.push({ pathname: '/(app)/appel/[id]', params: { id: r.id } })}
                  style={[styles.btn, solid]}
                  accessibilityLabel={t('mentorHome.startA11y', { name: nameA11y })}>
                  <Video size={16} color={c.bg} />
                  <Text variant="smallStrong" color={c.bg}>
                    {t('mentorHome.start')}
                  </Text>
                </PressableScale>
              ) : (
                <Animated.View entering={pop()} style={styles.confirmed}>
                  <Check size={14} color={tones.green.ink} strokeWidth={2.6} />
                  <Text variant="smallStrong" color={tones.green.ink}>
                    {t('mentorHome.confirmed')}
                  </Text>
                </Animated.View>
              )}
              <PressableScale onPress={write} disabled={open.isPending} style={[styles.btn, styles.soft]} accessibilityLabel={t('mentorHome.writeA11y', { name: nameA11y })}>
                <MessageCircle size={15} color={tones.green.ink} />
                <Text variant="smallStrong" color={tones.green.ink}>
                  {t('mentorHome.write')}
                </Text>
              </PressableScale>
            </>
          )}
          <PressableScale onPress={() => onReport(r)} style={styles.flag} accessibilityLabel={t('mentorHome.reportA11y', { name: nameA11y })}>
            <Flag size={16} color={c.muted} />
          </PressableScale>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles(({ c }) => ({
  card: { padding: 14, gap: 12 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingStart: 58 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 16, borderRadius: radius.pill },
  ghost: { paddingHorizontal: 12 },
  soft: { backgroundColor: c.mentorSoft },
  confirmed: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  pill: { marginTop: 2, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: c.fill },
  flag: { width: 44, height: 44, marginStart: 'auto', alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  stampWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 2, transform: [{ rotate: '-12deg' }] },
  stamp: { paddingHorizontal: 16, paddingVertical: 6, borderWidth: 3, borderRadius: 10, backgroundColor: c.surface },
  stampText: { fontFamily: fonts.displayBlack, fontSize: 22, lineHeight: 28, letterSpacing: 3, textTransform: 'uppercase' },
}));
