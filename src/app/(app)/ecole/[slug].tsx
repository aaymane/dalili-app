import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Bike, Bus, Check, ChevronLeft, ChevronRight, ExternalLink, Globe, MapPin, TramFront, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SuccessModal } from '@/components/feedback/SuccessModal';
import { toast } from '@/components/feedback/Toast';
import { Button } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { openLink } from '@/features/guides/components/RichText';
import { InterestSheet, PartnerBadge, SchoolCover } from '@/features/schools/components/SchoolParts';
import { useMyInterest, useSchool, useWithdrawInterest } from '@/features/schools/hooks';
import { formatFullDate, formatLong } from '@/lib/date';
import { enter } from '@/theme/motion';
import { palette, radius, shadow } from '@/theme/tokens';

const HERO = 320;

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
      <Animated.View style={[styles.hero, heroStyle]}>
        <SchoolCover school={school} height={HERO}>
          <View style={[styles.heroText, { paddingBottom: 44 }]}>
            <PartnerBadge dark />
            <Text variant="hero" color={palette.white}>
              {school.name}
            </Text>
            {school.tagline ? (
              <Text variant="body" color="rgba(255,255,255,0.8)">
                {school.tagline}
              </Text>
            ) : null}
          </View>
        </SchoolCover>
      </Animated.View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: HERO - 28, paddingBottom: 130 + insets.bottom }}>
        <View style={styles.sheet}>
          {school.facts.length ? (
            <Animated.View entering={enter(i++)} style={styles.facts}>
              {school.facts.map((f) => (
                <View key={f.label} style={styles.fact}>
                  <Text variant="h1" color={palette.electric}>
                    {f.value}
                  </Text>
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
            <Animated.View entering={enter(i++)}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }}>
                {school.photos.map((uri) => (
                  <Image key={uri} source={{ uri }} style={styles.photo} contentFit="cover" transition={250} />
                ))}
              </ScrollView>
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
  heroText: { paddingHorizontal: 20, gap: 8 },
  sheet: { gap: 26, paddingHorizontal: 20, paddingTop: 24, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: palette.bg, minHeight: 600 },
  facts: { flexDirection: 'row', gap: 10 },
  fact: { flex: 1, gap: 4, padding: 14, borderRadius: radius.xl, backgroundColor: palette.white, ...shadow.sm },
  photo: { width: 220, height: 150, borderRadius: radius.lg, backgroundColor: palette.surface },
  group: { borderRadius: radius.xl, backgroundColor: palette.white, overflow: 'hidden', ...shadow.sm },
  program: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14, minHeight: 64 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
  level: { minWidth: 52, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: palette.electricSoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 56 },
  intl: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: radius.xl, backgroundColor: palette.white, ...shadow.sm },
  source: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  bar: { position: 'absolute', left: 0, right: 0, top: 0, justifyContent: 'center', backgroundColor: 'rgba(245,247,253,0.97)', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  back: { position: 'absolute', left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: palette.bg },
  fade: { position: 'absolute', left: 0, right: 0, top: -28, height: 28 },
  sent: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.xl, backgroundColor: palette.white, ...shadow.sm },
  sentIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.mentor },
  withdraw: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
});
