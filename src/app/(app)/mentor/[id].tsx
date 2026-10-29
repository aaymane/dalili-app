import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Clock, Flag, Phone, Quote, Star } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useMentor } from '@/data/hooks';
import { useMyMentor } from '@/features/mentors/hooks';
import { SafetySheet } from '@/features/safety/components/SafetySheet';
import { palette, radius, shadow } from '@/theme/tokens';
import { pop, rise } from '@/theme/motion';

const LANG: Record<string, { code: string; label: string }> = {
  ar: { code: 'AR', label: 'Arabe' },
  fr: { code: 'FR', label: 'Français' },
  en: { code: 'EN', label: 'English' },
  ber: { code: 'ⵣ', label: 'Amazigh' },
};

/** Profil public d'un mentor : parcours, spécialités, langues, témoignages. */
export default function MentorProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: listed } = useMentor(id);
  // Ta propre fiche n'est pas dans la liste des mentors : tu la vois quand même, en aperçu.
  const { data: mine } = useMyMentor();
  const [reporting, setReporting] = useState(false);
  const own = !!mine && mine.id === id;
  const m = listed ?? (own ? mine : undefined);
  if (!m) return <View style={{ flex: 1, backgroundColor: palette.bg }} />;

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <LinearGradient colors={['#5B8BFF', '#1F56F5']} style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <PressableScale onPress={() => router.back()} style={[styles.back, { top: insets.top + 10 }]} accessibilityLabel="Retour">
            <ChevronLeft size={20} color="#fff" />
          </PressableScale>
          <Animated.View entering={pop()}>
            <Avatar name={`${m.firstName} ${m.lastName}`} color={m.avatarColor} size={104} ring="rgba(255,255,255,0.9)" />
          </Animated.View>
          <Animated.View entering={rise(100)} style={{ alignItems: 'center', gap: 4 }}>
            <View style={styles.certified}>
              <Text variant="caption" color="#fff" style={{ letterSpacing: 0.8, fontSize: 9 }}>
                MENTOR CERTIFIÉ DALILI
              </Text>
            </View>
            <Text variant="hero" color="#fff">
              {m.firstName} {m.lastName}
            </Text>
            <Text variant="small" color="rgba(255,255,255,0.8)">
              {m.headline}
            </Text>
            <Text variant="small" color="rgba(255,255,255,0.65)">
              {m.city}
            </Text>
          </Animated.View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20, gap: 22, marginTop: -30 }}>
          <Animated.View entering={rise(120)} style={styles.stats}>
            {[
              { v: m.rating.toFixed(1), l: 'NOTE', icon: <Star size={14} color="#F59E0B" fill="#F59E0B" /> },
              { v: String(m.sessions), l: 'SESSIONS', icon: <Phone size={14} color={palette.mentor} /> },
              { v: `${m.responseHours}h`, l: 'RÉPONSE', icon: <Clock size={14} color={palette.electric} /> },
            ].map((s, i) => (
              <View key={s.l} style={[styles.stat, i < 2 && styles.statBorder]}>
                <Text variant="h1">{s.v}</Text>
                <Text variant="caption" color={palette.muted} style={{ fontSize: 9, letterSpacing: 0.6 }}>
                  {s.l}
                </Text>
                {s.icon}
              </View>
            ))}
          </Animated.View>

          <Animated.View entering={rise(160)} style={styles.quote}>
            <Quote size={26} color={palette.electric} fill={palette.electric} />
            <Text variant="body" style={{ fontStyle: 'italic' }}>
              {m.quote}
            </Text>
          </Animated.View>

          <Animated.View entering={rise(200)} style={{ gap: 14 }}>
            <Text variant="overline" color={palette.muted}>
              Son parcours
            </Text>
            {m.journey.map((s, i) => (
              <View key={s.year} style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ alignItems: 'center' }}>
                  <View style={styles.tlDot}>
                    <View style={styles.tlInner} />
                  </View>
                  {i < m.journey.length - 1 && <View style={styles.tlLine} />}
                </View>
                <View style={{ flex: 1, paddingBottom: 6 }}>
                  <Text variant="smallStrong" color={palette.electric}>
                    {s.year}
                  </Text>
                  <Text variant="bodyStrong">{s.title}</Text>
                  <Text variant="small" color={palette.muted}>
                    {s.detail}
                  </Text>
                </View>
              </View>
            ))}
          </Animated.View>

          <View style={{ gap: 10 }}>
            <Text variant="overline" color={palette.muted}>
              Spécialités
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {m.specialties.map((s) => (
                <View key={s} style={styles.spec}>
                  <Text variant="smallStrong" color={palette.electric}>
                    {s}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <Text variant="overline" color={palette.muted}>
              Langues parlées
            </Text>
            <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
              {m.languages.map((l) => (
                <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={styles.lang}>
                    <Text variant="caption" color="#fff" style={{ fontSize: 8.5 }}>
                      {LANG[l].code}
                    </Text>
                  </View>
                  <Text variant="small">{LANG[l].label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <Text variant="overline" color={palette.muted}>
              Témoignages récents
            </Text>
            {m.reviews.map((r) => (
              <View key={r.author} style={styles.review}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Avatar name={r.author} size={32} color="#94A3B8" />
                  <Text variant="smallStrong" style={{ flex: 1 }}>
                    {r.author}
                  </Text>
                  <View style={{ flexDirection: 'row' }}>
                    {Array.from({ length: r.rating }, (_, i) => (
                      <Star key={i} size={11} color="#F59E0B" fill="#F59E0B" />
                    ))}
                  </View>
                </View>
                <Text variant="small" color={palette.subtle}>
                  {r.text}
                </Text>
              </View>
            ))}
          </View>

          {own ? null : (
            <PressableScale onPress={() => setReporting(true)} hitSlop={6} style={styles.report} accessibilityLabel={`Signaler ou bloquer ${m.firstName}`}>
              <Flag size={14} color={palette.muted} />
              <Text variant="small" color={palette.muted}>
                Un souci avec {m.firstName} ? Signaler ou bloquer
              </Text>
            </PressableScale>
          )}
        </View>
      </ScrollView>
      <SafetySheet visible={reporting} onClose={() => setReporting(false)} target={{ mentorId: m.id }} name={m.firstName} onBlocked={() => router.back()} />
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {own ? (
          <Text variant="small" color={palette.subtle} align="center">
            C’est ton profil, tel que les étudiants le voient.
          </Text>
        ) : (
          <Button label="Réserver · gratuit" onPress={() => router.push({ pathname: '/(app)/mentor/reserver', params: { id: m.id } })} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: 10, paddingBottom: 54, borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  back: { position: 'absolute', left: 16, top: 54, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  certified: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)' },
  stats: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: radius.xl, paddingVertical: 14, borderWidth: 2, borderColor: '#D6E0FF', ...shadow.md },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statBorder: { borderRightWidth: 1, borderRightColor: palette.line },
  quote: { padding: 18, borderRadius: radius.xl, backgroundColor: '#EEF3FF', gap: 8 },
  tlDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: palette.electric, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  tlInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.electric },
  tlLine: { width: 2, flex: 1, backgroundColor: '#D6E0FF', marginVertical: 2 },
  spec: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: palette.electricSoft },
  lang: { width: 22, height: 22, borderRadius: 11, backgroundColor: palette.electric, alignItems: 'center', justifyContent: 'center' },
  review: { padding: 14, borderRadius: radius.lg, backgroundColor: '#fff', gap: 8, ...shadow.sm },
  report: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, alignSelf: 'center', paddingHorizontal: 12 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: 'rgba(245,247,253,0.96)' },
});
