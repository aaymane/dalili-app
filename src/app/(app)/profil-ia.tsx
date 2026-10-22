import { router } from 'expo-router';
import { BrainCircuit, Pencil, ShieldCheck, Sparkles } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { LogoOrb } from '@/components/brand/LogoOrb';
import { BottomSheet } from '@/components/feedback/BottomSheet';
import { toast } from '@/components/feedback/Toast';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { OptionCard } from '@/components/ui/OptionCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { ArrivalSheet } from '@/features/journey/components/ArrivalSheet';
import { useJourney } from '@/features/journey/store';
import { CityPicker } from '@/features/profile/components/CityPicker';
import { useProfile } from '@/features/profile/store';
import {
  campusStatusLabels,
  concernLabels,
  housingLabels,
  studyLevelLabels,
  type CampusStatus,
  type Concern,
  type HousingStatus,
  type StudyLevel,
} from '@/features/profile/types';
import { formatLong, relativeDays } from '@/lib/date';
import { palette, radius, shadow } from '@/theme/tokens';
import { rise } from '@/theme/motion';

type Field = 'city' | 'level' | 'campus' | 'housing' | 'concerns' | null;

function Fact({ label, value, onEdit, delay }: { label: string; value: ReactNode; onEdit: () => void; delay: number }) {
  return (
    <Animated.View entering={rise(delay)}>
      <PressableScale onPress={onEdit} scaleTo={0.985} style={styles.fact}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text variant="overline" color={palette.muted} style={{ fontSize: 9.5 }}>
            {label}
          </Text>
          {typeof value === 'string' ? <Text variant="bodyStrong">{value}</Text> : value}
        </View>
        <View style={styles.edit}>
          <Pencil size={14} color={palette.aiIndigo} />
        </View>
      </PressableScale>
    </Animated.View>
  );
}

