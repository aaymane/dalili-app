import { router } from 'expo-router';
import { Calendar as CalIcon, Check, ChevronDown, Globe, IdCard, Lock, Mail, User } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Trans } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { Screen } from '@/components/layout/Screen';
import { StepHeader } from '@/components/layout/StepHeader';
import { Button } from '@/components/ui/Button';
import { ArrowRight } from '@/components/ui/DirIcons';
import { Input } from '@/components/ui/Input';
import { OptionCard } from '@/components/ui/OptionCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/store';
import { useProfile } from '@/features/profile/store';
import { countries, countryLabel, type Country, type Gender } from '@/features/profile/types';
import { useIsRTL, useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/scheme';
import { leave, rise } from '@/theme/motion';

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) s++;
  return s;
}

function StrengthBar({ value }: { value: number }) {
  const { c } = useTheme();
  const t = useT();
  const rtl = useIsRTL();
  const colors = ['#E5484D', '#F59E0B', '#3D78FF', '#16A34A'];
  const labels = t('auth.register.strength').split(',');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
      {[0, 1, 2, 3].map((i) => (
        <Seg key={i} on={i < value} color={colors[Math.max(0, value - 1)]} />
      ))}
      <Text variant="caption" color={c.muted} style={{ width: 54, textAlign: rtl ? 'left' : 'right' }}>
        {value ? labels[value - 1] : ''}
      </Text>
    </View>
  );
}
function Seg({ on, color }: { on: boolean; color: string }) {
  const { c } = useTheme();
  const s = useAnimatedStyle(() => ({ backgroundColor: withTiming(on ? color : c.lineStrong, { duration: 220 }) }));
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
  const { c, gradients } = useTheme();
  const t = useT();
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
    if (!/^\S+@\S+\.\S+$/.test(email)) e.email = t('auth.errors.invalidEmail');
    if (pw.length < 8) e.pw = t('auth.register.pwMin');
    if (pw2 !== pw) e.pw2 = t('auth.register.pwMismatch');
    setErrors(e);
    if (Object.keys(e).length) return haptics.warning();
    setStep(1);
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!first.trim()) e.first = t('auth.register.errFirstName');
    if (!country) e.country = t('auth.register.errCountry');
    if (birth && birth.length !== 10) e.birth = t('auth.register.errBirth');
    if (!cgu) e.cgu = t('auth.register.errCgu');
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
          overline={t('auth.register.overline')}
          title={t('auth.register.title')}
          step={step}
          total={2}
          onBack={() => (step ? setStep(0) : router.back())}
        />
      }
      footer={
        <View style={{ gap: 8 }}>
          {errors.submit ? (
            <Text variant="small" color={c.danger} align="center">
              {errors.submit}
            </Text>
          ) : null}
          <Button label={t('common.continue')} icon={<ArrowRight size={18} color="#fff" />} loading={loading} onPress={step ? submit : next} />
        </View>
      }>
      <View style={{ paddingHorizontal: 22 }}>
        {step === 0 ? (
          <Animated.View key="s0" entering={rise()} exiting={leave} style={{ gap: 12 }}>
            <Input label={t('auth.email')} icon={<Mail size={16} color={c.electric} />} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder={t('auth.emailPlaceholder')} error={errors.email} />
            <Input label={t('auth.password')} icon={<Lock size={16} color={c.electric} />} value={pw} onChangeText={setPw} secureTextEntry placeholder={t('auth.register.pwPlaceholder')} autoComplete="new-password" error={errors.pw} />
            <Input label={t('auth.register.confirmPw')} icon={<Lock size={16} color={c.electric} />} value={pw2} onChangeText={setPw2} secureTextEntry placeholder="••••••••" error={errors.pw2} />
            <StrengthBar value={pwStrength} />
          </Animated.View>
        ) : (
          <Animated.View key="s1" entering={rise()} exiting={leave} style={{ gap: 12 }}>
            <Text variant="overline" color={c.muted}>
              {t('auth.register.gender')}
            </Text>
            <Segmented
              kind="track"
              value={gender}
              onChange={setGender}
              options={[
                { value: 'male', label: t('auth.register.male') },
                { value: 'female', label: t('auth.register.female') },
                { value: 'other', label: t('auth.register.other') },
              ]}
            />
            <Input label={t('auth.register.firstName')} icon={<User size={16} color={c.electric} />} value={first} onChangeText={setFirst} autoComplete="given-name" placeholder={t('auth.register.firstNamePlaceholder')} error={errors.first} />
            <Input label={t('auth.register.lastName')} icon={<IdCard size={16} color={c.electric} />} value={last} onChangeText={setLast} autoComplete="family-name" placeholder={t('auth.register.lastNamePlaceholder')} />
            <PressableScale onPress={() => setCountryOpen(true)} scaleTo={0.99}>
              <View pointerEvents="none">
                <Input
                  label={t('auth.register.country')}
                  icon={<Globe size={16} color={c.electric} />}
                  value={selectedCountry ? `${selectedCountry.flag}  ${countryLabel(selectedCountry.id)}` : ''}
                  placeholder={t('auth.register.select')}
                  editable={false}
                  right={<ChevronDown size={18} color={c.muted} />}
                  error={errors.country}
                />
              </View>
            </PressableScale>
            <Input
              label={t('auth.register.birth')}
              icon={<CalIcon size={16} color={c.electric} />}
              value={birth}
              onChangeText={(v) => setBirth(formatBirth(v))}
              keyboardType="number-pad"
              placeholder={t('auth.register.birthPlaceholder')}
              error={errors.birth}
            />
            <PressableScale onPress={() => setCgu((v) => !v)} haptic="select" style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 8 }}>
              <View style={[{ width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: c.lineStrong, alignItems: 'center', justifyContent: 'center' }, cgu && { backgroundColor: c.electric, borderColor: c.electric }]}>
                {cgu && <Check size={14} color="#fff" strokeWidth={3} />}
              </View>
              <Text variant="small" color={c.subtle} style={{ flex: 1 }}>
                <Trans
                  i18nKey="auth.register.cgu"
                  components={{ terms: <Text variant="smallStrong" color={c.electric} />, privacy: <Text variant="smallStrong" color={c.electric} /> }}
                />
              </Text>
            </PressableScale>
            {errors.cgu ? (
              <Text variant="small" color={c.danger}>
                {errors.cgu}
              </Text>
            ) : null}
          </Animated.View>
        )}
      </View>

      <BottomSheet visible={countryOpen} onClose={() => setCountryOpen(false)}>
        <Text variant="h2" style={{ marginBottom: 14 }}>
          {t('auth.register.countrySheet')}
        </Text>
        <ScrollView style={{ maxHeight: 440 }} contentContainerStyle={{ gap: 10 }} showsVerticalScrollIndicator={false}>
          {countries.map((c) => (
            <OptionCard
              key={c.id}
              title={`${c.flag}  ${countryLabel(c.id)}`}
              selected={country === c.id}
              onPress={() => {
                setCountry(c.id);
                setTimeout(() => setCountryOpen(false), 180);
              }}
            />
          ))}
        </ScrollView>
      </BottomSheet>
    </Screen>
  );
}
