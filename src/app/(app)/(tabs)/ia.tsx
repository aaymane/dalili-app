import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ArrowUp, SquarePen, UserRoundCog } from 'lucide-react-native';
import { useCallback, useEffect, useEffectEvent, useRef, useState, type ComponentRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_SPACE } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { ListGroup } from '@/components/ui/ListGroup';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useContent } from '@/data/hooks';
import { Ame, type AmeState } from '@/features/ame/Ame';
import { AnswerText, AnswerTools, FeedbackSheet, RefusalOptions, RetryButton, SafetyNotes, SourcePills, StepActions } from '@/features/ai/components/ChatParts';
import { useSuggestions } from '@/features/ai/suggestions';
import { stopSpeaking } from '@/features/ai/speech';
import { useAssistant, type ChatMessage } from '@/features/ai/useAssistant';
import { displayName, useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';
import { makeStyles, useTheme } from '@/theme/scheme';
import { fonts, radius } from '@/theme/tokens';
import { rise } from '@/theme/motion';

function Bubble({
  m,
  onAsk,
  onRequest,
  onReport,
}: {
  m: ChatMessage;
  onAsk: (q: string) => void;
  onRequest: (id: string) => Promise<boolean>;
  onReport: (id: string) => void;
}) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  if (m.role === 'user') {
    return (
      <Animated.View entering={rise()} style={{ alignItems: 'flex-end' }}>
        <View style={styles.bubbleUser}>
          <Text variant="body" color={c.white}>
            {m.content}
          </Text>
        </View>
      </Animated.View>
    );
  }
  // En attente : c'est l'Âme, en haut, qui réfléchit. Pas de « … ».
  if (m.status === 'pending') return null;
  return (
    <Animated.View entering={FadeIn.duration(200)} style={{ gap: 10 }}>
      {m.status === 'error' ? (
        <View style={styles.error}>
          <Text variant="body" color={c.warningInk}>
            {m.content}
          </Text>
          {m.errorKind === 'auth' ? <Button label={t('ai.signIn')} size="md" full={false} onPress={() => router.push('/(auth)/login')} /> : null}
        </View>
      ) : (
        // La réponse se lit comme une page, pas comme une bulle : plus de largeur, moins de cadres.
        <View style={styles.answer}>
          <AnswerText text={m.content} />
        </View>
      )}
      {m.status === 'done' && m.fallback ? <RefusalOptions m={m} onRequest={() => onRequest(m.id)} /> : null}
      {m.status === 'done' && !m.fallback ? <SourcePills sources={m.sources ?? []} /> : null}
      {m.status === 'done' && !m.fallback && m.actions?.length ? <StepActions actions={m.actions} /> : null}
      {m.status === 'done' && !m.fallback && m.content ? <AnswerTools m={m} onReport={() => onReport(m.id)} /> : null}
      {m.status !== 'streaming' ? <SafetyNotes m={m} /> : null}
      {m.status === 'error' && m.retry ? <RetryButton onPress={() => onAsk(m.retry!)} /> : null}
    </Animated.View>
  );
}

