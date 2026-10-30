import type { CustomStep } from '@/features/journey/store';
import type { Profile } from '@/features/profile/types';

/**
 * Fusion de ce que le serveur renvoie avec ce que garde le téléphone, à chaque connexion.
 * Règle : le serveur gagne en cas de conflit, sauf pour ce que l'étudiant a touché PENDANT la relecture
 * (`before` = le téléphone au départ de la relecture, `now` = le téléphone à l'arrivée de la réponse).
 */

/** Un vide en ligne veut dire « jamais rempli », sauf pour ces champs où « je ne sais pas encore » est une vraie réponse. */
const NULL_IS_ANSWER: (keyof Profile)[] = ['destinationCity', 'arrivalDate', 'mentorCity'];

export function mergeProfile(before: Profile, now: Profile, server: Partial<Profile>): Profile {
  const next = { ...now };
  (Object.keys(server) as (keyof Profile)[]).forEach((key) => {
    const value = server[key];
    if (value === undefined || value === '') return;
    if (value === null && !NULL_IS_ANSWER.includes(key)) return;
    if (before[key] !== now[key]) return; // modifié sur le téléphone pendant la relecture
    (next as Record<keyof Profile, unknown>)[key] = value;
  });
  return next;
}

type Journey = { overrides: Record<string, boolean>; custom: CustomStep[] };

const customKey = (c: { title: string; date: string }) => `${c.title}|${c.date}`;

/**
 * Étapes cochées : le serveur gagne. Une étape cochée seulement sur le téléphone n'est pas un conflit
 * (l'envoi avait échoué) : on la garde et on la renvoie (`toPush`).
 * Tâches perso : la liste du serveur fait foi (une tâche absente en ligne a pu être supprimée ailleurs),
 * plus celles ajoutées pendant la relecture. Le téléphone garde ses identifiants, pour ne pas replanifier les rappels.
 */
export function mergeJourney(before: Journey, now: Journey, server: Journey): Journey & { toPush: string[] } {
  const touched = Object.keys(now.overrides).filter((id) => now.overrides[id] !== before.overrides[id]);
  const toPush = Object.keys(now.overrides).filter((id) => !(id in server.overrides) && !touched.includes(id));
  const overrides = { ...now.overrides, ...server.overrides };
  touched.forEach((id) => (overrides[id] = now.overrides[id]));

  const beforeById = new Map(before.custom.map((c) => [c.id, c]));
  const nowByKey = new Map(now.custom.map((c) => [customKey(c), c]));
  const removed = new Set(before.custom.filter((c) => !now.custom.some((n) => n.id === c.id)).map(customKey));
  const custom = server.custom
    .filter((s) => !removed.has(customKey(s)))
    .map((s) => {
      const local = nowByKey.get(customKey(s));
      if (!local) return s;
      // Cochée ou décochée pendant la relecture : le geste du téléphone l'emporte.
      const prev = beforeById.get(local.id);
      return { ...s, id: local.id, done: prev && prev.done !== local.done ? local.done : s.done };
    });
  const added = now.custom.filter((c) => !beforeById.has(c.id) && !custom.some((s) => customKey(s) === customKey(c)));
  return { overrides, custom: [...custom, ...added], toPush };
}
