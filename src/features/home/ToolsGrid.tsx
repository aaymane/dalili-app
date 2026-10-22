import { router, type Href } from 'expo-router';
import { BookOpen, Calculator, FolderCheck, Languages, Siren } from 'lucide-react-native';
import { ScrollView, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useContent } from '@/data/hooks';
import { palette, radius, shadow } from '@/theme/tokens';
import { rise } from '@/theme/motion';

const TOOLS: { label: string; sub: string; href: Href; icon: React.ReactNode; colors: [string, string] }[] = [
  { label: 'Guides', sub: '', href: '/(app)/(tabs)/explorer?tab=guides', icon: <BookOpen size={18} color="#fff" />, colors: ['#7FA6FF', '#3D78FF'] },
  { label: 'Lexique', sub: 'Zéro jargon', href: '/(app)/lexique', icon: <Languages size={18} color="#fff" />, colors: ['#C084FC', '#9333EA'] },
  { label: 'Budget', sub: 'Simulateur', href: '/(app)/outils/budget', icon: <Calculator size={18} color="#fff" />, colors: ['#4ADE80', '#16A34A'] },
  { label: 'Documents', sub: 'Checklist', href: '/(app)/outils/documents', icon: <FolderCheck size={18} color="#fff" />, colors: ['#FDBA74', '#F97316'] },
  { label: 'SOS', sub: 'Urgences', href: '/(app)/outils/sos', icon: <Siren size={18} color="#fff" />, colors: ['#FB7185', '#E11D48'] },
];

/** Boîte à outils (accès rapide). */
export function ToolsGrid() {
  const { data: manifest } = useContent('manifest');
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }}>
      {TOOLS.map((t, i) => (
        <Animated.View key={t.label} entering={rise(i * 60)}>
          <PressableScale onPress={() => router.push(t.href)} style={styles.tool}>
            <IconTile size={38} colors={t.colors} radius={12}>
              {t.icon}
            </IconTile>
            <Text variant="smallStrong" style={{ marginTop: 8 }}>
              {t.label}
            </Text>
            <Text variant="caption" color={palette.muted}>
              {t.label === 'Guides' ? `${manifest.guides.length} guides vérifiés` : t.sub}
            </Text>
          </PressableScale>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tool: { width: 104, padding: 12, borderRadius: radius.lg, backgroundColor: '#fff', ...shadow.sm },
});
