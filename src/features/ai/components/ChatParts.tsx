import { router } from 'expo-router';
import { BookOpen, BookPlus, Check, ChevronRight, HeartHandshake, Phone, RotateCcw, Scale, Square, ThumbsDown, UsersRound, Volume2 } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { toast } from '@/components/feedback/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OptionCard } from '@/components/ui/OptionCard';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useMentors } from '@/data/hooks';
import { openLink, RichText } from '@/features/guides/components/RichText';
import { StepIcon } from '@/features/journey/components/StepIcon';
import { useJourney } from '@/features/journey/store';
import { isInFrance, useProfile } from '@/features/profile/store';
import { relativeDays } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { palette, radius, shadow, tones } from '@/theme/tokens';
import { rise } from '@/theme/motion';

import { slugOf, type AssistantAction, type FeedbackReason, type SourceRef } from '../api';
import { speakAnswer, useSpeech } from '../speech';
import type { ChatMessage } from '../useAssistant';

/** Markdown léger des réponses : titres, listes, gras et liens (via RichText). */
export function AnswerText({ text }: { text: string }) {
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
            <View key={i} style={{ flexDirection: 'row', gap: 8, paddingLeft: 2 }}>
              <Text variant="body" color={palette.aiIndigo}>
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
  // Un guide = une pastille, même si plusieurs extraits en viennent (anciennes versions du site).
  const sources = all.filter((s, i) => all.findIndex((x) => x.url === s.url) === i);
  if (!sources.length) return null;
  return (
    <View style={{ gap: 6 }}>
      <Text variant="overline" color={palette.muted} style={{ fontSize: 9.5 }}>
        D’après nos guides
      </Text>
      {sources.map((s, i) => (
        <Animated.View key={s.url} entering={rise(i * 60)}>
          <PressableScale onPress={() => openSource(s)} style={styles.source} accessibilityRole="link" accessibilityLabel={`Lire le guide ${s.title}`}>
            <BookOpen size={15} color={palette.aiIndigo} />
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
            accessibilityLabel={`Ouvrir l’étape ${item.step.title}${item.done ? ', déjà faite' : ''}`}>
            <IconTile tone={item.done ? 'green' : 'blue'} size={40} radius={13}>
              {item.done ? <Check size={20} color={tones.green.ink} strokeWidth={2.6} /> : <StepIcon name={item.step.icon} size={20} color={tones.blue.ink} />}
            </IconTile>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color={palette.muted}>
                {item.done ? 'Étape déjà faite' : `Ton étape · ${relativeDays(item.date)}`}
              </Text>
              <Text variant="smallStrong" numberOfLines={2}>
                {item.step.title}
              </Text>
            </View>
            <ChevronRight size={18} color={palette.subtle} />
          </PressableScale>
        </Animated.View>
      ))}
    </View>
  );
}

