import { router, useLocalSearchParams } from 'expo-router';
import { Flag, ShieldCheck, Star } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ListGroup } from '@/components/ui/ListGroup';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useMentor } from '@/data/hooks';
import { MentorRoute } from '@/features/mentors/components/MentorRoute';
import { useMyMentor } from '@/features/mentors/hooks';
import { specialtyLabel } from '@/features/mentors/specialties';
import { useConversationWithMentor } from '@/features/messages/hooks';
import { SafetySheet } from '@/features/safety/components/SafetySheet';
import { useT } from '@/i18n';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';
import { rise } from '@/theme/motion';

/** Profil public d'un mentor : qui, son trajet, ce qu'il a vécu, pour quoi il peut t'aider, ce qu'en disent les étudiants. */
export default function MentorProfile() {
  const { c, gradients } = useTheme();
  const t = useT();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: listed } = useMentor(id);
  // Ta propre fiche n'est pas dans la liste des mentors : tu la vois quand même, en aperçu.
  const { data: mine } = useMyMentor();
  const [reporting, setReporting] = useState(false);
  // Il a déjà accepté un de tes appels : vous pouvez vous écrire.
  const conversation = useConversationWithMentor(id);
  const own = !!mine && mine.id === id;
  const m = listed ?? (own ? mine : undefined);
  if (!m) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  const book = (topic?: string) => router.push({ pathname: '/(app)/mentor/reserver', params: topic ? { id: m.id, topic } : { id: m.id } });
  const facts = [
    { value: m.rating.toFixed(1), label: t('mentors.profile.rating'), star: true },
    { value: String(m.sessions), label: t('mentors.profile.sessions') },
    { value: t('mentors.profile.hours', { n: m.responseHours }), label: t('mentors.profile.response') },
  ];

  return (
    <Screen
      top={gradients.roleTop.student}
      padded={false}
      header={<AppHeader back />}
      footer={
        own ? (
          <Text variant="small" color={c.subtle} align="center">
            {t('mentors.profile.own')}
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {conversation ? (
              <Button
                label={t('mentors.profile.write')}
                variant="secondary"
                full={false}
                style={{ flex: 1 }}
                onPress={() => router.push({ pathname: '/(app)/messages/[id]', params: { id: conversation.id } })}
              />
            ) : null}
            <Button label={t('mentors.profile.book')} full={false} style={{ flex: conversation ? 1.4 : 1 }} onPress={() => book()} />
          </View>
        )
      }>
      <View style={{ paddingHorizontal: 20, gap: 28 }}>
        <Animated.View entering={rise()} style={styles.hero}>
          <Avatar name={`${m.firstName} ${m.lastName}`} color={m.avatarColor} size={84} online={m.availableThisWeek} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text variant="h1">
              {m.firstName} {m.lastName}
            </Text>
            {m.headline ? (
              <Text variant="small" color={c.subtle}>
                {m.headline}
              </Text>
            ) : null}
            <View style={styles.verified}>
              <ShieldCheck size={14} color={c.mentorInk} />
              <Text variant="caption" color={c.mentorInk}>
                {t('mentors.profile.verified')}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* La carte d'identité : son trajet, puis trois chiffres. */}
        <Animated.View entering={rise(80)} style={styles.card}>
          {m.origin ? (
            <>
              <MentorRoute from={m.origin} to={m.city} />
              <View style={styles.separator} />
            </>
          ) : null}
          <View style={{ flexDirection: 'row' }}>
            {facts.map((f, i) => (
              <View key={f.label} style={[styles.fact, i > 0 && styles.factBorder]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {f.star ? <Star size={14} color={c.warning} fill={c.warning} /> : null}
                  <Text variant="h2">{f.value}</Text>
                </View>
                <Text variant="caption" color={c.muted} align="center">
                  {f.label}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {m.quote ? (
          <Animated.View entering={rise(140)} style={styles.quote}>
            <Text variant="body" style={styles.quoteText}>
              {m.quote}
            </Text>
          </Animated.View>
        ) : null}

        {m.specialties.length ? (
          <View style={{ gap: 12 }}>
            <Text variant="h3">{t('mentors.profile.specialties')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {m.specialties.map((s) =>
                own ? (
                  <View key={s} style={styles.spec}>
                    <Text variant="smallStrong" color={c.electric}>
                      {specialtyLabel(s)}
                    </Text>
                  </View>
                ) : (
                  // Un sujet touché ouvre la demande d'appel avec ce sujet déjà rempli.
                  <PressableScale key={s} haptic="select" onPress={() => book(specialtyLabel(s))} style={styles.spec} accessibilityRole="button" accessibilityLabel={t('mentors.profile.topicA11y', { topic: specialtyLabel(s) })}>
                    <Text variant="smallStrong" color={c.electric}>
                      {specialtyLabel(s)}
                    </Text>
                  </PressableScale>
                ),
              )}
            </View>
          </View>
        ) : null}

        {m.journey.length ? (
          <View style={{ gap: 14 }}>
            <Text variant="h3">{t('mentors.profile.journey')}</Text>
            <View>
              {m.journey.map((s, i) => (
                <View key={s.year} style={{ flexDirection: 'row', gap: 14 }}>
                  <View style={{ alignItems: 'center', width: 12 }}>
                    <View style={[styles.dot, i === m.journey.length - 1 && { backgroundColor: c.electric }]} />
                    {i < m.journey.length - 1 ? <View style={styles.rail} /> : null}
                  </View>
                  <View style={{ flex: 1, gap: 1, paddingBottom: i < m.journey.length - 1 ? 18 : 0 }}>
                    <Text variant="caption" color={c.muted}>
                      {s.year}
                    </Text>
                    <Text variant="bodyStrong">{s.title}</Text>
                    {s.detail ? (
                      <Text variant="small" color={c.subtle}>
                        {s.detail}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {m.languages.length ? (
          <View style={{ gap: 6 }}>
            <Text variant="h3">{t('mentors.profile.languages')}</Text>
            <Text variant="body" color={c.subtle}>
              {m.languages.map((l) => t(`mentors.lang.${l}`)).join(' · ')}
            </Text>
          </View>
        ) : null}

        {m.reviews.length ? (
          <View style={{ gap: 12 }}>
            <Text variant="h3">{t('mentors.profile.reviews')}</Text>
            <ListGroup>
              {m.reviews.map((r) => (
                <View key={r.author} style={styles.review}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Avatar name={r.author} size={30} color={c.muted} />
                    <Text variant="smallStrong" style={{ flex: 1 }}>
                      {r.author}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 1 }} accessibilityLabel={t('mentors.profile.starsA11y', { n: r.rating })}>
                      {Array.from({ length: r.rating }, (_, i) => (
                        <Star key={i} size={11} color={c.warning} fill={c.warning} />
                      ))}
                    </View>
                  </View>
                  <Text variant="small" color={c.subtle}>
                    {r.text}
                  </Text>
                </View>
              ))}
            </ListGroup>
          </View>
        ) : null}

        {own ? null : (
          <PressableScale onPress={() => setReporting(true)} hitSlop={6} style={styles.report} accessibilityLabel={t('mentors.profile.reportA11y', { name: m.firstName })}>
            <Flag size={14} color={c.muted} />
            <Text variant="small" color={c.muted}>
              {t('mentors.profile.report', { name: m.firstName })}
            </Text>
          </PressableScale>
        )}
      </View>
      <SafetySheet visible={reporting} onClose={() => setReporting(false)} target={{ mentorId: m.id }} name={m.firstName} onBlocked={() => router.back()} />
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  card: { gap: 16, padding: 16, borderRadius: radius.xl, backgroundColor: c.card, ...shadow.sm },
  separator: { height: 1, backgroundColor: c.line },
  fact: { flex: 1, alignItems: 'center', gap: 2 },
  factBorder: { borderStartWidth: 1, borderStartColor: c.line },
  // La phrase du mentor, en citation : un filet bleu, pas d'encadré.
  quote: { borderStartWidth: 3, borderStartColor: c.electric, paddingStart: 14, paddingVertical: 2 },
  quoteText: { fontSize: 17, lineHeight: 26, color: c.navy },
  spec: { paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: c.electricSoft },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: c.electric, backgroundColor: c.card, marginTop: 2 },
  rail: { width: 2, flex: 1, backgroundColor: c.electricSoft, marginVertical: 2 },
  review: { gap: 8, padding: 14 },
  report: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, alignSelf: 'center', paddingHorizontal: 12 },
}));
