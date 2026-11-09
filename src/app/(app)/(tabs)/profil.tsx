import { router, type Href } from 'expo-router';
import { Ban, Bell, Bookmark, BrainCircuit, CalendarCheck2, CalendarClock, Eye, FolderCheck, HandHeart, HeartHandshake, Languages, LogOut, Map, PenLine, RefreshCw, ShieldCheck, Siren, Star, SunMoon } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Platform, Switch, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { ListIcon, ListRow, ListSection } from '@/components/ui/ListRow';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { useGroups, useMyBookings } from '@/data/hooks';
import { useLocalDb } from '@/data/local-db';
import { resetLocalData } from '@/features/auth/account';
import { isDemoMode, useAuth } from '@/features/auth/store';
import { useJourney } from '@/features/journey/store';
import { askNotifications, turnOffNotifications } from '@/features/notifications/push';
import { AvatarSheet } from '@/features/profile/components/AvatarSheet';
import { IdentityCard } from '@/features/profile/components/IdentityCard';
import { LanguageSheet } from '@/features/profile/components/LanguageSheet';
import { NameCard } from '@/features/profile/components/NameCard';
import { splitMentorAgenda } from '@/features/mentors/appointments';
import { useMentorRequests, useMentorSlots, useMyApplication, useMyMentor } from '@/features/mentors/hooks';
import { isInFrance, useProfile } from '@/features/profile/store';
import { formatDecimal, LANGUAGE_NAMES, useCurrentLanguage, useLanguage, useT } from '@/i18n';
import { useRoleTheme } from '@/theme';
import { makeStyles, useTheme, useAppearance } from '@/theme/scheme';
import { rise } from '@/theme/motion';

