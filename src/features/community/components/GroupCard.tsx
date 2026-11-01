import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { toast } from '@/components/feedback/Toast';
import { ChevronRight } from '@/components/ui/DirIcons';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { remoteJoinGroup } from '@/data/api';
import { MY_GROUPS, type EventWithState, type GroupWithState } from '@/data/hooks';
import { useLocalDb } from '@/data/local-db';
import { t, useT } from '@/i18n';
import { formatTime, monthShort, weekdayName } from '@/lib/date';
import { makeStyles, useTheme } from '@/theme/scheme';
import { fonts, radius } from '@/theme/tokens';

/**
 * Rejoindre ou quitter un groupe. Avec un compte, la base est la vérité : l'écran change tout de suite, puis relit
 * la base (et revient en arrière si elle refuse). En démo, c'est ce téléphone qui s'en souvient.
 */
export function useJoinGroup() {
  const toggle = useLocalDb((s) => s.toggleGroup);
  const qc = useQueryClient();
  return (g: { id: string; name: string; isMember: boolean }) => {
    const join = !g.isMember;
    const before = qc.getQueryData<string[] | null>(MY_GROUPS);
    if (Array.isArray(before)) qc.setQueryData<string[]>(MY_GROUPS, join ? [...new Set([...before, g.id])] : before.filter((id) => id !== g.id));
    else toggle(g.id);
    toast(join ? t('community.welcome', { name: g.name }) : t('community.left', { name: g.name }), join ? 'success' : 'info');
    remoteJoinGroup(g.id, join)
      // Le fil se relit aussi : il était vide tant que tu n'étais pas membre (la base ne le montre qu'aux membres).
      .then(() => Promise.all([qc.invalidateQueries({ queryKey: ['groups'] }), qc.invalidateQueries({ queryKey: ['posts', g.id] })]))
      .catch(() => {
        if (Array.isArray(before)) qc.setQueryData(MY_GROUPS, before);
        else toggle(g.id);
        toast(t('community.joinFailed'), 'info');
      });
  };
}

const openGroup = (id: string) => router.push({ pathname: '/(app)/groupe/[id]', params: { id } });
const openEvent = (id: string) => router.push({ pathname: '/(app)/evenement/[id]', params: { id } });

/**
 * L'icône d'un groupe ou d'un événement : sa photo de couverture si le créateur en a mis une, sinon ses couleurs
 * et son emoji.
 */
export function GroupMark({ colors, emoji, size = 48, uri, cacheKey }: { colors: readonly [string, string]; emoji: string; size?: number; uri?: string | null; cacheKey?: string | null }) {
  if (uri)
    return (
      <View style={{ width: size, height: size, borderRadius: size * 0.3, overflow: 'hidden' }}>
        <Image source={{ uri, cacheKey: cacheKey ?? undefined }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} accessibilityIgnoresInvertColors />
      </View>
    );
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size * 0.3, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.48, lineHeight: size * 0.62 }} accessible={false}>
        {emoji}
      </Text>
    </LinearGradient>
  );
}

/** Places prises sur la capacité : un filet qui se remplit, et le chiffre. `light` : sur une invitation en couleur. */
export function SeatsBar({ attendees, capacity, light }: { attendees: number; capacity: number; light?: boolean }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const pct = capacity > 0 ? Math.min(100, Math.round((attendees / capacity) * 100)) : 0;
  return (
    <View style={{ gap: 6 }}>
      <View style={[styles.track, { backgroundColor: light ? 'rgba(255,255,255,0.25)' : c.fill }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: light ? c.white : c.electric }]} />
      </View>
      <Text variant="caption" color={light ? 'rgba(255,255,255,0.85)' : c.muted}>
        {t('community.seats', { count: attendees, capacity })}
      </Text>
    </View>
  );
}

/** Un groupe dans une liste (ListGroup) : son icône, son nom, ses membres, et « Rejoindre » en un geste. */
export function GroupRow({ g }: { g: GroupWithState }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const join = useJoinGroup();
  return (
    <PressableScale scaleTo={0.985} onPress={() => openGroup(g.id)} style={styles.row}>
      <GroupMark colors={g.cover} emoji={g.emoji} uri={g.coverUrl} cacheKey={g.coverPath} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="h3" numberOfLines={1}>
          {g.name}
        </Text>
        <Text variant="small" color={c.muted} numberOfLines={1}>
          {t('community.group.membersCity', { count: g.members, city: g.city })}
        </Text>
      </View>
      {g.isMember ? (
        <ChevronRight size={16} color={c.muted} />
      ) : (
        <PressableScale haptic="select" hitSlop={6} onPress={() => join(g)} style={styles.joinPill} accessibilityRole="button" accessibilityLabel={t('community.joinA11y', { name: g.name })}>
          <Text variant="smallStrong" color={c.electric}>
            {t('community.join')}
          </Text>
        </PressableScale>
      )}
    </PressableScale>
  );
}

