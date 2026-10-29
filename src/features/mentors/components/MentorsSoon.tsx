import { router } from 'expo-router';
import { Sparkles, UsersRound } from 'lucide-react-native';
import { View } from 'react-native';

import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

/** Aucun mentor validé pour l'instant : on le dit honnêtement et on propose Dalili en attendant. */
export function MentorsSoon() {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <IconTile icon={UsersRound} tone="green" size={46} radius={23} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="bodyStrong">Les premiers mentors arrivent bientôt</Text>
        <Text variant="small" color={c.muted}>
          Des étudiants passés par là, vérifiés un par un par l’équipe. En attendant, Dalili répond à tes questions.
        </Text>
        <PressableScale onPress={() => router.navigate('/(app)/(tabs)/ia')} style={styles.cta} hitSlop={8} accessibilityRole="button">
          <Sparkles size={14} color={c.electric} />
          <Text variant="smallStrong" color={c.electric}>
            Demander à Dalili
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
