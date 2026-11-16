import { router } from 'expo-router';
import { CalendarClock, Eye, PenLine, Star } from 'lucide-react-native';
import { View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import type { MyMentor } from '@/features/mentors/api';
import { specialtyLabel } from '@/features/mentors/specialties';
import { useProfile } from '@/features/profile/store';
import { formatDecimal, useT } from '@/i18n';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

/**
 * « Ta vitrine » : ta fiche telle qu'un étudiant la voit avant de te choisir (ta photo, ton titre, ta note, tes
 * spécialités), et les trois gestes qui la font vivre : la modifier, régler tes créneaux, la voir en entier.
 */
export function Showcase({ mentor, slots }: { mentor: MyMentor; slots: number }) {
  const { c, tones } = useTheme();
  const t = useT();
  const styles = useStyles();
  const avatar = useProfile((s) => s.profile.avatarUri);
  const name = `${mentor.firstName} ${mentor.lastName}`.trim();
  const openPublic = () => router.push({ pathname: '/(app)/mentor/[id]', params: { id: mentor.id } });

  return (
    <View style={styles.card}>
      <PressableScale onPress={openPublic} scaleTo={0.985} style={styles.top} accessibilityLabel={t('mentorHome.publicProfile')}>
        <Avatar name={name} uri={avatar} size={58} color={c.mentor} ring={c.mentorSoft} online={mentor.availableThisWeek} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="h3" numberOfLines={1}>
            {name}
          </Text>
          {mentor.headline ? (
            <Text variant="small" color={c.subtle} numberOfLines={1}>
              {mentor.headline}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Star size={12} color={c.warning} fill={mentor.sessions > 0 ? c.warning : 'transparent'} />
            <Text variant="caption" color={c.subtle}>
              {mentor.sessions > 0 ? `${formatDecimal(mentor.rating)} · ${mentor.city}` : `${t('mentorHome.new')} · ${mentor.city}`}
            </Text>
          </View>
        </View>
      </PressableScale>

      {mentor.specialties.length ? (
        <View style={styles.chips}>
          {mentor.specialties.slice(0, 3).map((s) => (
            <View key={s} style={styles.chip}>
              <Text variant="caption" color={tones.green.ink} numberOfLines={1}>
                {specialtyLabel(s)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Action icon={<PenLine size={16} color={tones.green.ink} />} label={t('mentorHome.showcase.edit')} onPress={() => router.push('/(app)/ma-fiche')} />
        <Action
          icon={<CalendarClock size={16} color={tones.green.ink} />}
          label={slots ? t('mentorHome.showcase.slots', { count: slots }) : t('mentorHome.slots')}
          onPress={() => router.push('/(app)/creneaux')}
        />
        <Action icon={<Eye size={16} color={tones.green.ink} />} label={t('mentorHome.showcase.view')} onPress={openPublic} />
      </View>
    </View>
  );
}

function Action({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  const { tones } = useTheme();
  const styles = useStyles();
  return (
    <PressableScale onPress={onPress} style={styles.action} accessibilityLabel={label}>
      {icon}
      <Text variant="smallStrong" color={tones.green.ink} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  card: { padding: 16, gap: 14, borderRadius: radius.xl, backgroundColor: c.surface, ...shadow.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: c.mentorSoft },
  actions: { flexDirection: 'row', gap: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.line },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: radius.pill, backgroundColor: c.mentorSoft },
}));
