import { View, type ViewProps } from 'react-native';

import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

type Props = ViewProps & { padded?: boolean; tone?: 'white' | 'soft' | 'dark' | 'outline'; elevated?: boolean };

export function Card({ padded = true, tone = 'white', elevated = true, style, ...rest }: Props) {
  const { c, shadow } = useTheme();
  const styles = useStyles();
  return (
    <View
      {...rest}
      style={[
        styles.base,
        padded && { padding: 16 },
        tone === 'soft' && { backgroundColor: c.electricSoft },
        tone === 'dark' && { backgroundColor: c.navyInk },
        tone === 'outline' && { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.line },
        elevated && tone !== 'outline' && shadow.sm,
        style,
      ]}
    />
  );
}

const useStyles = makeStyles(({ c }) => ({
  base: { backgroundColor: c.card, borderRadius: radius.xl },
}));
