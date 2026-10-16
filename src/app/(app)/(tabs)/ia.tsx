import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowUp, ChevronRight, Mic, Sparkles, UserRoundCog } from 'lucide-react-native';
import { useEffect, useEffectEvent, useRef, useState, type ComponentRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoOrb } from '@/components/brand/LogoOrb';
import { toast } from '@/components/feedback/Toast';
import { TAB_BAR_SPACE } from '@/components/layout/Screen';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { askDaliliRemote } from '@/data/api';
import { useLocalDb } from '@/data/local-db';
import { greeting, localAnswer, suggestions, type AiMessage } from '@/features/ai/brain';
import { useJourney } from '@/features/journey/store';
import { useProfile } from '@/features/profile/store';
import { daysFromToday } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { isSupabaseConfigured } from '@/lib/env';
import { fonts, gradients, palette, radius, shadow } from '@/theme/tokens';

function TypingDots() {
  const dots = [useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  useEffect(() => {
    dots.forEach((d, i) => {
      d.set(withDelay(i * 140, withRepeat(withSequence(withTiming(-5, { duration: 260 }), withTiming(0, { duration: 260 })), -1)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={[styles.bubbleAi, { flexDirection: 'row', gap: 5, paddingVertical: 16 }]}>
      {dots.map((d, i) => (
        <Dot key={i} v={d} />
      ))}
    </View>
  );
}
function Dot({ v }: { v: ReturnType<typeof useSharedValue<number>> }) {
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: v.value }] }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: palette.aiIndigo }, s]} />;
}

function AiAvatar() {
  return (
    <LinearGradient colors={gradients.ai} style={styles.aiAvatar}>
      <Sparkles size={13} color="#fff" fill="#fff" />
    </LinearGradient>
  );
}

