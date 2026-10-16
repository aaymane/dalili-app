import { router } from 'expo-router';
import { ArrowRight, Calendar as CalIcon, Check, ChevronDown, Globe, IdCard, Lock, Mail, User } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { Screen } from '@/components/layout/Screen';
import { StepHeader } from '@/components/layout/StepHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OptionCard } from '@/components/ui/OptionCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/store';
import { useProfile } from '@/features/profile/store';
import { countries, type Country, type Gender } from '@/features/profile/types';
import { haptics } from '@/lib/haptics';
import { gradients, palette } from '@/theme/tokens';

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) s++;
  return s;
}

function StrengthBar({ value }: { value: number }) {
  const colors = ['#E5484D', '#F59E0B', '#3D78FF', '#16A34A'];
  const labels = ['FAIBLE', 'MOYEN', 'BON', 'FORT'];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
      {[0, 1, 2, 3].map((i) => (
        <Seg key={i} on={i < value} color={colors[Math.max(0, value - 1)]} />
      ))}
      <Text variant="caption" color={palette.muted} style={{ width: 44, textAlign: 'right' }}>
        {value ? labels[value - 1] : ''}
      </Text>
    </View>
  );
}
function Seg({ on, color }: { on: boolean; color: string }) {
  const s = useAnimatedStyle(() => ({ backgroundColor: withTiming(on ? color : '#D5DAE7', { duration: 220 }) }));
  return <Animated.View style={[{ flex: 1, height: 4, borderRadius: 2 }, s]} />;
}

const formatBirth = (raw: string) => {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};

