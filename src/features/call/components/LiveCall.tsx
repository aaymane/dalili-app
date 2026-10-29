import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useProfile } from '@/features/profile/store';
import { SafetySheet } from '@/features/safety/components/SafetySheet';
import { pop, rise } from '@/theme/motion';
import { palette, radius } from '@/theme/tokens';

import type { CallInfo } from '../api';
import { loadDaily } from '../daily';
import { audioTrack, useDailyCall, videoTrack } from '../useDailyCall';
import { CallAvatar, CallBackdrop, CallControls, CallTop, duration } from './CallParts';

/** Le vrai appel : la vidéo de l'autre en plein écran, la tienne en vignette, les commandes en bas. */
export function LiveCall({ bookingId, info, color, onRetry }: { bookingId: string; info: CallInfo; color?: string; onRetry: () => void }) {
  const insets = useSafeAreaInsets();
  const profile = useProfile((s) => s.profile);
  const call = useDailyCall(info);
  const MediaView = loadDaily()?.DailyMediaView;
  const [reporting, setReporting] = useState(false);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!call.joinedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [call.joinedAt]);

  const remoteVideo = videoTrack(call.remote);
  const localVideo = call.camOn ? videoTrack(call.local) : null;
  const name = info.otherName;
  const status =
    call.phase === 'joining'
      ? 'Connexion…'
      : call.phase === 'joined' && call.joinedAt
        ? call.remote
          ? duration(Math.max(0, Math.floor((now - call.joinedAt) / 1000)))
          : 'En attente…'
        : call.phase === 'left'
          ? 'Appel terminé'
          : 'Connexion perdue';

  const hangUp = () => {
    call.leave();
    router.back();
  };

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
            <Text variant="h1" color={palette.white} align="center">
              {call.phase === 'error'
                ? 'La connexion a coupé'
                : call.phase === 'left'
                  ? 'Appel terminé'
                  : call.remote
                    ? `${name} a coupé sa caméra`
                    : call.phase === 'joined'
                      ? `En attente de ${name}…`
                      : `Connexion à l’appel…`}
            </Text>
            <Text variant="small" color="rgba(255,255,255,0.6)" align="center">
              {call.phase === 'joined' && !call.remote ? `L’appel commence dès que ${name} arrive.` : `Sujet : ${info.topic}`}
            </Text>
          </Animated.View>
          {call.phase === 'error' ? (
            <View style={{ marginTop: 20, width: 220 }}>
              <Button label="Réessayer" variant="white" onPress={onRetry} />
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
        <CallControls micOn={call.micOn} camOn={call.camOn} onMic={call.toggleMic} onCam={call.toggleCam} onHangUp={hangUp} onFlip={call.flipCamera} />
      </View>

      <SafetySheet visible={reporting} onClose={() => setReporting(false)} target={{ bookingId }} name={name} onBlocked={hangUp} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0F2A' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  self: { position: 'absolute', right: 16, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', zIndex: 3 },
  selfVideo: { width: 104, height: 148 },
  selfOff: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
});
