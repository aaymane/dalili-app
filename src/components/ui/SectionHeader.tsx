import { ArrowRight } from 'lucide-react-native';
import { View } from 'react-native';

import { palette } from '@/theme/tokens';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Props = { title: string; subtitle?: string; action?: string; onAction?: () => void; right?: string; accent?: string };

export function SectionHeader({ title, subtitle, action, onAction, right, accent = palette.electric }: Props) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
      <View style={{ flex: 1 }}>
        <Text variant="h2">{title}</Text>
        {subtitle ? (
          <Text variant="small" color={palette.muted}>
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
        <Text variant="smallStrong" color={palette.muted}>
          {right}
        </Text>
      ) : null}
    </View>
  );
}
