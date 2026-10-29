import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Bike, Bus, Check, ChevronLeft, ChevronRight, ExternalLink, Globe, MapPin, Play, TramFront, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SuccessModal } from '@/components/feedback/SuccessModal';
import { toast } from '@/components/feedback/Toast';
import { Button } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { openLink } from '@/features/guides/components/RichText';
import { CountUp } from '@/features/schools/components/Motion';
import { InterestSheet, PartnerBadge, SchoolCover } from '@/features/schools/components/SchoolParts';
import { useMyInterest, useSchool, useWithdrawInterest } from '@/features/schools/hooks';
import { useStoryCta } from '@/features/schools/story';
import { formatFullDate, formatLong } from '@/lib/date';
import { enter } from '@/theme/motion';
import { palette, radius, shadow } from '@/theme/tokens';
import { track } from '@/lib/analytics';

const HERO = 340;
const PHOTO_W = 260;

/** « Découvrir en 30 s » : une onde douce l'appelle sans clignoter. */
function DiscoverButton({ onPress }: { onPress: () => void }) {
  const reduced = useReducedMotion();
  const wave = useSharedValue(0);
  useEffect(() => {
    if (!reduced) wave.set(withRepeat(withTiming(1, { duration: 1800 }), -1));
  }, [wave, reduced]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.6 * (1 - wave.value), transform: [{ scale: 1 + wave.value * 0.55 }] }));
  return (
    <PressableScale onPress={onPress} haptic="press" style={styles.discover} accessibilityLabel="Découvrir l’école en 30 secondes">
      <View style={styles.play}>
        <Animated.View style={[styles.playRing, ring]} />
        <Play size={14} color={palette.navy} fill={palette.navy} />
      </View>
      <Text variant="smallStrong" color={palette.white}>
        Découvrir en 30 s
      </Text>
    </PressableScale>
  );
}

const transportIcon = (line: string): LucideIcon => (/tram/i.test(line) ? TramFront : /v[ée]lo/i.test(line) ? Bike : Bus);

