import { LinearGradient } from 'expo-linear-gradient';
import { Flag, Mic, MicOff, PhoneOff, RefreshCcw, Video, VideoOff } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { palette } from '@/theme/tokens';

/** Fond nuit de l'écran d'appel (dégradé décoratif). */
export function CallBackdrop() {
  return <LinearGradient colors={['#1B2470', '#0A0F2A']} style={StyleSheet.absoluteFill} />;
}

/** En haut : la personne, l'état ou la durée de l'appel, et le drapeau Signaler / Bloquer. */
export function CallTop({ name, color, status, onFlag }: { name: string; color?: string; status: string; onFlag?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
      <View style={styles.pill}>
        <Avatar name={name} color={color} size={34} />
        <View>
          <Text variant="smallStrong" color={palette.white}>
            {name}
          </Text>
          <Text variant="caption" color="rgba(255,255,255,0.6)">
            {status}
          </Text>
        </View>
      </View>
      {onFlag ? (
        <PressableScale onPress={onFlag} style={styles.flag} accessibilityLabel={`Signaler ou bloquer ${name}`}>
          <Flag size={18} color={palette.white} />
        </PressableScale>
      ) : null}
    </View>
  );
}

/** Le grand avatar au centre, avec l'onde qui s'élargit tant qu'on attend. */
export function CallAvatar({ name, color, waiting }: { name: string; color?: string; waiting: boolean }) {
  const ring = useSharedValue(0);
  useEffect(() => {
    ring.set(withRepeat(withTiming(1, { duration: 1600 }), -1));
  }, [ring]);
  const ringStyle = useAnimatedStyle(() => ({ opacity: 1 - ring.value, transform: [{ scale: 1 + ring.value * 0.6 }] }));
  return (
    <View style={styles.avatar}>
      {waiting ? <Animated.View style={[styles.ring, ringStyle]} /> : null}
      <Avatar name={name} color={color} size={150} />
    </View>
  );
}

/** Micro, caméra, raccrocher, changer de caméra. */
export function CallControls({
  micOn,
  camOn,
  onMic,
  onCam,
  onHangUp,
  onFlip,
}: {
  micOn: boolean;
  camOn: boolean;
  onMic: () => void;
  onCam: () => void;
  onHangUp: () => void;
  onFlip: () => void;
}) {
  return (
    <View style={styles.controls}>
      <PressableScale onPress={onMic} style={[styles.ctrl, !micOn && styles.ctrlOff]} accessibilityLabel={micOn ? 'Couper le micro' : 'Rallumer le micro'}>
        {micOn ? <Mic size={22} color={palette.white} /> : <MicOff size={22} color={palette.navy} />}
      </PressableScale>
      <PressableScale onPress={onCam} style={[styles.ctrl, !camOn && styles.ctrlOff]} accessibilityLabel={camOn ? 'Couper la caméra' : 'Rallumer la caméra'}>
        {camOn ? <Video size={22} color={palette.white} /> : <VideoOff size={22} color={palette.navy} />}
      </PressableScale>
      <PressableScale haptic="press" onPress={onHangUp} style={[styles.ctrl, styles.hang]} accessibilityLabel="Raccrocher">
        <PhoneOff size={26} color={palette.white} />
      </PressableScale>
      <PressableScale onPress={onFlip} style={styles.ctrl} accessibilityLabel="Changer de caméra">
        <RefreshCcw size={22} color={palette.white} />
      </PressableScale>
    </View>
  );
}

/** « 03:27 » */
export const duration = (secs: number) => `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, zIndex: 2 },
  flag: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', padding: 8, paddingRight: 16, borderRadius: 999, backgroundColor: 'rgba(10,15,42,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 170, height: 170, borderRadius: 85, borderWidth: 3, borderColor: '#7FA6FF' },
  controls: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 16, padding: 12, borderRadius: 40, backgroundColor: 'rgba(10,15,42,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  ctrl: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  ctrlOff: { backgroundColor: palette.white },
  hang: { width: 64, height: 64, borderRadius: 32, backgroundColor: palette.danger },
});
