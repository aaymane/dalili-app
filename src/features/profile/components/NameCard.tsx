import { UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { toast } from '@/components/feedback/Toast';
import { Button } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { setMyMentorName } from '@/features/mentors/api';
import { haptics } from '@/lib/haptics';
import { rise } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';
import { useT } from '@/i18n';

import { useProfile } from '../store';

/**
 * Prénom manquant (compte créé avant la correction du 24/10) : on le demande ici, une fois.
 * Il part en ligne avec le profil, et sur la fiche mentor si tu en as une.
 */
export function NameCard() {
  const { c } = useTheme();
  const styles = useStyles();
  const update = useProfile((s) => s.update);
  const isMentor = useProfile((s) => s.profile.roles.includes('mentor'));
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [saving, setSaving] = useState(false);
  const t = useT();

  const save = async () => {
    const f = first.trim();
    if (!f) return;
    setSaving(true);
    update({ firstName: f, lastName: last.trim() });
    try {
      if (isMentor) await setMyMentorName(f, last.trim());
      haptics.success();
      toast(t('nameCard.hello', { name: f }));
    } catch {
      toast(t('nameCard.offline'), 'info');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Animated.View entering={rise(40)} style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconTile icon={UserRound} tone="blue" size={44} radius={14} />
        <View style={{ flex: 1 }}>
          <Text variant="h3">{t('nameCard.title')}</Text>
          <Text variant="small" color={c.subtle}>
            {isMentor ? t('nameCard.mentor') : t('nameCard.student')}
          </Text>
        </View>
      </View>
      <Input placeholder={t('auth.register.firstName')} value={first} onChangeText={setFirst} autoComplete="given-name" textContentType="givenName" maxLength={40} />
      <Input placeholder={t('nameCard.lastName')} value={last} onChangeText={setLast} autoComplete="family-name" textContentType="familyName" maxLength={40} />
      <Button label={t('common.save')} size="md" disabled={!first.trim()} loading={saving} onPress={save} />
    </Animated.View>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  card: { gap: 12, padding: 16, borderRadius: radius.xl, backgroundColor: c.surface, ...shadow.sm },
}));
