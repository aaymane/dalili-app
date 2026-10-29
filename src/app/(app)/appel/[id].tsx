import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { CallPreview } from '@/features/call/components/CallPreview';
import { CallWaiting } from '@/features/call/components/CallWaiting';
import { LiveCall } from '@/features/call/components/LiveCall';
import { loadDaily } from '@/features/call/daily';
import { useCallAccess, useCallPeer } from '@/features/call/hooks';
import { SafetySheet } from '@/features/safety/components/SafetySheet';
import { formatTime } from '@/lib/date';

/**
 * Appel vidéo d'un rendez-vous confirmé (`id` = la demande d'appel).
 * Le site ouvre la salle 15 minutes avant l'heure ; en mode démo et dans Expo Go, l'écran reste un aperçu.
 */
export default function Call() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const access = useCallAccess(id);
  const peer = useCallPeer(id);
  const [reporting, setReporting] = useState(false);
  const a = access.data;
  const retry = () => void access.refetch();

  let screen;
  if (!a) {
    screen = <CallWaiting name={peer.name} color={peer.color} title="Connexion…" text="On prépare la salle de l’appel." />;
  } else if (a.kind === 'ready' && loadDaily()) {
    screen = <LiveCall bookingId={id} info={a} color={peer.color} onRetry={retry} />;
  } else if (a.kind === 'ready' || a.kind === 'demo') {
    screen = (
      <CallPreview
        name={a.kind === 'ready' ? a.otherName : peer.name}
        color={peer.color}
        topic={a.kind === 'ready' ? a.topic : peer.topic}
        note={a.kind === 'demo' ? 'Aperçu : en mode démo, l’appel n’est pas réel.' : 'Aperçu : la vidéo marche dans l’app installée, pas dans Expo Go.'}
        onFlag={() => setReporting(true)}
      />
    );
  } else if (a.kind === 'early') {
    screen = (
      <CallWaiting
        name={peer.name}
        color={peer.color}
        title={`L’appel s’ouvre à ${formatTime(a.opensAt)}`}
        text="Tu pourras rejoindre 15 minutes avant l’heure. En attendant, tu peux écrire à ton contact."
      />
    );
  } else if (a.kind === 'offline') {
    screen = <CallWaiting name={peer.name} color={peer.color} title="Pas de connexion" text="Vérifie ton réseau, puis réessaie." onRetry={retry} />;
  } else {
    screen = <CallWaiting name={peer.name} color={peer.color} title="Appel indisponible" text={a.message} />;
  }

  return (
    <View style={{ flex: 1 }}>
      {screen}
      <SafetySheet visible={reporting} onClose={() => setReporting(false)} target={{ bookingId: id }} name={peer.name} onBlocked={() => router.back()} />
    </View>
  );
}
