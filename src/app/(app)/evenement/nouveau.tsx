import { router } from 'expo-router';
import { ArrowRight, CalendarDays, Clock, Globe, Lock, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { SuccessModal } from '@/components/feedback/SuccessModal';
import { toast } from '@/components/feedback/Toast';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Calendar } from '@/components/ui/Calendar';
import { Input } from '@/components/ui/Input';
import { OptionCard } from '@/components/ui/OptionCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { remoteCreateEvent } from '@/data/api';
import { useLocalDb } from '@/data/local-db';
import { Cover } from '@/features/community/components/Cover';
import { useProfile } from '@/features/profile/store';
import { formatDayMonth } from '@/lib/date';
import { gradients, palette, radius, shadow } from '@/theme/tokens';

const HOURS = ['10:00', '13:00', '18:00', '19:30', '20:00', '21:00'];

/** Création d'événement : nom, date/heure, lieu, description, lien, confidentialité, tarif, approbation. */
export default function NewEvent() {
  const profile = useProfile((s) => s.profile);
  const addEvent = useLocalDb((s) => s.addEvent);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date(Date.now() + 7 * 86_400_000));
  const [hour, setHour] = useState('20:00');
  const [place, setPlace] = useState('');
  const [desc, setDesc] = useState('');
  const [link, setLink] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [price, setPrice] = useState<'free' | 'paid'>('free');
  const [approval, setApproval] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  const publish = async () => {
    if (!title.trim() || !place.trim()) return toast('Nom et lieu sont obligatoires.', 'info');
    const [h, m] = hour.split(':').map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    const base = {
      title: title.trim(),
      city: profile.destinationCity ?? profile.mentorCity ?? 'Paris',
      place: place.trim(),
      address: place.trim(),
      startsAt: d.toISOString(),
      description: desc.trim(),
      capacity: 30,
      price,
      link: link.trim() || undefined,
      cover: ['#7A5AF8', '#1F2850'] as const,
      emoji: '🎉',
    };
    try {
      const remote = await remoteCreateEvent(base);
      const e = remote ?? { ...base, id: `e-${Date.now()}`, attendees: 1 };
      addEvent(e);
      setCreated(e.id);
    } catch {
      toast('Publication impossible. Réessaie.', 'info');
    }
  };

  return (
    <Screen top={gradients.roleTop.student} keyboard padded={false} header={<AppHeader back pill="Créer un événement" hideActions />} footer={<Button label="Publier" icon={<ArrowRight size={18} color="#fff" />} onPress={publish} />}>
      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        <Cover colors={['#7A5AF8', '#1F2850']} emoji="🎉" height={130} label="ÉVÉNEMENT" labelColor="#7A5AF8" />
        <Input label="Nom de l’événement" placeholder="Ex : Soirée d’intégration, atelier CAF…" value={title} onChangeText={setTitle} />
        <View style={styles.box}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PressableScale onPress={() => setDateOpen(true)} style={styles.pick}>
              <CalendarDays size={16} color={palette.electric} />
              <View>
                <Text variant="caption" color={palette.muted}>
                  Date
                </Text>
                <Text variant="bodyStrong">{formatDayMonth(date)}</Text>
              </View>
            </PressableScale>
            <View style={[styles.pick, { flex: 1 }]}>
              <Clock size={16} color={palette.electric} />
              <View>
                <Text variant="caption" color={palette.muted}>
                  Heure
                </Text>
                <Text variant="bodyStrong">{hour}</Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {HOURS.map((h) => (
              <PressableScale key={h} haptic="select" onPress={() => setHour(h)} style={[styles.hour, hour === h && { backgroundColor: palette.electric }]}>
                <Text variant="smallStrong" color={hour === h ? '#fff' : palette.navy}>
                  {h}
                </Text>
              </PressableScale>
            ))}
          </View>
          <Input label="Lieu" icon={<MapPin size={16} color={palette.electric} />} placeholder="Rechercher une adresse ou un lieu…" value={place} onChangeText={setPlace} />
        </View>
        <Input label="Description" placeholder="Décris le but et les activités…" value={desc} onChangeText={setDesc} multiline />
        <Input label="Lien" placeholder="Site internet, réseaux sociaux…" value={link} onChangeText={setLink} autoCapitalize="none" keyboardType="url" />
        <Text variant="h3">Confidentialité</Text>
        <OptionCard title="Public" subtitle="Tout le monde peut voir l’événement." icon={<Globe size={20} color={palette.navy} />} selected={privacy === 'public'} onPress={() => setPrivacy('public')} />
        <OptionCard title="Privé" subtitle="Seuls les membres du groupe le voient." icon={<Lock size={20} color={palette.navy} />} selected={privacy === 'private'} onPress={() => setPrivacy('private')} />
        <View style={styles.box}>
          <Text variant="bodyStrong">Tarification</Text>
          <Text variant="small" color={palette.muted}>
            L’événement est-il gratuit ou payant ?
          </Text>
          <Segmented kind="track" value={price} onChange={setPrice} options={[{ value: 'free', label: 'Gratuit' }, { value: 'paid', label: 'Payant' }]} />
        </View>
        <View style={[styles.box, { flexDirection: 'row', alignItems: 'center' }]}>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">Approbation des participants</Text>
            <Text variant="small" color={palette.muted}>
              Valider manuellement les inscriptions
            </Text>
          </View>
          <Switch value={approval} onValueChange={setApproval} trackColor={{ true: palette.electric, false: '#D5DAE7' }} thumbColor="#fff" />
        </View>
      </View>
      <BottomSheet visible={dateOpen} onClose={() => setDateOpen(false)}>
        <Calendar selected={date} minDate={new Date()} onSelect={(d) => { setDate(d); setTimeout(() => setDateOpen(false), 150); }} />
      </BottomSheet>
      <SuccessModal
        visible={!!created}
        title="Événement publié !"
        message="Ton événement est en ligne. Il est déjà dans ton calendrier — partage-le à ton groupe."
        cta="Voir l’événement"
        onCta={() => {
          const id = created!;
          setCreated(null);
          router.replace({ pathname: '/(app)/evenement/[id]', params: { id } });
        }}
        onClose={() => {
          setCreated(null);
          router.back();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: { gap: 12, padding: 14, borderRadius: radius.xl, backgroundColor: '#fff', ...shadow.sm },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: palette.line, flex: 1 },
  hour: { paddingHorizontal: 12, height: 34, borderRadius: 10, backgroundColor: '#F1F3F9', justifyContent: 'center' },
});
