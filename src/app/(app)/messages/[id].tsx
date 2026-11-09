import { router, useLocalSearchParams } from 'expo-router';
import { Camera, FileText, Flag, Image as ImageIcon, ShieldAlert } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { toast } from '@/components/feedback/Toast';
import { ListGroup } from '@/components/ui/ListGroup';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { ChevronLeft } from '@/components/ui/DirIcons';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { MAX_ATTACHMENT_BYTES } from '@/data/media';
import { MessageRefused, prepareAttachment, type Attachment, type Message, type PickedFile } from '@/features/messages/api';
import { nameOf } from '@/features/messages/components/ConversationRow';
import { Bubble, Composer, DaySeparator, TrustNote, TypingBubble } from '@/features/messages/components/Thread';
import { isSameDay } from '@/lib/date';
import { threadKey, useConversation, useSendMessage, useThread } from '@/features/messages/hooks';
import { SafetySheet } from '@/features/safety/components/SafetySheet';
import { useT } from '@/i18n';
import { pickPdf, pickPhoto } from '@/lib/pick';
import { useRoleTheme } from '@/theme';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

/** Plus de 5 minutes entre deux messages, ou un autre auteur : on affiche l'heure sous la bulle. */
const GAP_MS = 5 * 60_000;
/** L'identifiant provisoire d'une bulle, le temps que la base renvoie le vrai. */
const tempId = () => `temp-${Date.now()}`;

type AttachSource = 'camera' | 'library' | 'pdf';

