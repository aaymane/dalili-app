import { router, type Href } from 'expo-router';
import { BookOpenText, FolderCheck, Languages, PiggyBank, Siren, type LucideIcon } from 'lucide-react-native';
import { ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';

import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useContent } from '@/data/hooks';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius, type Tone } from '@/theme/tokens';
import { rise } from '@/theme/motion';

const TOOLS: { label: string; sub: string; href: Href; icon: LucideIcon; tone: Tone }[] = [
  { label: 'Guides', sub: '', href: '/(app)/(tabs)/explorer?tab=guides', icon: BookOpenText, tone: 'blue' },
  { label: 'Lexique', sub: 'Zéro jargon', href: '/(app)/lexique', icon: Languages, tone: 'violet' },
  { label: 'Budget', sub: 'Simulateur', href: '/(app)/outils/budget', icon: PiggyBank, tone: 'green' },
  { label: 'Documents', sub: 'Checklist', href: '/(app)/outils/documents', icon: FolderCheck, tone: 'amber' },
  { label: 'SOS', sub: 'Urgences', href: '/(app)/outils/sos', icon: Siren, tone: 'red' },
];

/** Boîte à outils (accès rapide). */
export function ToolsGrid() {
  const { c } = useTheme();
  const styles = useStyles();
  const { data: manifest } = useContent('manifest');
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }}>
      {TOOLS.map((t, i) => (
        <Animated.View key={t.label} entering={rise(i * 60)}>
          <PressableScale onPress={() => router.push(t.href)} style={styles.tool}>
            <IconTile icon={t.icon} tone={t.tone} size={40} radius={13} />
            <Text variant="smallStrong" style={{ marginTop: 8 }}>
              {t.label}
            </Text>
            <Text variant="caption" color={c.muted}>
              {t.label === 'Guides' ? `${manifest.guides.length} guides vérifiés` : t.sub}
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
