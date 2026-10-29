import { router } from 'expo-router';
import { Clock, WifiOff, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n';
import { rise } from '@/theme/motion';
import { useTheme } from '@/theme/scheme';

import { CallAvatar, CallBackdrop, CallTop } from './CallParts';

/** Pas (encore) d'appel : trop tôt, terminé, plus confirmé, ou pas de connexion. On dit pourquoi, simplement. */
export function CallWaiting({
  name,
  color,
  title,
  text,
  icon = Clock,
  onRetry,
}: {
  name: string;
  color?: string;
  title: string;
  text: string;
  icon?: LucideIcon;
  onRetry?: () => void;
}) {
  const { c } = useTheme();
  const t = useT();
  const Icon = onRetry ? WifiOff : icon;
  return (
    <View style={styles.root}>
      <CallBackdrop />
      <CallTop name={name} color={color} status={t('call.notYet')} />
      <View style={styles.center}>
        <CallAvatar name={name} color={color} waiting={false} />
        <Animated.View entering={rise(80)} style={styles.card}>
          <Icon size={20} color="#7FA6FF" />
          <Text variant="h2" color={c.white} align="center">
            {title}
          </Text>
          <Text variant="small" color="rgba(255,255,255,0.7)" align="center">
            {text}
          </Text>
        </Animated.View>
        <View style={{ gap: 10, width: 240, marginTop: 8 }}>
          {onRetry ? <Button label={t('common.retry')} variant="white" onPress={onRetry} /> : null}
          <Button label={t('common.back')} variant="glass" onPress={() => router.back()} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0F2A' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 24 },
  card: { alignItems: 'center', gap: 6, maxWidth: 320 },
});
