import { Fragment } from 'react';
import { Text as RNText } from 'react-native';

import { Text } from '@/components/ui/Text';
import { haptics } from '@/lib/haptics';
import { palette, type TypeVariant } from '@/theme/tokens';

import { openTerm } from './GlossarySheet';

/**
 * Texte enrichi : `[[CAF]]` devient un mot souligné cliquable qui ouvre sa définition.
 * C'est la réponse UX au « mur du vocabulaire ».
 */
export function RichText({ text, variant = 'body', color = palette.navy }: { text: string; variant?: TypeVariant; color?: string }) {
  const parts = text.split(/(\[\[[^\]]+\]\])/g);
  return (
    <Text variant={variant} color={color}>
      {parts.map((p, i) => {
        const m = p.match(/^\[\[([^\]]+)\]\]$/);
        if (!m) return <Fragment key={i}>{p}</Fragment>;
        return (
          <RNText
            key={i}
            onPress={() => {
              haptics.select();
              openTerm(m[1]);
            }}
            accessibilityRole="link"
            accessibilityHint="Ouvre la définition"
            style={{ color: palette.electric, textDecorationLine: 'underline', textDecorationStyle: 'dotted', fontFamily: 'OpenSans_600SemiBold' }}>
            {m[1]}
          </RNText>
        );
      })}
    </Text>
  );
}
