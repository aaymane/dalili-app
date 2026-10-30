import { router } from 'expo-router';
import { CalendarDays, Clock, ListChecks, Route } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ArrowRight } from '@/components/ui/DirIcons';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Text } from '@/components/ui/Text';
import { useJourney } from '@/features/journey/store';
import { useT } from '@/i18n';
import { leave, pop, reflow, rise } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

import { useBrief } from './brief';

// Le salut arrive mot par mot au premier affichage de la session seulement : ensuite, il est là d'emblée.
let revealedOnce = false;

/** Haut de l'accueil, sans carte : « Salut Aymen. » et une phrase courte. */
export function Greeting() {
  const { c } = useTheme();
  const styles = useStyles();
  const brief = useBrief();
  const [animate] = useState(() => !revealedOnce);
  useEffect(() => {
    revealedOnce = true;
  }, []);
  return (
    <View style={{ gap: 2 }}>
      {animate ? (
        <View style={styles.words} accessible accessibilityRole="header" accessibilityLabel={brief.hello}>
          {brief.hello.split(' ').map((w, i) => (
            <Animated.View key={`${i}-${w}`} entering={rise(i * 70)}>
              <Text variant="h1">{w} </Text>
            </Animated.View>
          ))}
        </View>
      ) : (
        <Text variant="h1" accessibilityRole="header">
          {brief.hello}
        </Text>
      )}
      <Animated.View entering={rise(animate ? 160 : 0)}>
        <Text variant="small" color={c.muted}>
          {brief.lead}
        </Text>
      </Animated.View>
    </View>
  );
}

/**
 * « Ton parcours » sur l'accueil : l'anneau (où tu en es), la prochaine étape (quoi, combien de temps) et trois
 * accès toujours visibles au parcours : Mes étapes, Chemin, Calendrier. Une étape faite : l'anneau avance et la
 * suivante prend la place.
 */
export function NextStepCard() {
  const { c } = useTheme();
  const styles = useStyles();
  const t = useT();
  const j = useJourney();
  const step = j.current?.step ?? null;
  const open = (view: 'steps' | 'path' | 'calendar') => router.push({ pathname: '/(app)/parcours', params: { view } });
  const links = [
    { view: 'steps', label: t('journey.tabSteps'), icon: ListChecks, tone: 'blue' },
    { view: 'path', label: t('journey.tabPath'), icon: Route, tone: 'violet' },
    { view: 'calendar', label: t('journey.tabCalendar'), icon: CalendarDays, tone: 'green' },
  ] as const;

  return (
    <Animated.View entering={rise(120)} layout={reflow} style={styles.card}>
      <PressableScale
        onPress={() => (step ? router.push({ pathname: '/(app)/etape/[id]', params: { id: step.id } }) : open('steps'))}
        scaleTo={0.98}
        haptic="press"
        style={styles.next}
        accessibilityLabel={step ? `${t('home.nextStep')} : ${step.title}` : t('home.allDoneLead')}>
        <ProgressRing progress={j.progress} size={60} stroke={6} color={c.electric} colorTo={c.electricLight} track={c.fill} textColor={c.navy} label={`${j.doneCount}/${j.total}`} />
        <Animated.View key={step?.id ?? 'done'} entering={rise()} exiting={leave} style={{ flex: 1, gap: 2 }}>
          <Text variant="small" color={c.muted}>
            {step ? t('home.nextStep') : t('home.allDoneLead')}
          </Text>
          <Text variant="h3" numberOfLines={2}>
            {step ? step.title : t('home.journeyRow')}
          </Text>
          {step ? (
            <View style={styles.meta}>
              <Clock size={12} color={c.muted} />
              <Text variant="caption" color={c.muted} numberOfLines={1} style={{ flexShrink: 1 }}>
                {t('common.minutes', { n: step.minutes })}
                {step.window ? ` · ${step.window}` : ''}
              </Text>
            </View>
          ) : null}
        </Animated.View>
        <View style={styles.go}>
          <ArrowRight size={18} color={c.onAccent} />
        </View>
      </PressableScale>

      <View style={styles.links}>
        {links.map((l, i) => (
          <Animated.View key={l.view} entering={pop(260 + i * 60)} style={{ flex: 1 }}>
            <PressableScale onPress={() => open(l.view)} style={styles.link} accessibilityLabel={l.label}>
              <IconTile icon={l.icon} tone={l.tone} size={34} radius={11} />
              <Text variant="smallStrong" numberOfLines={1}>
                {l.label}
              </Text>
            </PressableScale>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  words: { flexDirection: 'row', flexWrap: 'wrap' },
  card: { borderRadius: radius.xl, backgroundColor: c.card, ...shadow.sm },
  next: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  go: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: c.electric },
  links: { flexDirection: 'row', gap: 8, paddingHorizontal: 10, paddingBottom: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
  link: { alignItems: 'center', gap: 6, paddingVertical: 8, borderRadius: radius.lg, minHeight: 64 },
}));
