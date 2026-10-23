import type { Profile } from '@/features/profile/types';

import type { StepIcon } from './steps';
import type { JourneyItem } from './store';

/**
 * « Ton chemin » (docs/VISION.md §4.B) : les étapes du site regroupées en grands jalons, de ta ville à ta nouvelle vie.
 * Ici, uniquement les données et la géométrie (pures) ; le dessin est dans `components/JourneyPath.tsx`.
 */

type MilestoneDef = { id: string; icon: StepIcon; title: (p: Profile) => string; steps: string[] };

/** Jalons dans l'ordre du voyage. Les étapes absentes du profil sont ignorées ; un jalon sans étape disparaît. */
const DEFS: MilestoneDef[] = [
  { id: 'projet', icon: 'graduation', title: () => 'Ton projet d’études', steps: ['bourses', 'tcf', 'ecole'] },
  { id: 'campus', icon: 'file', title: () => 'Ton dossier Campus France', steps: ['documents', 'campus-france'] },
  { id: 'visa', icon: 'passport', title: () => 'Ton visa', steps: ['ressources', 'visa'] },
  { id: 'logement', icon: 'home', title: () => 'Ton logement', steps: ['logement', 'garant', 'cvec'] },
  { id: 'arrivee', icon: 'plane', title: (p) => `Arrivée à ${p.destinationCity ?? 'destination'}`, steps: ['arrivee', 'assurance', 'sim', 'transport', 'banque', 'validation-visa'] },
  { id: 'vie', icon: 'heart', title: () => 'Ta nouvelle vie', steps: ['secu', 'caf', 'mutuelle', 'medecin', 'vitale', 'travail'] },
];

export type MilestoneStatus = 'done' | 'current' | 'todo';

export type Milestone = {
  id: string;
  icon: StepIcon | 'start';
  title: string;
  /** « 2/3 faites », la ville de départ… */
  detail: string;
  status: MilestoneStatus;
  /** Part des étapes du jalon déjà faites (0 → 1) : l'avion avance d'autant vers lui. */
  progress: number;
  /** Étape à ouvrir depuis le jalon (l'étape du jour si elle en fait partie). */
  stepId?: string;
};

export function buildMilestones(profile: Profile, items: JourneyItem[]): Milestone[] {
  const official = new Map<string, Extract<JourneyItem, { kind: 'official' }>>();
  items.forEach((i) => {
    if (i.kind === 'official') official.set(i.step.id, i);
  });

  const start: Milestone = {
    id: 'depart',
    icon: 'start',
    title: profile.originCity ? `Départ de ${profile.originCity}` : 'Ton départ',
    detail: 'C’est ici que tout commence',
    status: 'done',
    progress: 1,
  };

  const out: Milestone[] = [start];
  for (const def of DEFS) {
    const steps = def.steps.map((id) => official.get(id)).filter((s) => s !== undefined);
    if (!steps.length) continue;
    const done = steps.filter((s) => s.done).length;
    const current = steps.find((s) => s.current);
    const status: MilestoneStatus = done === steps.length ? 'done' : current ? 'current' : 'todo';
    out.push({
      id: def.id,
      icon: def.icon,
      title: def.title(profile),
      detail: status === 'done' ? 'Fait' : done ? `${done}/${steps.length} étapes faites` : `${steps.length} étape${steps.length > 1 ? 's' : ''}`,
      status,
      progress: done / steps.length,
      stepId: (current ?? steps.find((s) => !s.done) ?? steps[0]).step.id,
    });
  }
  // Étape du jour hors des jalons (ex. renouvellement) : le premier jalon pas fini devient « Tu es ici ».
  if (!out.some((m) => m.status === 'current')) {
    const next = out.find((m) => m.status === 'todo');
    if (next) next.status = 'current';
  }
  return out;
}

/** Le visa ouvre le billet (M2.3). */
export function visaDone(items: JourneyItem[]) {
  return items.some((i) => i.kind === 'official' && i.step.id === 'visa' && i.done);
}

// ——— Géométrie : un sentier en S qui passe par chaque jalon, de haut en bas. ———

export const GAP = 116; // distance verticale entre deux jalons
export const TOP = 36;
const SAMPLES = 40; // échantillons par segment pour mesurer la longueur
const LUT = 160; // points du parcours de l'avion

type Pt = { x: number; y: number };

export type PathGeometry = {
  /** Commandes SVG du sentier (pour Skia). */
  d: string;
  nodes: Pt[];
  /** Position de chaque jalon le long du sentier (0 → 1). */
  at: number[];
  /** Points régulièrement espacés le long du sentier, avec l'angle de la tangente (radians). */
  lut: { x: number; y: number; a: number }[];
  height: number;
  /** Longueur totale du sentier, en points. */
  length: number;
};

function bezier(p0: Pt, c0: Pt, c1: Pt, p1: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c0.x + 3 * u * t * t * c1.x + t * t * t * p1.x,
    y: u * u * u * p0.y + 3 * u * u * t * c0.y + 3 * u * t * t * c1.y + t * t * t * p1.y,
  };
}

export function pathGeometry(width: number, count: number, extra: number): PathGeometry {
  const left = width * 0.2;
  const right = width * 0.8;
  const nodes: Pt[] = Array.from({ length: count }, (_, i) => ({ x: i % 2 === 0 ? left : right, y: TOP + i * GAP }));
  // Le sentier continue jusqu'au billet, au centre, sous le dernier jalon.
  const end: Pt = { x: width / 2, y: TOP + (count - 1) * GAP + extra };
  const points = [...nodes, end];

  let d = `M${points[0].x} ${points[0].y}`;
  const samples: Pt[] = [points[0]];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const k = (p1.y - p0.y) * 0.55;
    const c0 = { x: p0.x, y: p0.y + k };
    const c1 = { x: p1.x, y: p1.y - k };
    d += ` C${c0.x} ${c0.y} ${c1.x} ${c1.y} ${p1.x} ${p1.y}`;
    for (let s = 1; s <= SAMPLES; s++) samples.push(bezier(p0, c0, c1, p1, s / SAMPLES));
  }

  const cum = [0];
  for (let i = 1; i < samples.length; i++) cum.push(cum[i - 1] + Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y));
  const total = cum[cum.length - 1];
  const at = points.slice(0, count).map((_, i) => cum[i * SAMPLES] / total);

  const lut: PathGeometry['lut'] = [];
  let j = 0;
  for (let i = 0; i < LUT; i++) {
    const target = (i / (LUT - 1)) * total;
    while (j < cum.length - 2 && cum[j + 1] < target) j++;
    const a = samples[j];
    const b = samples[j + 1];
    const f = cum[j + 1] > cum[j] ? (target - cum[j]) / (cum[j + 1] - cum[j]) : 0;
    lut.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, a: Math.atan2(b.y - a.y, b.x - a.x) });
  }
  return { d, nodes, at, lut, height: end.y, length: total };
}
