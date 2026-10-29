import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { BookOpen, Check, CircleDot, ShieldAlert, Sparkles, UsersRound } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { celebrate } from '@/components/feedback/Confetti';
import { Button } from '@/components/ui/Button';
import { ArrowUpRight, ChevronRight } from '@/components/ui/DirIcons';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { StatusPill, Tag } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import { readMinutes } from '@/data/content';
import { useContent, useGuide } from '@/data/hooks';
import { openTerm } from '@/features/guides/components/GlossarySheet';
import { DocumentsCard, FaqList, FigureList, KeyFactsCard, SourcesCard } from '@/features/guides/components/GuideParts';
import { StepIcon } from '@/features/journey/components/StepIcon';
import { useStep } from '@/features/journey/steps';
import { useJourney, useJourneyStore } from '@/features/journey/store';
import { formatLong } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';
import { rise } from '@/theme/motion';

/** Fiche de clarification : le quoi, le pourquoi, le combien, le quand — et UNE action. */
export default function StepSheet() {
  const { c } = useTheme();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const step = useStep(id);
  const j = useJourney();
  const toggle = useJourneyStore((s) => s.toggle);
  const { data: guide } = useGuide(step?.guides[0]);
  const { data: manifest } = useContent('manifest');
  const { data: journey } = useContent('journey');
  if (!step) return null;
  const item = j.all.find((i) => i.kind === 'official' && i.step.id === id);
  const done = !!item?.done;
  const current = !!item?.current;
  const otherGuides = step.guides.slice(1).map((slug) => manifest.guides.find((g) => g.slug === slug)).filter((g) => !!g);
  const showSafety = journey.safety.stepIds.includes(step.id);
  const openGuide = (slug: string) => router.push({ pathname: '/(app)/guide/[id]', params: { id: slug } });

  const markDone = () => {
    toggle(step.id, !done);
    if (!done) {
      haptics.success();
      celebrate();
      setTimeout(() => router.back(), 700);
    }
  };

  const ask = (q: string) => {
    router.back();
    setTimeout(() => router.navigate({ pathname: '/(app)/(tabs)/ia', params: { q } }), 250);
  };

  return (
    <ScrollView style={{ backgroundColor: c.card }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]} showsVerticalScrollIndicator={false}>
      <Animated.View entering={rise()} style={styles.head}>
        <IconTile size={52} bg={c.electricSoft} radius={16}>
          <StepIcon name={step.icon} color={c.electric} size={24} />
        </IconTile>
        <View style={{ flex: 1, gap: 8 }}>
          <Text variant="h1">{step.title}</Text>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <Tag label={step.tags.join(' · ')} />
            <StatusPill status={done ? 'done' : current ? 'current' : 'todo'} />
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={rise(60)} style={styles.reassure}>
        <Text variant="body">
          <Text variant="bodyStrong" color={c.electric}>
            Pas de panique.{' '}
          </Text>
          Des milliers d’étudiants sont passés par là avant toi, on t’explique tout, simplement.
        </Text>
      </Animated.View>

      <Animated.View entering={rise(100)} style={{ gap: 6 }}>
        <Text variant="overline" color={c.muted}>
          C’est quoi, en 1 phrase ?
        </Text>
        <Text variant="body">{step.oneLiner}</Text>
      </Animated.View>
      <Animated.View entering={rise(130)} style={{ gap: 6 }}>
        <Text variant="overline" color={c.muted}>
          Pourquoi c’est important
        </Text>
        <Text variant="body">{step.why}</Text>
      </Animated.View>

      <Animated.View entering={rise(160)} style={{ gap: 10 }}>
        <View style={styles.stat}>
          <Text variant="overline" color={c.muted} style={{ fontSize: 9 }}>
            Quand
          </Text>
          <Text variant="h3">{step.when}</Text>
          {item ? (
            <Text variant="caption" color={c.electric}>
              Pour toi : {formatLong(item.date)}
            </Text>
          ) : null}
        </View>
        <FigureList figures={step.figures} />
      </Animated.View>

      <Animated.View entering={rise(190)} style={{ gap: 10 }}>
        <Text variant="overline" color={c.muted}>
          Comment faire, en 3 étapes
        </Text>
        {step.howTo.map((h, i) => (
          <View key={h.title} style={styles.how}>
            <View style={[styles.num, { opacity: 1 - i * 0.18 }]}>
              <Text variant="h3" color="#fff">
                {i + 1}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{h.title}</Text>
              <Text variant="small" color={c.subtle}>
                {h.detail}
              </Text>
            </View>
          </View>
        ))}
      </Animated.View>

      {guide?.documents.length ? (
        <DocumentsCard documents={guide.documents} />
      ) : step.needs?.length ? (
        <Animated.View entering={rise(210)} style={{ gap: 8 }}>
          <Text variant="overline" color={c.muted}>
            Ce qu’il te faut
          </Text>
          {step.needs.map((n) => (
            <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CircleDot size={14} color={c.electric} />
              <Text variant="body">{n}</Text>
            </View>
          ))}
        </Animated.View>
      ) : null}

      {step.terms?.length ? (
        <Animated.View entering={rise(230)} style={{ gap: 8 }}>
          <Text variant="overline" color={c.muted}>
            Les mots à connaître
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {step.terms.map((t) => (
              <PressableScale key={t} onPress={() => openTerm(t)} haptic="select" style={styles.term}>
                <Text variant="smallStrong" color={c.electric}>
                  {t}
                </Text>
              </PressableScale>
            ))}
          </View>
        </Animated.View>
      ) : null}

      <Animated.View entering={rise(250)} style={styles.action}>
        <Text variant="overline" color="rgba(255,255,255,0.55)" style={{ fontSize: 9.5 }}>
          Ta seule action maintenant
        </Text>
        <Text variant="h3" color="#fff">
          {step.action.label}
        </Text>
        <Button
          label={step.action.url ? 'Ouvrir le site officiel' : 'Voir comment faire'}
          size="md"
          variant="white"
          icon={<ArrowUpRight size={16} color={c.navy} />}
          onPress={() => (step.action.url ? WebBrowser.openBrowserAsync(step.action.url) : guide ? openGuide(guide.slug) : ask(step.title))}
        />
      </Animated.View>

      {guide ? (
        <View style={{ gap: 14 }}>
          <View style={{ gap: 4 }}>
            <Text variant="overline" color={c.muted}>
              D’après notre guide
            </Text>
            <PressableScale onPress={() => openGuide(guide.slug)} style={styles.guide} accessibilityRole="link">
              <BookOpen size={18} color={c.electric} />
              <View style={{ flex: 1 }}>
                <Text variant="smallStrong">{guide.title}</Text>
                <Text variant="caption" color={c.muted}>
                  {readMinutes(guide.readTime)} min de lecture
                </Text>
              </View>
              <ChevronRight size={16} color={c.muted} />
            </PressableScale>
            {!step.hasCountryGuide ? (
              <Text variant="caption" color={c.subtle}>
                Notre guide spécifique pour ton pays arrive bientôt. En attendant, voici le guide général.
              </Text>
            ) : null}
          </View>
          <KeyFactsCard guide={guide} />
          <FaqList faq={guide.faq} limit={3} />
          <SourcesCard guide={guide} />
        </View>
      ) : null}

      {otherGuides.length ? (
        <View style={{ gap: 8 }}>
          <Text variant="overline" color={c.muted}>
            Pour aller plus loin
          </Text>
          {otherGuides.map((g) => (
            <PressableScale key={g.slug} onPress={() => openGuide(g.slug)} style={styles.guide} accessibilityRole="link">
              <BookOpen size={18} color={c.subtle} />
              <Text variant="smallStrong" style={{ flex: 1 }}>
                {g.title}
              </Text>
              <ChevronRight size={16} color={c.muted} />
            </PressableScale>
          ))}
        </View>
      ) : null}

      {showSafety ? (
        <PressableScale onPress={() => openGuide(journey.safety.guide)} style={[styles.guide, { backgroundColor: c.warningSoft, borderColor: c.warningSoft }]}>
          <ShieldAlert size={18} color={c.warningInk} />
          <View style={{ flex: 1 }}>
            <Text variant="smallStrong" color={c.warningInk}>
              {journey.safety.title}
            </Text>
            <Text variant="caption" color={c.warningInk}>
              {journey.safety.oneLiner}
            </Text>
          </View>
          <ChevronRight size={16} color={c.warningInk} />
        </PressableScale>
      ) : null}

      <View style={{ gap: 10 }}>
        <Button
          label={done ? 'Marquer comme à faire' : 'C’est fait !'}
          variant={done ? 'secondary' : 'primary'}
          icon={!done ? <Check size={18} color="#fff" strokeWidth={3} /> : undefined}
          onPress={markDone}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button label="Un mentor" size="md" variant="secondary" iconLeft={<UsersRound size={16} color={c.navy} />} onPress={() => {
              router.back();
              setTimeout(() => router.navigate('/(app)/(tabs)/explorer'), 250);
            }} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Dalili IA" size="md" variant="secondary" iconLeft={<Sparkles size={16} color={c.aiIndigo} />} onPress={() => ask(`Explique-moi : ${step.title}`)} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  content: { padding: 22, paddingTop: 28, gap: 20, maxWidth: 620, width: '100%', alignSelf: 'center' },
  head: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  reassure: { padding: 16, borderRadius: radius.lg, backgroundColor: c.electricSoft },
  stat: { flex: 1, padding: 14, borderRadius: radius.lg, borderWidth: 1.5, borderColor: c.line, gap: 4 },
  how: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: radius.lg, backgroundColor: c.card, ...shadow.sm },
  num: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#5B5CF0', alignItems: 'center', justifyContent: 'center' },
  term: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: c.electricSoft },
  action: { padding: 18, borderRadius: radius.xl, backgroundColor: c.navyInk, gap: 10 },
  guide: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, borderWidth: 1.5, borderColor: c.line },
}));
