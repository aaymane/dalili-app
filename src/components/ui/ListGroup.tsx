import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

/**
 * Une liste : une seule surface, des lignes séparées d'un trait fin (au lieu d'une carte par ligne).
 * L'ombre est sur l'enveloppe, les coins sont coupés dedans : un fond de ligne (étape en cours) reste dans l'arrondi.
 */
export function ListGroup({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[styles.shadow, style]}>
      <View style={styles.clip}>
        {rows.map((row, i) => (
          <Fragment key={row.key ?? i}>
            {i > 0 ? <View style={styles.separator} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  shadow: { borderRadius: radius.lg, backgroundColor: c.card, ...shadow.sm },
  clip: { borderRadius: radius.lg, overflow: 'hidden' },
  separator: { height: 1, backgroundColor: c.line },
}));
