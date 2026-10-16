import { StyleSheet, View, type ViewProps } from 'react-native';

import { palette, radius, shadow } from '@/theme/tokens';

type Props = ViewProps & { padded?: boolean; tone?: 'white' | 'soft' | 'dark' | 'outline'; elevated?: boolean };

export function Card({ padded = true, tone = 'white', elevated = true, style, ...rest }: Props) {
  return (
    <View
      {...rest}
      style={[
        styles.base,
        padded && { padding: 16 },
        tone === 'soft' && { backgroundColor: palette.electricSoft },
        tone === 'dark' && { backgroundColor: palette.navyInk },
        tone === 'outline' && { backgroundColor: 'transparent', borderWidth: 1, borderColor: palette.line },
        elevated && tone !== 'outline' && shadow.sm,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: palette.white, borderRadius: radius.xl },
});
