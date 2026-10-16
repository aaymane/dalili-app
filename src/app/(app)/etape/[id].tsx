import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ArrowUpRight, BookOpen, Check, CircleDot, MessageCircleQuestion, Sparkles, UsersRound } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { celebrate } from '@/components/feedback/Confetti';
import { Button } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { StatusPill, Tag } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import { openTerm } from '@/features/guides/components/GlossarySheet';
import { guideById } from '@/features/guides/guides';
import { StepIcon } from '@/features/journey/components/StepIcon';
import { stepById } from '@/features/journey/steps';
import { useJourney, useJourneyStore } from '@/features/journey/store';
import { formatLong } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { palette, radius, shadow } from '@/theme/tokens';

/** Fiche de clarification : le quoi, le pourquoi, le combien, le quand — et UNE action. */
export default function StepSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const step = stepById(id);
  const j = useJourney();
  const toggle = useJourneyStore((s) => s.toggle);
  if (!step) return null;
  const item = j.all.find((i) => i.kind === 'official' && i.step.id === id);
  const done = !!item?.done;
  const current = !!item?.current;
  const guide = step.guideId ? guideById(step.guideId) : null;

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
    <ScrollView style={{ backgroundColor: '#fff' }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.springify()} style={styles.head}>
        <IconTile size={52} bg={palette.electricSoft} radius={16}>
          <StepIcon name={step.icon} color={palette.electric} size={24} />
        </IconTile>
        <View style={{ flex: 1, gap: 8 }}>
          <Text variant="h1">{step.title}</Text>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <Tag label={step.tags.join(' · ')} />
            <StatusPill status={done ? 'done' : current ? 'current' : 'todo'} />
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.reassure}>
        <Text variant="body">
          <Text variant="bodyStrong" color={palette.electric}>
            Pas de panique.{' '}
          </Text>
          Des milliers d’étudiants sont passés par là avant toi, on t’explique tout, simplement.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).springify()} style={{ gap: 6 }}>
        <Text variant="overline" color={palette.muted}>
          C’est quoi, en 1 phrase ?
        </Text>
        <Text variant="body">{step.oneLiner}</Text>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(130).springify()} style={{ gap: 6 }}>
        <Text variant="overline" color={palette.muted}>
          Pourquoi c’est important
        </Text>
        <Text variant="body">{step.why}</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).springify()} style={{ flexDirection: 'row', gap: 10 }}>
        <View style={styles.stat}>
          <Text variant="overline" color={palette.muted} style={{ fontSize: 9 }}>
            Budget
          </Text>
          <Text variant="h3">{step.budget}</Text>
        </View>
        <View style={styles.stat}>
          <Text variant="overline" color={palette.muted} style={{ fontSize: 9 }}>
            Quand
          </Text>
          <Text variant="h3">{step.when}</Text>
          {item ? (
            <Text variant="caption" color={palette.electric}>
              Pour toi : {formatLong(item.date)}
            </Text>
          ) : null}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(190).springify()} style={{ gap: 10 }}>
        <Text variant="overline" color={palette.muted}>
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
              <Text variant="small" color={palette.subtle}>
                {h.detail}
              </Text>
            </View>
          </View>
        ))}
      </Animated.View>

      {step.needs?.length ? (
        <Animated.View entering={FadeInDown.delay(210).springify()} style={{ gap: 8 }}>
          <Text variant="overline" color={palette.muted}>
            Ce qu’il te faut
          </Text>
          {step.needs.map((n) => (
            <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CircleDot size={14} color={palette.electric} />
              <Text variant="body">{n}</Text>
            </View>
          ))}
        </Animated.View>
      ) : null}

      {step.terms?.length ? (
        <Animated.View entering={FadeInDown.delay(230).springify()} style={{ gap: 8 }}>
          <Text variant="overline" color={palette.muted}>
            Les mots à connaître
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {step.terms.map((t) => (
              <PressableScale key={t} onPress={() => openTerm(t)} haptic="select" style={styles.term}>
                <Text variant="smallStrong" color={palette.electric}>
                  {t}
                </Text>
              </PressableScale>
            ))}
          </View>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.action}>
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
          icon={<ArrowUpRight size={16} color={palette.navy} />}
          onPress={() => (step.action.url ? WebBrowser.openBrowserAsync(step.action.url) : guide ? router.push({ pathname: '/(app)/guide/[id]', params: { id: guide.id } }) : ask(step.title))}
        />
      </Animated.View>

      <View style={{ gap: 10 }}>
        <Button
          label={done ? 'Marquer comme à faire' : 'C’est fait !'}
          variant={done ? 'secondary' : 'primary'}
          icon={!done ? <Check size={18} color="#fff" strokeWidth={3} /> : undefined}
          onPress={markDone}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button label="Un mentor" size="md" variant="secondary" iconLeft={<UsersRound size={16} color={palette.navy} />} onPress={() => {
              router.back();
              setTimeout(() => router.navigate('/(app)/(tabs)/explorer'), 250);
            }} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Dalili IA" size="md" variant="secondary" iconLeft={<Sparkles size={16} color={palette.aiIndigo} />} onPress={() => ask(`Explique-moi : ${step.title}`)} />
          </View>
        </View>
        {guide ? (
          <PressableScale onPress={() => router.push({ pathname: '/(app)/guide/[id]', params: { id: guide.id } })} style={styles.guide}>
            <BookOpen size={18} color={palette.electric} />
            <View style={{ flex: 1 }}>
              <Text variant="smallStrong">Lire le guide : {guide.title}</Text>
              <Text variant="caption" color={palette.muted}>
                {guide.minutes} min de lecture
              </Text>
            </View>
            <MessageCircleQuestion size={16} color={palette.muted} />
          </PressableScale>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 22, paddingTop: 28, gap: 20, maxWidth: 620, width: '100%', alignSelf: 'center' },
  head: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  reassure: { padding: 16, borderRadius: radius.lg, backgroundColor: '#EEF3FF' },
  stat: { flex: 1, padding: 14, borderRadius: radius.lg, borderWidth: 1.5, borderColor: palette.line, gap: 4 },
  how: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: radius.lg, backgroundColor: '#fff', ...shadow.sm },
  num: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#5B5CF0', alignItems: 'center', justifyContent: 'center' },
  term: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: palette.electricSoft },
  action: { padding: 18, borderRadius: radius.xl, backgroundColor: palette.navyInk, gap: 10 },
  guide: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, borderWidth: 1.5, borderColor: palette.line },
});
