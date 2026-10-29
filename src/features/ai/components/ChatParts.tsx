import { router } from 'expo-router';
import { BookOpen, BookPlus, Check, HeartHandshake, Phone, RotateCcw, Scale, Square, ThumbsDown, UsersRound, Volume2 } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { toast } from '@/components/feedback/Toast';
import { Button } from '@/components/ui/Button';
import { ChevronRight } from '@/components/ui/DirIcons';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Tag';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useMentors } from '@/data/hooks';
import { openLink, RichText } from '@/features/guides/components/RichText';
import { StepIcon } from '@/features/journey/components/StepIcon';
import { useJourney } from '@/features/journey/store';
import { isInFrance, useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';
import { relativeDays } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';
import { rise } from '@/theme/motion';

import { slugOf, type AssistantAction, type FeedbackReason, type SourceRef } from '../api';
import { speakAnswer, useSpeech } from '../speech';
import type { ChatMessage } from '../useAssistant';

/** Markdown léger des réponses : titres, listes, gras et liens (via RichText). */
export function AnswerText({ text }: { text: string }) {
  const { c } = useTheme();
  const lines = text.split('\n');
  return (
    <View style={{ gap: 6 }}>
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim()) return null;
        const heading = line.match(/^#{1,4}\s+(.*)$/);
        if (heading) return <RichText key={i} variant="bodyStrong" text={heading[1].replace(/\*\*/g, '')} />;
        const bullet = line.match(/^\s*(?:[-*•]|(\d+)\.)\s+(.*)$/);
        if (bullet)
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 8, paddingStart: 2 }}>
              <Text variant="body" color={c.aiIndigo}>
                {bullet[1] ? `${bullet[1]}.` : '•'}
              </Text>
              <View style={{ flex: 1 }}>
                <RichText text={bullet[2]} />
              </View>
            </View>
          );
        return <RichText key={i} text={line} />;
      })}
    </View>
  );
}

const openSource = (s: SourceRef) => {
  const slug = slugOf(s);
  if (slug) router.push({ pathname: '/(app)/guide/[id]', params: { id: slug } });
  else openLink(s.url);
};

/** Pastilles « D'après nos guides » : chaque source ouvre le guide dans l'app. */
export function SourcePills({ sources: all }: { sources: SourceRef[] }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  // Un guide = une pastille, même si plusieurs extraits en viennent (anciennes versions du site).
  const sources = all.filter((s, i) => all.findIndex((x) => x.url === s.url) === i);
  if (!sources.length) return null;
  return (
    <View style={{ gap: 6 }}>
      <Text variant="overline" color={c.muted} style={{ fontSize: 9.5 }}>
        {t('ai.fromGuides')}
      </Text>
      {sources.map((s, i) => (
        <Animated.View key={s.url} entering={rise(i * 60)}>
          <PressableScale onPress={() => openSource(s)} style={styles.source} accessibilityRole="link" accessibilityLabel={t('ai.readGuideA11y', { title: s.title })}>
            <BookOpen size={15} color={c.aiIndigo} />
            <Text variant="smallStrong" style={{ flex: 1 }} numberOfLines={2}>
              {s.title}
            </Text>
          </PressableScale>
        </Animated.View>
      ))}
    </View>
  );
}

/**
 * « Ouvrir l'étape … » : les étapes du parcours liées aux guides cités (déduites par le serveur).
 * Une étape qui ne concerne pas ton profil n'apparaît pas.
 */
export function StepActions({ actions }: { actions: AssistantAction[] }) {
  const { c, tones } = useTheme();
  const t = useT();
  const styles = useStyles();
  const j = useJourney();
  const items = actions
    .map((a) => j.all.find((i) => i.kind === 'official' && i.step.id === a.stepId))
    .filter((i) => i?.kind === 'official');
  if (!items.length) return null;
  return (
    <View style={{ gap: 8 }}>
      {items.map((item, i) => (
        <Animated.View key={item.step.id} entering={rise(120 + i * 60)}>
          <PressableScale
            onPress={() => router.push({ pathname: '/(app)/etape/[id]', params: { id: item.step.id } })}
            style={styles.action}
            accessibilityRole="button"
            accessibilityLabel={item.done ? t('ai.openStepDoneA11y', { title: item.step.title }) : t('ai.openStepA11y', { title: item.step.title })}>
            <IconTile tone={item.done ? 'green' : 'blue'} size={40} radius={13}>
              {item.done ? <Check size={20} color={tones.green.ink} strokeWidth={2.6} /> : <StepIcon name={item.step.icon} size={20} color={tones.blue.ink} />}
            </IconTile>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color={c.muted}>
                {item.done ? t('ai.stepDone') : t('ai.yourStep', { when: relativeDays(item.date) })}
              </Text>
              <Text variant="smallStrong" numberOfLines={2}>
                {item.step.title}
              </Text>
            </View>
            <ChevronRight size={18} color={c.subtle} />
          </PressableScale>
        </Animated.View>
      ))}
    </View>
  );
}