/**
 * Une invitation (rail « Prochains événements ») : la date en grand, puis le titre, le lieu, l'heure et les places.
 * Les couleurs sont celles de l'événement ; un voile en bas garde le texte lisible.
 */
export function EventInvite({ e }: { e: EventWithState }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const d = new Date(e.startsAt);
  return (
    <PressableScale scaleTo={0.98} onPress={() => openEvent(e.id)} style={styles.invite} accessibilityRole="button">
      {e.coverUrl ? (
        // La vraie photo de l'événement ; un voile en haut garde la date lisible.
        <>
          <Image source={{ uri: e.coverUrl, cacheKey: e.coverPath ?? undefined }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} accessibilityIgnoresInvertColors />
          <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.4 }} style={StyleSheet.absoluteFill} />
        </>
      ) : (
        <LinearGradient colors={e.cover} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      )}
      <LinearGradient colors={['rgba(0,0,0,0)', e.coverUrl ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.5)']} start={{ x: 0, y: 0.35 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.inviteTop}>
        <View style={styles.date}>
          <Text variant="caption" color="rgba(255,255,255,0.8)">
            {weekdayName(d.getDay(), true)}
          </Text>
          <Text style={styles.day}>{d.getDate()}</Text>
          <Text variant="caption" color="rgba(255,255,255,0.8)">
            {monthShort(d)}
          </Text>
        </View>
        {e.isGoing ? (
          <View style={styles.going}>
            <Check size={12} color={c.white} strokeWidth={3} />
            <Text variant="caption" color={c.white}>
              {t('community.going')}
            </Text>
          </View>
        ) : e.coverUrl ? null : (
          <Text style={styles.emoji} accessible={false}>
            {e.emoji}
          </Text>
        )}
      </View>
      <View style={{ gap: 4 }}>
        <Text variant="h2" color={c.white} numberOfLines={2}>
          {e.title}
        </Text>
        <Text variant="small" color="rgba(255,255,255,0.85)" numberOfLines={1} style={{ marginBottom: 8 }}>
          {e.place} · {formatTime(e.startsAt)}
        </Text>
        <SeatsBar attendees={e.attendees} capacity={e.capacity} light />
      </View>
    </PressableScale>
  );
}

/** Un événement dans une liste (ListGroup) : la date, le titre, le lieu et l'heure. */
export function EventRow({ e }: { e: EventWithState }) {
  const { c } = useTheme();
  const styles = useStyles();
  const d = new Date(e.startsAt);
  return (
    <PressableScale scaleTo={0.985} onPress={() => openEvent(e.id)} style={styles.row}>
      <View style={styles.dateBox}>
        <Text variant="h3" style={{ fontSize: 16 }}>
          {d.getDate()}
        </Text>
        <Text variant="caption" color={c.muted} style={{ fontSize: 9 }}>
          {monthShort(d)}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="smallStrong" numberOfLines={2}>
          {e.title}
        </Text>
        <Text variant="caption" color={c.muted} numberOfLines={1}>
          {e.place} · {formatTime(e.startsAt)}
        </Text>
      </View>
      <ChevronRight size={16} color={c.muted} />
    </PressableScale>
  );
}

export const INVITE_W = 268;

const useStyles = makeStyles(({ c }) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 14, minHeight: 72 },
  joinPill: { paddingHorizontal: 14, minHeight: 34, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: c.electricSoft },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  invite: { width: INVITE_W, height: 248, borderRadius: radius.xl, overflow: 'hidden', padding: 16, justifyContent: 'space-between' },
  inviteTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  // La date comme sur un carton d'invitation : le jour en très grand.
  date: { alignItems: 'center', minWidth: 58, paddingVertical: 8, paddingHorizontal: 10, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  day: { fontFamily: fonts.displayBold, fontSize: 30, lineHeight: 34, color: c.white, letterSpacing: -0.6 },
  emoji: { fontSize: 34, lineHeight: 42 },
  going: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.2)' },
  dateBox: { width: 44, height: 46, borderRadius: 12, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' },
}));
