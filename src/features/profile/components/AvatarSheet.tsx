import * as ImagePicker from 'expo-image-picker';
import { Camera, ImageIcon } from 'lucide-react-native';
import { useRef } from 'react';
import { View } from 'react-native';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { toast } from '@/components/feedback/Toast';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/scheme';
import { useT } from '@/i18n';

import { uploadAvatar } from '../api';
import { prepareAvatar } from '../avatar';
import { useProfile } from '../store';

/** Choisir ou prendre sa photo de profil : recadrée en carré, nettoyée, gardée et envoyée. */
export function AvatarSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const update = useProfile((s) => s.update);
  const t = useT();
  // Choix en attente : la galerie ou l'appareil photo ne s'ouvre qu'une fois la feuille fermée.
  const pending = useRef<'camera' | 'library' | null>(null);

  const choose = (source: 'camera' | 'library') => {
    pending.current = source;
    onClose();
  };

  const onClosed = () => {
    const source = pending.current;
    pending.current = null;
    if (source) void pick(source === 'camera');
  };

  const pick = async (camera: boolean) => {
    let uri: string | undefined;
    try {
      // La galerie n'a pas besoin d'autorisation : le sélecteur système ne donne que la photo choisie.
      if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) return toast(t('avatar.cameraPermission'), 'info');
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 };
      const res = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      uri = res.canceled ? undefined : res.assets[0]?.uri;
    } catch {
      return toast(t('avatar.openFailed'), 'info');
    }
    if (!uri) return;
    let saved: Awaited<ReturnType<typeof prepareAvatar>>;
    try {
      saved = await prepareAvatar(uri);
    } catch {
      return toast(t('avatar.prepareFailed'), 'info');
    }
    update({ avatarUri: saved.uri });
    haptics.success();
    try {
      await uploadAvatar(saved.uri, saved.name);
      toast(t('avatar.nice'));
    } catch {
      toast(t('avatar.offline'), 'info');
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} onClosed={onClosed}>
      <View style={{ gap: 12 }}>
        <Text variant="h2">{t('avatar.title')}</Text>
        <Text variant="small" color={c.muted}>
          {t('avatar.text')}
        </Text>
        <Button label={t('avatar.take')} variant="secondary" iconLeft={<Camera size={18} color={c.navy} />} onPress={() => choose('camera')} />
        <Button label={t('avatar.choose')} variant="secondary" iconLeft={<ImageIcon size={18} color={c.navy} />} onPress={() => choose('library')} />
        <Button label={t('common.cancel')} variant="secondary" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}