/** La fiche d'une école partenaire : ce qu'elle propose, où elle est, et « Je suis intéressé·e ». */
export default function SchoolScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const { data: school } = useSchool(slug);
  const { data: interest } = useMyInterest(school?.id);
  const withdraw = useWithdrawInterest();
  const [sheet, setSheet] = useState<{ program: string | null } | null>(null);
  const [sent, setSent] = useState(false);
  // Le bouton final de la présentation ouvre « Je suis intéressé·e » ici, une fois la présentation refermée.
  const ctaSlug = useStoryCta((s) => s.slug);
  const clearCta = useStoryCta((s) => s.clear);
  useEffect(() => {
    if (!ctaSlug || ctaSlug !== slug) return;
    clearCta();
    const t = setTimeout(() => setSheet({ program: null }), 350);
    return () => clearTimeout(t);
  }, [ctaSlug, slug, clearCta]);

  // Parallaxe : la couverture glisse moins vite que la page et grandit quand on tire vers le bas ;
  // l'en-tête compact apparaît quand le titre de la couverture sort de l'écran.
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.set(e.contentOffset.y);
  });
  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(y.value, [-HERO, 0, HERO], [-HERO / 2, 0, -HERO * 0.45], Extrapolation.CLAMP) },
      { scale: interpolate(y.value, [-HERO, 0], [1.6, 1], Extrapolation.CLAMP) },
    ],
  }));
  const barStyle = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [HERO - 140, HERO - 80], [0, 1], Extrapolation.CLAMP) }));
  // Barre d'état claire sur la photo, sombre une fois l'en-tête clair affiché.
  const [overPhoto, setOverPhoto] = useState(true);
  useAnimatedReaction(
    () => y.value < HERO - 110,
    (now, before) => {
      if (now !== before) scheduleOnRN(setOverPhoto, now);
    },
  );

  const schoolSlug = school?.slug;
  useEffect(() => {
    if (schoolSlug) track('school_viewed', { school: schoolSlug });
  }, [schoolSlug]);

  if (!school) return <View style={{ flex: 1, backgroundColor: palette.bg }} />;

  const openMaps = () => {
    if (!school.address) return;
    const q = encodeURIComponent(school.address);
    Linking.openURL(Platform.OS === 'ios' ? `https://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`).catch(() => {});
  };

  const askWithdraw = () => {
    if (!interest) return;
    Alert.alert('Retirer ta demande ?', 'L’équipe DALILI ne te recontactera pas pour cette école.', [
      { text: 'Garder', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: () => withdraw.mutate(interest, { onError: () => toast('Pas retirée. Vérifie ta connexion et réessaie.', 'info') }) },
    ]);
  };

  let i = 0;
  return (
    <View style={styles.root}>
      <StatusBar style={overPhoto ? 'light' : 'dark'} animated />
      <Animated.View style={[styles.hero, heroStyle]}>
        <SchoolCover school={school} height={HERO} cinematic />
      </Animated.View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 + insets.bottom }}>
        {/* Le titre et « Découvrir » défilent avec la page (et restent touchables) ; la photo glisse plus lentement derrière. */}
        <View style={[styles.heroText, { height: HERO - 28, paddingBottom: 44 }]} pointerEvents="box-none">
          <PartnerBadge dark />
          <Text variant="hero" color={palette.white} style={styles.heroTitle}>
            {school.name}
          </Text>
          {school.tagline ? (
            <Text variant="body" color="rgba(255,255,255,0.88)" style={styles.heroTitle}>
              {school.tagline}
            </Text>
          ) : null}
          <DiscoverButton onPress={() => router.push({ pathname: '/(app)/ecole/decouvrir', params: { slug: school.slug } })} />
        </View>
        <View style={styles.sheet}>
          {school.facts.length ? (
            <Animated.View entering={enter(i++)} style={styles.facts}>
              {school.facts.map((f, k) => (
                <View key={f.label} style={styles.fact}>
                  <CountUp value={f.value} color={palette.electric} delay={250 + k * 120} />
                  <Text variant="caption" color={palette.subtle} numberOfLines={4}>
                    {f.label}
                  </Text>
                </View>
              ))}
            </Animated.View>
          ) : null}

          {school.description ? (
            <Animated.View entering={enter(i++)} style={{ gap: 8 }}>
              <Text variant="overline" color={palette.muted}>
                En bref
              </Text>
              <Text variant="body" color={palette.navy}>
                {school.description}
              </Text>
              <Text variant="small" color={palette.subtle}>
                RNCP : le répertoire national des certifications. Un titre RNCP est reconnu par l’État.
              </Text>
            </Animated.View>
          ) : null}

          {school.photos.length ? (
            <Animated.View entering={enter(i++)} style={{ gap: 8 }}>
              <Text variant="overline" color={palette.muted}>
                L’école en photos
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={PHOTO_W + 10}
                style={{ marginHorizontal: -20 }}
                contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }}>
                {school.photos.map((uri) => (
                  <Image key={uri} source={{ uri }} style={styles.photo} contentFit="cover" transition={300} />
                ))}
              </ScrollView>
              {school.photoCredit ? (
                <Text variant="caption" color={palette.muted}>
                  {school.photoCredit}
                </Text>
              ) : null}
            </Animated.View>
          ) : null}

          <Animated.View entering={enter(i++)} style={{ gap: 10 }}>
            <Text variant="overline" color={palette.muted}>
              Les formations à {school.city}
            </Text>
            <View style={styles.group}>
              {school.programs.map((p, k) => (
                <PressableScale
                  key={p.name}
                  scaleTo={0.985}
                  onPress={() => setSheet({ program: p.name })}
                  style={[styles.program, k > 0 && styles.sep]}
                  accessibilityLabel={`${p.name}, ${p.level}, ${p.format}. Je suis intéressé·e`}>
                  <View style={styles.level}>
                    <Text variant="caption" color={palette.electric}>
                      {p.level}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyStrong">{p.name}</Text>
                    <Text variant="caption" color={palette.muted}>
                      {p.format}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={palette.muted} />
                </PressableScale>
              ))}
            </View>
          </Animated.View>

          {school.address ? (
            <Animated.View entering={enter(i++)} style={{ gap: 10 }}>
              <Text variant="overline" color={palette.muted}>
                Le campus
              </Text>
              <View style={styles.group}>
                <PressableScale scaleTo={0.985} onPress={openMaps} style={styles.row} accessibilityLabel={`Adresse : ${school.address}. Ouvrir dans Plans`}>
                  <IconTile icon={MapPin} tone="blue" size={38} radius={12} />
                  <Text variant="small" style={{ flex: 1 }}>
                    {school.address}
                  </Text>
                  <ExternalLink size={16} color={palette.muted} />
                </PressableScale>
                {school.transport.map((t) => (
                  <View key={t} style={[styles.row, styles.sep]}>
                    <IconTile icon={transportIcon(t)} tone="slate" size={38} radius={12} />
                    <Text variant="small" style={{ flex: 1 }}>
                      {t}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          ) : null}

          <Animated.View entering={enter(i++)} style={styles.intl}>
            <IconTile icon={Globe} tone="violet" size={44} radius={14} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="h3">Tu arrives de l’étranger ?</Text>
              <Text variant="small" color={palette.subtle}>
                Campus France, visa, alternance quand on vient du Maghreb : pose ta question dans ta demande, l’équipe DALILI t’aide à y voir clair.
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={enter(i++)} style={{ gap: 6, alignItems: 'center' }}>
            {school.website ? (
              <PressableScale onPress={() => openLink(school.website!)} hitSlop={6} style={styles.source}>
                <Text variant="smallStrong" color={palette.electric}>
                  Voir le site de l’école
                </Text>
                <ExternalLink size={14} color={palette.electric} />
              </PressableScale>
            ) : null}
            {school.checkedOn ? (
              <Text variant="caption" color={palette.muted} align="center">
                Infos tirées du site officiel de l’école, vérifiées le {formatFullDate(school.checkedOn)}.
              </Text>
            ) : null}
          </Animated.View>
        </View>
      </Animated.ScrollView>

      {/* En-tête compact : il apparaît quand la couverture sort de l'écran. */}
      <Animated.View pointerEvents="none" style={[styles.bar, { paddingTop: insets.top, height: insets.top + 56 }, barStyle]}>
        <Text variant="h3" numberOfLines={1} style={{ marginLeft: 64, marginRight: 20 }}>
          {school.name}
        </Text>
      </Animated.View>
      <PressableScale onPress={() => router.back()} style={[styles.back, { top: insets.top + 6 }]} accessibilityLabel="Retour">
        <ChevronLeft size={20} color={palette.navy} />
      </PressableScale>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <LinearGradient colors={['rgba(245,247,253,0)', palette.bg]} style={styles.fade} pointerEvents="none" />
        {interest ? (
          <View style={styles.sent}>
            <View style={styles.sentIcon}>
              <Check size={16} color={palette.white} strokeWidth={3} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">Demande envoyée</Text>
              <Text variant="caption" color={palette.muted}>
                Le {formatLong(interest.createdAt)} · l’équipe te recontacte par email
              </Text>
            </View>
            <PressableScale onPress={askWithdraw} hitSlop={8} style={styles.withdraw} accessibilityLabel="Retirer ma demande">
              <Text variant="smallStrong" color={palette.subtle}>
                Retirer
              </Text>
            </PressableScale>
          </View>
        ) : (
          <Button label="Je suis intéressé·e" onPress={() => setSheet({ program: null })} />
        )}
      </View>

      <InterestSheet school={school} visible={!!sheet} initialProgram={sheet?.program} onClose={() => setSheet(null)} onSent={() => setSent(true)} />
      <SuccessModal
        visible={sent}
        title="Demande envoyée"
        message={`L’équipe DALILI a bien reçu ton intérêt pour ${school.name}. On te recontacte vite par email.`}
        cta="Super"
        onCta={() => setSent(false)}
        onClose={() => setSent(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  hero: { position: 'absolute', left: 0, right: 0, top: 0 },
  heroText: { paddingHorizontal: 20, gap: 8, justifyContent: 'flex-end' },
  heroTitle: { textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 12 },
  sheet: { gap: 26, paddingHorizontal: 20, paddingTop: 24, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: palette.bg, minHeight: 600 },
  facts: { flexDirection: 'row', gap: 10 },
  fact: { flex: 1, gap: 4, padding: 14, borderRadius: radius.xl, backgroundColor: palette.white, ...shadow.sm },
  photo: { width: PHOTO_W, height: 180, borderRadius: radius.xl, backgroundColor: palette.surface },
  discover: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', marginTop: 8, paddingLeft: 6, paddingRight: 16, height: 44, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  play: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.white },
  playRing: { position: 'absolute', width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: palette.white },
  group: { borderRadius: radius.xl, backgroundColor: palette.white, overflow: 'hidden', ...shadow.sm },
  program: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14, minHeight: 64 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
  level: { minWidth: 52, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: palette.electricSoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 56 },
  intl: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: radius.xl, backgroundColor: palette.white, ...shadow.sm },
  source: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  bar: { position: 'absolute', left: 0, right: 0, top: 0, justifyContent: 'center', backgroundColor: palette.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  back: { position: 'absolute', left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: palette.bg },
  fade: { position: 'absolute', left: 0, right: 0, top: -28, height: 28 },
  sent: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.xl, backgroundColor: palette.white, ...shadow.sm },
  sentIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.mentor },
  withdraw: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
});
