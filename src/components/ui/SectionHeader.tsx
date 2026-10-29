import { View } from 'react-native';

import { ArrowRight } from '@/components/ui/DirIcons';
import { useTheme } from '@/theme/scheme';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Props = { title: string; subtitle?: string; action?: string; onAction?: () => void; right?: string; accent?: string };

export function SectionHeader({ title, subtitle, action, onAction, right, accent }: Props) {
  const { c } = useTheme();
  accent ??= c.electric;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
      <View style={{ flex: 1 }}>
        <Text variant="h2">{title}</Text>
        {subtitle ? (
          <Text variant="small" color={c.muted}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? (
        <PressableScale onPress={onAction} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }} hitSlop={10}>
          <Text variant="smallStrong" color={accent}>
            {action}
          </Text>
          <ArrowRight size={14} color={accent} />
        </PressableScale>
      ) : right ? (
        <Text variant="smallStrong" color={c.muted}>
          {right}
        </Text>
      ) : null}
    </View>
  );
}
