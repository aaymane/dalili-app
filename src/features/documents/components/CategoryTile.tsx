import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n';
import { enter } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

import { CATEGORY_LOOK, type Category } from '../categories';

/** Une rubrique du coffre : son icône, son nom, combien de documents. */
export function CategoryTile({ category, count, index, onPress }: { category: Category; count: number; index: number; onPress: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const look = CATEGORY_LOOK[category];
  const name = t(`vault.categories.${category}`);
  const countLabel = count ? t('vault.count', { count }) : t('vault.empty');
  return (
    <Animated.View entering={enter(index)} style={styles.cell}>
      <PressableScale onPress={onPress} scaleTo={0.97} style={styles.tile} accessibilityLabel={`${name}, ${countLabel}`}>
        <IconTile icon={look.icon} tone={look.tone} size={42} />
        <View style={{ gap: 2 }}>
          <Text variant="h3" numberOfLines={2}>
            {name}
          </Text>
          <Text variant="caption" color={count ? c.muted : c.subtle}>
            {countLabel}
          </Text>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  cell: { width: '48%', flexGrow: 0 },
  tile: { gap: 12, padding: 14, minHeight: 118, borderRadius: radius.xl, backgroundColor: c.card, ...shadow.sm },
}));
