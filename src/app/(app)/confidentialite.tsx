import * as WebBrowser from 'expo-web-browser';
import { BadgeCheck, ExternalLink, Flag, GraduationCap, Image as ImageIcon, KeyRound, Lock, Map, MessageCircle, Sparkles, Trash2 } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { ChevronRight } from '@/components/ui/DirIcons';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { DeleteAccountSheet } from '@/features/auth/components/DeleteAccountSheet';
import { isDemoMode } from '@/features/auth/store';
import { useT } from '@/i18n';
import { analyticsAvailable, useAnalyticsConsent } from '@/lib/analytics';
import { env } from '@/lib/env';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';
import { rise } from '@/theme/motion';

// Les textes sont dans `privacy.items` et `privacy.never` (i18n).
const KEPT = [
  { icon: Map, key: 'profile' },
  { icon: ImageIcon, key: 'photo' },
  { icon: MessageCircle, key: 'community' },
  { icon: MessageCircle, key: 'mentor' },
  { icon: Sparkles, key: 'ai' },
  { icon: GraduationCap, key: 'schools' },
  { icon: Flag, key: 'reports' },
] as const;

const NEVER = [
  { icon: BadgeCheck, key: 'sold' },
  { icon: Lock, key: 'encrypted' },
  { icon: KeyRound, key: 'delete' },
] as const;

function Item({ icon, title, text }: { icon: ReactNode; title?: string; text: string }) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.item}>
      <View style={styles.icon}>{icon}</View>
      <View style={{ flex: 1, gap: 2 }}>
        {title ? <Text variant="bodyStrong">{title}</Text> : null}
        <Text variant={title ? 'caption' : 'small'} color={title ? c.muted : c.navy}>
          {text}
        </Text>
      </View>
    </View>
  );
}

/** Confidentialité : ce qu'on garde et pourquoi, nos engagements, et la suppression du compte. */
export default function Confidentialite() {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const [deleting, setDeleting] = useState(false);
  const consent = useAnalyticsConsent((s) => s.consent);
  const setConsent = useAnalyticsConsent((s) => s.setConsent);

  return (
    <Screen padded={false} header={<AppHeader back />}>
      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        <Text variant="hero">{t('privacy.title')}</Text>
        <Text variant="body" color={c.subtle}>
          {isDemoMode ? t('privacy.introDemo') : t('privacy.intro')}
        </Text>

        {!isDemoMode && (
          <Animated.View entering={rise()} style={styles.card}>
            <Text variant="overline" color={c.muted}>
              {t('privacy.kept')}
            </Text>
            {KEPT.map(({ icon: Icon, key }) => (
              <Item key={key} icon={<Icon size={16} color={c.electric} />} title={t(`privacy.items.${key}.title`)} text={t(`privacy.items.${key}.text`)} />
            ))}
          </Animated.View>
        )}

        <Animated.View entering={rise(60)} style={styles.card}>
          <Text variant="overline" color={c.muted}>
            {t('privacy.promises')}
          </Text>
          {NEVER.map(({ icon: Icon, key }) => (
            <Item key={key} icon={<Icon size={16} color={c.electric} />} text={t(`privacy.never.${key}`)} />
          ))}
        </Animated.View>

        {analyticsAvailable ? (
          <Animated.View entering={rise(90)} style={[styles.group, styles.stats]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyStrong">{t('privacy.stats')}</Text>
              <Text variant="caption" color={c.muted}>
                {t('privacy.statsText')}
              </Text>
            </View>
            <Switch
              value={consent === 'yes'}
              onValueChange={(v) => setConsent(v ? 'yes' : 'no')}
              trackColor={{ true: c.electric, false: c.lineStrong }}
              thumbColor="#fff"
              accessibilityLabel={t('privacy.statsA11y')}
            />
          </Animated.View>
        ) : null}

        <Animated.View entering={rise(120)} style={styles.group}>
          <PressableScale onPress={() => WebBrowser.openBrowserAsync(`${env.siteUrl}/confidentialite`)} style={styles.row} accessibilityRole="link">
            <ExternalLink size={18} color={c.navy} />
            <Text variant="bodyStrong" style={{ flex: 1 }}>
              {t('privacy.policy')}
            </Text>
            <ChevronRight size={18} color={c.muted} />
          </PressableScale>
          <View style={styles.divider} />
          <PressableScale haptic="press" onPress={() => setDeleting(true)} style={styles.row} accessibilityRole="button">
            <Trash2 size={18} color={c.danger} />
            <Text variant="bodyStrong" color={c.danger} style={{ flex: 1 }}>
              {t('privacy.deleteAccount')}
            </Text>
            <ChevronRight size={18} color={c.muted} />
          </PressableScale>
        </Animated.View>
      </View>
      <DeleteAccountSheet visible={deleting} onClose={() => setDeleting(false)} />
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  card: { padding: 16, gap: 14, borderRadius: radius.xl, backgroundColor: c.surface, ...shadow.sm },
  item: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.electricSoft, alignItems: 'center', justifyContent: 'center' },
  group: { borderRadius: radius.xl, backgroundColor: c.surface, paddingVertical: 4, ...shadow.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 52 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.line, marginStart: 46 },
}));
