import { router, type Href } from 'expo-router';
import {
  Bell,
  Bookmark,
  BrainCircuit,
  CalendarCheck2,
  Camera,
  ChevronRight,
  FolderCheck,
  Languages,
  LogOut,
  Map,
  RefreshCw,
  Repeat,
  ShieldCheck,
  Siren,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Alert, Platform, StyleSheet, Switch, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { toast } from '@/components/feedback/Toast';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Text } from '@/components/ui/Text';
import { useLocalDb } from '@/data/local-db';
import { resetLocalData } from '@/features/auth/account';
import { isDemoMode, useAuth } from '@/features/auth/store';
import { useJourney } from '@/features/journey/store';
import { AvatarSheet } from '@/features/profile/components/AvatarSheet';
import { useProfile } from '@/features/profile/store';
import { useRoleTheme } from '@/theme';
import { palette, radius, roleColors, shadow } from '@/theme/tokens';
import { pop, rise } from '@/theme/motion';

function Row({ icon, label, sub, onPress, right, colors }: { icon: ReactNode; label: string; sub?: string; onPress?: () => void; right?: ReactNode; colors: [string, string] }) {
  return (
    <PressableScale onPress={onPress} disabled={!onPress && !right} scaleTo={0.985} style={styles.row}>
      <IconTile size={38} colors={colors} radius={12}>
        {icon}
      </IconTile>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{label}</Text>
        {sub ? (
          <Text variant="caption" color={palette.muted}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right ?? <ChevronRight size={18} color={palette.muted} />}
    </PressableScale>
  );
}

/** Profil : identité, progression, accès rapides, réglages. */
export default function Profil() {
  const profile = useProfile((s) => s.profile);
  const update = useProfile((s) => s.update);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const signOut = useAuth((s) => s.signOut);
  const bookings = useLocalDb((s) => s.bookings).filter((b) => b.status === 'confirmed');
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
            <Text variant="small" color={palette.muted}>
              {profile.originCity || '—'} → {profile.destinationCity ?? profile.mentorCity ?? 'France'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
              {profile.roles.map((r) => (
                <View key={r} style={[styles.badge, { backgroundColor: roleColors[r].soft }]}>
                  <Text variant="caption" color={roleColors[r].main}>
                    {roleColors[r].label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={rise(60)} style={styles.stats}>
          <ProgressRing progress={j.progress} size={64} track="#E6EBF7" textColor={palette.navy} />
          <View style={styles.stat}>
            <Text variant="h1">{j.doneCount}</Text>
            <Text variant="caption" color={palette.muted}>
              étapes faites
            </Text>
          </View>
          <View style={styles.stat}>
            <Text variant="h1">{groups.length}</Text>
            <Text variant="caption" color={palette.muted}>
              groupes
            </Text>
          </View>
          <View style={styles.stat}>
            <Text variant="h1">{bookings.length}</Text>
            <Text variant="caption" color={palette.muted}>
              rendez-vous
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={rise(100)} style={styles.group}>
          <Row icon={<BrainCircuit size={18} color="#fff" />} colors={['#7A8CFF', '#7A5AF8']} label="Profil IA" sub="Ce que Dalili sait de toi" onPress={go('/(app)/profil-ia')} />
          <Row icon={<Map size={18} color="#fff" />} colors={['#7FA6FF', '#3D78FF']} label="Mon Parcours-quête" sub={`${Math.round(j.progress * 100)}% · ${j.total - j.doneCount} étapes restantes`} onPress={go('/(app)/parcours')} />
          <Row icon={<CalendarCheck2 size={18} color="#fff" />} colors={['#34D399', palette.mentor]} label="Mes rendez-vous" sub={bookings.length ? `${bookings.length} à venir` : 'Aucun pour le moment'} onPress={go('/(app)/parcours?view=calendar')} />
          <Row icon={<Bookmark size={18} color="#fff" />} colors={['#FDBA74', '#F97316']} label="Guides enregistrés" sub={`${saved.length} guide${saved.length > 1 ? 's' : ''}`} onPress={go('/(app)/(tabs)/explorer?tab=guides')} />
          <Row icon={<FolderCheck size={18} color="#fff" />} colors={['#C084FC', '#9333EA']} label="Mes documents" sub="La checklist de tes papiers" onPress={go('/(app)/outils/documents')} />
        </Animated.View>

        <Animated.View entering={rise(140)} style={styles.group}>
          <Row icon={<Repeat size={18} color="#fff" />} colors={['#94A3B8', '#475569']} label="Changer de mode" sub={`Actuellement : ${roleColors[profile.activeRole].label}`} onPress={go('/(app)/role')} />
          <Row
            icon={<Bell size={18} color="#fff" />}
            colors={['#94A3B8', '#475569']}
            label="Rappels d’échéances"
            sub="Visa, CAF, CVEC…"
            right={<Switch value={profile.notificationsEnabled} onValueChange={(v) => update({ notificationsEnabled: v })} trackColor={{ true: accent, false: '#D5DAE7' }} thumbColor="#fff" />}
          />
          <Row icon={<Languages size={18} color="#fff" />} colors={['#94A3B8', '#475569']} label="Langue" sub="Français · العربية et English bientôt" onPress={() => toast('Arabe et anglais arrivent bientôt 🌍', 'info')} />
          <Row icon={<Siren size={18} color="#fff" />} colors={['#FB7185', '#E11D48']} label="Urgences & SOS" sub="Numéros utiles en France" onPress={go('/(app)/outils/sos')} />
          <Row icon={<ShieldCheck size={18} color="#fff" />} colors={['#94A3B8', '#475569']} label="Confidentialité" sub="Tes données, supprimer ton compte" onPress={go('/(app)/confidentialite')} />
        </Animated.View>

        <Animated.View entering={rise(180)} style={styles.group}>
          {isDemoMode && (
            <Row
              icon={<RefreshCw size={18} color="#fff" />}
              colors={['#FDBA74', '#F97316']}
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
          <Row icon={<LogOut size={18} color="#fff" />} colors={['#F87171', '#E5484D']} label="Se déconnecter" onPress={() => confirm('Se déconnecter ?', 'Tu pourras te reconnecter à tout moment.', () => signOut())} />
        </Animated.View>
        <Text variant="caption" color={palette.muted} align="center">
          DALILI v0.1 · {isDemoMode ? 'Mode démo' : 'Connecté à Supabase'} · Fait avec 💙 par des étudiants, pour des étudiants
        </Text>
      </View>
      <AvatarSheet visible={avatarOpen} onClose={() => setAvatarOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: radius.xxl, backgroundColor: '#fff', ...shadow.md },
  camera: { position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  stats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: radius.xl, backgroundColor: '#fff', ...shadow.sm },
  stat: { alignItems: 'center' },
  group: { borderRadius: radius.xl, backgroundColor: '#fff', paddingVertical: 4, ...shadow.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
});
