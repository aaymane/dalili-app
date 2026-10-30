import { router, type Href } from 'expo-router';
import { Ban, Bell, Bookmark, BrainCircuit, CalendarCheck2, Camera, FolderCheck, HeartHandshake, Languages, LogOut, type LucideIcon, Map, RefreshCw, ShieldCheck, Siren, SunMoon } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Alert, Platform, Switch, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { ChevronRight } from '@/components/ui/DirIcons';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { useMyBookings } from '@/data/hooks';
import { useLocalDb } from '@/data/local-db';
import { resetLocalData } from '@/features/auth/account';
import { isDemoMode, useAuth } from '@/features/auth/store';
import { useJourney } from '@/features/journey/store';
import { askNotifications, unregisterPush } from '@/features/notifications/push';
import { AvatarSheet } from '@/features/profile/components/AvatarSheet';
import { LanguageSheet } from '@/features/profile/components/LanguageSheet';
import { NameCard } from '@/features/profile/components/NameCard';
import { useMyApplication } from '@/features/mentors/hooks';
import { isInFrance, useProfile } from '@/features/profile/store';
import { LANGUAGE_NAMES, useCurrentLanguage, useLanguage, useT } from '@/i18n';
import { useRoleTheme } from '@/theme';
import { makeStyles, useTheme, useAppearance } from '@/theme/scheme';
import { radius, roleColorsFor, type Tone } from '@/theme/tokens';
import { pop, rise } from '@/theme/motion';

function Row({ icon, label, sub, onPress, right, tone }: { icon: LucideIcon; label: string; sub?: string; onPress?: () => void; right?: ReactNode; tone: Tone }) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <PressableScale onPress={onPress} disabled={!onPress && !right} scaleTo={0.985} style={styles.row}>
      <IconTile icon={icon} tone={tone} size={38} radius={12} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{label}</Text>
        {sub ? (
          <Text variant="caption" color={c.muted}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right ?? <ChevronRight size={18} color={c.muted} />}
    </PressableScale>
  );
}

