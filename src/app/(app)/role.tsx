import { router } from 'expo-router';
import { ArrowRight, GraduationCap, House, Sparkles, Send } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { toast } from '@/components/feedback/Toast';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useProfile } from '@/features/profile/store';
import { haptics } from '@/lib/haptics';
import { palette, radius } from '@/theme/tokens';
import type { Role } from '@/theme/tokens';

/** « Comment veux-tu vivre l'app aujourd'hui ? » — sélecteur de rôle persistant. */
export default function RoleSwitcher() {
  const active = useProfile((s) => s.profile.activeRole);
  const setActiveRole = useProfile((s) => s.setActiveRole);

  const choose = (r: Role) => {
    if (r === 'host') {
      haptics.warning();
      return toast('L’espace Hôte arrive bientôt 🏡', 'info');
    }
    haptics.success();
    setActiveRole(r);
    router.back();
  };

  const cards: { role: Role; title: string; text: string; bullets?: string; colors: [string, string]; bg: string; fg: string; icon: React.ReactNode }[] = [
    { role: 'student', title: 'Étudiant', text: 'Tu arrives bientôt en France', bullets: 'Visa · Logement · CAF · Communauté', colors: ['#7FA6FF', '#3D78FF'], bg: '#E8EEFF', fg: palette.electric, icon: <Send size={20} color="#fff" /> },
    { role: 'mentor', title: 'Mentor', text: 'Tu aides 3 étudiants ce mois', bullets: '1 demande en attente', colors: ['#34D399', palette.mentor], bg: '#E3F7EF', fg: palette.mentor, icon: <GraduationCap size={20} color="#fff" /> },
    { role: 'host', title: 'Hôte', text: 'Cette fonctionnalité arrive bientôt', colors: ['#FDBA74', palette.host], bg: '#FDEDE3', fg: palette.host, icon: <House size={20} color="#fff" /> },
  ];

  return (
    <View style={styles.root}>
      <Text variant="overline" color={palette.muted}>
        DALILI · Une seule appli
      </Text>
      <Text variant="h1" style={{ marginTop: 6, marginBottom: 18 }}>
        Comment veux-tu vivre{'\n'}l’app aujourd’hui ?
      </Text>
      <View style={{ gap: 12 }}>
        {cards.map((c, i) => (
          <Animated.View key={c.role} entering={FadeInDown.delay(i * 70).springify()}>
            <PressableScale onPress={() => choose(c.role)} style={[styles.card, { backgroundColor: c.bg, borderColor: active === c.role ? c.fg : 'transparent' }, c.role === 'host' && { opacity: 0.75 }]}>
              <IconTile size={46} colors={c.colors} radius={14}>
                {c.icon}
              </IconTile>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text variant="h3" color={c.fg}>
                    {c.title}
                  </Text>
                  {active === c.role && (
                    <Text variant="caption" color={c.fg}>
                      ACTIF
                    </Text>
                  )}
                </View>
                <Text variant="small" color={palette.subtle}>
                  {c.text}
                </Text>
                {c.bullets ? (
                  <Text variant="caption" color={palette.subtle}>
                    • {c.bullets}
                  </Text>
                ) : null}
              </View>
              <ArrowRight size={18} color={c.fg} />
            </PressableScale>
          </Animated.View>
        ))}
      </View>
      <View style={styles.note}>
        <Sparkles size={16} color="#fff" />
        <Text variant="small" color="#fff" style={{ flex: 1 }}>
          Une seule appli, trois façons de la vivre. Tes données et conversations restent reliées.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: 22, paddingTop: 26, paddingBottom: 34, backgroundColor: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.xl, borderWidth: 2 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, padding: 14, borderRadius: radius.lg, backgroundColor: palette.navyInk },
});