/** Sous une réponse : 🔊 l'écouter, 👎 la signaler. */
export function AnswerTools({ m, onReport }: { m: ChatMessage; onReport: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const speaking = useSpeech((s) => s.speakingId === m.id);
  return (
    <View style={styles.tools}>
      <PressableScale
        haptic="select"
        onPress={() => speakAnswer(m.id, m.content, m.lang)}
        hitSlop={4}
        style={[styles.tool, speaking && { backgroundColor: c.aiSoft }]}
        accessibilityLabel={speaking ? t('ai.stopA11y') : t('ai.listenA11y')}>
        {speaking ? <Square size={13} color={c.aiIndigo} fill={c.aiIndigo} /> : <Volume2 size={16} color={c.subtle} />}
        <Text variant="caption" color={speaking ? c.aiIndigo : c.subtle}>
          {speaking ? t('ai.stop') : t('ai.listen')}
        </Text>
      </PressableScale>
      {m.queryId && m.reported ? (
        <Animated.View entering={FadeIn} style={styles.tool}>
          <Check size={15} color={c.success} />
          <Text variant="caption" color={c.success}>
            {t('ai.thanksChecking')}
          </Text>
        </Animated.View>
      ) : m.queryId ? (
        <PressableScale onPress={onReport} hitSlop={4} style={styles.tool} accessibilityLabel={t('ai.reportA11y')}>
          <ThumbsDown size={15} color={c.subtle} />
          <Text variant="caption" color={c.subtle}>
            {t('ai.report')}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const REASONS: FeedbackReason[] = ['faux', 'incomplet', 'pas_clair', 'autre'];

/** 👎 « Cette réponse est fausse » : un motif, un mot facultatif. Lié à la question, jamais à toi. */
export function FeedbackSheet({
  visible,
  onClose,
  onSend,
}: {
  visible: boolean;
  onClose: () => void;
  onSend: (reason: FeedbackReason, comment: string) => Promise<'sent' | 'demo' | 'failed'>;
}) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const [reason, setReason] = useState<FeedbackReason | null>(null);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!reason || sending) return;
    setSending(true);
    const result = await onSend(reason, comment);
    setSending(false);
    if (result === 'failed') return toast(t('ai.notSent'), 'info');
    haptics.success();
    toast(result === 'demo' ? t('ai.thanksDemo') : t('ai.thanksReview'));
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      scroll
      onClosed={() => {
        setReason(null);
        setComment('');
      }}>
      <View style={{ gap: 14 }}>
        <View style={{ gap: 4 }}>
          <Text variant="h2">{t('ai.whatsWrong')}</Text>
          <Text variant="small" color={c.subtle}>
            {t('ai.whatsWrongText')}
          </Text>
        </View>
        <View style={styles.reasons} accessibilityRole="radiogroup">
          {REASONS.map((r) => (
            <PressableScale
              key={r}
              haptic="select"
              onPress={() => setReason(r)}
              hitSlop={4}
              accessibilityRole="radio"
              accessibilityState={{ selected: reason === r }}>
              <Chip label={t(`ai.reason.${r}`)} active={reason === r} />
            </PressableScale>
          ))}
        </View>
        <Input multiline placeholder={t('ai.commentPlaceholder')} value={comment} onChangeText={setComment} maxLength={500} />
        <Button label={t('ai.send')} onPress={submit} loading={sending} disabled={!reason} />
      </View>
    </BottomSheet>
  );
}

function Option({ icon, label, onPress, done }: { icon: React.ReactNode; label: string; onPress: () => void; done?: boolean }) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <PressableScale onPress={onPress} disabled={done} style={[styles.option, done && { borderColor: c.success }]}>
      {icon}
      <Text variant="smallStrong" style={{ flex: 1 }} color={done ? c.success : c.navy}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** Un refus propose TOUJOURS : le guide le plus proche, un mentor, et « On l'ajoute à nos guides ». */
export function RefusalOptions({ m, onRequest }: { m: ChatMessage; onRequest: () => Promise<boolean> }) {
  const { c } = useTheme();
  const t = useT();
  const [sending, setSending] = useState(false);
  const nearest = m.sources?.[0];
  return (
    <Animated.View entering={FadeIn.delay(120)} style={{ gap: 8 }}>
      {nearest ? (
        <Option icon={<BookOpen size={17} color={c.aiIndigo} />} label={t('ai.nearestGuide', { title: nearest.title })} onPress={() => openSource(nearest)} />
      ) : null}
      <Option icon={<UsersRound size={17} color={c.mentor} />} label={t('ai.askMentor')} onPress={() => router.navigate('/(app)/(tabs)/explorer')} />
      <Option
        icon={m.requested ? <Check size={17} color={c.success} /> : <BookPlus size={17} color={c.electric} />}
        label={m.requested ? t('ai.requested') : t('ai.request')}
        done={m.requested}
        onPress={async () => {
          if (sending) return;
          setSending(true);
          const ok = await onRequest();
          setSending(false);
          if (!ok) toast(t('ai.requestFailed'), 'info');
        }}
      />
    </Animated.View>
  );
}

/** Filets de sécurité sous une réponse, selon les drapeaux du cerveau. */
export function SafetyNotes({ m }: { m: ChatMessage }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const flags = m.flags ?? [];
  const inFrance = useProfile((s) => isInFrance(s.profile));
  const { data: mentors = [] } = useMentors();
  return (
    <>
      {flags.includes('distress') && !inFrance ? (
        <View style={[styles.note, { backgroundColor: c.dangerSoft }]}>
          <HeartHandshake size={18} color="#E11D48" />
          <View style={{ flex: 1 }}>
            <Text variant="smallStrong" color="#9F1239">
              {t('ai.notAlone')}
            </Text>
            <Text variant="caption" color="#9F1239">
              {t('ai.dangerAbroad')}
            </Text>
          </View>
        </View>
      ) : null}
      {flags.includes('distress') && inFrance ? (
        <PressableScale onPress={() => Linking.openURL('tel:3114')} style={[styles.note, { backgroundColor: c.dangerSoft }]} accessibilityLabel={t('ai.call3114A11y')}>
          <HeartHandshake size={18} color="#E11D48" />
          <View style={{ flex: 1 }}>
            <Text variant="smallStrong" color="#9F1239">
              {t('ai.call3114')}
            </Text>
            <Text variant="caption" color="#9F1239">
              {t('ai.call3114Text')}
            </Text>
          </View>
          <Phone size={16} color="#E11D48" />
        </PressableScale>
      ) : null}
      {flags.includes('stress') || flags.includes('complex') ? (
        <PressableScale onPress={() => router.navigate(mentors.length ? '/(app)/(tabs)/explorer' : '/(app)/(tabs)/communaute')} style={[styles.note, { backgroundColor: c.mentorSoft }]}>
          <UsersRound size={18} color={c.mentor} />
          <Text variant="small" style={{ flex: 1 }}>
            {flags.includes('complex') ? t('ai.complex') : t('ai.stress')}
            <Text variant="smallStrong" color={c.mentor}>
              {mentors.length ? t('ai.mentorCall') : t('ai.community')}
            </Text>
          </Text>
        </PressableScale>
      ) : null}
      {flags.includes('legal') ? (
        <View style={styles.legal}>
          <Scale size={14} color={c.muted} />
          <Text variant="caption" color={c.muted} style={{ flex: 1 }}>
            {t('ai.legal')}
          </Text>
        </View>
      ) : null}
    </>
  );
}

export function RetryButton({ onPress }: { onPress: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  return (
    <PressableScale onPress={onPress} style={styles.retry}>
      <RotateCcw size={15} color={c.electric} />
      <Text variant="smallStrong" color={c.electric}>
        {t('ai.retry')}
      </Text>
    </PressableScale>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  tools: { flexDirection: 'row', gap: 8 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: c.surface },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: radius.lg, backgroundColor: c.surface, ...shadow.sm },
  source: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1, borderColor: '#E3E1FF' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1.5, borderColor: '#E3E1FF', ...shadow.sm },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.lg },
  legal: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: 4 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 14, minHeight: 44, borderRadius: 999, borderWidth: 1.5, borderColor: '#C9D6FF', backgroundColor: c.card },
}));
