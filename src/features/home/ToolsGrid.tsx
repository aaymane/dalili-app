import { router, type Href } from 'expo-router';
import { BookOpenText, FolderCheck, Languages, PiggyBank, Siren, type LucideIcon } from 'lucide-react-native';
import { ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';

import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useContent } from '@/data/hooks';
import { useT } from '@/i18n';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius, type Tone } from '@/theme/tokens';
import { rise } from '@/theme/motion';

// Libellés dans src/i18n/locales : home.tool<Id> et home.tool<Id>Sub.
const TOOLS: { id: 'Guides' | 'Lexicon' | 'Budget' | 'Documents' | 'Sos'; href: Href; icon: LucideIcon; tone: Tone }[] = [
  { id: 'Guides', href: '/(app)/(tabs)/explorer?tab=guides', icon: BookOpenText, tone: 'blue' },
  { id: 'Lexicon', href: '/(app)/lexique', icon: Languages, tone: 'violet' },
  { id: 'Budget', href: '/(app)/outils/budget', icon: PiggyBank, tone: 'green' },
  { id: 'Documents', href: '/(app)/outils/documents', icon: FolderCheck, tone: 'amber' },
  { id: 'Sos', href: '/(app)/outils/sos', icon: Siren, tone: 'red' },
];

/** Boîte à outils (accès rapide). */
export function ToolsGrid() {
  const { c } = useTheme();
  const styles = useStyles();
  const { data: manifest } = useContent('manifest');
  const t = useT();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }}>
      {TOOLS.map((tool, i) => (
        <Animated.View key={tool.id} entering={rise(i * 60)}>
          <PressableScale onPress={() => router.push(tool.href)} style={styles.tool}>
            <IconTile icon={tool.icon} tone={tool.tone} size={40} radius={13} />
            <Text variant="smallStrong" style={{ marginTop: 8 }}>
              {t(`home.tool${tool.id}`)}
            </Text>
            <Text variant="caption" color={c.muted}>
              {tool.id === 'Guides' ? t('home.toolGuidesSub', { count: manifest.guides.length }) : t(`home.tool${tool.id}Sub`)}
            </Text>
          </PressableScale>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  tool: { width: 104, padding: 12, borderRadius: radius.lg, backgroundColor: c.card, ...shadow.sm },
}));
