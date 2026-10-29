import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Compass, House, MessageSquareText, Sparkles, UserRound } from 'lucide-react-native';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useRoleTheme } from '@/theme';
import { makeStyles, useTheme } from '@/theme/scheme';
import { motion } from '@/theme/tokens';

const ICONS = { index: House, explorer: Compass, communaute: MessageSquareText, profil: UserRound } as const;
const LABELS: Record<string, string> = { index: 'Accueil', explorer: 'Explorer', ia: 'Dalili', communaute: 'Communauté', profil: 'Profil' };

function TabItem({ name, focused, onPress, accent }: { name: keyof typeof ICONS; focused: boolean; onPress: () => void; accent: string }) {
  const styles = useStyles();
  const { c } = useTheme();
  const Icon = ICONS[name];
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: withSpring(focused ? -2 : 0, motion.spring) }, { scale: withSpring(focused ? 1.08 : 1, motion.spring) }] }));
  const dot = useAnimatedStyle(() => ({ opacity: withTiming(focused ? 1 : 0, { duration: 180 }), transform: [{ scale: withSpring(focused ? 1 : 0.3, motion.spring) }] }));
  return (
    <PressableScale onPress={onPress} haptic="select" style={styles.item} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={LABELS[name]}>
      <Animated.View style={s}>
        <Icon size={22} color={focused ? accent : c.navy} strokeWidth={focused ? 2.4 : 1.9} />
      </Animated.View>
      <Text variant="caption" color={focused ? accent : c.subtle} style={{ fontSize: 10.5 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
        {LABELS[name]}
      </Text>
      <Animated.View style={[styles.dot, { backgroundColor: accent }, dot]} />
    </PressableScale>
  );
}

function AiButton({ focused, onPress }: { focused: boolean; onPress: () => void }) {
  const styles = useStyles();
  const { c, gradients } = useTheme();
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.set(withRepeat(withSequence(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 0 })), -1));
  }, [pulse]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - pulse.value), transform: [{ scale: 1 + pulse.value * 0.45 }] }));
  return (
    <PressableScale onPress={onPress} haptic="press" scaleTo={0.9} style={styles.aiWrap} accessibilityLabel="Dalili IA" accessibilityRole="tab" accessibilityState={{ selected: focused }}>
      {!focused && <Animated.View style={[styles.aiRing, ring]} />}
      <LinearGradient colors={gradients.ai} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.ai, focused && { borderColor: '#C9C2FF' }]}>
        <Sparkles size={24} color="#fff" fill="#fff" />
      </LinearGradient>
      <Text variant="caption" color={focused ? c.aiIndigo : c.subtle} style={{ fontSize: 10.5, marginTop: 4 }}>
        Dalili
      </Text>
    </PressableScale>
  );
}

/** Tab bar sur-mesure : 4 onglets + bouton IA central lumineux. */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { accent } = useRoleTheme();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const onPress = () => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        };
        if (route.name === 'ia') return <AiButton key={route.key} focused={focused} onPress={onPress} />;
        if (!(route.name in ICONS)) return null;
        return <TabItem key={route.key} name={route.name as keyof typeof ICONS} focused={focused} onPress={onPress} accent={accent} />;
      })}
    </View>
  );
}

const useStyles = makeStyles(({ c }) => ({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    backgroundColor: c.card,
    paddingTop: 10,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    shadowColor: '#1F2850',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
    ...(Platform.OS === 'web' ? { maxWidth: 560, alignSelf: 'center', marginHorizontal: 'auto' } : null),
  },
  item: { alignItems: 'center', gap: 4, width: 64, paddingTop: 4 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
  aiWrap: { alignItems: 'center', width: 70, marginTop: -30 },
  ai: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.card, shadowColor: '#5B5CF0', shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
  aiRing: { position: 'absolute', top: 0, width: 58, height: 58, borderRadius: 29, backgroundColor: '#7A5AF8' },
}));
