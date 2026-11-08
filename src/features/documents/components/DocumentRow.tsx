import { Check, FileText, Image as ImageIcon } from 'lucide-react-native';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { ChevronRight } from '@/components/ui/DirIcons';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useContent } from '@/data/hooks';
import { useLocalDb } from '@/data/local-db';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { pop } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { motion } from '@/theme/tokens';

import { CATEGORY_LOOK, SUGGESTIONS } from '../categories';
import { docMeta } from '../format';
import type { VaultDoc } from '../store';

/** Un document du coffre : son type, son nom, « PDF · 1,2 Mo · 3 novembre ». */
export function DocumentRow({ doc, onPress }: { doc: VaultDoc; onPress: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  return (
    <PressableScale onPress={onPress} scaleTo={0.985} style={styles.row} accessibilityLabel={t('vault.openA11y', { name: doc.title })}>
      <IconTile icon={doc.type === 'application/pdf' ? FileText : ImageIcon} tone={CATEGORY_LOOK[doc.category].tone} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {doc.title}
        </Text>
        <Text variant="caption" color={c.muted} numberOfLines={1}>
          {docMeta(doc)}
        </Text>
      </View>
      <ChevronRight size={18} color={c.subtle} />
    </PressableScale>
  );
}

type Suggestion = (typeof SUGGESTIONS)[number];

/**
 * Un document conseillé : coché quand il est dans le coffre (on l'ouvre) ou quand on l'a en papier (case à cocher) ;
 * sinon, « Ajouter » ouvre l'ajout déjà rangé dans la bonne rubrique.
 */
export function SuggestionRow({ s, stored, onAdd, onOpen }: { s: Suggestion; stored?: VaultDoc; onAdd: () => void; onOpen: (d: VaultDoc) => void }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const ticked = useLocalDb((st) => !!st.documents[s.id]);
  const toggle = useLocalDb((st) => st.toggleDocument);
  const { data: figures } = useContent('figures');
  const label = t(`tools.documents.items.${s.key}`);
  // Le montant exigé vient des chiffres officiels du site (il a changé le 1er août 2026).
  const hint =
    s.id === 'resources' && figures.verified.compteBloqueMensuel
      ? t('tools.documents.atLeast', { amount: figures.verified.compteBloqueMensuel.display })
      : s.hint
        ? t(`tools.documents.hints.${s.hint}`)
        : undefined;
  const on = !!stored || ticked;
  const box = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(on ? 1 : 0.92, motion.springBouncy) }], backgroundColor: on ? c.success : c.fill }));

  return (
    <View style={styles.row}>
      <PressableScale
        haptic={false}
        disabled={!!stored}
        onPress={() => {
          if (ticked) haptics.tap();
          else haptics.success();
          toggle(s.id);
        }}
        style={styles.hit}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on, disabled: !!stored }}
        accessibilityLabel={t('vault.tickA11y', { name: label })}>
        <Animated.View style={[styles.box, box]}>
          {on && (
            <Animated.View entering={pop()}>
              <Check size={14} color={c.onAccent} strokeWidth={3.4} />
            </Animated.View>
          )}
        </Animated.View>
      </PressableScale>
      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="bodyStrong" color={on ? c.subtle : c.navy}>
          {label}
        </Text>
        {stored ? (
          <Text variant="caption" color={c.success}>
            {t('vault.stored')}
          </Text>
        ) : hint ? (
          <Text variant="caption" color={c.muted}>
            {hint}
          </Text>
        ) : null}
      </View>
      {stored ? (
        <PressableScale onPress={() => onOpen(stored)} style={styles.open} accessibilityLabel={t('vault.openA11y', { name: label })}>
          <ChevronRight size={18} color={c.subtle} />
        </PressableScale>
      ) : (
        <Button label={t('vault.addThis')} size="sm" variant="secondary" onPress={onAdd} />
      )}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, minHeight: 60 },
  hit: { width: 44, height: 44, marginStart: -9, marginEnd: -6, alignItems: 'center', justifyContent: 'center' },
  box: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  open: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginEnd: -10 },
}));
