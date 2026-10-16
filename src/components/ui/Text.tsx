import { Text as RNText, type TextProps } from 'react-native';

import { palette, type, type TypeVariant } from '@/theme/tokens';

type Props = TextProps & {
  variant?: TypeVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
};

/** Texte typographié — toujours utiliser ce composant plutôt que <Text> de React Native. */
export function Text({ variant = 'body', color = palette.navy, align, style, ...rest }: Props) {
  return (
    <RNText
      {...rest}
      maxFontSizeMultiplier={1.4}
      style={[type[variant], { color, textAlign: align }, style]}
    />
  );
}
