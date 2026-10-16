import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '@/theme/tokens';

type Props = { visible: boolean; onClose: () => void; children: ReactNode; scroll?: boolean; maxHeight?: number | `${number}%` };

/** Bottom sheet modale animée (ressort), fermeture au tap sur le fond. */
export function BottomSheet({ visible, onClose, children, scroll, maxHeight = '88%' }: Props) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  // Monte immédiatement à l'ouverture ; démonte après l'animation de sortie.
  if (visible && !mounted) setMounted(true);
  useEffect(() => {
    if (visible) return;
    const t = setTimeout(() => setMounted(false), 260);
    return () => clearTimeout(t);
  }, [visible]);

  if (!mounted) return null;
  const Body = scroll ? ScrollView : View;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {visible && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={StyleSheet.absoluteFill}>
          <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
        </Animated.View>
      )}
      {visible && (
        <Animated.View
          entering={SlideInDown.springify().damping(20).stiffness(180)}
          exiting={SlideOutDown.duration(220)}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8, maxHeight }]}>
          <View style={styles.handle} />
          <Body {...(scroll ? { showsVerticalScrollIndicator: false, contentContainerStyle: { paddingBottom: 8 } } : {})}>{children}</Body>
        </Animated.View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,13,31,0.45)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 10,
    ...(Platform.OS === 'web' ? { maxWidth: 520, alignSelf: 'center', marginHorizontal: 'auto' } : null),
  },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#1F2850', alignSelf: 'center', marginBottom: 16, opacity: 0.9 },
});
