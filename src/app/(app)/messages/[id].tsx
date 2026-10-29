import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Flag } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { toast } from '@/components/feedback/Toast';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { MessageRefused, type Message } from '@/features/messages/api';
import { nameOf } from '@/features/messages/components/ConversationRow';
import { Bubble, Composer, TrustNote, TypingBubble } from '@/features/messages/components/Thread';
import { threadKey, useConversation, useSendMessage, useThread } from '@/features/messages/hooks';
import { SafetySheet } from '@/features/safety/components/SafetySheet';
import { useRoleTheme } from '@/theme';
import { palette, radius, shadow } from '@/theme/tokens';

/** Plus de 5 minutes entre deux messages, ou un autre auteur : on affiche l'heure sous la bulle. */
const GAP_MS = 5 * 60_000;

/** Une conversation : bulles, « en train d'écrire », envoi immédiat, signaler ou bloquer en haut. */
export default function Thread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useRoleTheme();
  const qc = useQueryClient();
  const { data: c } = useConversation(id);
  const thread = useThread(id);
  const send = useSendMessage(id);
  const [safety, setSafety] = useState(false);
  const list = useRef<FlatList<Message>>(null);
  // Ouverture de l'écran : seules les bulles arrivées après montent en douceur.
  const [openedAt] = useState(Date.now);
  const messages = thread.data ?? [];
  const name = c ? nameOf(c) : '';
  const first = name.split(' ')[0] || name;

  useEffect(() => {
    const t = setTimeout(() => list.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [messages.length, thread.typing]);

  const post = (body: string) =>
    send.mutate(
      { body, tempId: `temp-${Date.now()}` },
      { onError: (e) => toast(e instanceof MessageRefused ? e.message : 'Pas envoyé. Vérifie ta connexion, puis touche la bulle pour renvoyer.', 'info') },
    );

  const retry = (m: Message) => {
    qc.setQueryData<Message[]>(threadKey(id), (all = []) => all.filter((x) => x.id !== m.id));
    post(m.body);
  };

  const header = (
    <View style={styles.header}>
      <PressableScale onPress={() => router.back()} style={styles.round} accessibilityLabel="Retour">
        <ChevronLeft size={20} color={palette.navy} />
      </PressableScale>
      <Avatar name={name || '?'} size={38} color={c?.asRole === 'student' ? palette.mentor : palette.electricLight} />
      <View style={{ flex: 1 }}>
        <Text variant="h3" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" color={thread.typing ? theme.accent : palette.muted}>
          {thread.typing ? 'en train d’écrire…' : c?.asRole === 'student' ? 'Ton mentor' : 'Étudiant·e'}
        </Text>
      </View>
      {c?.bookingId || c?.asRole === 'student' ? (
        <PressableScale onPress={() => setSafety(true)} style={styles.round} accessibilityLabel={`Signaler ou bloquer ${first}`}>
          <Flag size={16} color={palette.subtle} />
        </PressableScale>
      ) : null}
    </View>
  );

  const footer = c?.canWrite === false ? (
    <View style={styles.closed}>
      <Text variant="small" color={palette.subtle} align="center">
        {first} n’est plus disponible comme mentor pour le moment. Tu peux relire vos messages.
      </Text>
    </View>
  ) : (
    <Composer onSend={post} onTyping={thread.notifyTyping} disabled={!c} />
  );

  return (
    <Screen top={theme.top} scroll={false} padded={false} keyboard header={header} footer={footer}>
      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        ListHeaderComponent={<TrustNote />}
        ListEmptyComponent={
          thread.isPending ? undefined : (
            <Text variant="small" color={palette.subtle} align="center" style={{ marginTop: 24 }}>
              {thread.isError ? 'Impossible de charger les messages. Vérifie ta connexion.' : `Écris le premier message à ${first || 'ton contact'}.`}
            </Text>
          )
        }
        ListFooterComponent={thread.typing ? <TypingBubble name={first} /> : undefined}
        renderItem={({ item, index }) => {
          const next = messages[index + 1];
          const showTime = !next || next.mine !== item.mine || new Date(next.createdAt).getTime() - new Date(item.createdAt).getTime() > GAP_MS;
          return <Bubble m={item} fresh={new Date(item.createdAt).getTime() > openedAt - 1000} showTime={showTime} onRetry={retry} />;
        }}
      />
      {c ? (
        <SafetySheet
          visible={safety}
          onClose={() => setSafety(false)}
          target={c.bookingId ? { bookingId: c.bookingId } : { mentorId: c.mentorId }}
          name={first}
          onBlocked={() => router.back()}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12, gap: 6, flexGrow: 1 },
  closed: { padding: 14, borderRadius: radius.lg, backgroundColor: palette.surface },
});
