import { router, type Href } from 'expo-router';
import { Ban, Bell, Bookmark, BrainCircuit, CalendarCheck2, Camera, ChevronRight, FolderCheck, Languages, LogOut, type LucideIcon, Map, RefreshCw, Repeat, ShieldCheck, Siren, SunMoon } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Alert, Platform, Switch, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { toast } from '@/components/feedback/Toast';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
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
import { NameCard } from '@/features/profile/components/NameCard';
import { useProfile } from '@/features/profile/store';
import { useRoleTheme } from '@/theme';
import { makeStyles, useTheme, useAppearance } from '@/theme/scheme';
import { radius, roleColors, roleColorsFor, type Tone } from '@/theme/tokens';
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
  const signOut = useAuth((s) => s.signOut);
  const [since] = useState(() => Date.now());
  const bookings = useMyBookings().data.filter((b) => (b.status === 'pending' || b.status === 'confirmed') && new Date(b.startsAt).getTime() > since);
  const saved = useLocalDb((s) => s.savedGuides);
  const groups = useLocalDb((s) => s.joinedGroups);
  const j = useJourney();
  const { top, accent } = useRoleTheme();
  const go = (h: Href) => () => router.push(h);

  const confirm = (title: string, msg: string, action: () => void) => {
    if (Platform.OS === 'web') return action();
    Alert.alert(title, msg, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', style: 'destructive', onPress: action },
    ]);
  };

  return (
    <Screen top={top} tabBar padded={false} header={<AppHeader />}>
      <View style={{ paddingHorizontal: 20, gap: 18 }}>
        <Animated.View entering={rise()} style={styles.card}>
          <Animated.View entering={pop()}>
            <PressableScale onPress={() => setAvatarOpen(true)} accessibilityRole="button" accessibilityLabel={profile.avatarUri ? 'Changer ma photo de profil' : 'Ajouter une photo de profil'}>
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
              {profile.originCity || '—'} → {profile.destinationCity ?? profile.mentorCity ?? 'France'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
              {profile.roles.map((r) => (
                <View key={r} style={[styles.badge, { backgroundColor: roleColorsFor(c)[r].soft }]}>
                  <Text variant="caption" color={roleColorsFor(c)[r].main}>
                    {roleColors[r].label}
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
              étapes faites
            </Text>
          </View>
          <View style={styles.stat}>
            <Text variant="h1">{groups.length}</Text>
            <Text variant="caption" color={c.muted}>
              groupes
            </Text>
          </View>
          <View style={styles.stat}>
            <Text variant="h1">{bookings.length}</Text>
            <Text variant="caption" color={c.muted}>
              rendez-vous
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={rise(100)} style={styles.group}>
          <Row icon={BrainCircuit} tone="violet" label="Profil IA" sub="Ce que Dalili sait de toi" onPress={go('/(app)/profil-ia')} />
          <Row icon={Map} tone="blue" label="Mon Parcours-quête" sub={`${Math.round(j.progress * 100)}% · ${j.total - j.doneCount} étapes restantes`} onPress={go('/(app)/parcours')} />
          <Row icon={CalendarCheck2} tone="green" label="Mes rendez-vous" sub={bookings.length ? `${bookings.length} à venir` : 'Aucun pour le moment'} onPress={go('/(app)/parcours?view=calendar')} />
          <Row icon={Bookmark} tone="orange" label="Guides enregistrés" sub={`${saved.length} guide${saved.length > 1 ? 's' : ''}`} onPress={go('/(app)/(tabs)/explorer?tab=guides')} />
          <Row icon={FolderCheck} tone="amber" label="Mes documents" sub="La checklist de tes papiers" onPress={go('/(app)/outils/documents')} />
        </Animated.View>

        <Animated.View entering={rise(140)} style={styles.group}>
          <Row icon={Repeat} tone="slate" label="Changer de mode" sub={`Actuellement : ${roleColors[profile.activeRole].label}`} onPress={go('/(app)/role')} />
          <Row
            icon={Bell}
            tone="slate"
            label="Rappels d’échéances"
            sub="Visa, CAF, CVEC…"
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
              <Text variant="bodyStrong">Apparence</Text>
              <Segmented
                kind="track"
                options={[
                  { value: 'system', label: 'Auto' },
                  { value: 'light', label: 'Clair' },
                  { value: 'dark', label: 'Sombre' },
                ]}
                value={appearance}
                onChange={setAppearance}
              />
            </View>
          </View>
          <Row icon={Languages} tone="slate" label="Langue" sub="Français · العربية et English bientôt" onPress={() => toast('Arabe et anglais arrivent bientôt 🌍', 'info')} />
          <Row icon={Siren} tone="red" label="Urgences & SOS" sub="Numéros utiles en France" onPress={go('/(app)/outils/sos')} />
          <Row icon={ShieldCheck} tone="slate" label="Confidentialité" sub="Tes données, supprimer ton compte" onPress={go('/(app)/confidentialite')} />
          <Row icon={Ban} tone="slate" label="Personnes bloquées" sub="Dans le mentorat" onPress={go('/(app)/bloques')} />
        </Animated.View>

        <Animated.View entering={rise(180)} style={styles.group}>
          {isDemoMode && (
            <Row
              icon={RefreshCw}
              tone="amber"
              label="Réinitialiser la démo"
              sub="Recommencer l’onboarding"
              onPress={() =>
                confirm('Réinitialiser ?', 'Toutes tes données locales seront effacées.', () => {
                  resetLocalData();
                  signOut();
                })
              }
            />
          )}
          <Row icon={LogOut} tone="red" label="Se déconnecter" onPress={() => confirm('Se déconnecter ?', 'Tu pourras te reconnecter à tout moment.', () => signOut())} />
        </Animated.View>
        <Text variant="caption" color={c.muted} align="center">
          DALILI v0.1 · {isDemoMode ? 'Mode démo' : 'Connecté à Supabase'} · Fait avec 💙 par des étudiants, pour des étudiants
        </Text>
      </View>
      <AvatarSheet visible={avatarOpen} onClose={() => setAvatarOpen(false)} />
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  appearance: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: radius.xxl, backgroundColor: c.card, ...shadow.md },
  camera: { position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: c.card, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  stats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: radius.xl, backgroundColor: c.card, ...shadow.sm },
  stat: { alignItems: 'center' },
  group: { borderRadius: radius.xl, backgroundColor: c.card, paddingVertical: 4, ...shadow.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
}));
