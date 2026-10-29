import { CheckCircle2, Info } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { Text } from '@/components/ui/Text';
import { makeStyles, useTheme } from '@/theme/scheme';
import { drop, lift } from '@/theme/motion';

type ToastState = {
  msg: string | null;
  kind: 'success' | 'info';
  id: number;
  show: (msg: string, kind?: 'success' | 'info') => void;
  hide: () => void;
};

const useToastStore = create<ToastState>((set) => ({
  msg: null,
  kind: 'success',
  id: 0,
  show: (msg, kind = 'success') => set((s) => ({ msg, kind, id: s.id + 1 })),
  hide: () => set({ msg: null }),
}));

export const toast = (msg: string, kind: 'success' | 'info' = 'success') => useToastStore.getState().show(msg, kind);

export function ToastHost() {
  const { c } = useTheme();
  const styles = useStyles();
  const { msg, kind, id, hide } = useToastStore();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(hide, 2600);
    return () => clearTimeout(t);
  }, [id, msg, hide]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', paddingTop: insets.top + 8 }]}>
      {/* Le conteneur reste monté : le toast peut ainsi jouer sa sortie. */}
      {msg ? (
        <Animated.View key={id} entering={drop()} exiting={lift} style={styles.toast}>
          {kind === 'success' ? <CheckCircle2 size={18} color={c.success} /> : <Info size={18} color={c.electric} />}
          <Text variant="smallStrong" style={{ flexShrink: 1 }}>
            {msg}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ shadow, c }) => ({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    maxWidth: '90%',
    ...shadow.md,
  },
}));
