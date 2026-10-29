import { Smartphone } from 'lucide-react-native';
import { View } from 'react-native';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { toast } from '@/components/feedback/Toast';
import { IconTile } from '@/components/ui/IconTile';
import { OptionCard } from '@/components/ui/OptionCard';
import { Text } from '@/components/ui/Text';
import { i18n, LANGUAGE_NAMES, LANGUAGES, resolveLanguage, systemLanguage, useLanguage, useT, type LanguagePreference } from '@/i18n';
import { useTheme } from '@/theme/scheme';

/** Choisir la langue de l'app : celle du téléphone, ou français, arabe, anglais. Le changement est immédiat. */
export function LanguageSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const preference = useLanguage((s) => s.preference);
  const setPreference = useLanguage((s) => s.setPreference);

  const choose = (p: LanguagePreference) => {
    const changed = resolveLanguage(p) !== resolveLanguage(preference);
    setPreference(p);
    // La feuille se ferme une fois la coche posée ; le message arrive dans la nouvelle langue.
    setTimeout(() => {
      onClose();
      if (changed) toast(i18n.t('language.changed'));
    }, 220);
  };

  const options: { value: LanguagePreference; title: string; subtitle?: string }[] = [
    { value: 'system', title: t('language.system'), subtitle: LANGUAGE_NAMES[systemLanguage()] },
    ...LANGUAGES.map((l) => ({ value: l, title: LANGUAGE_NAMES[l] })),
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ gap: 14 }}>
        <View style={{ gap: 6 }}>
          <Text variant="h2">{t('language.sheetTitle')}</Text>
          <Text variant="small" color={c.muted}>
            {t('language.sheetText')}
          </Text>
        </View>
        <View style={{ gap: 10 }}>
          {options.map((o) => (
            <OptionCard
              key={o.value}
              title={o.title}
              subtitle={o.subtitle}
              icon={o.value === 'system' ? <IconTile icon={Smartphone} tone="slate" size={38} radius={12} /> : undefined}
              selected={preference === o.value}
              onPress={() => choose(o.value)}
            />
          ))}
        </View>
      </View>
    </BottomSheet>
  );
}
