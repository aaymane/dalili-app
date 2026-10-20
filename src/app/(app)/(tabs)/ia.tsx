import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowUp, Sparkles, UserRoundCog } from 'lucide-react-native';
import { useEffect, useEffectEvent, useRef, useState, type ComponentRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_SPACE } from '@/components/layout/Screen';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useContent } from '@/data/hooks';
import { Ame, type AmeState } from '@/features/ame/Ame';
import { AnswerText, RefusalOptions, RetryButton, SafetyNotes, SourcePills } from '@/features/ai/components/ChatParts';
import { useSuggestions } from '@/features/ai/suggestions';
import { useAssistant, type ChatMessage } from '@/features/ai/useAssistant';
import { displayName, useProfile } from '@/features/profile/store';
import { fonts, gradients, palette, radius, shadow } from '@/theme/tokens';

function Bubble({ m, onAsk, onRequest }: { m: ChatMessage; onAsk: (q: string) => void; onRequest: (id: string) => Promise<boolean> }) {
  if (m.role === 'user') {
    return (
      <Animated.View entering={FadeInDown.springify().damping(16)} style={{ alignItems: 'flex-end' }}>
        <LinearGradient colors={['#3D78FF', '#2A55E0']} style={styles.bubbleUser}>
          <Text variant="body" color="#fff">
            {m.content}
          </Text>
        </LinearGradient>
      </Animated.View>
    );
  }
  // En attente : c'est l'Âme, en haut, qui réfléchit. Pas de « … ».
  if (m.status === 'pending') return null;
  return (
    <Animated.View entering={FadeIn.duration(200)} style={{ gap: 10 }}>
      <View style={[styles.bubbleAi, m.status === 'error' && { backgroundColor: palette.warningSoft }]}>
        {m.status === 'error' ? (
          <Text variant="body" color={palette.warningInk}>
            {m.content}
          </Text>
        ) : (
          <AnswerText text={m.content} />
        )}
      </View>
      {m.status === 'done' && m.fallback ? <RefusalOptions m={m} onRequest={() => onRequest(m.id)} /> : null}
      {m.status === 'done' && !m.fallback ? <SourcePills sources={m.sources ?? []} /> : null}
      {m.status !== 'streaming' ? <SafetyNotes m={m} /> : null}
      {m.status === 'error' && m.retry ? <RetryButton onPress={() => onAsk(m.retry!)} /> : null}
    </Animated.View>
  );
}

/** Dalili IA : répond uniquement avec les guides dalili.study, et montre d'où vient chaque info. */
export default function DaliliIA() {
  const params = useLocalSearchParams<{ q?: string }>();
  const insets = useSafeAreaInsets();
  const profile = useProfile((s) => s.profile);
  const { data: manifest } = useContent('manifest');
  const { messages, ask, request, thinking, streaming, busy } = useAssistant();
  const suggestions = useSuggestions();
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
    <View style={{ flex: 1, backgroundColor: '#F7F7FF' }}>
      <LinearGradient colors={['#C9C2FF', '#ECEAFF', '#F7F7FF']} style={StyleSheet.absoluteFill} locations={[0, 0.3, 0.6]} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <View style={styles.status}>
            {empty ? null : <Ame size={44} state={state} signal={signal} surface="light" />}
            <View>
              <Text variant="smallStrong">Dalili IA</Text>
              <Text variant="caption" color={palette.subtle}>
                {thinking ? 'Je cherche dans nos guides…' : `D’après nos ${manifest.counts.guides} guides vérifiés`}
              </Text>
            </View>
          </View>
          <PressableScale onPress={() => router.push('/(app)/profil-ia')} style={styles.profileBtn} accessibilityLabel="Ce que Dalili sait de toi">
            <UserRoundCog size={18} color={palette.aiIndigo} />
          </PressableScale>
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
              <Animated.View entering={FadeInDown.springify()} style={{ alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <Ame size={132} state={state} signal={signal} surface="light" />
                <Text variant="h2" align="center">
                  Salut {displayName(profile)}, je t’écoute.
                </Text>
                <Text variant="small" color={palette.subtle} align="center" style={{ maxWidth: 300 }}>
                  Je réponds uniquement avec les guides DALILI, et je te montre d’où vient chaque info. Si je ne sais pas, je te le dis.
                </Text>
              </Animated.View>
            ) : null
          }
          renderItem={({ item }) => <Bubble m={item} onAsk={send} onRequest={request} />}
          ListFooterComponent={
            empty ? (
              <View style={{ gap: 8, marginTop: 8 }}>
                <Text variant="overline" color={palette.muted}>
                  Pour ton étape en cours
                </Text>
                {suggestions.map((s, i) => (
                  <Animated.View key={s} entering={FadeInDown.delay(120 + i * 60).springify()}>
                    <PressableScale onPress={() => send(s)} style={styles.suggestion}>
                      <Sparkles size={14} color={palette.aiIndigo} />
                      <Text variant="smallStrong" style={{ flex: 1 }}>
                        {s}
                      </Text>
                    </PressableScale>
                  </Animated.View>
                ))}
              </View>
            ) : null
          }
        />

        <View style={[styles.inputBar, { marginBottom: TAB_BAR_SPACE - 18 }]}>
          <TextInput
            value={text}
            onChangeText={(t) => {
              setText(t);
              setKeys((k) => k + 1);
            }}
            placeholder="Demande-moi n’importe quoi…"
            placeholderTextColor={palette.muted}
            style={styles.input}
            multiline
            maxLength={300}
            onSubmitEditing={() => send(text)}
            submitBehavior="blurAndSubmit"
            returnKeyType="send"
            accessibilityLabel="Ta question pour Dalili"
          />
          <PressableScale onPress={() => send(text)} disabled={!text.trim() || busy} haptic={false} accessibilityLabel="Envoyer">
            <LinearGradient colors={gradients.ai} style={[styles.send, (!text.trim() || busy) && { opacity: 0.45 }]}>
              <ArrowUp size={18} color="#fff" strokeWidth={2.8} />
            </LinearGradient>
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 6 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.7)', paddingLeft: 6, paddingRight: 14, minHeight: 44, borderRadius: 999 },
  profileBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  bubbleAi: { backgroundColor: '#fff', borderRadius: 20, borderTopLeftRadius: 6, padding: 14, ...shadow.sm },
  bubbleUser: { maxWidth: '82%', borderRadius: 20, borderBottomRightRadius: 6, padding: 14 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.lg, backgroundColor: '#fff', ...shadow.sm },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, paddingLeft: 18, paddingRight: 6, minHeight: 56, borderRadius: 28, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E3E1FF', ...shadow.md },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: palette.navy, maxHeight: 110, paddingVertical: 12, outlineStyle: 'none' } as any,
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
