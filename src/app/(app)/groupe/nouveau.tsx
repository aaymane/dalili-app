import { router } from 'expo-router';
import { ArrowRight, Globe, Lock } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { SuccessModal } from '@/components/feedback/SuccessModal';
import { toast } from '@/components/feedback/Toast';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OptionCard } from '@/components/ui/OptionCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { remoteCreateGroup } from '@/data/api';
import { useLocalDb } from '@/data/local-db';
import { Cover } from '@/features/community/components/Cover';
import { useProfile } from '@/features/profile/store';
import { useTheme } from '@/theme/scheme';

const COVERS: { colors: [string, string]; emoji: string }[] = [
  { colors: ['#F59E0B', '#1E1B4B'], emoji: '🗼' },
  { colors: ['#38BDF8', '#065F46'], emoji: '🌿' },
  { colors: ['#A855F7', '#1E3A8A'], emoji: '💻' },
  { colors: ['#FB7185', '#7C2D12'], emoji: '🎶' },
  { colors: ['#22C55E', '#14532D'], emoji: '⚽' },
  { colors: ['#DC2626', '#14532D'], emoji: '🍵' },
];

/** Création de groupe : couverture, ville, nom, description, confidentialité. */
export default function NewGroup() {
  const { c: colors, gradients } = useTheme();
  const profile = useProfile((s) => s.profile);
  const addGroup = useLocalDb((s) => s.addGroup);
  const [cover, setCover] = useState(0);
  const [name, setName] = useState('');
  const [city, setCity] = useState(profile.destinationCity ?? profile.mentorCity ?? '');
  const [desc, setDesc] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [created, setCreated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!name.trim() || !city.trim()) return toast('Nom et ville sont obligatoires.', 'info');
    setLoading(true);
    const base = { name: name.trim(), city: city.trim(), description: desc.trim(), tags: [], privacy, cover: COVERS[cover].colors, emoji: COVERS[cover].emoji };
    try {
      const remote = await remoteCreateGroup(base);
      const g = remote ?? { ...base, id: `g-${Date.now()}`, members: 1 };
      addGroup(g);
      setCreated(g.id);
    } catch {
      toast('Création impossible. Réessaie.', 'info');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen top={gradients.roleTop.student} keyboard padded={false} header={<AppHeader back pill="Créer un groupe" hideActions />} footer={<Button label="Créer" icon={<ArrowRight size={18} color="#fff" />} loading={loading} onPress={create} />}>
      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        <Cover colors={COVERS[cover].colors} emoji={COVERS[cover].emoji} height={150} label="GROUPE" />
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
          {COVERS.map((c, i) => (
            <PressableScale key={i} haptic="select" onPress={() => setCover(i)} style={{ width: 40, height: 40, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: cover === i ? colors.electric : 'transparent' }}>
              <Cover colors={c.colors} emoji={c.emoji} height={36} radius={10} />
            </PressableScale>
          ))}
        </View>
        <Input label="Nom du groupe" placeholder="Ex : Étudiants marocains à Nantes" value={name} onChangeText={setName} />
        <Input label="Ville du groupe" placeholder="Paris" value={city} onChangeText={setCity} />
        <Input label="Description" placeholder="Décris le but et les activités de ton groupe…" value={desc} onChangeText={setDesc} multiline />
        <Text variant="h3">Confidentialité</Text>
        <OptionCard title="Public" subtitle="Tout le monde peut voir les membres et les posts." icon={<Globe size={20} color={colors.navy} />} selected={privacy === 'public'} onPress={() => setPrivacy('public')} />
        <OptionCard title="Privé" subtitle="Seuls les membres peuvent voir les membres et posts." icon={<Lock size={20} color={colors.navy} />} selected={privacy === 'private'} onPress={() => setPrivacy('private')} />
      </View>
      <SuccessModal
        visible={!!created}
        title="Groupe créé !"
        message="Félicitations ! Ton groupe a été créé avec succès. Tu peux maintenant inviter des membres."
        cta="Voir le groupe"
        onCta={() => {
          const id = created!;
          setCreated(null);
          router.replace({ pathname: '/(app)/groupe/[id]', params: { id } });
        }}
        onClose={() => {
          setCreated(null);
          router.back();
        }}
      />
    </Screen>
  );
}