/** Profil IA : transparence totale sur ce que Dalili utilise pour personnaliser — et tout est modifiable. */
export default function ProfilIA() {
  const profile = useProfile((s) => s.profile);
  const update = useProfile((s) => s.update);
  const j = useJourney();
  const [field, setField] = useState<Field>(null);
  const [arrival, setArrival] = useState(false);

  const who = { bac: 'jeune bachelier·e', licence: 'en licence', master: 'en master', doctorat: 'doctorant·e' } as const;
  const summary = `Tu es ${profile.studyLevel ? who[profile.studyLevel] : 'étudiant·e'}, tu pars de ${profile.originCity || 'chez toi'} pour ${profile.destinationCity ?? 'une ville à choisir'} ${relativeDays(j.arrival)}. ${j.current ? `Ta priorité du moment : « ${j.current.step.title} ».` : 'Toutes tes démarches sont faites !'}${profile.concerns.length ? ` Ce qui t'inquiète le plus : ${profile.concerns.map((c) => concernLabels[c].label.toLowerCase()).join(', ')}.` : ''}`;

  return (
    <Screen top={['#C9C2FF', '#ECEAFF', '#F5F7FD']} padded={false} header={<AppHeader back />}>
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        <View style={{ alignItems: 'center' }}>
          <LogoOrb size={84} />
          <Text variant="hero" align="center">
            Ce que Dalili{'\n'}sait de toi
          </Text>
          <Text variant="small" color={palette.subtle} align="center" style={{ marginTop: 6, maxWidth: 320 }}>
            Ces infos servent uniquement à personnaliser ton parcours, tes mentors et les réponses de l’IA. Touche pour modifier.
          </Text>
        </View>

        <Animated.View entering={rise()} style={styles.summary}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BrainCircuit size={18} color="#fff" />
            <Text variant="overline" color="rgba(255,255,255,0.75)">
              Ton résumé IA
            </Text>
          </View>
          <Text variant="body" color="#fff">
            {summary}
          </Text>
        </Animated.View>

        <Fact delay={40} label="Ville de destination" value={profile.destinationCity ?? 'Je ne sais pas encore'} onEdit={() => setField('city')} />
        <Fact delay={70} label="Date d’arrivée" value={`${formatLong(j.arrival)} · ${relativeDays(j.arrival)}`} onEdit={() => setArrival(true)} />
        <Fact delay={100} label="Niveau d’études" value={profile.studyLevel ? studyLevelLabels[profile.studyLevel] : '—'} onEdit={() => setField('level')} />
        <Fact delay={130} label="Campus France" value={profile.campusStatus ? campusStatusLabels[profile.campusStatus] : '—'} onEdit={() => setField('campus')} />
        <Fact delay={160} label="Logement" value={profile.housing ? housingLabels[profile.housing] : '—'} onEdit={() => setField('housing')} />
        <Fact
          delay={190}
          label="Ce qui t’inquiète"
          value={
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
              {profile.concerns.length ? (
                profile.concerns.map((c) => (
                  <View key={c} style={styles.chip}>
                    <Text variant="smallStrong" color={palette.aiIndigo}>
                      {concernLabels[c].emoji} {concernLabels[c].label}
                    </Text>
                  </View>
                ))
              ) : (
                <Text variant="bodyStrong">—</Text>
              )}
            </View>
          }
          onEdit={() => setField('concerns')}
        />

        <View style={styles.privacy}>
          <ShieldCheck size={18} color={palette.success} />
          <Text variant="small" color={palette.subtle} style={{ flex: 1 }}>
            Dalili ne vend jamais tes données. Quand tu poses une question, seuls ta question, les derniers messages, ton pays et ton étape en cours sont envoyés. Les questions sont gardées sans ton nom ni ton email, pour améliorer nos guides.
          </Text>
        </View>
        <Button label="Poser une question à Dalili" iconLeft={<Sparkles size={18} color="#fff" />} accent={['#4D6BFF', '#7A5AF8']} onPress={() => router.navigate('/(app)/(tabs)/ia')} />
      </View>

      <BottomSheet visible={!!field} onClose={() => setField(null)} scroll>
        <View style={{ gap: 10 }}>
          {field === 'city' && <CityPicker value={profile.destinationCity} onChange={(c) => { update({ destinationCity: c }); toast('Mis à jour'); setField(null); }} />}
          {field === 'level' &&
            (Object.keys(studyLevelLabels) as StudyLevel[]).map((k) => (
              <OptionCard key={k} title={studyLevelLabels[k]} selected={profile.studyLevel === k} onPress={() => { update({ studyLevel: k }); setField(null); }} />
            ))}
          {field === 'campus' &&
            (Object.keys(campusStatusLabels) as CampusStatus[]).map((k) => (
              <OptionCard key={k} title={campusStatusLabels[k]} selected={profile.campusStatus === k} onPress={() => { update({ campusStatus: k }); setField(null); }} />
            ))}
          {field === 'housing' &&
            (Object.keys(housingLabels) as HousingStatus[]).map((k) => (
              <OptionCard key={k} title={housingLabels[k]} selected={profile.housing === k} onPress={() => { update({ housing: k }); setField(null); }} />
            ))}
          {field === 'concerns' && (
            <>
              {(Object.keys(concernLabels) as Concern[]).map((k) => (
                <OptionCard
                  key={k}
                  kind="check"
                  title={`${concernLabels[k].emoji}  ${concernLabels[k].label}`}
                  selected={profile.concerns.includes(k)}
                  onPress={() => update({ concerns: profile.concerns.includes(k) ? profile.concerns.filter((c) => c !== k) : [...profile.concerns, k] })}
                />
              ))}
              <Button label="Valider" onPress={() => setField(null)} />
            </>
          )}
        </View>
      </BottomSheet>
      <ArrivalSheet visible={arrival} onClose={() => setArrival(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { gap: 10, padding: 18, borderRadius: radius.xl, backgroundColor: '#5B5CF0', ...shadow.glow, shadowColor: '#5B5CF0' },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: '#fff', ...shadow.sm },
  edit: { width: 32, height: 32, borderRadius: 16, backgroundColor: palette.aiSoft, alignItems: 'center', justifyContent: 'center' },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: palette.aiSoft },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.lg, backgroundColor: palette.successSoft },
});
