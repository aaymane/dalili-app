import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '@/theme/tokens';

export const TAB_BAR_SPACE = 110;

type Props = {
  children: ReactNode;
  /** Dégradé du haut d'écran (couleurs du rôle par défaut côté appelant). */
  top?: readonly string[];
  scroll?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  padded?: boolean;
  /** Ajoute l'espace sous le contenu pour la tab bar flottante. */
  tabBar?: boolean;
  bg?: string;
  scrollProps?: ScrollViewProps;
  keyboard?: boolean;
};

/** Gabarit d'écran : dégradé haut, safe-area, scroll, footer collant. */
export function Screen({ children, top, scroll = true, header, footer, padded = true, tabBar, bg = palette.bg, scrollProps, keyboard }: Props) {
  const insets = useSafeAreaInsets();
  const bottom = (tabBar ? TAB_BAR_SPACE : 24) + (footer ? 0 : insets.bottom);
  const content = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      {...scrollProps}
      contentContainerStyle={[padded && styles.pad, { paddingBottom: bottom }, scrollProps?.contentContainerStyle]}>
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, padded && styles.pad]}>{children}</View>
  );

  const body = (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      {header}
      {content}
      {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>{footer}</View> : null}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {top ? (
        <LinearGradient colors={top as [string, string, ...string[]]} locations={top.length === 3 ? [0, 0.55, 1] : undefined} style={styles.gradient} />
      ) : null}
      {keyboard ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gradient: { position: 'absolute', left: 0, right: 0, top: 0, height: 360 },
  pad: { paddingHorizontal: 20 },
  footer: { paddingHorizontal: 20, paddingTop: 10 },
});
