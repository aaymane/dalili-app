import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { CallPreview } from '@/features/call/components/CallPreview';
import { CallWaiting } from '@/features/call/components/CallWaiting';
import { LiveCall } from '@/features/call/components/LiveCall';
import { loadDaily } from '@/features/call/daily';
import { useCallAccess, useCallPeer } from '@/features/call/hooks';
import { SafetySheet } from '@/features/safety/components/SafetySheet';
import { currentLanguage, useT } from '@/i18n';
import { formatTime } from '@/lib/date';

/**
 * Appel vidéo d'un rendez-vous confirmé (`id` = la demande d'appel).
 * Le site ouvre la salle 15 minutes avant l'heure ; en mode démo et dans Expo Go, l'écran reste un aperçu.
 */
export default function Call() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const access = useCallAccess(id);
  const peer = useCallPeer(id);
  const [reporting, setReporting] = useState(false);
  const a = access.data;
  const retry = () => void access.refetch();

  let screen;
  if (!a) {
    screen = <CallWaiting name={peer.name} color={peer.color} title={t('call.connecting')} text={t('call.preparing')} />;
  } else if (a.kind === 'ready' && loadDaily()) {
    screen = <LiveCall bookingId={id} info={a} color={peer.color} onRetry={retry} />;
  } else if (a.kind === 'ready' || a.kind === 'demo') {
    screen = (
      <CallPreview
        name={a.kind === 'ready' ? a.otherName : peer.name}
        color={peer.color}
        topic={a.kind === 'ready' ? a.topic : peer.topic}
        note={a.kind === 'demo' ? t('call.demoNote') : t('call.expoGoNote')}
        onFlag={() => setReporting(true)}
      />
    );
  } else if (a.kind === 'early') {
    screen = (
      <CallWaiting
        name={peer.name}
        color={peer.color}
        title={t('call.opensAt', { time: formatTime(a.opensAt) })}
        text={t('call.earlyText')}
      />
    );
  } else if (a.kind === 'offline') {
    screen = <CallWaiting name={peer.name} color={peer.color} title={t('call.offlineTitle')} text={t('call.offlineText')} onRetry={retry} />;
  } else {
    // Le site explique le refus en français : dans une autre langue, une phrase générale.
    const text = a.message && currentLanguage() === 'fr' ? a.message : t('call.unavailableText');
    screen = <CallWaiting name={peer.name} color={peer.color} title={t('call.unavailableTitle')} text={text} />;
  }

  return (
    <View style={{ flex: 1 }}>
      {screen}
      <SafetySheet visible={reporting} onClose={() => setReporting(false)} target={{ bookingId: id }} name={peer.name} onBlocked={() => router.back()} />
    </View>
  );
}
