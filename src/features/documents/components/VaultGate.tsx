import { LockKeyhole } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { NightBackground } from '@/components/layout/NightBackground';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { leave, pop, rise } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';

import { clearViews } from '../files';
import {
  authenticateOutcome,
  canLock,
  isBusy,
  lockSupport,
  lockVault,
  unlockVault,
  useVaultLockPref,
  useVaultSession,
  type LockSupport,
} from '../lock';
import { FaceIdGlyph, type GlyphPhase } from './FaceIdGlyph';

/** Ce que le téléphone permet, lu une fois par visite du coffre (partagé avec la carte « Protégé »). */
export function useLockSupport() {
  const [support, setSupport] = useState<LockSupport | 'checking'>('checking');
  useEffect(() => {
    let alive = true;
    void lockSupport().then((s) => alive && setSupport(s));
    return () => {
      alive = false;
    };
  }, []);
  return support;
}

/**
 * Le coffre derrière Face ID (ou le code du téléphone). Les écrans restent montés dessous (un ajout en cours
 * n'est pas perdu), recouverts tant que ce n'est pas ouvert. Il se referme quand on quitte le coffre ou que l'app
 * passe en arrière-plan (sauf pendant un scan ou une photo), et un voile le cache dans le sélecteur d'apps.
 */
export function VaultGate({ children }: { children: ReactNode }) {
  const t = useT();
  const support = useLockSupport();
  const enabled = useVaultLockPref((s) => s.enabled);
  const unlocked = useVaultSession((s) => s.unlocked);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const active = enabled && canLock(support);
  const locked = support === 'checking' || (active && !unlocked);
  // L'invite s'ouvre seule une fois par arrivée (ou retour d'arrière-plan) ; ensuite, le bouton. Pas en revenant
  // de l'invite elle-même (l'app passe « inactive » pendant Face ID) : un « Annuler » ne la relance pas en boucle.
  const asked = useRef(false);
  const [phase, setPhase] = useState<GlyphPhase>('idle');
  const reduced = useReducedMotion();

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
      if (state === 'background') asked.current = false;
      if (state === 'background' && !isBusy()) {
        lockVault();
        setPhase('idle');
      }
    });
    return () => {
      sub.remove();
      // On quitte le coffre : il se referme, les aperçus ouverts s'effacent.
      lockVault();
      clearViews();
    };
  }, []);

  // Le visage tourne pendant Face ID, la coche se trace, puis le coffre s'ouvre (le temps de la voir).
  const unlock = useCallback(async () => {
    setPhase('scanning');
    const outcome = await authenticateOutcome(t('vault.lock.prompt'), t('common.cancel'));
    if (outcome === 'ok') {
      haptics.success();
      setPhase('success');
      setTimeout(unlockVault, reduced ? 250 : 720);
    } else if (outcome === 'fail') {
      haptics.warning();
      setPhase('failed');
    } else {
      setPhase('idle');
    }
  }, [t, reduced]);

  useEffect(() => {
    if (!active || unlocked || !appActive || asked.current) return;
    asked.current = true;
    void unlock();
  }, [active, unlocked, appActive, unlock]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {locked ? (
        <LockScreen checking={support === 'checking'} faceId={support === 'faceId'} phase={phase} onUnlock={unlock} />
      ) : !appActive ? (
        <Animated.View exiting={leave} style={StyleSheet.absoluteFill}>
          <NightBackground />
        </Animated.View>
      ) : null}
    </View>
  );
}

type LockProps = { checking: boolean; faceId: boolean; phase: GlyphPhase; onUnlock: () => void };

function LockScreen({ checking, faceId, phase, onUnlock }: LockProps) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  return (
    <Animated.View exiting={leave} style={StyleSheet.absoluteFill}>
      <NightBackground />
      {checking ? null : (
        <View style={styles.center}>
          {faceId ? (
            <Animated.View
              entering={pop()}
              accessible
              accessibilityRole="image"
              accessibilityLabel={t(phase === 'success' ? 'vault.lock.recognized' : 'vault.lock.faceIdLabel')}
            >
              <FaceIdGlyph phase={phase} color={c.white} success={c.success} />
            </Animated.View>
          ) : (
            <Animated.View entering={pop()} style={styles.badge}>
              <LockKeyhole size={34} color={c.white} strokeWidth={1.8} />
            </Animated.View>
          )}
          <Animated.View entering={rise(80)} style={{ gap: 8, alignItems: 'center' }}>
            <Text variant="h1" color={c.white} align="center">
              {t('vault.lock.title')}
            </Text>
            <Text variant="body" color="rgba(255,255,255,0.72)" align="center" accessibilityLiveRegion="polite">
              {t(phase === 'failed' ? 'vault.lock.retry' : phase === 'success' ? 'vault.lock.recognized' : 'vault.lock.body')}
            </Text>
          </Animated.View>
          <Animated.View entering={rise(160)} style={{ alignSelf: 'stretch' }}>
            <Button
              label={t('vault.lock.unlock')}
              variant="white"
              size="lg"
              full
              disabled={phase === 'scanning' || phase === 'success'}
              onPress={onUnlock}
            />
          </Animated.View>
        </View>
      )}
    </Animated.View>
  );
}

const useStyles = makeStyles(() => ({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22, paddingHorizontal: 32 },
  badge: {
    width: 76,
    height: 76,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
}));
