import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { useProfile } from '@/features/profile/store';
import { haptics } from '@/lib/haptics';
import { pop } from '@/theme/motion';
import { palette } from '@/theme/tokens';

import { CallAvatar, CallBackdrop, CallControls, CallTop, duration } from './CallParts';

/**
 * Aperçu sans vraie vidéo : en mode démo, ou dans Expo Go (pas de code natif pour la vidéo).
 * L'appel « décroche » au bout de 2 secondes pour montrer l'écran tel qu'il sera.
 */
export function CallPreview({ name, color, topic, note, onFlag }: { name: string; color?: string; topic?: string; note: string; onFlag?: () => void }) {
  const insets = useSafeAreaInsets();
  const profile = useProfile((s) => s.profile);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [secs, setSecs] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const c = setTimeout(() => {
      setConnected(true);
      haptics.success();
    }, 2200);
    return () => clearTimeout(c);
  }, []);
  useEffect(() => {
    if (!connected) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [connected]);

  return (
    <View style={styles.root}>
      <CallBackdrop />
      <CallTop name={name} color={color} status={connected ? duration(secs) : 'Connexion…'} onFlag={onFlag} />
      <View style={styles.center}>
        <CallAvatar name={name} color={color} waiting={!connected} />
        <Text variant="h1" color={palette.white} style={{ marginTop: 18 }}>
          {connected ? `En appel avec ${name}` : `On appelle ${name}…`}
        </Text>
        <Text variant="small" color="rgba(255,255,255,0.6)">
          Sujet : {topic ?? 'Question générale'}
        </Text>
      </View>
      {cam ? (
        <Animated.View entering={pop()} style={[styles.self, { top: insets.top + 70 }]}>
          <Avatar name={`${profile.firstName} ${profile.lastName}`} uri={profile.avatarUri} size={70} />
          <Text variant="caption" color={palette.white} style={{ marginTop: 6 }}>
            {profile.firstName || 'Toi'}
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
  self: { position: 'absolute', right: 20, alignItems: 'center', padding: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)' },
});
