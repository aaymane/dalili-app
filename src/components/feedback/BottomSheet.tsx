import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { interpolate, ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { EASE_SHEET } from '@/theme/motion';
import { makeStyles } from '@/theme/scheme';
import { motion } from '@/theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Appelé une fois la feuille complètement disparue : c'est là qu'on ouvre un écran système (galerie, appareil photo). */
  onClosed?: () => void;
  children: ReactNode;
  scroll?: boolean;
  maxHeight?: number | `${number}%`;
};

const OPEN = { duration: 440, easing: EASE_SHEET, reduceMotion: ReduceMotion.System };
const CLOSE = { duration: 260, easing: EASE_SHEET, reduceMotion: ReduceMotion.System };

/**
 * Feuille modale du bas. Elle monte depuis le bord (courbe des feuilles iOS, sans rebond) et le fond s'assombrit
 * au même rythme. On la ferme au tap sur le fond ou en la glissant vers le bas : elle suit le doigt, puis se ferme
 * (glissé ample ou rapide) ou revient en place en ressort.
 */
export function BottomSheet({ visible, onClose, onClosed, children, scroll, maxHeight = '88%' }: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  // `mounted` : modale affichée (jusqu'à la fin de l'animation de sortie).
  // `present` : modale dans l'arbre. Elle y reste après `mounted`, le temps qu'iOS la retire (`onDismiss`), puis
  // disparaît : on ne garde pas de Modal native invisible dans l'arbre.
  const [mounted, setMounted] = useState(visible);
  const [present, setPresent] = useState(visible);
  if (visible && !mounted) {
    setMounted(true);
    setPresent(true);
  }

  // Ouverture (0 = fermée, 1 = ouverte) et glissé du doigt (px), séparés : une fermeture repart d'où le doigt l'a laissée.
  const open = useSharedValue(0);
  const drag = useSharedValue(0);
  const start = useSharedValue(0);
  const height = useSharedValue(screenH);
  // Hauteur du clavier : la feuille monte avec lui pour qu'un champ et son bouton restent visibles.
  const keyboard = useSharedValue(0);
  const bottomPad = Math.max(insets.bottom, 16) + 8;

  useEffect(() => {
    // Android redimensionne déjà la fenêtre au-dessus du clavier : seul iOS a besoin de ce décalage.
    if (!mounted || Platform.OS !== 'ios') return;
    const follow = (to: number, duration?: number) => keyboard.set(withTiming(to, { duration: duration || 250, easing: EASE_SHEET }));
    const show = Keyboard.addListener('keyboardWillShow', (e) => follow(e.endCoordinates.height, e.duration));
    const hide = Keyboard.addListener('keyboardWillHide', (e) => follow(0, e.duration));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [mounted, keyboard]);

  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      drag.set(0);
      open.set(withTiming(1, OPEN));
      return;
    }
    open.set(
      withTiming(0, CLOSE, (done) => {
        if (done) scheduleOnRN(setMounted, false);
      }),
    );
  }, [visible, mounted, open, drag]);

  const onLayout = (e: LayoutChangeEvent) => {
    height.set(e.nativeEvent.layout.height);
  };

  // Un écran système (galerie, appareil photo) ouvert pendant que la modale se ferme est ignoré par iOS :
  // on attend `onDismiss`, appelé par iOS une fois la modale vraiment partie. Ailleurs, la fin du démontage suffit.
  const shown = useRef(false);
  const closed = () => {
    setPresent(false);
    if (!shown.current) return;
    shown.current = false;
    onClosed?.();
  };
  useEffect(() => {
    if (mounted) {
      shown.current = true;
      return;
    }
    if (!present) return;
    // iOS prévient par `onDismiss` (ce délai n'est qu'un filet de sécurité) ; ailleurs, la modale est déjà partie.
    const t = setTimeout(closed, Platform.OS === 'ios' ? 700 : 0);
    return () => clearTimeout(t);
  });

  const pan = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .failOffsetX([-16, 16])
    .onBegin(() => {
      start.set(drag.get());
    })
    .onUpdate((e) => {
      const next = start.get() + e.translationY;
      // Vers le haut, la feuille résiste (élastique) au lieu de décoller.
      drag.set(next >= 0 ? next : -Math.sqrt(-next) * 2);
    })
    .onEnd((e) => {
      const dismiss = drag.get() > height.get() * 0.3 || (e.velocityY > 800 && e.translationY > 16);
      if (dismiss) scheduleOnRN(onClose);
      else drag.set(withSpring(0, { ...motion.springFirm, velocity: e.velocityY, reduceMotion: ReduceMotion.System }));
    });

  // +40 : l'ombre et l'arrondi sortent aussi de l'écran.
  // Le clavier recouvre déjà la marge du bas (barre d'accueil) : on ne monte que du reste.
  const sheetStyle = useAnimatedStyle(() => {
    const lift = Math.max(0, keyboard.value - bottomPad + 12);
    return {
      transform: [{ translateY: (1 - open.value) * (height.value + 40) + drag.value - lift }],
      ...(lift > 0 ? { maxHeight: screenH - insets.top - 12 - lift } : null),
    };
  });
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: open.value * interpolate(drag.value, [0, height.value], [1, 0], 'clamp'),
  }));

  if (!present) return null;
  const Body = scroll ? ScrollView : View;
  const handle = (
    <View style={styles.handleZone}>
      <View style={styles.handle} />
    </View>
  );
  // Avec une liste qui défile, seule la poignée se glisse (sinon le geste volerait le défilement) ; sinon, toute la feuille.
  const sheet = (
    <Animated.View onLayout={onLayout} style={[styles.sheet, { paddingBottom: bottomPad, maxHeight }, sheetStyle]}>
      {scroll ? <GestureDetector gesture={pan}>{handle}</GestureDetector> : handle}
      <Body
        {...(scroll
          ? { showsVerticalScrollIndicator: false, contentContainerStyle: { paddingBottom: 8 }, keyboardShouldPersistTaps: 'handled' as const }
          : {})}>
        {children}
      </Body>
    </Animated.View>
  );
  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      onRequestClose={onClose}
      onDismiss={Platform.OS === 'ios' ? closed : undefined}
      statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer" />
        </Animated.View>
        {scroll ? sheet : <GestureDetector gesture={pan}>{sheet}</GestureDetector>}
      </GestureHandlerRootView>
    </Modal>
  );
}

const useStyles = makeStyles(({ c }) => ({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,13,31,0.45)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.card,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    ...(Platform.OS === 'web' ? { maxWidth: 520, alignSelf: 'center', marginHorizontal: 'auto' } : null),
  },
  handleZone: { height: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#1F2850', opacity: 0.9 },
}));