function Message({ m, onAsk }: { m: AiMessage; onAsk: (q: string) => void }) {
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
  return (
    <Animated.View entering={FadeInDown.springify().damping(16)} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
      <AiAvatar />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={styles.bubbleAi}>
          <Text variant="body">{m.content.replace(/\*\*/g, '')}</Text>
        </View>
        {m.steps?.map((s, i) => (
          <Animated.View key={s.title} entering={FadeInDown.delay(150 + i * 120).springify()}>
            <PressableScale onPress={() => m.stepId && router.push({ pathname: '/(app)/etape/[id]', params: { id: m.stepId } })} style={styles.stepCard}>
              <View style={[styles.stepNum, { opacity: 1 - i * 0.2 }]}>
                <Text variant="h3" color="#fff">
                  {i + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="smallStrong">{s.title}</Text>
                <Text variant="caption" color={palette.muted}>
                  {s.detail}
                </Text>
              </View>
              <ChevronRight size={16} color={palette.muted} />
            </PressableScale>
          </Animated.View>
        ))}
        {m.followUp ? (
          <PressableScale onPress={() => onAsk(m.followUp!)} style={styles.follow}>
            <Text variant="smallStrong" color={palette.electric}>
              {m.followUp}
            </Text>
          </PressableScale>
        ) : null}
      </View>
    </Animated.View>
  );
}

/** Dalili IA — chat conversationnel qui reformule en actions simples, personnalisé par le profil. */
export default function DaliliIA() {
  const params = useLocalSearchParams<{ q?: string }>();
  const insets = useSafeAreaInsets();
  const profile = useProfile((s) => s.profile);
  const j = useJourney();
  const setAiHistory = useLocalDb((s) => s.setAiHistory);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const list = useRef<ComponentRef<typeof FlatList<AiMessage>>>(null);
  const lastQ = useRef<string | undefined>(undefined);

  const ask = async (q: string) => {
      const question = q.trim();
      if (!question || typing) return;
      haptics.tap();
      setText('');
      const user: AiMessage = { id: `u${Date.now()}`, role: 'user', content: question };
      const history = [...messages, user];
      setMessages(history);
      setTyping(true);
      let answer: Omit<AiMessage, 'id' | 'role'>;
      try {
        const remote = isSupabaseConfigured
          ? await askDaliliRemote(
              history.map((m) => ({ role: m.role, content: m.content })),
              { firstName: profile.firstName, originCity: profile.originCity, destinationCity: profile.destinationCity, arrivalDate: j.arrivalISO, studyLevel: profile.studyLevel, campusStatus: profile.campusStatus, housing: profile.housing, concerns: profile.concerns, currentStep: j.current?.step.title },
            )
          : null;
        answer = remote ? { content: remote } : localAnswer(question, profile);
      } catch {
        answer = localAnswer(question, profile);
      }
      await new Promise((r) => setTimeout(r, isSupabaseConfigured ? 0 : 700));
      const ai: AiMessage = { id: `a${Date.now()}`, role: 'assistant', ...answer };
      setTyping(false);
      haptics.select();
      setMessages((m) => {
        const next = [...m, ai];
        setAiHistory(next.map((x) => ({ role: x.role, content: x.content })));
        return next;
      });
  };

  // Question reçue depuis un autre écran (?q=…) — posée une seule fois.
  const onIncoming = useEffectEvent((q: string) => ask(q));
  useEffect(() => {
    if (params.q && params.q !== lastQ.current) {
      lastQ.current = params.q;
      onIncoming(params.q);
    }
  }, [params.q]);

  useEffect(() => {
    setTimeout(() => list.current?.scrollToEnd({ animated: true }), 80);
  }, [messages.length, typing]);

  const empty = messages.length === 0;
  const sugg = suggestions(profile, j.current?.step.title);

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F7FF' }}>
      <LinearGradient colors={['#C9C2FF', '#ECEAFF', '#F7F7FF']} style={StyleSheet.absoluteFill} locations={[0, 0.3, 0.6]} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={0}>
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <View style={styles.status}>
            <View style={styles.online} />
            <Text variant="caption" color={palette.subtle}>
              IA DALILI · répond instantanément
            </Text>
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
            <Animated.View entering={FadeInUp.springify()} style={{ alignItems: 'center', gap: 10, marginBottom: empty ? 10 : 0 }}>
              <LogoOrb size={empty ? 96 : 64} />
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', alignSelf: 'stretch' }}>
                <AiAvatar />
                <View style={[styles.bubbleAi, { flex: 1 }]}>
                  <Text variant="body">{greeting(profile, daysFromToday(j.arrival))}</Text>
                </View>
              </View>
            </Animated.View>
          }
          renderItem={({ item }) => <Message m={item} onAsk={ask} />}
          ListFooterComponent={
            typing ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <AiAvatar />
                <TypingDots />
              </View>
            ) : empty ? (
              <View style={{ gap: 8, marginTop: 8 }}>
                <Text variant="overline" color={palette.muted}>
                  Suggestions pour toi
                </Text>
                {sugg.map((s, i) => (
                  <Animated.View key={s} entering={FadeInDown.delay(200 + i * 70).springify()}>
                    <PressableScale onPress={() => ask(s)} style={styles.suggestion}>
                      <Sparkles size={14} color={palette.aiIndigo} />
                      <Text variant="smallStrong" style={{ flex: 1 }}>
                        {s}
                      </Text>
                    </PressableScale>
                  </Animated.View>
                ))}
              </View>
            ) : undefined
          }
        />

        <View style={[styles.inputBar, { marginBottom: TAB_BAR_SPACE - 18 + (Platform.OS === 'web' ? 0 : 0) }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Demande-moi n’importe quoi…"
            placeholderTextColor={palette.muted}
            style={styles.input}
            multiline
            onSubmitEditing={() => ask(text)}
            blurOnSubmit
            returnKeyType="send"
          />
          <PressableScale onPress={() => toast('La dictée vocale arrive bientôt 🎙️', 'info')} hitSlop={8} accessibilityLabel="Dictée vocale">
            <Mic size={20} color={palette.muted} />
          </PressableScale>
          <PressableScale onPress={() => ask(text)} disabled={!text.trim()} haptic={false} accessibilityLabel="Envoyer">
            <LinearGradient colors={gradients.ai} style={styles.send}>
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
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  online: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.mentor },
  profileBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  bubbleAi: { backgroundColor: '#fff', borderRadius: 20, borderTopLeftRadius: 6, padding: 14, ...shadow.sm },
  bubbleUser: { maxWidth: '82%', borderRadius: 20, borderBottomRightRadius: 6, padding: 14 },
  stepCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: '#fff', ...shadow.sm },
  stepNum: { width: 32, height: 32, borderRadius: 10, backgroundColor: palette.aiIndigo, alignItems: 'center', justifyContent: 'center' },
  follow: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: '#C9D6FF', backgroundColor: '#fff' },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.lg, backgroundColor: '#fff', ...shadow.sm },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, paddingLeft: 18, paddingRight: 6, minHeight: 56, borderRadius: 28, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E3E1FF', ...shadow.md },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: palette.navy, maxHeight: 110, paddingVertical: 12, outlineStyle: 'none' } as any,
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
