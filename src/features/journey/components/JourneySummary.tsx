import { Pencil } from 'lucide-react-native';
import { View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n';
import { daysFromToday, formatDayMonth, relativeDays } from '@/lib/date';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

import { useJourney } from '../store';

/** En tête du Parcours : où tu en es, combien d'étapes ont glissé, et ta date d'arrivée (modifiable). */
export function JourneySummary({ onEditArrival }: { onEditArrival: () => void }) {
  const { c } = useTheme();
  const styles = useStyles();
  const t = useT();
  const j = useJourney();
  const late = j.all.filter((i) => !i.done && daysFromToday(i.date) < 0).length;
  return (
    <View style={styles.card}>
      <ProgressRing progress={j.progress} size={52} stroke={5} color={c.electric} colorTo={c.electricLight} track={c.fill} textColor={c.navy} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{t('journey.doneOf', { done: j.doneCount, total: j.total })}</Text>
        {late ? (
          <Text variant="small" color={c.warningInk}>
            {t('journey.lateCount', { count: late })}
          </Text>
        ) : null}
        <Text variant="small" color={c.muted}>
          {t('journey.arrivalOn', { date: formatDayMonth(j.arrival), rel: relativeDays(j.arrival) })}
        </Text>
      </View>
      <PressableScale onPress={onEditArrival} style={styles.edit} accessibilityLabel={t('journey.editArrival')}>
        <Pencil size={16} color={c.electric} />
      </PressableScale>
    </View>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.xl, backgroundColor: c.card, ...shadow.sm },
  edit: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' },
}));