/** Sous une réponse : 🔊 l'écouter, 👎 la signaler. */
export function AnswerTools({ m, onReport }: { m: ChatMessage; onReport: () => void }) {
  const speaking = useSpeech((s) => s.speakingId === m.id);
  return (
    <View style={styles.tools}>
      <PressableScale
        haptic="select"
        onPress={() => speakAnswer(m.id, m.content, m.lang)}
        hitSlop={4}
        style={[styles.tool, speaking && { backgroundColor: palette.aiSoft }]}
        accessibilityLabel={speaking ? 'Arrêter la lecture' : 'Écouter la réponse'}>
        {speaking ? <Square size={13} color={palette.aiIndigo} fill={palette.aiIndigo} /> : <Volume2 size={16} color={palette.subtle} />}
        <Text variant="caption" color={speaking ? palette.aiIndigo : palette.subtle}>
          {speaking ? 'Arrêter' : 'Écouter'}
        </Text>
      </PressableScale>
      {m.queryId && m.reported ? (
        <Animated.View entering={FadeIn} style={styles.tool}>
          <Check size={15} color={palette.success} />
          <Text variant="caption" color={palette.success}>
            Merci, on vérifie
          </Text>
        </Animated.View>
      ) : m.queryId ? (
        <PressableScale onPress={onReport} hitSlop={4} style={styles.tool} accessibilityLabel="Signaler : cette réponse est fausse">
          <ThumbsDown size={15} color={palette.subtle} />
          <Text variant="caption" color={palette.subtle}>
            Signaler
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const REASONS: { id: FeedbackReason; label: string }[] = [
  { id: 'faux', label: 'C’est faux' },
  { id: 'incomplet', label: 'Il manque quelque chose' },
  { id: 'pas_clair', label: 'Ce n’est pas clair' },
  { id: 'autre', label: 'Autre chose' },
];

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
  const [reason, setReason] = useState<FeedbackReason | null>(null);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!reason || sending) return;
    setSending(true);
    const result = await onSend(reason, comment);
    setSending(false);
    if (result === 'failed') return toast('Pas envoyé. Vérifie ta connexion et réessaie.', 'info');
    haptics.success();
    toast(result === 'demo' ? 'Merci ! En mode démo, rien n’est envoyé.' : 'Merci ! L’équipe va relire cette réponse.');
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      onClosed={() => {
        setReason(null);
        setComment('');
      }}>
      <View style={{ gap: 14 }}>
        <View style={{ gap: 4 }}>
          <Text variant="h2">Qu’est-ce qui ne va pas ?</Text>
          <Text variant="small" color={palette.subtle}>
            L’équipe relit chaque signalement et corrige le guide si besoin. Ton nom n’est jamais envoyé.
          </Text>
        </View>
        <View style={{ gap: 8 }}>
          {REASONS.map((r) => (
            <OptionCard key={r.id} title={r.label} selected={reason === r.id} onPress={() => setReason(r.id)} />
          ))}
        </View>
        <Input multiline placeholder="Dis-nous ce qui cloche (facultatif)" value={comment} onChangeText={setComment} maxLength={500} />
        <Button label="Envoyer" onPress={submit} loading={sending} disabled={!reason} />
      </View>
    </BottomSheet>
  );
}

function Option({ icon, label, onPress, done }: { icon: React.ReactNode; label: string; onPress: () => void; done?: boolean }) {
  return (
    <PressableScale onPress={onPress} disabled={done} style={[styles.option, done && { borderColor: palette.success }]}>
      {icon}
      <Text variant="smallStrong" style={{ flex: 1 }} color={done ? palette.success : palette.navy}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** Un refus propose TOUJOURS : le guide le plus proche, un mentor, et « On l'ajoute à nos guides ». */
export function RefusalOptions({ m, onRequest }: { m: ChatMessage; onRequest: () => Promise<boolean> }) {
  const [sending, setSending] = useState(false);
  const nearest = m.sources?.[0];
  return (
    <Animated.View entering={FadeIn.delay(120)} style={{ gap: 8 }}>
      {nearest ? (
        <Option icon={<BookOpen size={17} color={palette.aiIndigo} />} label={`Le guide le plus proche : ${nearest.title}`} onPress={() => openSource(nearest)} />
      ) : null}
      <Option icon={<UsersRound size={17} color={palette.mentor} />} label="Demander à un mentor" onPress={() => router.navigate('/(app)/(tabs)/explorer')} />
      <Option
        icon={m.requested ? <Check size={17} color={palette.success} /> : <BookPlus size={17} color={palette.electric} />}
        label={m.requested ? 'Merci ! L’équipe va l’ajouter à ses guides à écrire.' : 'On l’ajoute à nos guides'}
        done={m.requested}
        onPress={async () => {
          if (sending) return;
          setSending(true);
          const ok = await onRequest();
          setSending(false);
          if (!ok) toast('Impossible de l’envoyer pour le moment. Réessaie plus tard.', 'info');
        }}
      />
    </Animated.View>
  );
}

/** Filets de sécurité sous une réponse, selon les drapeaux du cerveau. */
export function SafetyNotes({ m }: { m: ChatMessage }) {
  const flags = m.flags ?? [];
  const inFrance = useProfile((s) => isInFrance(s.profile));
  const { data: mentors = [] } = useMentors();
  return (
    <>
      {flags.includes('distress') && !inFrance ? (
        <View style={[styles.note, { backgroundColor: '#FFF1F2' }]}>
          <HeartHandshake size={18} color="#E11D48" />
          <View style={{ flex: 1 }}>
            <Text variant="smallStrong" color="#9F1239">
              Tu n’es pas seul·e.
            </Text>
            <Text variant="caption" color="#9F1239">
              Si tu es en danger, appelle tout de suite les urgences de ton pays. Et parle dès maintenant à quelqu’un en qui tu as confiance.
            </Text>
          </View>
        </View>
      ) : null}
      {flags.includes('distress') && inFrance ? (
        <PressableScale onPress={() => Linking.openURL('tel:3114')} style={[styles.note, { backgroundColor: '#FFF1F2' }]} accessibilityLabel="Appeler le 3114">
          <HeartHandshake size={18} color="#E11D48" />
          <View style={{ flex: 1 }}>
            <Text variant="smallStrong" color="#9F1239">
              Tu n’es pas seul·e. Appelle le 3114
            </Text>
            <Text variant="caption" color="#9F1239">
              Gratuit, 24 h/24, des professionnels t’écoutent. En danger immédiat : le 15 ou le 112.
            </Text>
          </View>
          <Phone size={16} color="#E11D48" />
        </PressableScale>
      ) : null}
      {flags.includes('stress') || flags.includes('complex') ? (
        <PressableScale onPress={() => router.navigate(mentors.length ? '/(app)/(tabs)/explorer' : '/(app)/(tabs)/communaute')} style={[styles.note, { backgroundColor: palette.mentorSoft }]}>
          <UsersRound size={18} color={palette.mentor} />
          <Text variant="small" style={{ flex: 1 }}>
            {flags.includes('complex') ? 'Ta situation mérite l’avis d’une personne. ' : 'Tu n’es pas seul·e à vivre ça. '}
            <Text variant="smallStrong" color={palette.mentor}>
              {mentors.length ? 'Un étudiant passé par là peut t’appeler gratuitement.' : 'Parles-en avec les étudiants de la communauté.'}
            </Text>
          </Text>
        </PressableScale>
      ) : null}
      {flags.includes('legal') ? (
        <View style={styles.legal}>
          <Scale size={14} color={palette.muted} />
          <Text variant="caption" color={palette.muted} style={{ flex: 1 }}>
            Ce n’est pas un conseil juridique. Pour ton cas précis, vérifie auprès de la préfecture, du consulat ou d’un juriste.
          </Text>
        </View>
      ) : null}
    </>
  );
}

export function RetryButton({ onPress }: { onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={styles.retry}>
      <RotateCcw size={15} color={palette.electric} />
      <Text variant="smallStrong" color={palette.electric}>
        Renvoyer ma question
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tools: { flexDirection: 'row', gap: 8 },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: palette.surface },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: radius.lg, backgroundColor: palette.surface, ...shadow.sm },
  source: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.lg, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E3E1FF' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E3E1FF', ...shadow.sm },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.lg },
  legal: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: 4 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 14, minHeight: 44, borderRadius: 999, borderWidth: 1.5, borderColor: '#C9D6FF', backgroundColor: '#fff' },
});
