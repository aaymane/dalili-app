import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, CalendarClock, Check, CircleDot, Clock, Heart, ShieldAlert, Sparkles, UsersRound } from 'lucide-react-native';
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
import { useT } from '@/i18n';
import { daysFromToday, formatDayMonth, formatLong } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';
import { rise } from '@/theme/motion';

/**
 * Fiche de clarification : le quoi, le pourquoi, le combien, le quand — et UNE action. L'action et « C'est fait »
 * restent dans une barre fixe en bas : jamais besoin de descendre pour agir.
 */
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
  const t = useT();
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

  const late = !!item && !done && daysFromToday(item.date) < 0;
  const act = () => (step.action.url ? WebBrowser.openBrowserAsync(step.action.url) : guide ? openGuide(guide.slug) : ask(step.title));
  const actLabel = step.action.url ? t('step.officialSite') : guide ? t('step.readGuide') : t('step.ai');

  return (
    // Deux enfants directs, sans conteneur : la feuille iOS a besoin que la liste qui défile soit le premier.
    <>
      <ScrollView style={{ backgroundColor: c.card }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
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

        {/* L'essentiel d'un coup d'œil : combien de temps, et quand (une date passée le dit). */}
        <Animated.View entering={rise(50)} style={styles.facts}>
          <View style={styles.fact}>
            <Clock size={14} color={c.subtle} />
            <Text variant="smallStrong" color={c.subtle}>
              {t('common.minutes', { n: step.minutes })}
            </Text>
          </View>
          <View style={[styles.fact, late && { backgroundColor: c.warningSoft }]}>
            <CalendarClock size={14} color={late ? c.warningInk : c.electric} />
            <Text variant="smallStrong" color={late ? c.warningInk : c.electric}>
              {item ? (late ? t('step.lateOn', { date: formatDayMonth(item.date) }) : t('step.forYou', { date: formatLong(item.date) })) : step.when}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={rise(90)} style={{ gap: 8 }}>
          <Text variant="body">{step.oneLiner}</Text>
          <Text variant="body" color={c.subtle}>
            {step.why}
          </Text>
          <View style={styles.reassure}>
            <Heart size={14} color={c.electric} />
            <Text variant="small" color={c.subtle} style={{ flex: 1 }}>
              <Text variant="smallStrong" color={c.electric}>
                {t('step.reassureA')}{' '}
              </Text>
              {t('step.reassureB')}
            </Text>
          </View>
        </Animated.View>

        {step.figures.length ? (
          <Animated.View entering={rise(120)}>
            <FigureList figures={step.figures} />
          </Animated.View>
        ) : null}

        {/* Comment faire : une frise numérotée, du premier geste au dernier. */}
        <Animated.View entering={rise(150)} style={{ gap: 12 }}>
          <Text variant="h3">{t('step.how')}</Text>
          <View>
            {step.howTo.map((h, i) => (
              <View key={h.title} style={styles.how}>
                <View style={{ alignItems: 'center' }}>
                  <View style={styles.num}>
                    <Text variant="smallStrong" color={c.onAccent}>
                      {i + 1}
                    </Text>
                  </View>
                  {i < step.howTo.length - 1 ? <View style={styles.rail} /> : null}
                </View>
                <View style={{ flex: 1, gap: 2, paddingBottom: i < step.howTo.length - 1 ? 18 : 0 }}>
                  <Text variant="bodyStrong">{h.title}</Text>
                  <Text variant="small" color={c.subtle}>
                    {h.detail}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {guide?.documents.length ? (
          <DocumentsCard documents={guide.documents} />
        ) : step.needs?.length ? (
          <Animated.View entering={rise(180)} style={{ gap: 8 }}>
            <Text variant="h3">{t('step.needs')}</Text>
            {step.needs.map((n) => (
              <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CircleDot size={14} color={c.electric} />
                <Text variant="body">{n}</Text>
              </View>
            ))}
          </Animated.View>
        ) : null}

        {step.terms?.length ? (
          <Animated.View entering={rise(200)} style={{ gap: 10 }}>
            <Text variant="h3">{t('step.terms')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {step.terms.map((term) => (
                <PressableScale key={term} onPress={() => openTerm(term)} haptic="select" style={styles.term}>
                  <Text variant="smallStrong" color={c.electric}>
                    {term}
                  </Text>
                </PressableScale>
              ))}
            </View>
          </Animated.View>
        ) : null}

        {guide ? (
          <View style={{ gap: 14 }}>
            <View style={{ gap: 10 }}>
              <Text variant="h3">{t('step.fromGuide')}</Text>
              <PressableScale onPress={() => openGuide(guide.slug)} style={styles.guide} accessibilityRole="link">
                <BookOpen size={18} color={c.electric} />
                <View style={{ flex: 1 }}>
                  <Text variant="smallStrong">{guide.title}</Text>
                  <Text variant="caption" color={c.muted}>
                    {t('step.readTime', { n: readMinutes(guide.readTime) })}
                  </Text>
                </View>
                <ChevronRight size={16} color={c.muted} />
              </PressableScale>
              {!step.hasCountryGuide ? (
                <Text variant="caption" color={c.subtle}>
                  {t('step.countryGuideSoon')}
                </Text>
              ) : null}
            </View>
            <KeyFactsCard guide={guide} />
            <FaqList faq={guide.faq} limit={3} />
            <SourcesCard guide={guide} />
          </View>
        ) : null}

        {otherGuides.length ? (
          <View style={{ gap: 10 }}>
            <Text variant="h3">{t('step.further')}</Text>
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
          <Text variant="h3">{t('step.help')}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button
                label={t('step.aMentor')}
                size="md"
                variant="secondary"
                iconLeft={<UsersRound size={16} color={c.navy} />}
                onPress={() => {
                  router.back();
                  setTimeout(() => router.navigate('/(app)/(tabs)/explorer'), 250);
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={t('step.ai')} size="md" variant="secondary" iconLeft={<Sparkles size={16} color={c.aiIndigo} />} onPress={() => ask(t('step.explain', { title: step.title }))} />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Toujours visible : faire l'action, et la cocher une fois faite. Le contenu glisse dessous, en fondu. */}
      <Animated.View entering={rise(220)} style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]} pointerEvents="box-none">
        <LinearGradient colors={[`${c.card}00`, c.card]} style={styles.fade} pointerEvents="none" />
        <View style={styles.footerRow}>
          <View style={{ flex: 1.15 }}>
            <Button label={actLabel} onPress={act} icon={<ArrowUpRight size={18} color={c.onAccent} />} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={done ? t('step.undo') : t('step.markDone')}
              variant="secondary"
              iconLeft={done ? undefined : <Check size={18} color={c.success} strokeWidth={3} />}
              onPress={markDone}
            />
          </View>
        </View>
      </Animated.View>
    </>
  );
}

const useStyles = makeStyles(({ c }) => ({
  content: { padding: 22, paddingTop: 28, gap: 24, maxWidth: 620, width: '100%', alignSelf: 'center' },
  head: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -6 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: c.fill },
  reassure: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4 },
  how: { flexDirection: 'row', gap: 14 },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.electric, alignItems: 'center', justifyContent: 'center' },
  rail: { flex: 1, width: 2, marginVertical: 4, borderRadius: 1, backgroundColor: c.electricSoft },
  term: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: c.electricSoft },
  guide: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, borderWidth: 1.5, borderColor: c.line },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 22, paddingTop: 10, backgroundColor: c.card },
  fade: { position: 'absolute', left: 0, right: 0, top: -28, height: 28 },
  footerRow: { flexDirection: 'row', gap: 10, maxWidth: 620, width: '100%', alignSelf: 'center' },
}));