/** Dalili IA : répond uniquement avec les guides dalili.study, et montre d'où vient chaque info. */
export default function DaliliIA() {
  const { c, gradients } = useTheme();
  const styles = useStyles();
  const params = useLocalSearchParams<{ q?: string }>();
  const insets = useSafeAreaInsets();
  const profile = useProfile((s) => s.profile);
  const { data: manifest } = useContent('manifest');
  const { messages, ask, request, report, reset, thinking, streaming, busy } = useAssistant();
  const [reporting, setReporting] = useState<string | null>(null);
  // On quitte le chat : la lecture à voix haute s'arrête.
  useFocusEffect(useCallback(() => stopSpeaking, []));
  const suggestions = useSuggestions();
  const t = useT();
  const [text, setText] = useState('');
  const [keys, setKeys] = useState(0);
  const list = useRef<ComponentRef<typeof FlatList<ChatMessage>>>(null);
  const lastQ = useRef<string | undefined>(undefined);

  const send = (q: string) => {
    if (busy || !q.trim()) return;
    setText('');
    void ask(q);
  };

  // Question reçue depuis un autre écran (?q=…), posée une seule fois.
  const onIncoming = useEffectEvent((q: string) => send(q));
  useEffect(() => {
    if (params.q && params.q !== lastQ.current) {
      lastQ.current = params.q;
      onIncoming(params.q);
    }
  }, [params.q]);

  // On suit la fin de la conversation pendant que les mots arrivent.
  const lastContent = messages[messages.length - 1]?.content.length ?? 0;
  useEffect(() => {
    setTimeout(() => list.current?.scrollToEnd({ animated: true }), 60);
  }, [lastContent, messages.length]);

  const empty = messages.length === 0;
  const state: AmeState = thinking ? 'think' : streaming ? 'answer' : text ? 'listen' : 'rest';
  // L'Âme pulse à chaque frappe, puis toutes les ~40 lettres reçues (≈ 4 Hz au plus).
  const signal = streaming ? Math.floor(lastContent / 40) : keys;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <LinearGradient colors={gradients.aiTop} style={StyleSheet.absoluteFill} locations={[0, 0.3, 0.6]} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          {empty ? (
            <View />
          ) : (
            <Animated.View entering={FadeIn.duration(200)} style={styles.status}>
              <Ame size={44} state={state} signal={signal} surface="light" />
              <View>
                <Text variant="smallStrong">{t('ai.name')}</Text>
                <Text variant="caption" color={c.subtle}>
                  {thinking ? t('ai.searching') : t('ai.basedOn', { count: manifest.counts.guides })}
                </Text>
              </View>
            </Animated.View>
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {empty ? null : (
              <PressableScale onPress={reset} disabled={busy} style={[styles.headBtn, busy && { opacity: 0.4 }]} accessibilityLabel={t('ai.newChat')}>
                <SquarePen size={18} color={c.aiIndigo} />
              </PressableScale>
            )}
            <PressableScale onPress={() => router.push('/(app)/profil-ia')} style={styles.headBtn} accessibilityLabel={t('ai.profileA11y')}>
              <UserRoundCog size={18} color={c.aiIndigo} />
            </PressableScale>
          </View>
        </View>

        <FlatList
          ref={list}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 20, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            empty ? (
              <Animated.View entering={rise()} style={{ alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 18 }}>
                <Ame size={132} state={state} signal={signal} surface="light" />
                <Text variant="h1" align="center" style={{ marginTop: 6 }}>
                  {t('ai.hello', { name: displayName(profile) })}
                </Text>
                <Text variant="body" color={c.subtle} align="center" style={{ maxWidth: 320 }}>
                  {t('ai.intro')}
                </Text>
                <Text variant="caption" color={c.muted} align="center" style={{ maxWidth: 300 }}>
                  {t('ai.answersLanguage')}
                </Text>
              </Animated.View>
            ) : undefined
          }
          renderItem={({ item }) => <Bubble m={item} onAsk={send} onRequest={request} onReport={setReporting} />}
          ListFooterComponent={
            empty ? (
              <Animated.View entering={rise(120)} style={{ gap: 10 }}>
                <Text variant="h3">{t('ai.forStep')}</Text>
                <ListGroup>
                  {suggestions.map((s) => (
                    <PressableScale key={s} scaleTo={0.985} onPress={() => send(s)} style={styles.suggestion} accessibilityRole="button" accessibilityHint={t('ai.send')}>
                      <Text variant="smallStrong" style={{ flex: 1 }}>
                        {s}
                      </Text>
                      <View style={styles.suggestionGo}>
                        <ArrowUp size={14} color={c.aiIndigo} strokeWidth={2.6} />
                      </View>
                    </PressableScale>
                  ))}
                </ListGroup>
              </Animated.View>
            ) : undefined
          }
        />

        <View style={[styles.inputBar, { marginBottom: TAB_BAR_SPACE - 18 }]}>
          <TextInput
            value={text}
            onChangeText={(v) => {
              setText(v);
              setKeys((k) => k + 1);
            }}
            placeholder={t('ai.placeholder')}
            placeholderTextColor={c.muted}
            style={styles.input}
            multiline
            maxLength={300}
            onSubmitEditing={() => send(text)}
            submitBehavior="blurAndSubmit"
            returnKeyType="send"
            accessibilityLabel={t('ai.inputA11y')}
          />
          <PressableScale onPress={() => send(text)} disabled={!text.trim() || busy} haptic={false} accessibilityLabel={t('ai.send')}>
            <LinearGradient colors={gradients.ai} style={[styles.send, (!text.trim() || busy) && { opacity: 0.45 }]}>
              <ArrowUp size={18} color="#fff" strokeWidth={2.8} />
            </LinearGradient>
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
      <FeedbackSheet visible={reporting !== null} onClose={() => setReporting(null)} onSend={(reason, comment) => report(reporting ?? '', reason, comment)} />
    </View>
  );
}

const useStyles = makeStyles(({ c, shadow, scheme }) => ({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 6 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: scheme === 'dark' ? 'rgba(20,27,49,0.8)' : 'rgba(255,255,255,0.7)', paddingLeft: 6, paddingRight: 14, minHeight: 44, borderRadius: 999 },
  headBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  answer: { paddingEnd: 8 },
  error: { gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: c.warningSoft, alignItems: 'flex-start' },
  bubbleUser: { maxWidth: '82%', borderRadius: 20, borderBottomEndRadius: 6, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: c.electric },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14, minHeight: 52 },
  suggestionGo: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.aiSoft, alignItems: 'center', justifyContent: 'center' },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, paddingLeft: 18, paddingRight: 6, minHeight: 56, borderRadius: 28, backgroundColor: c.card, borderWidth: 1.5, borderColor: c.line, ...shadow.md },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: c.navy, maxHeight: 110, paddingVertical: 12, outlineStyle: 'none' } as any,
  send: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
}));