/** Profil : identité, progression, accès rapides, réglages. */
export default function Profil() {
  const appearance = useAppearance((st) => st.preference);
  const setAppearance = useAppearance((st) => st.setPreference);
  const { c } = useTheme();
  const styles = useStyles();
  const profile = useProfile((s) => s.profile);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const t = useT();
  const language = useCurrentLanguage();
  const languagePreference = useLanguage((s) => s.preference);
  const signOut = useAuth((s) => s.signOut);
  const [since] = useState(() => Date.now());
  const bookings = useMyBookings().data.filter((b) => (b.status === 'pending' || b.status === 'confirmed') && new Date(b.startsAt).getTime() > since);
  const saved = useLocalDb((s) => s.savedGuides);
  // Tes groupes d'après la base (avec un compte), pas seulement ceux rejoints sur ce téléphone.
  const groups = useGroups().data.filter((g) => g.isMember);
  const j = useJourney();
  const application = useMyApplication().data;
  const isMentor = profile.activeRole === 'mentor';
  // Espace mentor : sa fiche, ses demandes, ses créneaux (rien n'est demandé côté étudiant).
  const mentor = useMyMentor().data;
  const requests = useMentorRequests({ enabled: isMentor }).data ?? [];
  const slots = useMentorSlots(isMentor ? mentor?.id : undefined).data ?? [];
  const agenda = splitMentorAgenda(requests);
  const helped = new Set(requests.filter((r) => r.status === 'confirmed' || r.status === 'done').map((r) => r.student ?? r.id)).size;
  const calls = requests.filter((r) => r.status === 'done' || (r.status === 'confirmed' && new Date(r.startsAt).getTime() < since)).length;
  const { top, accent } = useRoleTheme();
  const go = (h: Href) => () => router.push(h);

  const confirm = (title: string, msg: string, action: () => void) => {
    if (Platform.OS === 'web') return action();
    Alert.alert(title, msg, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.confirm'), style: 'destructive', onPress: action },
    ]);
  };

  const city = mentor?.city ?? profile.mentorCity ?? t('common.france');
  const stats = isMentor
    ? [
        {
          value: mentor && mentor.sessions > 0 ? formatDecimal(mentor.rating) : '—',
          label: mentor && mentor.sessions > 0 ? t('profile.mentorRating') : t('mentorHome.notRated'),
          icon: <Star size={14} color={c.mentorGlow} fill={mentor && mentor.sessions > 0 ? c.mentorGlow : 'transparent'} />,
        },
        { value: String(calls), label: t('mentorHome.calls') },
        { value: String(helped), label: t('profile.studentsHelped') },
      ]
    : [
        { value: `${j.doneCount}/${j.total}`, label: t('profile.stepsDone') },
        { value: String(groups.length), label: t('profile.groups') },
        { value: String(bookings.length), label: t('profile.appointments') },
      ];

  return (
    <Screen top={top} tabBar padded={false} header={<AppHeader />}>
      <View style={{ paddingHorizontal: 20, gap: 26 }}>
        <Animated.View entering={rise()}>
          <IdentityCard
            name={`${profile.firstName} ${profile.lastName}`.trim()}
            avatarUri={profile.avatarUri}
            line={isMentor ? t('profile.mentorIn', { city }) : `${profile.originCity || '—'} → ${profile.destinationCity ?? profile.mentorCity ?? t('common.france')}`}
            role={t(`roles.${isMentor ? 'mentor' : 'student'}`)}
            verified={isMentor}
            stats={stats}
            progress={isMentor ? undefined : j.progress}
            accent={accent}
            onAvatar={() => setAvatarOpen(true)}
            avatarA11y={profile.avatarUri ? t('profile.changePhoto') : t('profile.addPhoto')}
          />
        </Animated.View>

        {!profile.firstName.trim() ? <NameCard /> : null}

        {isMentor ? (
          <ListSection title={t('profile.sectionMentor')} delay={60}>
            <ListRow
              icon={CalendarCheck2}
              label={t('agenda.title')}
              sub={agenda.toHandle.length ? t('profile.toHandle', { count: agenda.toHandle.length }) : agenda.upcoming.length ? t('profile.upcomingCalls', { count: agenda.upcoming.length }) : t('profile.agendaClear')}
              onPress={() => router.navigate('/(app)/(tabs)/agenda')}
            />
            <ListRow icon={CalendarClock} label={t('mentorHome.slots')} sub={slots.length ? t('mentorHome.slotsCount', { count: slots.length }) : t('mentorHome.slotsNone')} onPress={go('/(app)/creneaux')} />
            <ListRow icon={PenLine} label={t('mentorHome.editSheet')} sub={t('mentorHome.editSheetSub')} onPress={go('/(app)/ma-fiche')} />
            <ListRow icon={Eye} label={t('mentorHome.publicProfile')} sub={t('mentorHome.publicProfileSub')} onPress={mentor ? () => router.push({ pathname: '/(app)/mentor/[id]', params: { id: mentor.id } }) : undefined} />
            <ListRow icon={HandHeart} label={t('profile.charter')} sub={mentor?.charterOk === false ? t('profile.charterToAccept') : t('profile.charterOk')} onPress={go('/(app)/charte-mentor')} />
          </ListSection>
        ) : (
          <>
            <ListSection title={t('profile.sectionMine')} delay={60}>
              <ListRow icon={Map} label={t('profile.journey')} sub={t('profile.journeySub', { percent: Math.round(j.progress * 100), count: j.total - j.doneCount })} onPress={go('/(app)/parcours')} />
              <ListRow icon={CalendarCheck2} label={t('profile.myAppointments')} sub={bookings.length ? t('profile.upcoming', { count: bookings.length }) : t('profile.noAppointments')} onPress={go('/(app)/rendez-vous')} />
              <ListRow icon={BrainCircuit} label={t('profile.aiProfile')} sub={t('profile.aiProfileSub')} onPress={go('/(app)/profil-ia')} />
              <ListRow icon={Bookmark} label={t('profile.savedGuides')} sub={t('profile.guidesCount', { count: saved.length })} onPress={go('/(app)/(tabs)/explorer?tab=guides')} />
              <ListRow icon={FolderCheck} label={t('profile.documents')} sub={t('profile.documentsSub')} onPress={go('/(app)/outils/documents')} />
            </ListSection>
            {/* Un compte est étudiant OU mentor : l'étudiant arrivé en France peut candidater, l'équipe vérifie. */}
            <ListSection delay={100}>
              <ListRow
                icon={HeartHandshake}
                label={t('mentorApply.row')}
                sub={t(`mentorApply.rowSub.${isInFrance(profile) ? (application?.status ?? 'none') : 'abroad'}`)}
                onPress={go('/(app)/devenir-mentor')}
              />
            </ListSection>
          </>
        )}

        <ListSection title={t('profile.sectionSettings')} delay={140}>
          <ListRow
            icon={Bell}
            label={t('profile.notifications')}
            sub={isMentor ? t('profile.notificationsMentorSub') : t('profile.notificationsStudentSub')}
            right={
              <Switch
                value={profile.notificationsEnabled}
                onValueChange={(v) => {
                  // Oui : on demande l'autorisation (ou on ouvre Réglages) et on inscrit le téléphone. Non : il ne reçoit plus rien.
                  if (v) void askNotifications(true);
                  else void turnOffNotifications();
                }}
                trackColor={{ true: accent, false: c.lineStrong }}
                thumbColor={c.white}
                accessibilityLabel={t('profile.notifications')}
              />
            }
          />
          <View style={styles.appearance}>
            <ListIcon icon={SunMoon} />
            <View style={{ flex: 1, gap: 10 }}>
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
          <ListRow
            icon={Languages}
            label={t('language.title')}
            sub={languagePreference === 'system' ? t('language.systemShort', { name: LANGUAGE_NAMES[language] }) : LANGUAGE_NAMES[language]}
            onPress={() => setLanguageOpen(true)}
          />
        </ListSection>

        <ListSection title={t('profile.sectionHelp')} delay={180}>
          <ListRow icon={Siren} label={t('profile.sos')} sub={t('profile.sosSub')} onPress={go('/(app)/outils/sos')} />
          <ListRow icon={ShieldCheck} label={t('profile.privacy')} sub={t('profile.privacySub')} onPress={go('/(app)/confidentialite')} />
          <ListRow icon={Ban} label={t('profile.blocked')} sub={t('profile.blockedSub')} onPress={go('/(app)/bloques')} />
        </ListSection>

        <ListSection delay={220}>
          {isDemoMode ? (
            <ListRow
              icon={RefreshCw}
              label={t('profile.resetDemo')}
              sub={t('profile.resetDemoSub')}
              onPress={() =>
                confirm(t('profile.resetTitle'), t('profile.resetText'), () => {
                  resetLocalData();
                  signOut();
                })
              }
            />
          ) : null}
          <ListRow icon={LogOut} label={t('profile.signOut')} danger onPress={() => confirm(t('profile.signOutTitle'), t('profile.signOutText'), () => signOut())} />
        </ListSection>
        <Text variant="caption" color={c.muted} align="center">
          {t('profile.footer', { mode: isDemoMode ? t('profile.modeDemo') : t('profile.modeOnline') })}
        </Text>
      </View>
      <AvatarSheet visible={avatarOpen} onClose={() => setAvatarOpen(false)} />
      <LanguageSheet visible={languageOpen} onClose={() => setLanguageOpen(false)} />
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  appearance: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingHorizontal: 14, paddingVertical: 14 },
}));
