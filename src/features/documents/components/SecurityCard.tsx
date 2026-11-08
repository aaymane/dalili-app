import { EyeOff, LockKeyhole, ShieldCheck, Trash2, type LucideIcon } from 'lucide-react-native';
import { Platform, Switch, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/store';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

import { authenticate, canLock, unlockVault, useVaultLockPref, type LockSupport } from '../lock';

/** Ce qui protège le coffre, dit simplement, et l'interrupteur du verrou (Face ID ou code). */
export function SecurityCard({ support }: { support: LockSupport | 'checking' }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const demo = useAuth((s) => !s.user);
  const enabled = useVaultLockPref((s) => s.enabled);
  const setEnabled = useVaultLockPref((s) => s.setEnabled);

  const toggle = async (next: boolean) => {
    // Enlever le verrou demande Face ID : quelqu'un qui a le téléphone en main ne peut pas l'enlever.
    if (!next && !(await authenticate(t('vault.lock.confirmOff'), t('common.cancel')))) return;
    haptics.select();
    setEnabled(next);
    if (next) unlockVault();
  };

  const lines: [LucideIcon, string][] = [
    [ShieldCheck, t('vault.security.private')],
    [EyeOff, t('vault.security.clean')],
    [Trash2, demo ? t('vault.security.demo') : t('vault.security.account')],
  ];

  return (
    <View style={styles.card}>
      <Text variant="h3">{t('vault.security.title')}</Text>
      {canLock(support) ? (
        <View style={styles.lockRow}>
          <LockKeyhole size={20} color={c.electric} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{t('vault.lock.toggle', { method: t(`vault.lock.${support}`) })}</Text>
            <Text variant="caption" color={c.muted}>
              {t('vault.lock.toggleSub')}
            </Text>
          </View>
          <Switch
            accessibilityLabel={t('vault.lock.toggle', { method: t(`vault.lock.${support}`) })}
            value={enabled}
            onValueChange={toggle}
            trackColor={{ true: c.electric, false: c.lineStrong }}
            thumbColor={c.white}
          />
        </View>
      ) : support === 'none' || (support === 'unavailable' && Platform.OS !== 'web') ? (
        <View style={styles.lockRow}>
          <LockKeyhole size={20} color={c.warningInk} />
          <Text variant="small" color={c.warningInk} style={{ flex: 1 }}>
            {support === 'none' ? t('vault.lock.noPasscode') : t('vault.lock.update')}
          </Text>
        </View>
      ) : null}
      {lines.map(([Icon, text]) => (
        <View key={text} style={styles.line}>
          <Icon size={16} color={c.success} />
          <Text variant="small" color={c.muted} style={{ flex: 1 }}>
            {text}
          </Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  card: { gap: 12, padding: 16, borderRadius: radius.xl, backgroundColor: c.card, ...shadow.sm },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
}));
