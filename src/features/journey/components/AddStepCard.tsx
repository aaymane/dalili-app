import { CalendarDays, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { toast } from '@/components/feedback/Toast';
import { Button } from '@/components/ui/Button';
import { Calendar } from '@/components/ui/Calendar';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { formatDayMonth, toISODate } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { fonts, palette, radius } from '@/theme/tokens';

import { useJourneyStore } from '../store';

/** « + Ajouter ma propre étape » — carte en pointillés (prototype). */
export function AddStepCard({ defaultDate }: { defaultDate?: Date }) {
  const add = useJourneyStore((s) => s.addCustom);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<Date>(() => defaultDate ?? new Date(Date.now() + 7 * 86_400_000));
  const [open, setOpen] = useState(false);

  const submit = () => {
    if (!title.trim()) {
      haptics.warning();
      return toast('Donne un nom à ton étape.', 'info');
    }
    add(title, toISODate(date));
    haptics.success();
    toast('Étape ajoutée avec succès.');
    setTitle('');
  };

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Plus size={18} color={palette.electric} strokeWidth={2.6} />
        <Text variant="h3" color={palette.electric}>
          Ajouter ma propre étape
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput value={title} onChangeText={setTitle} placeholder="Ex : acheter mon billet d’avion" placeholderTextColor={palette.muted} style={[styles.field, { flex: 1.4 }]} onSubmitEditing={submit} returnKeyType="done" />
        <PressableScale onPress={() => setOpen(true)} style={[styles.field, styles.dateBtn]}>
          <CalendarDays size={14} color={palette.electric} />
          <Text variant="smallStrong">{formatDayMonth(date)}</Text>
        </PressableScale>
      </View>
      <Button label="Ajouter à mes étapes" size="md" onPress={submit} />
      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <Calendar
          selected={date}
          onSelect={(d) => {
            setDate(d);
            setTimeout(() => setOpen(false), 160);
          }}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 16, borderRadius: radius.xl, borderWidth: 2, borderStyle: 'dashed', borderColor: '#9DB6FF', backgroundColor: '#FAFBFF' },
  field: { height: 46, borderRadius: radius.md, borderWidth: 1.5, borderColor: palette.line, backgroundColor: '#fff', paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 14, color: palette.navy },
  dateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
