import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { toast } from '@/components/feedback/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useProfile } from '@/features/profile/store';
import { SafetySheet } from '@/features/safety/components/SafetySheet';
import { useT } from '@/i18n';
import { pop, rise } from '@/theme/motion';
import { useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

import type { CallInfo } from '../api';
import { loadDaily } from '../daily';
import { useEndCall } from '../hooks';
import { audioTrack, useDailyCall, videoTrack } from '../useDailyCall';
import { CallAvatar, CallBackdrop, CallControls, CallTop, duration } from './CallParts';

/** Le vrai appel : la vidéo de l'autre en plein écran, la tienne en vignette, les commandes en bas. */
export function LiveCall({ bookingId, info, color, onRetry }: { bookingId: string; info: CallInfo; color?: string; onRetry: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const profile = useProfile((s) => s.profile);
  const call = useDailyCall(info);
  const MediaView = loadDaily()?.DailyMediaView;
  const [reporting, setReporting] = useState(false);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!call.joinedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [call.joinedAt]);

  const remoteVideo = videoTrack(call.remote);
  const localVideo = call.camOn ? videoTrack(call.local) : null;
  const name = info.otherName;
  const status =
    call.phase === 'joining'
      ? t('call.connecting')
      : call.phase === 'joined' && call.joinedAt
        ? call.remote
          ? duration(Math.max(0, Math.floor((now - call.joinedAt) / 1000)))
          : t('call.waiting')
        : call.phase === 'left'
          ? t('call.ended')
          : t('call.lost');

  // Toi qui raccroches : tu sors. Le salon qui se ferme sous tes pieds (le mentor a terminé, l'heure est passée,
  // la connexion a lâché) : l'écran redemande l'accès une fois, qui répond « terminé » ou te reconnecte.
  const leftByMe = useRef(false);
  const rechecked = useRef(false);
  useEffect(() => {
    if ((call.phase === 'left' || call.phase === 'error') && !leftByMe.current && !rechecked.current) {
      rechecked.current = true;
      onRetry();
    }
  }, [call.phase, onRetry]);

  const hangUp = () => {
    leftByMe.current = true;
    call.leave();
    router.back();
  };
  // Le mentor choisit : terminer pour les deux (le salon ferme, l'étudiant peut noter) ou juste quitter un instant.
  const [ending, setEnding] = useState(false);
  const end = useEndCall(bookingId);
  const finish = () =>
    end.mutate(undefined, {
      onSuccess: () => {
        leftByMe.current = true;
        setEnding(false);
        call.leave();
      },
      onError: () => toast(t('common.offlineRetry'), 'info'),
    });

  return (
    <View style={styles.root}>
      <CallBackdrop />
      {MediaView && call.remote ? (
        <MediaView videoTrack={remoteVideo} audioTrack={audioTrack(call.remote)} objectFit="cover" zOrder={0} style={StyleSheet.absoluteFill} />
      ) : null}

      <CallTop name={name} color={color} status={status} onFlag={() => setReporting(true)} />

      {!remoteVideo ? (
        <View style={styles.center}>
          <CallAvatar name={name} color={color} waiting={call.phase === 'joining' || (call.phase === 'joined' && !call.remote)} />
          <Animated.View key={status} entering={rise()} style={{ alignItems: 'center', gap: 4, marginTop: 18 }}>
            <Text variant="h1" color={c.white} align="center">
              {call.phase === 'error'
                ? t('call.cutTitle')
                : call.phase === 'left'
                  ? t('call.ended')
                  : call.remote
                    ? t('call.camOff', { name })
                    : call.phase === 'joined'
                      ? t('call.waitingFor', { name })
                      : t('call.joining')}
            </Text>
            <Text variant="small" color="rgba(255,255,255,0.6)" align="center">
              {call.phase === 'joined' && !call.remote ? t('call.startsWhen', { name }) : t('call.topic', { topic: info.topic })}
            </Text>
          </Animated.View>
          {call.phase === 'error' ? (
            <View style={{ marginTop: 20, width: 220 }}>
              <Button label={t('common.retry')} variant="white" onPress={onRetry} />
            </View>
          ) : null}
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      <Animated.View entering={pop(200)} style={[styles.self, { top: insets.top + 70 }]}>
        {MediaView && localVideo ? (
          <MediaView videoTrack={localVideo} audioTrack={null} mirror objectFit="cover" zOrder={1} style={styles.selfVideo} />
        ) : (
          <View style={[styles.selfVideo, styles.selfOff]}>
            <Avatar name={`${profile.firstName} ${profile.lastName}`} uri={profile.avatarUri} size={56} />
          </View>
        )}
      </Animated.View>

      <View style={{ marginBottom: insets.bottom + 24 }}>
        <CallControls micOn={call.micOn} camOn={call.camOn} onMic={call.toggleMic} onCam={call.toggleCam} onHangUp={info.role === 'mentor' ? () => setEnding(true) : hangUp} onFlip={call.flipCamera} />
      </View>

      <BottomSheet visible={ending} onClose={() => setEnding(false)}>
        <View style={{ gap: 14 }}>
          <Text variant="h2">{t('call.endTitle')}</Text>
          <Text variant="body" color={c.subtle}>
            {t('call.endText', { name })}
          </Text>
          <Button label={t('call.endForBoth')} variant="danger" loading={end.isPending} onPress={finish} />
          <Button label={t('call.justLeave')} variant="secondary" onPress={hangUp} />
        </View>
      </BottomSheet>

      <SafetySheet visible={reporting} onClose={() => setReporting(false)} target={{ bookingId }} name={name} onBlocked={hangUp} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0F2A' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  self: { position: 'absolute', end: 16, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', zIndex: 3 },
  selfVideo: { width: 104, height: 148 },
  selfOff: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
});
