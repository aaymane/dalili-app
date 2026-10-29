import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Flag, Mic, MicOff, PhoneOff, RefreshCcw, Video, VideoOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useMentors, useMyBookings } from '@/data/hooks';
import { useProfile } from '@/features/profile/store';
import { SafetySheet } from '@/features/safety/components/SafetySheet';
import { haptics } from '@/lib/haptics';
import { palette } from '@/theme/tokens';

/**
 * Écran d'appel mentor (UI).
 * TODO(roadmap) : brancher la vidéo temps réel (LiveKit / Daily) — voir docs/ROADMAP.md.
 */
export default function Call() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const booking = useMyBookings().data.find((b) => b.id === id);
  const { data: mentors = [] } = useMentors();
  const m = mentors.find((x) => x.id === booking?.mentorId) ?? mentors[0];
  const profile = useProfile((s) => s.profile);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [secs, setSecs] = useState(0);
  const [connected, setConnected] = useState(false);
  const [reporting, setReporting] = useState(false);
  const ring = useSharedValue(0);
  useEffect(() => {
    ring.set(withRepeat(withTiming(1, { duration: 1600 }), -1));
    const c = setTimeout(() => {
      setConnected(true);
      haptics.success();
    }, 2200);
    return () => clearTimeout(c);
  }, [ring]);
  useEffect(() => {
    if (!connected) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [connected]);
  const ringStyle = useAnimatedStyle(() => ({ opacity: 1 - ring.value, transform: [{ scale: 1 + ring.value * 0.6 }] }));
  if (!m) return null;

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0F2A' }}>
      <LinearGradient colors={['#1B2470', '#0A0F2A']} style={StyleSheet.absoluteFill} />
      <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
        <View style={styles.pill}>
          <Avatar name={`${m.firstName} ${m.lastName}`} color={m.avatarColor} size={34} />
          <View>
            <Text variant="smallStrong" color="#fff">
              {m.firstName} {m.lastName}
            </Text>
            <Text variant="caption" color="rgba(255,255,255,0.6)">
              {connected ? `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}` : 'Connexion…'}
            </Text>
          </View>
        </View>
        <PressableScale onPress={() => setReporting(true)} style={styles.flag} accessibilityLabel={`Signaler ou bloquer ${m.firstName}`}>
          <Flag size={18} color="#fff" />
        </PressableScale>
      </View>
      <View style={styles.center}>
        {!connected && <Animated.View style={[styles.ring, ringStyle]} />}
        <Avatar name={`${m.firstName} ${m.lastName}`} color={m.avatarColor} size={150} />
        <Text variant="h1" color="#fff" style={{ marginTop: 18 }}>
          {connected ? `En appel avec ${m.firstName}` : `On appelle ${m.firstName}…`}
        </Text>
        <Text variant="small" color="rgba(255,255,255,0.6)">
          Sujet : {booking?.topic ?? 'Question générale'}
        </Text>
      </View>
      {cam && (
        <Animated.View entering={FadeIn} style={[styles.self, { top: insets.top + 70 }]}>
          <Avatar name={`${profile.firstName} ${profile.lastName}`} uri={profile.avatarUri} size={70} />
          <Text variant="caption" color="#fff" style={{ marginTop: 6 }}>
            {profile.firstName || 'Toi'}
          </Text>
        </Animated.View>
      )}
      <View style={[styles.controls, { marginBottom: insets.bottom + 24 }]}>
        <PressableScale onPress={() => setMic((v) => !v)} style={[styles.ctrl, !mic && { backgroundColor: '#fff' }]} accessibilityLabel="Micro">
          {mic ? <Mic size={22} color="#fff" /> : <MicOff size={22} color={palette.navy} />}
        </PressableScale>
        <PressableScale onPress={() => setCam((v) => !v)} style={[styles.ctrl, !cam && { backgroundColor: '#fff' }]} accessibilityLabel="Caméra">
          {cam ? <Video size={22} color="#fff" /> : <VideoOff size={22} color={palette.navy} />}
        </PressableScale>
        <PressableScale haptic="press" onPress={() => router.back()} style={[styles.ctrl, styles.hang]} accessibilityLabel="Raccrocher">
          <PhoneOff size={26} color="#fff" />
        </PressableScale>
        <PressableScale style={styles.ctrl} accessibilityLabel="Changer de caméra">
          <RefreshCcw size={22} color="#fff" />
        </PressableScale>
      </View>
      <Text variant="caption" color="rgba(255,255,255,0.4)" align="center" style={{ marginBottom: insets.bottom + 8 }}>
        Aperçu — la vidéo temps réel arrive dans la prochaine version
      </Text>
      <SafetySheet
        visible={reporting}
        onClose={() => setReporting(false)}
        target={booking ? { bookingId: booking.id } : { mentorId: m.id }}
        name={m.firstName}
        onBlocked={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  flag: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', padding: 8, paddingRight: 16, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  ring: { position: 'absolute', width: 170, height: 170, borderRadius: 85, borderWidth: 3, borderColor: '#7FA6FF' },
  self: { position: 'absolute', right: 20, alignItems: 'center', padding: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)' },
  controls: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 16, padding: 12, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  ctrl: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  hang: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E5484D' },
});
