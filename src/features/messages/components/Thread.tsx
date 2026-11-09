import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { ArrowUp, FileText, Lock, Paperclip, RotateCcw } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { PhotoViewer } from '@/components/feedback/PhotoViewer';
import { toast } from '@/components/feedback/Toast';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n';
import { daysFromToday, formatLong, formatTime } from '@/lib/date';
import { useRoleTheme } from '@/theme';
import { pop, reflow, rise } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { fonts, radius } from '@/theme/tokens';

import type { Message } from '../api';
import { useAttachmentUrl } from '../hooks';

/** « 240 Ko », « 1,8 Mo ». */
const sizeLabel = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`);

/**
 * Une pièce jointe dans la conversation : la photo (on la touche pour la voir en grand) ou le PDF (il s'ouvre).
 * Après 30 jours, le fichier est supprimé : on garde son nom, et on le dit.
 */
function AttachmentView({ m, onLongPress }: { m: Message; onLongPress?: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const a = m.attachment!;
  const url = useAttachmentUrl(a);
  const [viewing, setViewing] = useState(false);
  const expired = !a.path && !a.localUri;
  if (expired)
    return (
      <View style={[styles.file, styles.fileExpired]}>
        <FileText size={18} color={c.muted} />
        <View style={{ flexShrink: 1 }}>
          <Text variant="smallStrong" color={c.muted} numberOfLines={1}>
            {a.name}
          </Text>
          <Text variant="caption" color={c.muted}>
            {t('messages.fileExpired')}
          </Text>
        </View>
      </View>
    );
  if (a.type === 'image/jpeg')
    return (
      <>
        <PressableScale
          onPress={() => url && setViewing(true)}
          onLongPress={onLongPress}
          scaleTo={0.98}
          style={[styles.photo, (m.pending || m.failed) && { opacity: 0.6 }]}
          accessibilityRole="imagebutton"
          accessibilityLabel={t('messages.photoA11y', { name: a.name })}
          accessibilityHint={onLongPress ? t('own.hint') : undefined}>
          {url ? <Image source={{ uri: url, cacheKey: a.path ?? a.localUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : null}
        </PressableScale>
        <PhotoViewer uri={viewing ? url : null} cacheKey={a.path ?? a.localUri} onClose={() => setViewing(false)} />
      </>
    );
  return (
    <PressableScale
      onPress={() => (url ? WebBrowser.openBrowserAsync(url) : toast(t('messages.fileOpening'), 'info'))}
      onLongPress={onLongPress}
      scaleTo={0.98}
      style={[styles.file, m.mine && styles.fileMine, (m.pending || m.failed) && { opacity: 0.6 }]}
      accessibilityRole="link"
      accessibilityLabel={t('messages.pdfA11y', { name: a.name })}>
      <View style={styles.fileIcon}>
        <FileText size={18} color={c.electric} />
      </View>
      <View style={{ flexShrink: 1 }}>
        <Text variant="smallStrong" numberOfLines={1}>
          {a.name}
        </Text>
        <Text variant="caption" color={c.muted}>
          PDF · {sizeLabel(a.size)}
        </Text>
      </View>
    </PressableScale>
  );
}

/**
 * Une bulle. Les tiennes à droite, dans la couleur de ton rôle ; celles de l'autre à gauche.
 * `fresh` : arrivée pendant que l'écran est ouvert, elle monte en douceur (pas au chargement).
 * `onLongPress` : seulement sur les tiennes, envoyées (modifier, supprimer). « modifié » s'affiche sous la bulle.
 */
export function Bubble({
  m,
  fresh,
  showTime,
  onRetry,
  onLongPress,
}: {
  m: Message;
  fresh: boolean;
  showTime: boolean;
  onRetry: (m: Message) => void;
  onLongPress?: (m: Message) => void;
}) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const theme = useRoleTheme();
  const body = (
    <Text variant="body" color={m.mine ? c.white : c.navy}>
      {m.body}
    </Text>
  );
  const hasText = m.body.trim().length > 0;
  const press = onLongPress && m.mine && !m.pending && !m.failed ? () => onLongPress(m) : undefined;
  const mine = (
    <LinearGradient colors={theme.gradient} style={[styles.bubble, styles.mine, (m.pending || m.failed) && { opacity: 0.6 }]}>
      {body}
    </LinearGradient>
  );
  const edited = m.editedAt ? t('own.edited') : null;
  return (
    <Animated.View entering={fresh ? rise() : undefined} layout={reflow} style={[styles.bubbleRow, m.mine && styles.mineRow]}>
      {m.attachment ? <AttachmentView m={m} onLongPress={press} /> : null}
      {!hasText ? null : m.mine ? (
        press ? (
          <PressableScale onLongPress={press} delayLongPress={350} scaleTo={0.97} haptic={false} accessibilityRole="text" accessibilityHint={t('own.hint')}>
            {mine}
          </PressableScale>
        ) : (
          mine
        )
      ) : (
        <View style={[styles.bubble, styles.theirs]}>{body}</View>
      )}
      {m.failed ? (
        <PressableScale onPress={() => onRetry(m)} hitSlop={8} style={styles.retry} accessibilityLabel={t('messages.notSentA11y')}>
          <RotateCcw size={12} color={c.danger} />
          <Text variant="caption" color={c.danger}>
            {t('messages.notSentRetry')}
          </Text>
        </PressableScale>
      ) : showTime || edited ? (
        <Text variant="caption" color={c.muted} style={styles.time}>
          {[m.pending ? t('messages.sending') : showTime ? formatTime(m.createdAt) : null, edited].filter(Boolean).join(' · ')}
        </Text>
      ) : null}
    </Animated.View>
  );
}

function Dot({ i }: { i: number }) {
  const styles = useStyles();
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withDelay(i * 160, withRepeat(withSequence(withTiming(1, { duration: 320 }), withTiming(0, { duration: 320 })), -1)));
  }, [v, i]);
  const style = useAnimatedStyle(() => ({ opacity: 0.35 + v.value * 0.65, transform: [{ translateY: -v.value * 3 }] }));
  return <Animated.View style={[styles.dot, style]} />;
}

/** « … est en train d'écrire » : trois points qui respirent. */
export function TypingBubble({ name }: { name: string }) {
  const t = useT();
  const styles = useStyles();
  return (
    <Animated.View entering={pop()} style={styles.bubbleRow} accessible accessibilityLabel={t('messages.typingA11y', { name })}>
      <View style={[styles.bubble, styles.theirs, styles.typing]}>
        {[0, 1, 2].map((i) => (
          <Dot key={i} i={i} />
        ))}
      </View>
    </Animated.View>
  );
}

/** En tête de conversation : les règles de confiance, en une phrase discrète (comme une messagerie chiffrée). */
export function TrustNote() {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  return (
    <View style={styles.note}>
      <Lock size={12} color={c.muted} />
      <Text variant="caption" color={c.muted} align="center" style={{ flexShrink: 1 }}>
        {t('messages.trust')}
      </Text>
    </View>
  );
}

/** « Aujourd'hui », « Hier », puis « mardi 27 octobre » : un repère au changement de jour. */
export function DaySeparator({ iso }: { iso: string }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const n = daysFromToday(iso);
  const label = n === 0 ? t('messages.today') : n === -1 ? t('messages.yesterday') : formatLong(iso);
  return (
    <View style={styles.day}>
      <Text variant="caption" color={c.subtle}>
        {label.charAt(0).toUpperCase() + label.slice(1)}
      </Text>
    </View>
  );
}

/** Zone de saisie : grandit jusqu'à 5 lignes, envoie avec la flèche. Sert aussi aux commentaires. */
export function Composer({
  onSend,
  onTyping,
  onAttach,
  disabled,
  placeholder,
  label,
}: {
  onSend: (body: string) => void;
  onTyping?: () => void;
  /** Le trombone : joindre une photo ou un PDF (messagerie seulement, pas les commentaires). */
  onAttach?: () => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
}) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const theme = useRoleTheme();
  const [text, setText] = useState('');
  const ready = !disabled && text.trim().length > 0;
  const send = () => {
    if (!ready) return;
    onSend(text);
    setText('');
  };
  return (
    <View style={[styles.composer, onAttach && { paddingStart: 4 }]}>
      {onAttach ? (
        <PressableScale onPress={onAttach} disabled={disabled} haptic="select" style={styles.attach} accessibilityLabel={t('messages.attachA11y')}>
          <Paperclip size={20} color={c.subtle} />
        </PressableScale>
      ) : null}
      <TextInput
        value={text}
        onChangeText={(value) => {
          setText(value);
          if (value.trim()) onTyping?.();
        }}
        placeholder={placeholder ?? t('messages.placeholder')}
        placeholderTextColor={c.muted}
        style={styles.input}
        multiline
        maxLength={2000}
        editable={!disabled}
        accessibilityLabel={label ?? t('messages.label')}
      />
      <PressableScale onPress={send} disabled={!ready} haptic="tap" accessibilityLabel={t('messages.send')}>
        <LinearGradient colors={theme.gradient} style={[styles.send, !ready && { opacity: 0.4 }]}>
          <ArrowUp size={18} color={c.white} strokeWidth={2.8} />
        </LinearGradient>
      </PressableScale>
    </View>
  );
}

const useStyles = makeStyles(({ c, scheme }) => ({
  bubbleRow: { alignItems: 'flex-start', gap: 3 },
  mineRow: { alignItems: 'flex-end' },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, overflow: 'hidden' },
  mine: { borderBottomEndRadius: 6 },
  theirs: { backgroundColor: c.card, borderBottomStartRadius: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line },
  time: { paddingHorizontal: 6 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 28, paddingHorizontal: 6 },
  typing: { flexDirection: 'row', gap: 5, paddingVertical: 14 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.muted },
  note: { alignItems: 'center', gap: 4, alignSelf: 'center', maxWidth: 280, paddingVertical: 6, marginBottom: 6 },
  day: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: scheme === 'dark' ? 'rgba(20,27,49,0.85)' : 'rgba(255,255,255,0.7)', marginVertical: 8 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingStart: 16, paddingEnd: 6, paddingVertical: 6, borderRadius: 26, backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: c.navy, maxHeight: 120, paddingVertical: 10, outlineStyle: 'none' } as any,
  send: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  attach: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  photo: { width: 230, aspectRatio: 4 / 5, borderRadius: 18, overflow: 'hidden', backgroundColor: c.fill },
  file: { flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: '82%', padding: 10, paddingEnd: 14, borderRadius: 18, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line },
  fileMine: { borderColor: c.electricSoft },
  fileExpired: { backgroundColor: c.surface },
  fileIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: c.electricSoft, alignItems: 'center', justifyContent: 'center' },
}));
