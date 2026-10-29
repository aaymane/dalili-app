import * as WebBrowser from 'expo-web-browser';
import { BadgeCheck, ChevronRight, ExternalLink, Flag, Image as ImageIcon, KeyRound, Lock, Map, MessageCircle, Sparkles, Trash2 } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { DeleteAccountSheet } from '@/features/auth/components/DeleteAccountSheet';
import { isDemoMode } from '@/features/auth/store';
import { env } from '@/lib/env';
import { palette, radius, shadow } from '@/theme/tokens';
import { rise } from '@/theme/motion';

const KEPT = [
  { icon: Map, title: 'Ton profil et ton parcours', text: 'Pour reprendre là où tu en étais, même sur un autre téléphone.' },
  { icon: ImageIcon, title: 'Ta photo', text: 'Privée : pour l’instant, toi seul·e la vois. On retire le lieu et les infos cachées avant l’envoi.' },
  { icon: MessageCircle, title: 'Tes messages dans la communauté', text: 'Visibles par les membres des groupes que tu rejoins.' },
  { icon: MessageCircle, title: 'Tes conversations avec un mentor', text: 'Visibles seulement par vous deux. Elles partent avec ton compte.' },
  { icon: Sparkles, title: 'Tes questions à Dalili IA', text: 'Gardées sans ton nom ni ton email, pour améliorer les guides.' },
  { icon: Flag, title: 'Les signalements du mentorat', text: 'Lus seulement par l’équipe. Si un compte est supprimé, le signalement reste, sans le nom, pour protéger les autres.' },
];

const NEVER = [
  { icon: BadgeCheck, text: 'Tes données ne sont jamais revendues, et il n’y a pas de pub.' },
  { icon: Lock, text: 'Ta connexion est chiffrée sur ton téléphone.' },
  { icon: KeyRound, text: 'Tu peux tout supprimer quand tu veux, ici même.' },
];

function Item({ icon, title, text }: { icon: ReactNode; title?: string; text: string }) {
  return (
    <View style={styles.item}>
      <View style={styles.icon}>{icon}</View>
      <View style={{ flex: 1, gap: 2 }}>
        {title ? <Text variant="bodyStrong">{title}</Text> : null}
        <Text variant={title ? 'caption' : 'small'} color={title ? palette.muted : palette.navy}>
          {text}
        </Text>
      </View>
    </View>
  );
}

/** Confidentialité : ce qu'on garde et pourquoi, nos engagements, et la suppression du compte. */
export default function Confidentialite() {
  const [deleting, setDeleting] = useState(false);

  return (
    <Screen padded={false} header={<AppHeader back />}>
      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        <Text variant="hero">Confidentialité</Text>
        <Text variant="body" color={palette.subtle}>
          {isDemoMode ? 'En mode démo, tout reste sur ce téléphone. Rien n’est envoyé en ligne.' : 'Tes données restent à toi. Voici ce qu’on garde, et pourquoi.'}
        </Text>

        {!isDemoMode && (
          <Animated.View entering={rise()} style={styles.card}>
            <Text variant="overline" color={palette.muted}>
              Ce qu’on garde
            </Text>
            {KEPT.map(({ icon: Icon, title, text }) => (
              <Item key={title} icon={<Icon size={16} color={palette.electric} />} title={title} text={text} />
            ))}
          </Animated.View>
        )}

        <Animated.View entering={rise(60)} style={styles.card}>
          <Text variant="overline" color={palette.muted}>
            Nos engagements
          </Text>
          {NEVER.map(({ icon: Icon, text }) => (
            <Item key={text} icon={<Icon size={16} color={palette.electric} />} text={text} />
          ))}
        </Animated.View>

        <Animated.View entering={rise(120)} style={styles.group}>
          <PressableScale onPress={() => WebBrowser.openBrowserAsync(`${env.siteUrl}/confidentialite`)} style={styles.row} accessibilityRole="link">
            <ExternalLink size={18} color={palette.navy} />
            <Text variant="bodyStrong" style={{ flex: 1 }}>
              Lire la politique complète
            </Text>
            <ChevronRight size={18} color={palette.muted} />
          </PressableScale>
          <View style={styles.divider} />
          <PressableScale haptic="press" onPress={() => setDeleting(true)} style={styles.row} accessibilityRole="button">
            <Trash2 size={18} color={palette.danger} />
            <Text variant="bodyStrong" color={palette.danger} style={{ flex: 1 }}>
              Supprimer mon compte
            </Text>
            <ChevronRight size={18} color={palette.muted} />
          </PressableScale>
        </Animated.View>
      </View>
      <DeleteAccountSheet visible={deleting} onClose={() => setDeleting(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 14, borderRadius: radius.xl, backgroundColor: palette.surface, ...shadow.sm },
  item: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 32, height: 32, borderRadius: 16, backgroundColor: palette.electricSoft, alignItems: 'center', justifyContent: 'center' },
  group: { borderRadius: radius.xl, backgroundColor: palette.surface, paddingVertical: 4, ...shadow.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 52 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: palette.line, marginLeft: 46 },
});
