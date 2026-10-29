import { useState } from 'react';
import { View } from 'react-native';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { toast } from '@/components/feedback/Toast';
import { Button } from '@/components/ui/Button';
import { Calendar } from '@/components/ui/Calendar';
import { Text } from '@/components/ui/Text';
import { effectiveArrival, useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';
import { formatLong, toISODate } from '@/lib/date';
import { useTheme } from '@/theme/scheme';

/** Modifier la date d'arrivée → toutes les échéances se recalculent. */
export function ArrivalSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const profile = useProfile((s) => s.profile);
  const update = useProfile((s) => s.update);
  const t = useT();
  const [d, setD] = useState<Date>(effectiveArrival(profile));
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ gap: 14 }}>
        <View>
          <Text variant="h2">{t('journey.arrivalTitle')}</Text>
          <Text variant="small" color={c.muted}>
            {t('journey.arrivalText')}
          </Text>
        </View>
        <Calendar selected={d} onSelect={setD} minDate={new Date()} />
        <Button
          label={t('journey.arrivalValidate', { date: formatLong(d) })}
          onPress={() => {
            update({ arrivalDate: toISODate(d) });
            toast(t('journey.recomputed'));
            onClose();
          }}
        />
      </View>
    </BottomSheet>
  );
}
