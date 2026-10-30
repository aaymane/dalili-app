import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { CallEnded } from '@/features/call/components/CallEnded';
import { CallPreview } from '@/features/call/components/CallPreview';
import { CallWaiting } from '@/features/call/components/CallWaiting';
import { LiveCall } from '@/features/call/components/LiveCall';
import { loadDaily } from '@/features/call/daily';
import { useCallAccess, useCallPeer } from '@/features/call/hooks';
import { useProfile } from '@/features/profile/store';
import { SafetySheet } from '@/features/safety/components/SafetySheet';
import { currentLanguage, useT } from '@/i18n';
import { formatTime } from '@/lib/date';

/**
 * Appel vidéo d'un rendez-vous confirmé (`id` = la demande d'appel).
 * Le site ouvre la salle 15 minutes avant l'heure, et c'est le mentor qui lance l'appel : l'étudiant arrivé avant
 * attend dans la salle d'attente. Le mentor peut terminer l'appel ; ensuite (ou 45 minutes après l'heure), l'écran
 * « Appel terminé » invite l'étudiant à noter et à redemander. En mode démo et dans Expo Go, l'écran reste un aperçu.
 */
export default function Call() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const access = useCallAccess(id);
  const peer = useCallPeer(id);
  const role = useProfile((s) => s.profile.activeRole);
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
  } else if (a.kind === 'waiting') {
    // C'est le mentor qui ouvre le salon : l'écran réessaie tout seul, et une notification arrive s'il est fermé.
    screen = <CallWaiting name={peer.name} color={peer.color} title={t('call.waitingFor', { name: peer.name })} text={t('call.mentorOpens', { name: peer.name })} />;
  } else if (a.kind === 'early') {
    screen = (
      <CallWaiting
        name={peer.name}
        color={peer.color}
        title={t('call.opensAt', { time: formatTime(a.opensAt) })}
        text={t('call.earlyText')}
      />
    );
  } else if (a.kind === 'ended') {
    screen = <CallEnded bookingId={id} role={role === 'mentor' ? 'mentor' : 'student'} name={peer.name} color={peer.color} mentorId={peer.mentorId} />;
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
