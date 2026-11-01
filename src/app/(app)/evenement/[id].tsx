import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { CalendarDays, Link2, MapPin, Ticket, Users } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Linking, Platform, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { SuccessModal } from '@/components/feedback/SuccessModal';
import { toast } from '@/components/feedback/Toast';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { ArrowRight, ArrowUpRight } from '@/components/ui/DirIcons';
import { ListGroup } from '@/components/ui/ListGroup';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { remoteJoinEvent } from '@/data/api';
import { useEvent, useGroup } from '@/data/hooks';
import { useLocalDb } from '@/data/local-db';
import { SeatsBar } from '@/features/community/components/GroupCard';
import { AddCoverRow, CoverPhoto, useChangeCover } from '@/features/community/cover';
import { useJourneyStore } from '@/features/journey/store';
import { useT } from '@/i18n';
import { wash } from '@/lib/color';
import { formatLong, formatTime, monthShort, toISODate, weekdayName } from '@/lib/date';
import { makeStyles, useTheme } from '@/theme/scheme';
import { fonts, radius } from '@/theme/tokens';
import { rise } from '@/theme/motion';

const upperFirst = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

/** L'itinéraire s'ouvre dans l'app de cartes du téléphone. */
const openMaps = (query: string) => {
  const q = encodeURIComponent(query);
  Linking.openURL(Platform.OS === 'ios' ? `https://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`).catch(() => {});
};

/** Une ligne d'information : une icône, ce qu'il faut savoir, et parfois une action à droite. */
function Fact({ icon, title, sub, right, children }: { icon: ReactNode; title: string; sub?: string; right?: ReactNode; children?: ReactNode }) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.fact}>
      <View style={styles.factIcon}>{icon}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{title}</Text>
        {sub ? (
          <Text variant="small" color={c.muted}>
            {sub}
          </Text>
        ) : null}
        {children}
      </View>
      {right}
    </View>
  );
}

/** Détail d'un événement + inscription (ajoutée au calendrier du Parcours). */
export default function EventPage() {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: e } = useEvent(id);
  // Le groupe qui l'organise, quand il y en a un : on sait qui sera là.
  const { data: group } = useGroup(e?.groupId);
  const toggle = useLocalDb((s) => s.toggleEvent);
  const addCustom = useJourneyStore((s) => s.addCustom);
  const [done, setDone] = useState(false);
  const cover = useChangeCover('events', id);
  if (!e) return null;
  const full = e.attendees >= e.capacity && !e.isGoing;
  const left = Math.max(0, e.capacity - e.attendees);
  const d = new Date(e.startsAt);

  const participate = () => {
    toggle(e.id);
    remoteJoinEvent(e.id, !e.isGoing).catch(() => {});
    if (!e.isGoing) {
      addCustom(`${e.title} · ${e.place}`, toISODate(d));
      setDone(true);
    } else toast(t('community.event.cancelled'), 'info');
  };

  return (
    <Screen
      // Le haut de l'écran prend la couleur de l'événement, en lavis.
      top={wash(e.cover[0], c.bg)}
      padded={false}
      header={<AppHeader back />}
      footer={<Button label={e.isGoing ? t('community.event.leave') : full ? t('community.event.full') : t('community.event.participate')} variant={e.isGoing ? 'secondary' : 'primary'} disabled={full} icon={!e.isGoing && !full ? <ArrowRight size={18} color={c.white} /> : undefined} onPress={participate} />}>
      <View style={{ paddingHorizontal: 20, gap: 26 }}>
        {e.coverUrl ? (
          <Animated.View entering={rise()}>
            <CoverPhoto uri={e.coverUrl} cacheKey={e.coverPath} onChange={e.isMine ? cover.change : undefined} busy={cover.busy} />
          </Animated.View>
        ) : e.isMine ? (
          <AddCoverRow onPress={cover.change} busy={cover.busy} />
        ) : null}
        {/* Le carton d'invitation : la date en grand, aux couleurs de l'événement, puis le titre. */}
        <Animated.View entering={rise()} style={styles.hero}>
          <LinearGradient colors={e.cover} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.date}>
            <Text variant="caption" color="rgba(255,255,255,0.85)">
              {weekdayName(d.getDay(), true)}
            </Text>
            <Text style={styles.day}>{d.getDate()}</Text>
            <Text variant="caption" color="rgba(255,255,255,0.85)">
              {monthShort(d)}
            </Text>
          </LinearGradient>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="h1">{e.title}</Text>
            {group ? (
              <PressableScale onPress={() => router.push({ pathname: '/(app)/groupe/[id]', params: { id: group.id } })} hitSlop={8} accessibilityRole="link">
                <Text variant="smallStrong" color={c.electric}>
                  {t('community.event.byGroup', { name: group.name })}
                </Text>
              </PressableScale>
            ) : (
              <Text variant="small" color={c.subtle}>
                {e.city}
              </Text>
            )}
          </View>
        </Animated.View>

        <Animated.View entering={rise(80)}>
          <ListGroup>
            <Fact icon={<CalendarDays size={18} color={c.subtle} />} title={upperFirst(formatLong(d))} sub={t('community.event.at', { time: formatTime(d) })} />
            <PressableScale onPress={() => openMaps(`${e.place}, ${e.address}`)} scaleTo={0.985} accessibilityRole="link" accessibilityLabel={t('community.event.directionsA11y', { place: e.place })}>
              <Fact
                icon={<MapPin size={18} color={c.subtle} />}
                title={e.place}
                sub={e.address}
                right={
                  <Text variant="smallStrong" color={c.electric}>
                    {t('community.event.directions')}
                  </Text>
                }
              />
            </PressableScale>
            <Fact icon={<Users size={18} color={c.subtle} />} title={full ? t('community.event.full') : t('community.event.spotsLeft', { count: left })}>
              <View style={{ marginTop: 6 }}>
                <SeatsBar attendees={e.attendees} capacity={e.capacity} />
              </View>
            </Fact>
            <Fact icon={<Ticket size={18} color={c.subtle} />} title={e.price === 'free' ? t('community.event.free') : t('community.event.paid')} />
            {e.link ? (
              <PressableScale onPress={() => WebBrowser.openBrowserAsync(e.link!)} scaleTo={0.985} accessibilityRole="link">
                <Fact icon={<Link2 size={18} color={c.subtle} />} title={e.link.replace(/^https?:\/\//, '').replace(/\/$/, '')} sub={t('community.event.moreInfo')} right={<ArrowUpRight size={18} color={c.electric} />} />
              </PressableScale>
            ) : null}
          </ListGroup>
        </Animated.View>

        {e.description ? (
          <View style={{ gap: 8 }}>
            <Text variant="h3">{t('community.group.about')}</Text>
            <Text variant="body" color={c.subtle}>
              {e.description}
            </Text>
          </View>
        ) : null}
      </View>
      <SuccessModal
        visible={done}
        title={t('community.event.successTitle')}
        message={t('community.event.successText')}
        cta={t('community.event.successCta')}
        onCta={() => {
          setDone(false);
          router.push({ pathname: '/(app)/parcours', params: { view: 'calendar' } });
        }}
        onClose={() => setDone(false)}
      />
    </Screen>
  );
}

const useStyles = makeStyles(({ c }) => ({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  date: { width: 78, height: 88, borderRadius: radius.lg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  day: { fontFamily: fonts.displayBold, fontSize: 34, lineHeight: 38, color: c.white, letterSpacing: -0.6 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
  factIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' },
}));
