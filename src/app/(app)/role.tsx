import { router } from 'expo-router';
import { Backpack, HeartHandshake, House, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { toast } from '@/components/feedback/Toast';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius, roleColors, type Role, type Tone } from '@/theme/tokens';
import { pop, rise } from '@/theme/motion';

/** « Comment veux-tu vivre l'app aujourd'hui ? » : sélecteur de rôle persistant. */
export default function RoleSwitcher() {
  const { c: colors } = useTheme();
  const styles = useStyles();
  const active = useProfile((s) => s.profile.activeRole);
  const isMentor = useProfile((s) => s.profile.roles.includes('mentor'));
  const setActiveRole = useProfile((s) => s.setActiveRole);
  const t = useT();

  const choose = (r: Role) => {
    if (r === 'host') {
      haptics.warning();
      return toast(t('role.hostSoon'), 'info');
    }
    haptics.success();
    setActiveRole(r);
    router.back();
  };

  const rows: { role: Role; text: string; icon: LucideIcon; tone: Tone }[] = [
    { role: 'student', text: t('role.student'), icon: Backpack, tone: 'blue' },
    { role: 'mentor', text: isMentor ? t('role.mentorActive') : t('role.mentorNew'), icon: HeartHandshake, tone: 'green' },
    { role: 'host', text: t('role.host'), icon: House, tone: 'orange' },
  ];

  return (
    <View style={styles.root}>
      <Text variant="h1">{t('role.title')}</Text>
      <Text variant="body" color={colors.subtle} style={{ marginTop: 6, marginBottom: 18 }}>
        {t('role.text')}
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
                accessibilityLabel={soon ? t('role.soonA11y', { role: t(`roles.${c.role}`) }) : t(`roles.${c.role}`)}>
                <View style={soon && { opacity: 0.55 }}>
                  <IconTile icon={c.icon} tone={c.tone} size={46} radius={15} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text variant="h3" color={soon ? colors.muted : colors.navy}>
                      {t(`roles.${c.role}`)}
                    </Text>
                    {soon ? (
                      <View style={styles.soon}>
                        <Text variant="caption" color={colors.subtle}>
                          {t('common.soon')}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text variant="small" color={colors.subtle}>
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

const useStyles = makeStyles(({ c }) => ({
  root: { padding: 22, paddingTop: 26, paddingBottom: 34, backgroundColor: c.surface },
  list: { borderRadius: radius.xl, backgroundColor: c.surface, overflow: 'hidden', borderWidth: 1, borderColor: c.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, minHeight: 74 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
  soon: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: c.bg },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: c.line, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
}));
