import * as ImagePicker from 'expo-image-picker';
import { Camera, ImageIcon } from 'lucide-react-native';
import { useRef } from 'react';
import { View } from 'react-native';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { toast } from '@/components/feedback/Toast';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { haptics } from '@/lib/haptics';
import { palette } from '@/theme/tokens';

import { uploadAvatar } from '../api';
import { prepareAvatar } from '../avatar';
import { useProfile } from '../store';

/** Choisir ou prendre sa photo de profil : recadrée en carré, nettoyée, gardée et envoyée. */
export function AvatarSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const update = useProfile((s) => s.update);
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
      if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) return toast('Autorise l’appareil photo dans les réglages.', 'info');
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 };
      const res = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      uri = res.canceled ? undefined : res.assets[0]?.uri;
    } catch {
      return toast('Impossible d’ouvrir la photo.', 'info');
    }
    if (!uri) return;
    let saved: Awaited<ReturnType<typeof prepareAvatar>>;
    try {
      saved = await prepareAvatar(uri);
    } catch {
      return toast('Impossible de préparer la photo. Essaie avec une autre.', 'info');
    }
    update({ avatarUri: saved.uri });
    haptics.success();
    try {
      await uploadAvatar(saved.uri, saved.name);
      toast('Belle photo !');
    } catch {
      toast('Photo gardée sur ton téléphone, mais pas encore envoyée en ligne. Vérifie ta connexion.', 'info');
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} onClosed={onClosed}>
      <View style={{ gap: 12 }}>
        <Text variant="h2">Ta photo de profil</Text>
        <Text variant="small" color={palette.muted}>
          Pour l’instant, toi seul·e la vois. Avant l’envoi, on retire le lieu et les infos cachées de la photo.
        </Text>
        <Button label="Prendre une photo" variant="secondary" iconLeft={<Camera size={18} color={palette.navy} />} onPress={() => choose('camera')} />
        <Button label="Choisir dans la galerie" variant="secondary" iconLeft={<ImageIcon size={18} color={palette.navy} />} onPress={() => choose('library')} />
        <Button label="Annuler" variant="secondary" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}
