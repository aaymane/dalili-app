import { Redirect, router } from 'expo-router';
import { CalendarDays, Clock, Globe, Lock, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { SuccessModal } from '@/components/feedback/SuccessModal';
import { toast } from '@/components/feedback/Toast';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Calendar } from '@/components/ui/Calendar';
import { ArrowRight } from '@/components/ui/DirIcons';
import { Input } from '@/components/ui/Input';
import { OptionCard } from '@/components/ui/OptionCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { remoteCreateEvent } from '@/data/api';
import { useLocalDb } from '@/data/local-db';
import { Cover } from '@/features/community/components/Cover';
import { useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';
import { formatDayMonth } from '@/lib/date';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

const HOURS = ['10:00', '13:00', '18:00', '19:30', '20:00', '21:00'];

/** Création d'événement : nom, date/heure, lieu, description, lien, confidentialité, tarif, approbation. */
/** Seuls les mentors validés créent les événements (la base le garantit aussi) : un étudiant revient à la Communauté. */
export default function NewEventRoute() {
  const isMentor = useProfile((s) => s.profile.activeRole === 'mentor');
  if (!isMentor) return <Redirect href="/(app)/(tabs)/communaute" />;
  return <NewEvent />;
}

function NewEvent() {
  const { c, gradients } = useTheme();
  const t = useT();
  const styles = useStyles();
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
    if (!title.trim() || !place.trim()) return toast(t('community.newEvent.required'), 'info');
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
      toast(t('community.newEvent.failed'), 'info');
    }
  };

  return (
    <Screen top={gradients.roleTop.student} keyboard padded={false} header={<AppHeader back pill={t('community.createEvent')} hideActions />} footer={<Button label={t('community.publish')} icon={<ArrowRight size={18} color="#fff" />} onPress={publish} />}>
      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        <Cover colors={['#7A5AF8', '#1F2850']} emoji="🎉" height={130} label={t('community.eventBadge')} labelColor="#7A5AF8" />
        <Input label={t('community.newEvent.name')} placeholder={t('community.newEvent.namePlaceholder')} value={title} onChangeText={setTitle} />
        <View style={styles.box}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PressableScale onPress={() => setDateOpen(true)} style={styles.pick}>
              <CalendarDays size={16} color={c.electric} />
              <View>
                <Text variant="caption" color={c.muted}>
                  {t('community.newEvent.date')}
                </Text>
                <Text variant="bodyStrong">{formatDayMonth(date)}</Text>
              </View>
            </PressableScale>
            <View style={[styles.pick, { flex: 1 }]}>
              <Clock size={16} color={c.electric} />
              <View>
                <Text variant="caption" color={c.muted}>
                  {t('community.newEvent.hour')}
                </Text>
                <Text variant="bodyStrong">{hour}</Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {HOURS.map((h) => (
              <PressableScale key={h} haptic="select" onPress={() => setHour(h)} style={[styles.hour, hour === h && { backgroundColor: c.electric }]}>
                <Text variant="smallStrong" color={hour === h ? '#fff' : c.navy}>
                  {h}
                </Text>
              </PressableScale>
            ))}
          </View>
          <Input label={t('community.newEvent.place')} icon={<MapPin size={16} color={c.electric} />} placeholder={t('community.newEvent.placePlaceholder')} value={place} onChangeText={setPlace} />
        </View>
        <Input label={t('community.description')} placeholder={t('community.newEvent.descPlaceholder')} value={desc} onChangeText={setDesc} multiline />
        <Input label={t('community.newEvent.link')} placeholder={t('community.newEvent.linkPlaceholder')} value={link} onChangeText={setLink} autoCapitalize="none" keyboardType="url" />
        <Text variant="h3">{t('community.privacy')}</Text>
        <OptionCard title={t('community.public')} subtitle={t('community.newEvent.publicSub')} icon={<Globe size={20} color={c.navy} />} selected={privacy === 'public'} onPress={() => setPrivacy('public')} />
        <OptionCard title={t('community.private')} subtitle={t('community.newEvent.privateSub')} icon={<Lock size={20} color={c.navy} />} selected={privacy === 'private'} onPress={() => setPrivacy('private')} />
        <View style={styles.box}>
          <Text variant="bodyStrong">{t('community.newEvent.pricing')}</Text>
          <Text variant="small" color={c.muted}>
            {t('community.newEvent.pricingQuestion')}
          </Text>
          <Segmented kind="track" value={price} onChange={setPrice} options={[{ value: 'free', label: t('community.newEvent.free') }, { value: 'paid', label: t('community.newEvent.paid') }]} />
        </View>
        <View style={[styles.box, { flexDirection: 'row', alignItems: 'center' }]}>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{t('community.newEvent.approval')}</Text>
            <Text variant="small" color={c.muted}>
              {t('community.newEvent.approvalSub')}
            </Text>
          </View>
          <Switch accessibilityLabel={t('community.newEvent.approval')} value={approval} onValueChange={setApproval} trackColor={{ true: c.electric, false: c.lineStrong }} thumbColor="#fff" />
        </View>
      </View>
      <BottomSheet visible={dateOpen} onClose={() => setDateOpen(false)}>
        <Calendar selected={date} minDate={new Date()} onSelect={(d) => { setDate(d); setTimeout(() => setDateOpen(false), 150); }} />
      </BottomSheet>
      <SuccessModal
        visible={!!created}
        title={t('community.newEvent.successTitle')}
        message={t('community.newEvent.successText')}
        cta={t('community.newEvent.successCta')}
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

const useStyles = makeStyles(({ c, shadow }) => ({
  box: { gap: 12, padding: 14, borderRadius: radius.xl, backgroundColor: c.card, ...shadow.sm },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.line, flex: 1 },
  hour: { paddingHorizontal: 12, height: 34, borderRadius: 10, backgroundColor: c.fill, justifyContent: 'center' },
}));
