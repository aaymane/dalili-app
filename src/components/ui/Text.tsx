import { Text as RNText, type TextProps } from 'react-native';

import { useIsRTL } from '@/i18n';
import { useColors } from '@/theme/scheme';
import { type, type TypeVariant } from '@/theme/tokens';

type Props = TextProps & {
  variant?: TypeVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
};

const NO_SPACING = { letterSpacing: 0 };

/** Texte typographié — toujours utiliser ce composant plutôt que <Text> de React Native. */
export function Text({ variant = 'body', color, align, style, ...rest }: Props) {
  // Couleur par défaut : le texte principal du thème en cours (foncé en clair, clair en sombre).
  const c = useColors();
  // L'arabe s'écrit lié : l'espacement des lettres (sur-titres, majuscules) casserait les liaisons.
  const rtl = useIsRTL();
  return (
    <RNText
      {...rest}
      maxFontSizeMultiplier={1.4}
      style={[type[variant], { color: color ?? c.navy, textAlign: align }, rtl && NO_SPACING, style]}
    />
  );
}
