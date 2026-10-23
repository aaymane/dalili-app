import { router } from 'expo-router';
import { Backpack, HeartHandshake, House, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { toast } from '@/components/feedback/Toast';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useProfile } from '@/features/profile/store';
import { haptics } from '@/lib/haptics';
import { palette, radius, roleColors, type Role, type Tone } from '@/theme/tokens';
import { pop, rise } from '@/theme/motion';

/** « Comment veux-tu vivre l'app aujourd'hui ? » : sélecteur de rôle persistant. */
export default function RoleSwitcher() {
  const active = useProfile((s) => s.profile.activeRole);
  const isMentor = useProfile((s) => s.profile.roles.includes('mentor'));
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

  const rows: { role: Role; text: string; icon: LucideIcon; tone: Tone }[] = [
    { role: 'student', text: 'Tes démarches, ton parcours, ta ville', icon: Backpack, tone: 'blue' },
    { role: 'mentor', text: isMentor ? 'Tes demandes d’appel et tes créneaux' : 'Aide les nouveaux arrivants, gratuitement', icon: HeartHandshake, tone: 'green' },
    { role: 'host', text: 'Accueillir un étudiant à son arrivée', icon: House, tone: 'orange' },
  ];

  return (
    <View style={styles.root}>
      <Text variant="h1">Comment veux-tu vivre{'\n'}l’app aujourd’hui ?</Text>
      <Text variant="body" color={palette.subtle} style={{ marginTop: 6, marginBottom: 18 }}>
        Un seul compte : tes données et tes conversations te suivent.
      </Text>
      <View style={styles.list}>
        {rows.map((c, i) => {
          const on = active === c.role;
          const soon = c.role === 'host';
          return (
            <Animated.View key={c.role} entering={rise(i * 60)}>
              <PressableScale
                onPress={() => choose(c.role)}
                scaleTo={0.985}
                style={[styles.row, i > 0 && styles.sep]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on, disabled: soon }}
                accessibilityLabel={`${roleColors[c.role].label}${soon ? ', bientôt' : ''}`}>
                <View style={soon && { opacity: 0.55 }}>
                  <IconTile icon={c.icon} tone={c.tone} size={46} radius={15} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text variant="h3" color={soon ? palette.muted : palette.navy}>
                      {roleColors[c.role].label}
                    </Text>
                    {soon ? (
                      <View style={styles.soon}>
                        <Text variant="caption" color={palette.subtle}>
                          Bientôt
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text variant="small" color={palette.subtle}>
                    {c.text}
                  </Text>
                </View>
                {soon ? null : (
                  <View style={[styles.radio, on && { borderColor: roleColors[c.role].main }]}>
                    {on ? <Animated.View entering={pop()} style={[styles.radioDot, { backgroundColor: roleColors[c.role].main }]} /> : null}
                  </View>
                )}
              </PressableScale>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: 22, paddingTop: 26, paddingBottom: 34, backgroundColor: palette.surface },
  list: { borderRadius: radius.xl, backgroundColor: palette.surface, overflow: 'hidden', borderWidth: 1, borderColor: palette.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, minHeight: 74 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
  soon: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: palette.bg },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
});