/** Profil : identité, progression, accès rapides, réglages. */
export default function Profil() {
  const appearance = useAppearance((st) => st.preference);
  const setAppearance = useAppearance((st) => st.setPreference);
  const { c } = useTheme();
  const styles = useStyles();
  const profile = useProfile((s) => s.profile);
  const update = useProfile((s) => s.update);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const t = useT();
  const language = useCurrentLanguage();
  const languagePreference = useLanguage((s) => s.preference);
  const signOut = useAuth((s) => s.signOut);
  const [since] = useState(() => Date.now());
  const bookings = useMyBookings().data.filter((b) => (b.status === 'pending' || b.status === 'confirmed') && new Date(b.startsAt).getTime() > since);
  const saved = useLocalDb((s) => s.savedGuides);
  const groups = useLocalDb((s) => s.joinedGroups);
  const j = useJourney();
  const application = useMyApplication().data;
  const isMentor = profile.activeRole === 'mentor';
  const { top, accent } = useRoleTheme();
  const go = (h: Href) => () => router.push(h);

  const confirm = (title: string, msg: string, action: () => void) => {
    if (Platform.OS === 'web') return action();
    Alert.alert(title, msg, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.confirm'), style: 'destructive', onPress: action },
    ]);
  };

  return (
    <Screen top={top} tabBar padded={false} header={<AppHeader />}>
      <View style={{ paddingHorizontal: 20, gap: 18 }}>
        <Animated.View entering={rise()} style={styles.card}>
          <Animated.View entering={pop()}>
            <PressableScale onPress={() => setAvatarOpen(true)} accessibilityRole="button" accessibilityLabel={profile.avatarUri ? t('profile.changePhoto') : t('profile.addPhoto')}>
              <Avatar name={`${profile.firstName} ${profile.lastName}`} uri={profile.avatarUri} size={84} ring={accent} />
              <View style={[styles.camera, { backgroundColor: accent }]}>
                <Camera size={14} color="#fff" />
              </View>
            </PressableScale>
          </Animated.View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text variant="h1">
              {profile.firstName} {profile.lastName}
            </Text>
            <Text variant="small" color={c.muted}>
              {profile.originCity || '—'} → {profile.destinationCity ?? profile.mentorCity ?? t('common.france')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
              {profile.roles.map((r) => (
                <View key={r} style={[styles.badge, { backgroundColor: roleColorsFor(c)[r].soft }]}>
                  <Text variant="caption" color={roleColorsFor(c)[r].main}>
                    {t(`roles.${r}`)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {!profile.firstName.trim() ? <NameCard /> : null}

        <Animated.View entering={rise(60)} style={styles.stats}>
          <ProgressRing progress={j.progress} size={64} track="#E6EBF7" textColor={c.navy} />
          <View style={styles.stat}>
            <Text variant="h1">{j.doneCount}</Text>
            <Text variant="caption" color={c.muted}>
              {t('profile.stepsDone')}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text variant="h1">{groups.length}</Text>
            <Text variant="caption" color={c.muted}>
              {t('profile.groups')}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text variant="h1">{bookings.length}</Text>
            <Text variant="caption" color={c.muted}>
              {t('profile.appointments')}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={rise(100)} style={styles.group}>
          <Row icon={BrainCircuit} tone="violet" label={t('profile.aiProfile')} sub={t('profile.aiProfileSub')} onPress={go('/(app)/profil-ia')} />
          <Row icon={Map} tone="blue" label={t('profile.journey')} sub={t('profile.journeySub', { percent: Math.round(j.progress * 100), count: j.total - j.doneCount })} onPress={go('/(app)/parcours')} />
          <Row icon={CalendarCheck2} tone="green" label={t('profile.myAppointments')} sub={bookings.length ? t('profile.upcoming', { count: bookings.length }) : t('profile.noAppointments')} onPress={go('/(app)/rendez-vous')} />
          <Row icon={Bookmark} tone="orange" label={t('profile.savedGuides')} sub={t('profile.guidesCount', { count: saved.length })} onPress={go('/(app)/(tabs)/explorer?tab=guides')} />
          <Row icon={FolderCheck} tone="amber" label={t('profile.documents')} sub={t('profile.documentsSub')} onPress={go('/(app)/outils/documents')} />
        </Animated.View>

        <Animated.View entering={rise(140)} style={styles.group}>
          {/* Un compte est étudiant OU mentor : l'étudiant arrivé en France peut candidater, l'équipe vérifie. */}
          {isMentor ? null : (
            <Row
              icon={HeartHandshake}
              tone="green"
              label={t('mentorApply.row')}
              sub={t(`mentorApply.rowSub.${isInFrance(profile) ? (application?.status ?? 'none') : 'abroad'}`)}
              onPress={go('/(app)/devenir-mentor')}
            />
          )}
          <Row
            icon={Bell}
            tone="slate"
            label={t('profile.reminders')}
            sub={t('profile.remindersSub')}
            right={
              <Switch
                value={profile.notificationsEnabled}
                onValueChange={(v) => {
                  // Oui : on demande l'autorisation au système et on inscrit le téléphone. Non : il ne reçoit plus rien.
                  if (v) void askNotifications();
                  else {
                    update({ notificationsEnabled: false });
                    void unregisterPush();
                  }
                }}
                trackColor={{ true: accent, false: c.lineStrong }}
                thumbColor="#fff"
              />
            }
          />
          <View style={styles.appearance}>
            <IconTile icon={SunMoon} tone="slate" size={38} radius={12} />
            <View style={{ flex: 1, gap: 8 }}>
              <Text variant="bodyStrong">{t('profile.appearance')}</Text>
              <Segmented
                kind="track"
                options={[
                  { value: 'system', label: t('profile.appearanceAuto') },
                  { value: 'light', label: t('profile.appearanceLight') },
                  { value: 'dark', label: t('profile.appearanceDark') },
                ]}
                value={appearance}
                onChange={setAppearance}
              />
            </View>
          </View>
          <Row
            icon={Languages}
            tone="slate"
            label={t('language.title')}
            sub={languagePreference === 'system' ? t('language.systemShort', { name: LANGUAGE_NAMES[language] }) : LANGUAGE_NAMES[language]}
            onPress={() => setLanguageOpen(true)}
          />
          <Row icon={Siren} tone="red" label={t('profile.sos')} sub={t('profile.sosSub')} onPress={go('/(app)/outils/sos')} />
          <Row icon={ShieldCheck} tone="slate" label={t('profile.privacy')} sub={t('profile.privacySub')} onPress={go('/(app)/confidentialite')} />
          <Row icon={Ban} tone="slate" label={t('profile.blocked')} sub={t('profile.blockedSub')} onPress={go('/(app)/bloques')} />
        </Animated.View>

        <Animated.View entering={rise(180)} style={styles.group}>
          {isDemoMode && (
            <Row
              icon={RefreshCw}
              tone="amber"
              label={t('profile.resetDemo')}
              sub={t('profile.resetDemoSub')}
              onPress={() =>
                confirm(t('profile.resetTitle'), t('profile.resetText'), () => {
                  resetLocalData();
                  signOut();
                })
              }
            />
          )}
          <Row icon={LogOut} tone="red" label={t('profile.signOut')} onPress={() => confirm(t('profile.signOutTitle'), t('profile.signOutText'), () => signOut())} />
        </Animated.View>
        <Text variant="caption" color={c.muted} align="center">
          {t('profile.footer', { mode: isDemoMode ? t('profile.modeDemo') : t('profile.modeOnline') })}
        </Text>
      </View>
      <AvatarSheet visible={avatarOpen} onClose={() => setAvatarOpen(false)} />
      <LanguageSheet visible={languageOpen} onClose={() => setLanguageOpen(false)} />
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  appearance: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: radius.xxl, backgroundColor: c.card, ...shadow.md },
  camera: { position: 'absolute', end: -2, bottom: -2, width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: c.card, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  stats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: radius.xl, backgroundColor: c.card, ...shadow.sm },
  stat: { alignItems: 'center' },
  group: { borderRadius: radius.xl, backgroundColor: c.card, paddingVertical: 4, ...shadow.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
}));
