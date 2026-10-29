import { router } from 'expo-router';
import { BookOpen, Lightbulb } from 'lucide-react-native';
import { View } from 'react-native';
import { create } from 'zustand';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { Button } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { Text } from '@/components/ui/Text';
import { useStep } from '@/features/journey/steps';
import { useT } from '@/i18n';
import { useTheme } from '@/theme/scheme';

import { findTerm, useGlossary } from '../glossary';

const useGlossarySheet = create<{ term: string | null; open: (t: string) => void; close: () => void }>((set) => ({
  term: null,
  open: (term) => set({ term }),
  close: () => set({ term: null }),
}));

export const openTerm = (t: string) => useGlossarySheet.getState().open(t);

/** Définition d'un terme du lexique, accessible depuis n'importe quel texte. */
export function GlossarySheetHost() {
  const { c } = useTheme();
  const { term, close } = useGlossarySheet();
  const glossary = useGlossary();
  const entry = term ? findTerm(glossary, term) : null;
  const step = useStep(entry?.stepId);
  const t = useT();
  return (
    <BottomSheet visible={!!term} onClose={close}>
      {entry ? (
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconTile icon={BookOpen} tone="blue" />
            <View style={{ flex: 1 }}>
              <Text variant="h1">{entry.term}</Text>
              {entry.full ? (
                <Text variant="small" color={c.muted}>
                  {entry.full}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={{ backgroundColor: c.electricSoft, borderRadius: 18, padding: 16 }}>
            <Text variant="overline" color={c.electric} style={{ marginBottom: 6 }}>
              {t('glossary.oneSentence')}
            </Text>
            <Text variant="body">{entry.simple}</Text>
          </View>
          {entry.example ? (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <Lightbulb size={18} color={c.warning} style={{ marginTop: 2 }} />
              <Text variant="body" color={c.subtle} style={{ flex: 1 }}>
                {entry.example}
              </Text>
            </View>
          ) : null}
          {step ? (
            <Button
              label={t('glossary.seeStep', { title: step.title })}
              variant="secondary"
              size="md"
              onPress={() => {
                close();
                setTimeout(() => router.push({ pathname: '/(app)/etape/[id]', params: { id: step.id } }), 250);
              }}
            />
          ) : null}
          <Button
            label={t('glossary.openAll')}
            variant="ghost"
            size="md"
            onPress={() => {
              close();
              setTimeout(() => router.push('/(app)/lexique'), 250);
            }}
          />
        </View>
      ) : (
        <Text variant="body">{t('glossary.notFound')}</Text>
      )}
    </BottomSheet>
  );
}
