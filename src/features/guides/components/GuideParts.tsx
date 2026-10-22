import { AlertTriangle, BadgeCheck, ChevronDown, ExternalLink, FileCheck2, Info, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import type { FigureDisplay, Guide, GuideBlock } from '@/data/content';
import { formatFullDate } from '@/lib/date';
import { palette, radius, shadow } from '@/theme/tokens';
import { reflow } from '@/theme/motion';

import { RichText, openLink } from './RichText';

/** Un bloc de guide du site (titres, paragraphes, listes, tableaux, encadrés). */
export function GuideBlockView({ b }: { b: GuideBlock }) {
  switch (b.type) {
    case 'h2':
      return (
        <Text variant="h2" style={{ marginTop: 10 }}>
          {b.text}
        </Text>
      );
    case 'h3':
      return <Text variant="h3">{b.text}</Text>;
    case 'p':
      return <RichText text={b.text} />;
    case 'list':
      return (
        <View style={{ gap: 8 }}>
          {b.items.map((it, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
              {b.ordered ? (
                <Text variant="bodyStrong" color={palette.electric} style={{ minWidth: 18 }}>
                  {i + 1}.
                </Text>
              ) : (
                <View style={styles.bullet} />
              )}
              <View style={{ flex: 1 }}>
                <RichText text={it} />
              </View>
            </View>
          ))}
        </View>
      );
    case 'table':
      return (
        <View style={styles.table}>
          {b.rows.map((row, r) => (
            <View key={r} style={[styles.tableRow, r > 0 && styles.tableDivider]}>
              {row.map((cell, c) => (
                <View key={c} style={{ gap: 2 }}>
                  <Text variant="caption" color={palette.muted}>
                    {b.header[c] ?? ''}
                  </Text>
                  <RichText text={cell} variant={c === 0 ? 'smallStrong' : 'small'} />
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    case 'callout':
      return (
        <View style={[styles.callout, { backgroundColor: b.tone === 'warning' ? palette.warningSoft : palette.electricSoft }]}>
          {b.tone === 'warning' ? <AlertTriangle size={18} color={palette.warning} /> : <Info size={18} color={palette.electric} />}
          <View style={{ flex: 1 }}>
            <RichText text={b.text} />
          </View>
        </View>
      );
  }
}

/** Chiffres officiels d'une étape, chacun avec sa source, ou « À vérifier ». */
export function FigureList({ figures }: { figures: FigureDisplay[] }) {
  if (!figures.length) return null;
  return (
    <View style={styles.card}>
      {figures.map((f, i) => (
        <View key={`${f.label}${i}`} style={[styles.figure, i > 0 && styles.tableDivider]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="small" color={palette.subtle}>
              {f.label}
            </Text>
            {f.source ? (
              <Text
                variant="caption"
                color={palette.muted}
                onPress={f.sourceUrl ? () => openLink(f.sourceUrl!) : undefined}
                accessibilityRole={f.sourceUrl ? 'link' : undefined}>
                Source : {f.source}
              </Text>
            ) : null}
          </View>
          <View style={[styles.value, f.toVerify && { backgroundColor: palette.warningSoft }]}>
            <Text variant="bodyStrong" color={f.toVerify ? palette.warningInk : palette.navy}>
              {f.value}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Les points clés vérifiés du guide (bloc KeyFacts du site). */
export function KeyFactsCard({ guide }: { guide: Guide }) {
  if (!guide.keyFacts?.facts.length) return null;
  return (
    <View style={[styles.card, { gap: 10 }]}>
      <View style={styles.cardTitle}>
        <BadgeCheck size={18} color={palette.success} />
        <Text variant="bodyStrong">Les points clés vérifiés</Text>
      </View>
      {guide.keyFacts.facts.map((f, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
          <View style={[styles.bullet, { backgroundColor: palette.success }]} />
          <Text variant="small" style={{ flex: 1 }}>
            {f}
          </Text>
        </View>
      ))}
      {guide.keyFacts.source ? (
        <Text variant="caption" color={palette.muted}>
          Sources : {guide.keyFacts.source}
        </Text>
      ) : null}
    </View>
  );
}

export function DocumentsCard({ documents }: { documents: string[] }) {
  if (!documents.length) return null;
  return (
    <View style={[styles.card, { gap: 10 }]}>
      <View style={styles.cardTitle}>
        <FileCheck2 size={18} color={palette.electric} />
        <Text variant="bodyStrong">Les documents à préparer</Text>
      </View>
      {documents.map((d, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
          <View style={styles.bullet} />
          <Text variant="small" style={{ flex: 1 }}>
            {d}
          </Text>
        </View>
      ))}
    </View>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Animated.View layout={reflow} style={styles.faq}>
      <PressableScale haptic="select" onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.faqHead}>
        <Text variant="smallStrong" style={{ flex: 1 }}>
          {q}
        </Text>
        <ChevronDown size={18} color={palette.subtle} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </PressableScale>
      {open ? (
        <Animated.View entering={FadeIn.duration(180)} style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <Text variant="small" color={palette.subtle}>
            {a}
          </Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

export function FaqList({ faq, limit }: { faq: Guide['faq']; limit?: number }) {
  if (!faq.length) return null;
  return (
    <View style={{ gap: 8 }}>
      <Text variant="h3">Les questions qu’on nous pose</Text>
      {faq.slice(0, limit ?? faq.length).map((f) => (
        <FaqItem key={f.question} q={f.question} a={f.answer} />
      ))}
    </View>
  );
}

/** Sources officielles + date de mise à jour : la preuve que l'info est vérifiée. */
export function SourcesCard({ guide }: { guide: Guide }) {
  const links = guide.sources.filter((s) => s.url);
  return (
    <View style={[styles.card, { gap: 10 }]}>
      <View style={styles.cardTitle}>
        <ShieldCheck size={18} color={palette.electric} />
        <Text variant="bodyStrong">D’où viennent ces infos</Text>
      </View>
      <Text variant="small" color={palette.subtle}>
        Guide DALILI vérifié, mis à jour le {formatFullDate(guide.updatedDate)}.
      </Text>
      {links.map((s) => (
        <PressableScale key={s.url} onPress={() => openLink(s.url)} style={styles.source} accessibilityRole="link">
          <Text variant="smallStrong" color={palette.electric} style={{ flex: 1 }} numberOfLines={1}>
            {s.label}
          </Text>
          <ExternalLink size={14} color={palette.electric} />
        </PressableScale>
      ))}
      <PressableScale onPress={() => openLink(guide.url)} style={styles.source} accessibilityRole="link">
        <Text variant="smallStrong" color={palette.electric} style={{ flex: 1 }}>
          Lire le guide complet sur dalili.study
        </Text>
        <ExternalLink size={14} color={palette.electric} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  bullet: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.electric, marginTop: 8 },
  table: { borderRadius: radius.lg, backgroundColor: palette.surface, paddingHorizontal: 14, ...shadow.sm },
  tableRow: { paddingVertical: 12, gap: 8 },
  tableDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
  callout: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: radius.lg },
  card: { padding: 16, borderRadius: radius.xl, backgroundColor: palette.surface, ...shadow.sm },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  figure: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  value: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, backgroundColor: palette.electricSoft },
  faq: { borderRadius: radius.lg, backgroundColor: palette.surface, overflow: 'hidden', ...shadow.sm },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, minHeight: 48 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
});
