import { router } from 'expo-router';
import { BookOpen, BookPlus, Check, HeartHandshake, Phone, RotateCcw, Scale, UsersRound } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { toast } from '@/components/feedback/Toast';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useMentors } from '@/data/hooks';
import { openLink, RichText } from '@/features/guides/components/RichText';
import { isInFrance, useProfile } from '@/features/profile/store';
import { palette, radius, shadow } from '@/theme/tokens';

import { slugOf, type SourceRef } from '../api';
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
        <Animated.View key={s.url} entering={FadeInDown.delay(i * 60).springify()}>
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
  source: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.lg, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E3E1FF' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E3E1FF', ...shadow.sm },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.lg },
  legal: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: 4 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 14, minHeight: 44, borderRadius: 999, borderWidth: 1.5, borderColor: '#C9D6FF', backgroundColor: '#fff' },
});