/** Création de compte en 2 étapes (identifiants → identité), puis code OTP. */
export default function Register() {
  const signUp = useAuth((s) => s.signUp);
  const update = useProfile((s) => s.update);
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [country, setCountry] = useState<Country | null>(null);
  const [birth, setBirth] = useState('');
  const [cgu, setCgu] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const pwStrength = useMemo(() => strength(pw), [pw]);

  const next = () => {
    const e: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'Entre un email valide.';
    if (pw.length < 8) e.pw = '8 caractères minimum.';
    if (pw2 !== pw) e.pw2 = 'Les mots de passe ne correspondent pas.';
    setErrors(e);
    if (Object.keys(e).length) return haptics.warning();
    setStep(1);
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!first.trim()) e.first = 'Ton prénom ?';
    if (!country) e.country = 'Choisis ton pays.';
    if (birth && birth.length !== 10) e.birth = 'Format jj/mm/aaaa.';
    if (!cgu) e.cgu = 'Accepte les conditions pour continuer.';
    setErrors(e);
    if (Object.keys(e).length) return haptics.warning();
    const c = countries.find((x) => x.id === country)!;
    const [dd, mm, yy] = birth.split('/');
    update({
      email: email.trim(),
      firstName: first.trim(),
      lastName: last.trim(),
      gender,
      country,
      originCity: c.city,
      birthDate: birth.length === 10 ? `${yy}-${mm}-${dd}` : null,
    });
    setLoading(true);
    const res = await signUp(email.trim(), pw);
    setLoading(false);
    if (!res.ok) return setErrors({ submit: res.error });
    if (res.needsVerification) router.push({ pathname: '/(auth)/verify', params: { email: email.trim() } });
  };

  const selectedCountry = countries.find((c) => c.id === country);

  return (
    <Screen
      top={gradients.sky}
      bg="#fff"
      keyboard
      padded={false}
      header={
        <StepHeader
          overline="Création de compte"
          title={'On commence par\nte connaître.'}
          step={step}
          total={2}
          onBack={() => (step ? setStep(0) : router.back())}
        />
      }
      footer={
        <View style={{ gap: 8 }}>
          {errors.submit ? (
            <Text variant="small" color={palette.danger} align="center">
              {errors.submit}
            </Text>
          ) : null}
          <Button label="Continuer" icon={<ArrowRight size={18} color="#fff" />} loading={loading} onPress={step ? submit : next} />
        </View>
      }>
      <View style={{ paddingHorizontal: 22 }}>
        {step === 0 ? (
          <Animated.View key="s0" entering={FadeInRight.springify().damping(18)} exiting={FadeOutLeft.duration(150)} style={{ gap: 12 }}>
            <Input label="Email" icon={<Mail size={16} color={palette.electric} />} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="toi@email.com" error={errors.email} />
            <Input label="Mot de passe" icon={<Lock size={16} color={palette.electric} />} value={pw} onChangeText={setPw} secureTextEntry placeholder="8 caractères minimum" autoComplete="new-password" error={errors.pw} />
            <Input label="Confirmer le mot de passe" icon={<Lock size={16} color={palette.electric} />} value={pw2} onChangeText={setPw2} secureTextEntry placeholder="••••••••" error={errors.pw2} />
            <StrengthBar value={pwStrength} />
          </Animated.View>
        ) : (
          <Animated.View key="s1" entering={FadeInRight.springify().damping(18)} exiting={FadeOutLeft.duration(150)} style={{ gap: 12 }}>
            <Text variant="overline" color={palette.muted}>
              Genre
            </Text>
            <Segmented
              kind="track"
              value={gender}
              onChange={setGender}
              options={[
                { value: 'male', label: 'Homme' },
                { value: 'female', label: 'Femme' },
                { value: 'other', label: 'Autre' },
              ]}
            />
            <Input label="Prénom" icon={<User size={16} color={palette.electric} />} value={first} onChangeText={setFirst} autoComplete="given-name" placeholder="Aymen" error={errors.first} />
            <Input label="Nom" icon={<IdCard size={16} color={palette.electric} />} value={last} onChangeText={setLast} autoComplete="family-name" placeholder="Amri" />
            <PressableScale onPress={() => setCountryOpen(true)} scaleTo={0.99}>
              <View pointerEvents="none">
                <Input
                  label="Pays de résidence"
                  icon={<Globe size={16} color={palette.electric} />}
                  value={selectedCountry ? `${selectedCountry.flag}  ${selectedCountry.label}` : ''}
                  placeholder="Sélectionner"
                  editable={false}
                  right={<ChevronDown size={18} color={palette.muted} />}
                  error={errors.country}
                />
              </View>
            </PressableScale>
            <Input
              label="Date de naissance"
              icon={<CalIcon size={16} color={palette.electric} />}
              value={birth}
              onChangeText={(t) => setBirth(formatBirth(t))}
              keyboardType="number-pad"
              placeholder="jj/mm/aaaa"
              error={errors.birth}
            />
            <PressableScale onPress={() => setCgu((v) => !v)} haptic="select" style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 8 }}>
              <View style={[{ width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: '#CBD1E1', alignItems: 'center', justifyContent: 'center' }, cgu && { backgroundColor: palette.electric, borderColor: palette.electric }]}>
                {cgu && <Check size={14} color="#fff" strokeWidth={3} />}
              </View>
              <Text variant="small" color={palette.subtle} style={{ flex: 1 }}>
                J’accepte les <Text variant="smallStrong" color={palette.electric}>conditions d’utilisation</Text> et la{' '}
                <Text variant="smallStrong" color={palette.electric}>politique de confidentialité</Text> de DALILI.
              </Text>
            </PressableScale>
            {errors.cgu ? (
              <Text variant="small" color={palette.danger}>
                {errors.cgu}
              </Text>
            ) : null}
          </Animated.View>
        )}
      </View>

      <BottomSheet visible={countryOpen} onClose={() => setCountryOpen(false)}>
        <Text variant="h2" style={{ marginBottom: 14 }}>
          Ton pays de résidence
        </Text>
        <View style={{ gap: 10 }}>
          {countries.map((c) => (
            <OptionCard
              key={c.id}
              title={`${c.flag}  ${c.label}`}
              selected={country === c.id}
              onPress={() => {
                setCountry(c.id);
                setTimeout(() => setCountryOpen(false), 180);
              }}
            />
          ))}
        </View>
      </BottomSheet>
    </Screen>
  );
}
