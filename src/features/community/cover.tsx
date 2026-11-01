import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Camera, ImagePlus, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { toast } from '@/components/feedback/Toast';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { uploadCover } from '@/data/api';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { pickPhoto } from '@/lib/pick';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

/** Changer la photo de couverture d'un groupe ou d'un événement (son créateur seulement : la base le vérifie). */
export function useChangeCover(kind: 'groups' | 'events', id?: string) {
  const qc = useQueryClient();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const change = async () => {
    if (!id || busy) return;
    const photo = await pickPhoto('library');
    if (!photo || photo === 'denied') return;
    setBusy(true);
    try {
      await uploadCover(kind, id, photo.uri);
      await qc.invalidateQueries({ queryKey: [kind] });
      haptics.success();
      toast(t('community.cover.updated'));
    } catch {
      toast(t('community.cover.failed'), 'info');
    } finally {
      setBusy(false);
    }
  };
  return { change, busy };
}

/** La photo de couverture en large ; son créateur voit « Changer la photo » dessus. */
export function CoverPhoto({ uri, cacheKey, onChange, busy }: { uri: string; cacheKey?: string | null; onChange?: () => void; busy?: boolean }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  return (
    <View style={styles.photo}>
      <Image source={{ uri, cacheKey: cacheKey ?? undefined }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} accessibilityIgnoresInvertColors />
      {onChange ? (
        <PressableScale onPress={onChange} disabled={busy} style={styles.change} accessibilityRole="button" accessibilityLabel={t('community.cover.change')}>
          {busy ? <ActivityIndicator size="small" color={c.white} /> : <Camera size={15} color={c.white} />}
          <Text variant="caption" color={c.white}>
            {t('community.cover.change')}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

/** Pas encore de photo : le créateur peut en ajouter une (ligne en pointillés, discrète). */
export function AddCoverRow({ onPress, busy }: { onPress: () => void; busy?: boolean }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  return (
    <PressableScale onPress={onPress} disabled={busy} style={styles.add} accessibilityRole="button">
      {busy ? <ActivityIndicator size="small" color={c.electric} /> : <ImagePlus size={18} color={c.electric} />}
      <Text variant="smallStrong" color={c.electric}>
        {t('community.cover.add')}
      </Text>
    </PressableScale>
  );
}

/** À la création : une photo facultative, choisie dans la galerie, envoyée une fois le groupe ou l'événement créé. */
export function CoverPicker({ uri, onChange }: { uri: string | null; onChange: (uri: string | null) => void }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const pick = async () => {
    const photo = await pickPhoto('library');
    if (photo && photo !== 'denied') onChange(photo.uri);
  };
  if (!uri) return <AddCoverRow onPress={pick} />;
  return (
    <View>
      <CoverPhoto uri={uri} onChange={pick} />
      <PressableScale onPress={() => onChange(null)} style={styles.remove} accessibilityLabel={t('community.cover.remove')}>
        <X size={16} color={c.white} />
      </PressableScale>
    </View>
  );
}

const useStyles = makeStyles(({ c }) => ({
  photo: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: c.fill },
  change: { position: 'absolute', end: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, minHeight: 36, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.45)' },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.line },
  remove: { position: 'absolute', top: 10, end: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
}));
