import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { pop } from '@/theme/motion';
import { useTheme } from '@/theme/scheme';

import { CallAvatar, CallBackdrop, CallControls, CallTop, duration } from './CallParts';

/**
 * Aperçu sans vraie vidéo : en mode démo, ou dans Expo Go (pas de code natif pour la vidéo).
 * L'appel « décroche » au bout de 2 secondes pour montrer l'écran tel qu'il sera.
 */
export function CallPreview({ name, color, topic, note, onFlag }: { name: string; color?: string; topic?: string; note: string; onFlag?: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const profile = useProfile((s) => s.profile);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [secs, setSecs] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setConnected(true);
      haptics.success();
    }, 2200);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!connected) return;
    const timer = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [connected]);

  return (
    <View style={styles.root}>
      <CallBackdrop />
      <CallTop name={name} color={color} status={connected ? duration(secs) : t('call.connecting')} onFlag={onFlag} />
      <View style={styles.center}>
        <CallAvatar name={name} color={color} waiting={!connected} />
        <Text variant="h1" color={c.white} style={{ marginTop: 18 }}>
          {connected ? t('call.inCall', { name }) : t('call.calling', { name })}
        </Text>
        <Text variant="small" color="rgba(255,255,255,0.6)">
          {t('call.topic', { topic: topic ?? t('call.defaultTopic') })}
        </Text>
      </View>
      {cam ? (
        <Animated.View entering={pop()} style={[styles.self, { top: insets.top + 70 }]}>
          <Avatar name={`${profile.firstName} ${profile.lastName}`} uri={profile.avatarUri} size={70} />
          <Text variant="caption" color={c.white} style={{ marginTop: 6 }}>
            {profile.firstName || t('call.you')}
          </Text>
        </Animated.View>
      ) : null}
      <View style={{ marginBottom: insets.bottom + 16 }}>
        <CallControls micOn={mic} camOn={cam} onMic={() => setMic((v) => !v)} onCam={() => setCam((v) => !v)} onHangUp={() => router.back()} onFlip={() => {}} />
      </View>
      <Text variant="caption" color="rgba(255,255,255,0.45)" align="center" style={{ marginBottom: insets.bottom + 8, paddingHorizontal: 24 }}>
        {note}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0F2A' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  self: { position: 'absolute', end: 20, alignItems: 'center', padding: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)' },
});