/** Une conversation : bulles, « en train d'écrire », envoi immédiat, signaler ou bloquer en haut. */
export default function Thread() {
  const { c: colors } = useTheme();
  const t = useT();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useRoleTheme();
  const qc = useQueryClient();
  const { data: c } = useConversation(id);
  const thread = useThread(id);
  const send = useSendMessage(id);
  const [safety, setSafety] = useState(false);
  const [attaching, setAttaching] = useState(false);
  // Choix en attente : iOS ignore un écran système ouvert pendant que la feuille se ferme.
  const pendingAttach = useRef<AttachSource | null>(null);
  const list = useRef<FlatList<Message>>(null);
  // Ouverture de l'écran : seules les bulles arrivées après montent en douceur.
  const [openedAt] = useState(Date.now);
  const messages = thread.data ?? [];
  const name = c ? nameOf(c) : '';
  const first = name.split(' ')[0] || name;

  useEffect(() => {
    const timer = setTimeout(() => list.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(timer);
  }, [messages.length, thread.typing]);

  const post = (body: string, attachment?: Attachment) =>
    send.mutate(
      { body, tempId: tempId(), attachment },
      { onError: (e) => toast(e instanceof MessageRefused ? t('messages.slowDown') : t('messages.notSent'), 'info') },
    );

  const retry = (m: Message) => {
    qc.setQueryData<Message[]>(threadKey(id), (all = []) => all.filter((x) => x.id !== m.id));
    post(m.body, m.attachment);
  };

  // Une pièce jointe part tout de suite, comme dans une messagerie : la bulle apparaît, puis le fichier monte.
  const attach = async (source: AttachSource) => {
    let file: PickedFile | null = null;
    if (source === 'pdf') {
      const pdf = await pickPdf();
      if (pdf === 'unavailable') return toast(t('messages.pdfUpdate'), 'info');
      if (!pdf) return;
      if (pdf.size > MAX_ATTACHMENT_BYTES) return toast(t('messages.tooBig'), 'info');
      file = { uri: pdf.uri, name: pdf.name, type: 'application/pdf', size: pdf.size };
    } else {
      const photo = await pickPhoto(source);
      if (photo === 'denied') return toast(t('messages.cameraDenied'), 'info');
      if (!photo) return;
      file = { uri: photo.uri, name: photo.name, type: 'image/jpeg' };
    }
    try {
      post('', await prepareAttachment(file));
    } catch {
      toast(t('messages.notSent'), 'info');
    }
  };

  const chooseAttachment = (source: AttachSource) => {
    pendingAttach.current = source;
    setAttaching(false);
  };

  const onAttachSheetClosed = () => {
    const source = pendingAttach.current;
    pendingAttach.current = null;
    if (source) void attach(source);
  };

  const header = (
    <View style={styles.header}>
      <PressableScale onPress={() => router.back()} style={styles.round} accessibilityLabel={t('common.back')}>
        <ChevronLeft size={20} color={colors.navy} />
      </PressableScale>
      <Avatar name={name || '?'} size={38} color={c?.asRole === 'student' ? colors.mentor : colors.electricLight} uri={c?.otherAvatarUrl} cacheKey={c?.otherAvatarPath} />
      <View style={{ flex: 1 }}>
        <Text variant="h3" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" color={thread.typing ? theme.accent : colors.muted}>
          {thread.typing ? t('messages.typing') : c?.asRole === 'student' ? t('messages.yourMentor') : t('messages.student')}
        </Text>
      </View>
      {c?.bookingId || c?.asRole === 'student' ? (
        <PressableScale onPress={() => setSafety(true)} style={styles.round} accessibilityLabel={t('messages.reportA11y', { name: first })}>
          <Flag size={16} color={colors.subtle} />
        </PressableScale>
      ) : null}
    </View>
  );

  const footer = c?.canWrite === false ? (
    <View style={styles.closed}>
      <Text variant="small" color={colors.subtle} align="center">
        {t('messages.closed', { name: first })}
      </Text>
    </View>
  ) : (
    <Composer onSend={(body) => post(body)} onTyping={thread.notifyTyping} onAttach={() => setAttaching(true)} disabled={!c} />
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
            <Text variant="small" color={colors.subtle} align="center" style={{ marginTop: 24 }}>
              {thread.isError ? t('messages.threadError') : first ? t('messages.first', { name: first }) : t('messages.firstNoName')}
            </Text>
          )
        }
        ListFooterComponent={thread.typing ? <TypingBubble name={first} /> : undefined}
        renderItem={({ item, index }) => {
          const prev = messages[index - 1];
          const next = messages[index + 1];
          const showTime = !next || next.mine !== item.mine || new Date(next.createdAt).getTime() - new Date(item.createdAt).getTime() > GAP_MS;
          return (
            <>
              {!prev || !isSameDay(prev.createdAt, item.createdAt) ? <DaySeparator iso={item.createdAt} /> : null}
              <Bubble m={item} fresh={new Date(item.createdAt).getTime() > openedAt - 1000} showTime={showTime} onRetry={retry} />
            </>
          );
        }}
      />
      <BottomSheet visible={attaching} onClose={() => setAttaching(false)} onClosed={onAttachSheetClosed}>
        <View style={{ gap: 14 }}>
          <Text variant="h2">{t('messages.attachTitle', { name: first || t('messages.yourMentor') })}</Text>
          <ListGroup>
            {(
              [
                ['camera', Camera, t('messages.attachCamera')],
                ['library', ImageIcon, t('messages.attachLibrary')],
                ['pdf', FileText, t('messages.attachPdf')],
              ] as const
            ).map(([source, Icon, label]) => (
              <PressableScale key={source} onPress={() => chooseAttachment(source)} scaleTo={0.985} style={styles.attachRow} accessibilityRole="button">
                <Icon size={20} color={colors.electric} />
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  {label}
                </Text>
              </PressableScale>
            ))}
          </ListGroup>
          {/* Le rappel, à chaque fois : ce sont parfois des papiers sensibles. */}
          <View style={styles.reminder}>
            <ShieldAlert size={16} color={colors.warningInk} />
            <Text variant="small" color={colors.warningInk} style={{ flex: 1 }}>
              {t('messages.attachReminder')}
            </Text>
          </View>
        </View>
      </BottomSheet>
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

const useStyles = makeStyles(({ c, shadow }) => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  // Les messages partent du bas, près du clavier, comme dans toute messagerie.
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12, gap: 6, flexGrow: 1, justifyContent: 'flex-end' },
  closed: { padding: 14, borderRadius: radius.lg, backgroundColor: c.surface },
  attachRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, minHeight: 56 },
  reminder: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.lg, backgroundColor: c.warningSoft },
}));
