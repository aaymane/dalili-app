import type { DailyCall, DailyParticipant } from '@daily-co/react-native-daily-js';
import { useEffect, useRef, useState } from 'react';

import { haptics } from '@/lib/haptics';

import type { CallInfo } from './api';
import { loadDaily } from './daily';

export type CallPhase = 'joining' | 'joined' | 'left' | 'error';

/**
 * Un appel Daily : on rejoint la salle dès que `info` arrive, on quitte en sortant de l'écran.
 * `available` est faux dans Expo Go et sur le web (pas de code natif) : l'écran garde alors son aperçu.
 */
export function useDailyCall(info: CallInfo | null) {
  const Daily = loadDaily();
  const call = useRef<DailyCall | null>(null);
  const [phase, setPhase] = useState<CallPhase>('joining');
  const [local, setLocal] = useState<DailyParticipant | null>(null);
  const [remote, setRemote] = useState<DailyParticipant | null>(null);
  const [joinedAt, setJoinedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!Daily || !info) return;
    const c = Daily.default.createCallObject();
    call.current = c;
    const refresh = () => {
      const all = c.participants();
      setLocal(all.local ?? null);
      setRemote(Object.values(all).find((p) => !p.local) ?? null);
    };
    c.on('joined-meeting', () => {
      setPhase('joined');
      setJoinedAt(Date.now());
      refresh();
    })
      .on('participant-joined', () => {
        haptics.success();
        refresh();
      })
      .on('participant-updated', refresh)
      .on('participant-left', refresh)
      .on('left-meeting', () => setPhase('left'))
      .on('error', () => setPhase('error'));
    c.join({ url: info.url, token: info.token }).catch(() => setPhase('error'));
    return () => {
      call.current = null;
      void c
        .leave()
        .catch(() => {})
        .finally(() => void c.destroy());
    };
  }, [Daily, info]);

  const micOn = !!local && local.tracks.audio.state !== 'off' && local.tracks.audio.state !== 'blocked';
  const camOn = !!local && local.tracks.video.state !== 'off' && local.tracks.video.state !== 'blocked';

  return {
    available: !!Daily,
    phase,
    local,
    remote,
    joinedAt,
    micOn,
    camOn,
    toggleMic: () => call.current?.setLocalAudio(!micOn),
    toggleCam: () => call.current?.setLocalVideo(!camOn),
    flipCamera: () => void call.current?.cycleCamera(),
    leave: () => void call.current?.leave(),
  };
}

/** La vidéo d'un participant, si elle est prête (sinon on montre son avatar). */
export const videoTrack = (p: DailyParticipant | null) => (p?.tracks.video.state === 'playable' ? (p.tracks.video.persistentTrack ?? null) : null);
/** Le son de l'autre ; jamais le tien (pas d'écho). */
export const audioTrack = (p: DailyParticipant | null) => (p && !p.local && p.tracks.audio.state === 'playable' ? (p.tracks.audio.persistentTrack ?? null) : null);
