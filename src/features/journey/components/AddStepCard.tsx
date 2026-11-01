import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { toast } from '@/components/feedback/Toast';
import { Button } from '@/components/ui/Button';
import { Calendar } from '@/components/ui/Calendar';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n';
import { formatDayMonth, toISODate } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { makeStyles, useTheme } from '@/theme/scheme';
import { fonts, radius } from '@/theme/tokens';

import { useJourneyStore } from '../store';

/** « + Ajouter ma propre étape » : une ligne discrète qui ouvre la feuille (nom, puis date au calendrier). */
export function AddStepCard({ defaultDate }: { defaultDate?: Date }) {
  const { c } = useTheme();
  const styles = useStyles();
  const add = useJourneyStore((s) => s.addCustom);
  const t = useT();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<Date>(() => defaultDate ?? new Date(Date.now() + 7 * 86_400_000));
  const [open, setOpen] = useState(false);

  const submit = () => {
    if (!title.trim()) {
      haptics.warning();
      return toast(t('journey.addNeedName'), 'info');
    }
    add(title, toISODate(date));
    haptics.success();
    toast(t('journey.added'));
    setTitle('');
    setOpen(false);
  };

  return (
    <>
      <PressableScale onPress={() => setOpen(true)} style={styles.row} accessibilityRole="button">
        <View style={styles.plus}>
          <Plus size={16} color={c.electric} strokeWidth={2.6} />
        </View>
        <Text variant="smallStrong" color={c.electric}>
          {t('journey.addTitle')}
        </Text>
      </PressableScale>
      <BottomSheet visible={open} onClose={() => setOpen(false)} scroll>
        <View style={{ gap: 14 }}>
          <Text variant="h2">{t('journey.addTitle')}</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder={t('journey.addPlaceholder')} placeholderTextColor={c.muted} style={styles.field} returnKeyType="done" />
          <Text variant="smallStrong" color={c.subtle}>
            {t('journey.addWhen', { date: formatDayMonth(date) })}
          </Text>
          <Calendar selected={date} onSelect={setDate} />
          <Button label={t('journey.addCta')} onPress={submit} />
        </View>
      </BottomSheet>
    </>
  );
}

const useStyles = makeStyles(({ c }) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, alignSelf: 'flex-start', minHeight: 44 },
  plus: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.electricSoft, alignItems: 'center', justifyContent: 'center' },
  field: { height: 50, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.line, backgroundColor: c.card, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 15, color: c.navy },
}));
