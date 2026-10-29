import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { BadgeCheck, ChevronRight, GraduationCap } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { toast } from '@/components/feedback/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { Chip } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import { palette, radius, shadow } from '@/theme/tokens';
import { track } from '@/lib/analytics';

import type { School } from '../api';
import { KenBurns } from './Motion';
import { useSendInterest } from '../hooks';

/** Initiales de l'école (« DC »), sur la couverture tant qu'il n'y a pas son logo. */
const monogram = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-ZÀ-Ý]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('');

/**
 * Couverture : la photo de l'école (servie par dalili.study), sinon un dégradé nuit DALILI avec ses initiales.
 * `cinematic` : lent zoom à l'ouverture de la fiche. Le voile du bas garde le titre lisible sur n'importe quelle photo.
 */
export function SchoolCover({
  school,
  height,
  compact,
  cinematic,
  children,
}: {
  school: School;
  height: number;
  compact?: boolean;
  cinematic?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <View style={[styles.cover, { height }]}>
      {school.coverUrl && cinematic ? (
        <KenBurns uri={school.coverUrl} duration={9000} />
      ) : school.coverUrl ? (
        <Image source={{ uri: school.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} accessibilityIgnoresInvertColors />
      ) : (
        <LinearGradient colors={['#1B2470', '#014DF8', '#0B1233']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}>
          <View
            style={[
              styles.halo,
              {
                width: height * 1.3,
                height: height * 1.3,
                right: -height * 0.45,
                top: -height * 0.55,
              },
            ]}
          />
          <View
            style={[
              styles.halo,
              {
                width: height * 0.8,
                height: height * 0.8,
                left: -height * 0.3,
                bottom: -height * 0.45,
                opacity: 0.07,
              },
            ]}
          />
          {compact ? null : (
            <View style={[styles.monogram, { top: height * 0.22 }]}>
              {school.logoUrl ? (
                <Image source={{ uri: school.logoUrl }} style={{ width: 44, height: 44 }} contentFit="contain" />
              ) : (
                <Text variant="h1" color={palette.white}>
                  {monogram(school.name)}
                </Text>
              )}
            </View>
          )}
        </LinearGradient>
      )}
      {/* Voile : en mode cinéma, sur toute la hauteur (heure en haut, titre en bas lisibles sur n'importe quelle photo). */}
      <LinearGradient
        colors={cinematic ? ['rgba(11,18,51,0.6)', 'rgba(11,18,51,0.4)', 'rgba(11,18,51,0.94)'] : ['transparent', 'rgba(11,18,51,0.85)']}
        locations={cinematic ? [0, 0.4, 1] : undefined}
        style={cinematic ? StyleSheet.absoluteFill : styles.veil}
      />
      {children}
    </View>
  );
}

/** Le badge de confiance, partout où l'école apparaît. */
export function PartnerBadge({ dark }: { dark?: boolean }) {
  return (
    <View style={[styles.badge, dark && styles.badgeDark]}>
      <BadgeCheck size={13} color={dark ? palette.white : palette.electric} />
      <Text variant="caption" color={dark ? palette.white : palette.electric} style={{ letterSpacing: 0.4 }}>
        École partenaire DALILI
      </Text>
    </View>
  );
}

/** Dans Explorer : la carte d'une école partenaire. */
export function SchoolCard({ school }: { school: School }) {
  const levels = [...new Set(school.programs.map((p) => p.level))].sort();
  const alternance = school.programs.some((p) => /alternance/i.test(p.format));
  return (
    <PressableScale
      scaleTo={0.98}
      onPress={() =>
        router.push({
          pathname: '/(app)/ecole/[slug]',
          params: { slug: school.slug },
        })
      }
      style={styles.card}
      accessibilityLabel={`${school.name}, ${school.city}. École partenaire. Ouvrir la fiche`}
    >
      <SchoolCover school={school} height={168} compact>
        <View style={styles.cardTop}>
          <PartnerBadge dark />
        </View>
        <View style={styles.cardTitle}>
          <Text variant="h2" color={palette.white}>
            {school.name}
          </Text>
          {school.tagline ? (
            <Text variant="small" color="rgba(255,255,255,0.75)" numberOfLines={1}>
              {school.tagline}
            </Text>
          ) : null}
        </View>
      </SchoolCover>
      <View style={styles.cardInfo}>
        <GraduationCap size={16} color={palette.electric} />
        <Text variant="smallStrong" style={{ flex: 1 }} numberOfLines={1}>
          {school.programs.length} formations · {levels.length > 1 ? `${levels[0]} à ${levels[levels.length - 1]}` : levels[0]}
          {alternance ? ' · Alternance' : ''}
        </Text>
        <ChevronRight size={18} color={palette.muted} />
      </View>
    </PressableScale>
  );
}

/**
 * « Je suis intéressé·e » : la formation qui t'attire (facultatif), une question, et ce que devient ta demande.
 * Elle reste chez DALILI : l'équipe te recontacte, rien n'est envoyé à l'école.
 */
export function InterestSheet({
  school,
  visible,
  initialProgram,
  onClose,
  onSent,
}: {
  school: School;
  visible: boolean;
  initialProgram?: string | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const send = useSendInterest();
  const [program, setProgram] = useState<string | null>(initialProgram ?? null);
  const [message, setMessage] = useState('');
  // La formation touchée sur la fiche arrive présélectionnée à chaque ouverture.
  const [openedWith, setOpenedWith] = useState<string | null | undefined>(undefined);
  if (visible && openedWith !== initialProgram) {
    setOpenedWith(initialProgram);
    setProgram(initialProgram ?? null);
  }

  const submit = () =>
    send.mutate(
      { schoolId: school.id, program, message },
      {
        onSuccess: () => {
          track('school_interest_sent', { school: school.slug, with_program: !!program });
          onClose();
          onSent();
        },
        onError: () => toast('Pas envoyé. Vérifie ta connexion et réessaie.', 'info'),
      },
    );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      scroll
      onClosed={() => {
        setMessage('');
        setOpenedWith(undefined);
      }}
    >
      <View style={{ gap: 16 }}>
        <View style={{ gap: 4 }}>
          <Text variant="h2">{school.name} t’intéresse ?</Text>
          <Text variant="small" color={palette.subtle}>
            Dis-nous ce qui t’attire. L’équipe DALILI te recontacte par email pour t’aider à y voir clair.
          </Text>
        </View>
        <View style={{ gap: 8 }}>
          <Text variant="overline" color={palette.muted}>
            La formation qui t’attire
          </Text>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {[...school.programs.map((p) => p.name), 'Je ne sais pas encore'].map((name) => {
              const value = name === 'Je ne sais pas encore' ? null : name;
              const active = program === value;
              return (
                <PressableScale key={name} haptic="select" onPress={() => setProgram(value)} hitSlop={4} accessibilityRole="radio" accessibilityState={{ selected: active }}>
                  <Chip label={name} active={active} />
                </PressableScale>
              );
            })}
          </View>
        </View>
        <Input multiline placeholder="Ta question (facultatif) : admission, alternance, logement…" value={message} onChangeText={setMessage} maxLength={500} />
        <View style={styles.privacy}>
          <BadgeCheck size={16} color={palette.mentor} />
          <Text variant="caption" color={palette.subtle} style={{ flex: 1 }}>
            Ta demande reste chez DALILI. Rien n’est transmis à l’école sans ton accord, et tu peux la retirer quand tu veux.
          </Text>
        </View>
        <Button label="Envoyer ma demande" onPress={submit} loading={send.isPending} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  cover: {
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: palette.navyDeep,
  },
  halo: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#fff',
    opacity: 0.1,
  },
  monogram: {
    position: 'absolute',
    alignSelf: 'center',
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  veil: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '65%' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: palette.electricSoft,
  },
  badgeDark: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  card: {
    borderRadius: radius.xxl,
    backgroundColor: palette.white,
    overflow: 'hidden',
    ...shadow.md,
  },
  cardTop: { position: 'absolute', top: 14, left: 14 },
  cardTitle: { padding: 16, gap: 2 },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: palette.mentorSoft,
  },
});
