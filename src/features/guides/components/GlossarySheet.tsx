import { router } from 'expo-router';
import { BookOpen, Lightbulb } from 'lucide-react-native';
import { View } from 'react-native';
import { create } from 'zustand';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { Button } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { Text } from '@/components/ui/Text';
import { useStep } from '@/features/journey/steps';
import { palette } from '@/theme/tokens';

import { findTerm, useGlossary } from '../glossary';

const useGlossarySheet = create<{ term: string | null; open: (t: string) => void; close: () => void }>((set) => ({
  term: null,
  open: (term) => set({ term }),
  close: () => set({ term: null }),
}));

export const openTerm = (t: string) => useGlossarySheet.getState().open(t);

/** Définition d'un terme du lexique, accessible depuis n'importe quel texte. */
export function GlossarySheetHost() {
  const { term, close } = useGlossarySheet();
  const glossary = useGlossary();
  const t = term ? findTerm(glossary, term) : null;
  const step = useStep(t?.stepId);
  return (
    <BottomSheet visible={!!term} onClose={close}>
      {t ? (
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconTile bg={palette.electricSoft}>
              <BookOpen size={20} color={palette.electric} />
            </IconTile>
            <View style={{ flex: 1 }}>
              <Text variant="h1">{t.term}</Text>
              {t.full ? (
                <Text variant="small" color={palette.muted}>
                  {t.full}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={{ backgroundColor: palette.electricSoft, borderRadius: 18, padding: 16 }}>
            <Text variant="overline" color={palette.electric} style={{ marginBottom: 6 }}>
              En une phrase
            </Text>
            <Text variant="body">{t.simple}</Text>
          </View>
          {t.example ? (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <Lightbulb size={18} color={palette.warning} style={{ marginTop: 2 }} />
              <Text variant="body" color={palette.subtle} style={{ flex: 1 }}>
                {t.example}
              </Text>
            </View>
          ) : null}
          {step ? (
            <Button
              label={`Voir l'étape : ${step.title}`}
              variant="secondary"
              size="md"
              onPress={() => {
                close();
                setTimeout(() => router.push({ pathname: '/(app)/etape/[id]', params: { id: step.id } }), 250);
              }}
            />
          ) : null}
          <Button
            label="Ouvrir le lexique complet"
            variant="ghost"
            size="md"
            onPress={() => {
              close();
              setTimeout(() => router.push('/(app)/lexique'), 250);
            }}
          />
        </View>
      ) : (
        <Text variant="body">Terme introuvable.</Text>
      )}
    </BottomSheet>
  );
}
