import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { toast } from '@/components/feedback/Toast';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ArrowRight } from '@/components/ui/DirIcons';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { remoteCreatePost } from '@/data/api';
import { useGroup } from '@/data/hooks';
import { useLocalDb } from '@/data/local-db';
import { useProfile } from '@/features/profile/store';
import { useTheme } from '@/theme/scheme';

/** Publier dans un groupe. */
export default function NewPost() {
  const { c, gradients } = useTheme();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { data: g } = useGroup(groupId);
  const profile = useProfile((s) => s.profile);
  const addPost = useLocalDb((s) => s.addPost);
  const [body, setBody] = useState('');

  const publish = async () => {
    if (body.trim().length < 3) return toast('Écris au moins quelques mots ✍️', 'info');
    addPost({
      id: `p-${Date.now()}`,
      groupId,
      author: `${profile.firstName} ${profile.lastName}`.trim() || 'Moi',
      authorColor: c.electric,
      createdAt: new Date().toISOString(),
      body: body.trim(),
      likes: 0,
      comments: [],
    });
    remoteCreatePost(groupId, body.trim()).catch(() => {});
    toast('Publié dans le groupe 🎉');
    router.back();
  };

  return (
    <Screen top={gradients.roleTop.student} keyboard padded={false} header={<AppHeader back pill="Créer un post" hideActions />} footer={<Button label="Publier" icon={<ArrowRight size={18} color="#fff" />} onPress={publish} />}>
      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Avatar name={`${profile.firstName} ${profile.lastName}`} uri={profile.avatarUri} size={42} />
          <View>
            <Text variant="bodyStrong">{profile.firstName || 'Toi'}</Text>
            <Text variant="caption" color={c.muted}>
              dans {g?.name ?? 'le groupe'}
            </Text>
          </View>
        </View>
        <Input placeholder="Partage une question, un bon plan, une victoire…" value={body} onChangeText={setBody} multiline autoFocus />
        <Text variant="caption" color={c.muted}>
          Sois bienveillant·e : pas de données personnelles (numéro, adresse) en public.
        </Text>
      </View>
    </Screen>
  );
}
