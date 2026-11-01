import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, ImagePlus, X } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { toast } from '@/components/feedback/Toast';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ArrowRight } from '@/components/ui/DirIcons';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { remoteCreatePost } from '@/data/api';
import { useGroup } from '@/data/hooks';
import { useLocalDb } from '@/data/local-db';
import { useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';
import { pickPhoto } from '@/lib/pick';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

/** Publier dans un groupe : quelques mots, une photo, ou les deux (comme sur Instagram ou Facebook). */
export default function NewPost() {
  const { c, gradients } = useTheme();
  const t = useT();
  const styles = useStyles();
  const qc = useQueryClient();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { data: g } = useGroup(groupId);
  const profile = useProfile((s) => s.profile);
  const addPost = useLocalDb((s) => s.addPost);
  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const choose = async (source: 'camera' | 'library') => {
    const picked = await pickPhoto(source);
    if (picked === 'denied') return toast(t('messages.cameraDenied'), 'info');
    if (picked) setPhoto(picked.uri);
  };

  const publish = async () => {
    if (!photo && body.trim().length < 3) return toast(t('community.newPost.tooShort'), 'info');
    setSending(true);
    try {
      const sent = await remoteCreatePost(groupId, body.trim(), photo);
      // Envoyée : le fil se relit depuis la base. En démo : elle reste sur le téléphone.
      if (sent) await qc.invalidateQueries({ queryKey: ['posts', groupId] });
      else
        addPost({
          id: `p-${Date.now()}`,
          groupId,
          author: `${profile.firstName} ${profile.lastName}`.trim() || t('community.newPost.me'),
          authorColor: c.electric,
          createdAt: new Date().toISOString(),
          body: body.trim(),
          likes: 0,
          comments: [],
          imageUrl: photo,
        });
      toast(t('community.newPost.published'));
      router.back();
    } catch {
      toast(t('community.newPost.failed'), 'info');
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen
      top={gradients.roleTop.student}
      keyboard
      padded={false}
      header={<AppHeader back pill={t('community.newPost.title')} hideActions />}
      footer={<Button label={t('community.publish')} icon={<ArrowRight size={18} color={c.white} />} loading={sending} onPress={publish} />}>
      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Avatar name={`${profile.firstName} ${profile.lastName}`} uri={profile.avatarUri} size={42} />
          <View>
            <Text variant="bodyStrong">{profile.firstName || t('community.newPost.you')}</Text>
            <Text variant="caption" color={c.muted}>
              {g?.name ? t('community.newPost.inGroup', { name: g.name }) : t('community.newPost.inTheGroup')}
            </Text>
          </View>
        </View>
        <Input placeholder={t('community.newPost.placeholder')} value={body} onChangeText={setBody} multiline autoFocus={!photo} />
        {photo ? (
          <View style={styles.preview}>
            <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} accessibilityIgnoresInvertColors />
            <PressableScale onPress={() => setPhoto(null)} style={styles.remove} accessibilityLabel={t('community.newPost.removePhoto')}>
              <X size={16} color={c.white} />
            </PressableScale>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PressableScale onPress={() => choose('library')} style={styles.tool} accessibilityRole="button">
              <ImagePlus size={18} color={c.electric} />
              <Text variant="smallStrong" color={c.electric}>
                {t('community.newPost.addPhoto')}
              </Text>
            </PressableScale>
            <PressableScale onPress={() => choose('camera')} style={styles.tool} accessibilityRole="button">
              <Camera size={18} color={c.electric} />
              <Text variant="smallStrong" color={c.electric}>
                {t('community.newPost.takePhoto')}
              </Text>
            </PressableScale>
          </View>
        )}
        <Text variant="caption" color={c.muted}>
          {t('community.newPost.kind')}
        </Text>
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(({ c }) => ({
  tool: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: radius.lg, backgroundColor: c.electricSoft },
  preview: { width: '100%', aspectRatio: 1, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: c.fill },
  remove: { position: 'absolute', top: 10, end: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
}));
