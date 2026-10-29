import { router } from 'expo-router';
import { Sparkles, UsersRound } from 'lucide-react-native';
import { View } from 'react-native';

import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

/** Aucun mentor validé pour l'instant : on le dit honnêtement et on propose Dalili en attendant. */
export function MentorsSoon() {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <IconTile icon={UsersRound} tone="green" size={46} radius={23} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="bodyStrong">{t('mentors.soon.title')}</Text>
        <Text variant="small" color={c.muted}>
          {t('mentors.soon.text')}
        </Text>
        <PressableScale onPress={() => router.navigate('/(app)/(tabs)/ia')} style={styles.cta} hitSlop={8} accessibilityRole="button">
          <Sparkles size={14} color={c.electric} />
          <Text variant="smallStrong" color={c.electric}>
            {t('mentors.soon.ask')}
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  card: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: radius.xl, backgroundColor: c.surface, ...shadow.sm },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', minHeight: 44 },
}));
