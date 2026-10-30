import * as ImagePicker from 'expo-image-picker';
import { Camera, Check, FileText, GraduationCap, IdCard, Images, Lock, Send, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { toast } from '@/components/feedback/Toast';
import { Screen } from '@/components/layout/Screen';
import { StepHeader } from '@/components/layout/StepHeader';
import { Button } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { enter, pop, reflow } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

import { DOC_KINDS, MAX_DOCUMENT_BYTES, type DocKind, type PickedDocument } from '../api';
import { useCreateMyMentor, useMyApplication, useUploadDocument } from '../hooks';

const DOC_ICON: Record<DocKind, LucideIcon> = { titre_sejour: IdCard, certificat_scolarite: GraduationCap };

type Props = { step: number; total: number; birthYear: number; onBack: () => void; onSent: () => void };

/**
 * Candidature mentor, 2e étape : titre de séjour et certificat de scolarité, puis la fiche part à l'équipe.
 * Chaque document part dès qu'il est choisi (dossier privé, lu par l'équipe seulement) ; la base refuse une fiche
 * sans les deux, ou d'une personne qui n'est pas en France.
 */
export function DocumentsScreen({ step, total, birthYear, onBack, onSent }: Props) {
  const { c, gradients, tones } = useTheme();
  const ink = tones.green.ink;
  const t = useT();
  const styles = useStyles();
  const profile = useProfile((s) => s.profile);
  const application = useMyApplication();
  const upload = useUploadDocument();
  const create = useCreateMyMentor();
  const [busy, setBusy] = useState<DocKind | null>(null);
  const sent = application.data?.documents ?? [];
  const city = profile.mentorCity ?? profile.destinationCity ?? '';
  const missing = !profile.firstName.trim() ? t('mentorHome.needName') : !city ? t('mentorHome.needCity') : null;
  const ready = DOC_KINDS.every((k) => sent.includes(k)) && !missing;

  const send = (kind: DocKind, file: PickedDocument) => {
    setBusy(kind);
    upload.mutate(
      { kind, file },
      {
        onSuccess: () => haptics.success(),
        onError: () => toast(t('mentorApply.uploadFailed'), 'info'),
        onSettled: () => setBusy(null),
      },
    );
  };

  const pickImage = async (kind: DocKind, camera: boolean) => {
    if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) return toast(t('mentorApply.permission'), 'info');
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
    const res = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (res.canceled || !res.assets[0]) return;
    send(kind, { uri: res.assets[0].uri });
  };

  const pickPdf = async (kind: DocKind) => {
    // Chargé au moment du choix : un build de l'app d'avant ce module n'a pas le sélecteur de fichiers (mettre l'app à jour).
    let DocumentPicker: typeof import('expo-document-picker');
    try {
      DocumentPicker = await import('expo-document-picker');
    } catch {
      return toast(t('mentorApply.pdfUpdate'), 'info');
    }
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true }).catch(() => null);
    if (!res || res.canceled || !res.assets[0]) return;
    if ((res.assets[0].size ?? 0) > MAX_DOCUMENT_BYTES) return toast(t('mentorApply.tooBig'), 'info');
    send(kind, { uri: res.assets[0].uri, pdf: true });
  };

  const submit = () =>
    create.mutate(
      { firstName: profile.firstName, lastName: profile.lastName, city, origin: profile.originCity, birthYear },
      {
        onSuccess: onSent,
        // 42501 : la règle d'insertion refuse (profil pas « en France » côté serveur) ; 23514 : âge ou charte.
        onError: (e) => {
          const code = (e as { code?: string }).code;
          if (code === '42501') return toast(t('mentorApply.notInFrance'), 'info');
          if (code === '23514') return toast(t(e.message.includes('18') ? 'mentors.charter.tooYoung' : 'mentors.charter.outdated'), 'info');
          toast(t('mentorApply.notSent'), 'info');
        },
      },
    );

  return (
    <Screen
      top={gradients.mint}
      padded={false}
      header={
        <StepHeader
          overline={t('mentorApply.docsOverline', { step: step + 1, total })}
          title={t('mentorApply.docsTitle')}
          subtitle={t('mentorApply.docsSubtitle')}
          step={step}
          total={total}
          accent={c.mentor}
          onBack={onBack}
        />
      }
      footer={
        <Button
          label={t('mentorApply.submit')}
          accent={gradients.mentor}
          icon={<Send size={17} color="#fff" />}
          loading={create.isPending}
          disabled={!ready || !!busy}
          onPress={submit}
        />
      }>
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        {application.data?.status === 'rejected' ? (
          <Animated.View entering={enter(0)} style={styles.rejected}>
            <Text variant="bodyStrong" color={c.danger}>
              {t('mentorApply.rejectedTitle')}
            </Text>
            <Text variant="small" color={c.subtle}>
              {application.data.rejectedReason ? t('mentorApply.rejectedText', { reason: application.data.rejectedReason }) : t('mentorApply.rejectedNoReason')}
            </Text>
          </Animated.View>
        ) : null}

        {DOC_KINDS.map((kind, i) => {
          const done = sent.includes(kind);
          const loading = busy === kind;
          const label = t(`mentorApply.docs.${kind}`);
          return (
            <Animated.View key={kind} entering={enter(i + 1)} layout={reflow} style={[styles.card, done && styles.cardDone]}>
              <View style={styles.head} accessible accessibilityLabel={t('mentorApply.docA11y', { doc: label, state: done ? t('mentorApply.added') : t('mentorApply.toAdd') })}>
                <IconTile icon={DOC_ICON[kind]} tone="green" size={48} radius={16} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="h3">{label}</Text>
                  <Text variant="small" color={c.subtle}>
                    {t(`mentorApply.docsHint.${kind}`)}
                  </Text>
                </View>
                {loading ? (
                  <ActivityIndicator color={c.mentor} />
                ) : done ? (
                  <Animated.View key="done" entering={pop()} style={styles.check}>
                    <Check size={16} color="#fff" strokeWidth={3} />
                  </Animated.View>
                ) : null}
              </View>
              <View style={styles.actions}>
                <PressableScale onPress={() => pickImage(kind, true)} disabled={!!busy} style={[styles.action, styles.primary]} accessibilityLabel={`${t('mentorApply.take')} · ${label}`}>
                  <Camera size={16} color={ink} />
                  <Text variant="smallStrong" color={ink}>
                    {t('mentorApply.photo')}
                  </Text>
                </PressableScale>
                <PressableScale onPress={() => pickImage(kind, false)} disabled={!!busy} style={[styles.action, styles.soft]} accessibilityLabel={`${t('mentorApply.pick')} · ${label}`}>
                  <Images size={16} color={ink} />
                  <Text variant="smallStrong" color={ink}>
                    {t('mentorApply.gallery')}
                  </Text>
                </PressableScale>
                <PressableScale onPress={() => pickPdf(kind)} disabled={!!busy} style={[styles.action, styles.soft]} accessibilityLabel={`${t('mentorApply.pdf')} · ${label}`}>
                  <FileText size={16} color={ink} />
                  <Text variant="smallStrong" color={ink}>
                    PDF
                  </Text>
                </PressableScale>
              </View>
            </Animated.View>
          );
        })}

        <Animated.View entering={enter(3)} style={styles.privacy}>
          <Lock size={15} color={c.subtle} />
          <Text variant="caption" color={c.subtle} style={{ flex: 1 }}>
            {t('mentorApply.privacy')}
          </Text>
        </Animated.View>
        {missing ? (
          <Text variant="caption" color={c.danger} align="center">
            {missing}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  card: { gap: 14, padding: 16, borderRadius: radius.xl, backgroundColor: c.card, borderWidth: 1.5, borderColor: c.line, ...shadow.sm },
  cardDone: { borderColor: c.mentor },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.mentor },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: radius.pill },
  primary: { backgroundColor: c.mentorSoft },
  soft: { backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.mentorSoft },
  privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: radius.lg, backgroundColor: c.fill },
  rejected: { gap: 4, padding: 14, borderRadius: radius.lg, backgroundColor: c.dangerSoft },
}));
