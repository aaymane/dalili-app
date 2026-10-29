import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Fragment } from 'react';
import { Text as RNText } from 'react-native';

import { Text } from '@/components/ui/Text';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/scheme';
import { type TypeVariant } from '@/theme/tokens';

import { openTerm } from './GlossarySheet';

const TOKEN = /(\[\[[^\]]+\]\]|\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g;

/** Un lien vers un guide du site s'ouvre dans l'app ; les autres dans le navigateur intégré. */
export function openLink(url: string) {
  haptics.tap();
  const guide = url.match(/^(?:https:\/\/dalili\.study)?\/blog\/([a-z0-9-]+)/);
  if (guide) router.push({ pathname: '/(app)/guide/[id]', params: { id: guide[1] } });
  else WebBrowser.openBrowserAsync(url.startsWith('/') ? `https://dalili.study${url}` : url);
}

/**
 * Texte enrichi :
 * - `[[CAF]]` devient un mot cliquable qui ouvre sa définition (le « mur du vocabulaire ») ;
 * - `**gras**` et `[libellé](url)` viennent des guides du site.
 */
export function RichText({ text, variant = 'body', color }: { text: string; variant?: TypeVariant; color?: string }) {
  const { c } = useTheme();
  color ??= c.navy;
  const parts = text.split(TOKEN);
  return (
    <Text variant={variant} color={color}>
      {parts.map((p, i) => {
        const term = p.match(/^\[\[([^\]]+)\]\]$/);
        if (term)
          return (
            <RNText
              key={i}
              onPress={() => {
                haptics.select();
                openTerm(term[1]);
              }}
              accessibilityRole="link"
              accessibilityHint="Ouvre la définition"
              style={{ color: c.electric, textDecorationLine: 'underline', textDecorationStyle: 'dotted', fontFamily: 'OpenSans_600SemiBold' }}>
              {term[1]}
            </RNText>
          );
        const bold = p.match(/^\*\*([^*]+)\*\*$/);
        if (bold)
          return (
            <RNText key={i} style={{ fontFamily: 'OpenSans_700Bold' }}>
              {bold[1]}
            </RNText>
          );
        const link = p.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
        if (link)
          return (
            <RNText
              key={i}
              onPress={() => openLink(link[2])}
              accessibilityRole="link"
              style={{ color: c.electric, textDecorationLine: 'underline', fontFamily: 'OpenSans_600SemiBold' }}>
              {link[1]}
            </RNText>
          );
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </Text>
  );
}
