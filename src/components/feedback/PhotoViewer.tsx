import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { makeStyles, useTheme } from '@/theme/scheme';

/**
 * Une photo en plein écran, sur fond noir (publication d'un groupe, photo reçue en message).
 * On la ferme d'un tap n'importe où, ou avec la croix.
 */
export function PhotoViewer({ uri, cacheKey, onClose }: { uri: string | null; cacheKey?: string; onClose: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!uri} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          {uri ? <Image source={{ uri, cacheKey }} style={StyleSheet.absoluteFill} contentFit="contain" transition={150} accessibilityIgnoresInvertColors /> : null}
        </Pressable>
        <PressableScale onPress={onClose} style={[styles.close, { top: insets.top + 8 }]} accessibilityLabel={t('common.close')}>
          <X size={20} color={c.white} />
        </PressableScale>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles(() => ({
  root: { flex: 1, backgroundColor: '#000' },
  close: { position: 'absolute', end: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
}));
