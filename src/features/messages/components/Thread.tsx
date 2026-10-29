import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUp, RotateCcw, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { formatTime } from '@/lib/date';
import { useRoleTheme } from '@/theme';
import { pop, rise } from '@/theme/motion';
import { fonts, palette, radius } from '@/theme/tokens';

import type { Message } from '../api';

/**
 * Une bulle. Les tiennes à droite, dans la couleur de ton rôle ; celles de l'autre à gauche.
 * `fresh` : arrivée pendant que l'écran est ouvert, elle monte en douceur (pas au chargement).
 */
export function Bubble({ m, fresh, showTime, onRetry }: { m: Message; fresh: boolean; showTime: boolean; onRetry: (m: Message) => void }) {
  const theme = useRoleTheme();
  const body = (
    <Text variant="body" color={m.mine ? palette.white : palette.navy}>
      {m.body}
    </Text>
  );
  return (
    <Animated.View entering={fresh ? rise() : undefined} style={[styles.bubbleRow, m.mine && styles.mineRow]}>
      {m.mine ? (
        <LinearGradient colors={theme.gradient} style={[styles.bubble, styles.mine, (m.pending || m.failed) && { opacity: 0.6 }]}>
          {body}
        </LinearGradient>
      ) : (
        <View style={[styles.bubble, styles.theirs]}>{body}</View>
      )}
      {m.failed ? (
        <PressableScale onPress={() => onRetry(m)} hitSlop={8} style={styles.retry} accessibilityLabel="Pas envoyé. Toucher pour renvoyer">
          <RotateCcw size={12} color={palette.danger} />
          <Text variant="caption" color={palette.danger}>
            Pas envoyé · Renvoyer
          </Text>
        </PressableScale>
      ) : showTime ? (
        <Text variant="caption" color={palette.muted} style={styles.time}>
          {m.pending ? 'Envoi…' : formatTime(m.createdAt)}
        </Text>
      ) : null}
    </Animated.View>
  );
}

function Dot({ i }: { i: number }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withDelay(i * 160, withRepeat(withSequence(withTiming(1, { duration: 320 }), withTiming(0, { duration: 320 })), -1)));
  }, [v, i]);
  const style = useAnimatedStyle(() => ({ opacity: 0.35 + v.value * 0.65, transform: [{ translateY: -v.value * 3 }] }));
  return <Animated.View style={[styles.dot, style]} />;
}

/** « … est en train d'écrire » : trois points qui respirent. */
export function TypingBubble({ name }: { name: string }) {
  return (
    <Animated.View entering={pop()} style={styles.bubbleRow} accessible accessibilityLabel={`${name} est en train d’écrire`}>
      <View style={[styles.bubble, styles.theirs, styles.typing]}>
        {[0, 1, 2].map((i) => (
          <Dot key={i} i={i} />
        ))}
      </View>
    </Animated.View>
  );
}

/** En tête de conversation : les règles de confiance, en une phrase. */
export function TrustNote() {
  return (
    <View style={styles.note}>
      <ShieldCheck size={16} color={palette.mentor} />
      <Text variant="caption" color={palette.subtle} style={{ flex: 1 }}>
        Restez sur DALILI. Ne partage jamais tes papiers, tes codes ou de l’argent. Un souci ? Touche le drapeau en haut.
      </Text>
    </View>
  );
}

/** Zone de saisie : grandit jusqu'à 5 lignes, envoie avec la flèche. Sert aussi aux commentaires. */
export function Composer({
  onSend,
  onTyping,
  disabled,
  placeholder = 'Écris ton message…',
  label = 'Ton message',
}: {
  onSend: (body: string) => void;
  onTyping?: () => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
}) {
  const theme = useRoleTheme();
  const [text, setText] = useState('');
  const ready = !disabled && text.trim().length > 0;
  const send = () => {
    if (!ready) return;
    onSend(text);
    setText('');
  };
  return (
    <View style={styles.composer}>
      <TextInput
        value={text}
        onChangeText={(t) => {
          setText(t);
          if (t.trim()) onTyping?.();
        }}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        style={styles.input}
        multiline
        maxLength={2000}
        editable={!disabled}
        accessibilityLabel={label}
      />
      <PressableScale onPress={send} disabled={!ready} haptic="tap" accessibilityLabel="Envoyer">
        <LinearGradient colors={theme.gradient} style={[styles.send, !ready && { opacity: 0.4 }]}>
          <ArrowUp size={18} color={palette.white} strokeWidth={2.8} />
        </LinearGradient>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleRow: { alignItems: 'flex-start', gap: 3 },
  mineRow: { alignItems: 'flex-end' },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  mine: { borderBottomRightRadius: 6 },
  theirs: { backgroundColor: palette.white, borderBottomLeftRadius: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: palette.line },
  time: { paddingHorizontal: 6 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 28, paddingHorizontal: 6 },
  typing: { flexDirection: 'row', gap: 5, paddingVertical: 14 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.muted },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.lg, backgroundColor: palette.surface, marginBottom: 8 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingLeft: 16, paddingRight: 6, paddingVertical: 6, borderRadius: 26, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: palette.navy, maxHeight: 120, paddingVertical: 10, outlineStyle: 'none' } as any,
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
