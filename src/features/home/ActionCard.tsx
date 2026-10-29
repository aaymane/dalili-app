import { router } from 'expo-router';
import { ArrowRight, Clock, FileText, Phone } from 'lucide-react-native';
import { View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useGuide, useMentors } from '@/data/hooks';
import { StepIcon } from '@/features/journey/components/StepIcon';
import type { Step } from '@/features/journey/steps';
import { useProfile } from '@/features/profile/store';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

/** « Ta seule action aujourd'hui » : une étape, pourquoi, combien de temps, ce qu'il faut, un bouton. */
export function ActionCard({ step }: { step: Step }) {
  const { c } = useTheme();
  const styles = useStyles();
  const city = useProfile((s) => s.profile.destinationCity);
  const { data: guide } = useGuide(step.guides[0]);
  const { data: mentors = [] } = useMentors();
  const needs = (step.needs?.length ? step.needs : guide?.documents ?? []).slice(0, 3);
  const helpers = [...mentors].sort((a, b) => Number(b.city === city) - Number(a.city === city) || b.rating - a.rating).slice(0, 2);
  const open = () => router.push({ pathname: '/(app)/etape/[id]', params: { id: step.id } });

  return (
    <View style={styles.card}>
      <Text variant="overline" color={c.electric}>
        Ta seule action aujourd’hui
      </Text>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <IconTile size={48} bg={c.electricSoft}>
          <StepIcon name={step.icon} color={c.electric} size={22} />
        </IconTile>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="h3">{step.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Clock size={13} color={c.muted} />
            <Text variant="caption" color={c.muted}>
              ≈ {step.minutes} min · {step.window}
            </Text>
          </View>
        </View>
      </View>
      <Text variant="small" color={c.subtle}>
        {step.why}
      </Text>
      {needs.length ? (
        <View style={styles.needs}>
          <Text variant="smallStrong">Il te faut</Text>
          {needs.map((n) => (
            <View key={n} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <FileText size={14} color={c.electric} style={{ marginTop: 3 }} />
              <Text variant="small" style={{ flex: 1 }}>
                {n}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      <Button label={step.action.label} onPress={open} icon={<ArrowRight size={18} color="#fff" />} />
      {helpers.length ? (
        <PressableScale onPress={() => router.push({ pathname: '/(app)/mentor/[id]', params: { id: helpers[0].id } })} style={styles.mentors}>
          <View style={{ flexDirection: 'row' }}>
            {helpers.map((m, i) => (
              <View key={m.id} style={{ marginLeft: i ? -10 : 0, borderRadius: 99, borderWidth: 2, borderColor: c.card }}>
                <Avatar name={`${m.firstName} ${m.lastName}`} color={m.avatarColor} size={32} />
              </View>
            ))}
          </View>
          <Text variant="small" style={{ flex: 1 }} numberOfLines={2}>
            <Text variant="smallStrong">{helpers[0].firstName}</Text> ({helpers[0].origin} → {helpers[0].city}) est passé·e par là.
          </Text>
          <View style={styles.call}>
            <Phone size={13} color={c.mentor} />
            <Text variant="caption" color={c.mentor}>
              Appel gratuit
            </Text>
          </View>
        </PressableScale>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  card: { gap: 12, padding: 18, borderRadius: radius.xxl, backgroundColor: c.surface, ...shadow.md },
  needs: { gap: 6, padding: 12, borderRadius: radius.lg, backgroundColor: c.bg },
  mentors: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line, minHeight: 44 },
  call: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: c.mentorSoft },
}));
