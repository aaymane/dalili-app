import { Check } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { haptics } from '@/lib/haptics';
import { palette, shadow } from '@/theme/tokens';
import { cardIn, cardOut, pop } from '@/theme/motion';

import { celebrate } from './Confetti';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  cta: string;
  onCta: () => void;
  onClose?: () => void;
  closeLabel?: string;
};

/** Carte de succès (« Rendez-vous confirmé ! », « Groupe créé ! »…) + confettis. */
export function SuccessModal({ visible, title, message, cta, onCta, onClose, closeLabel = 'Fermer' }: Props) {
  useEffect(() => {
    if (visible) {
      haptics.success();
      celebrate();
    }
  }, [visible]);
  // La modale reste montée le temps de la sortie (fond et carte s'effacent au lieu de disparaître d'un coup).
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  useEffect(() => {
    if (visible) return;
    const t = setTimeout(() => setMounted(false), 220);
    return () => clearTimeout(t);
  }, [visible]);
  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose ?? onCta} statusBarTranslucent>
      {visible && (
        <Animated.View entering={FadeIn.duration(240)} exiting={FadeOut.duration(200)} style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={closeLabel} />
          <Animated.View entering={cardIn} exiting={cardOut} style={styles.card}>
            <Animated.View entering={pop(200)} style={styles.check}>
              <Check size={22} color="#fff" strokeWidth={3.2} />
            </Animated.View>
            <Text variant="h1" align="center">
              {title}
            </Text>
            <Text variant="body" color={palette.subtle} align="center" style={{ marginTop: 8, marginBottom: 20 }}>
              {message}
            </Text>
            <Button label={cta} onPress={onCta} />
            {onClose ? (
              <PressableScale onPress={onClose} style={{ alignSelf: 'center', padding: 14 }}>
                <Text variant="bodyStrong" color={palette.subtle}>
                  {closeLabel}
                </Text>
              </PressableScale>
            ) : (
              <View style={{ height: 6 }} />
            )}
          </Animated.View>
        </Animated.View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,13,31,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 24,
    paddingTop: 28,
    borderWidth: 2,
    borderColor: 'rgba(1,77,248,0.35)',
    ...shadow.md,
  },
  check: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.success,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
});
