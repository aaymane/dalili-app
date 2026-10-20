/**
 * Contenu DALILI (guides, parcours, chiffres, villes, pays, lexique, outils).
 * UNE seule source de vérité : l'API du site dalili.study (`/api/content/v1`), générée
 * depuis les mêmes fichiers que les pages. L'app n'écrit aucun contenu administratif.
 *
 * Hors ligne : un instantané est embarqué (`assets/content/`, régénéré par
 * `npm run content:snapshot`) et sert de valeur initiale ; React Query le remplace dès
 * que le réseau répond, puis le garde en cache persistant.
 */
import { env } from '@/lib/env';

// ───────────────────────────── Types (miroir de lib/content/* du site) ─────────────────────────────

export type CountryCode = 'MA' | 'DZ' | 'TN' | 'SN' | 'LB' | 'CI' | 'CM';
export type Phase = 'before' | 'arrival' | 'first_months';

export type GuideBlock =
  | { type: 'h2' | 'h3'; text: string; id: string }
  | { type: 'p'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; header: string[]; rows: string[][] }
  | { type: 'callout'; tone: 'info' | 'warning'; text: string };

export type GuideSummary = {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  category: string;
  cluster: string | null;
  countries: CountryCode[];
  date: string;
  updatedDate: string;
  readTime: string;
  url: string;
};

export type Guide = GuideSummary & {
  summary: string;
  keyFacts: { facts: string[]; source: string | null } | null;
  documents: string[];
  faq: { question: string; answer: string }[];
  sources: { label: string; url: string }[];
  blocks: GuideBlock[];
};

export type FigureRef = {
  kind: 'figure' | 'pending';
  id: string;
  label: string;
  countries?: CountryCode[];
};

export type JourneyStepDTO = {
  id: string;
  phase: Phase;
  offsetDays: number;
  icon: string;
  tags: string[];
  title: string;
  window: string;
  oneLiner: string;
  why: string;
  minutes: number;
  howTo: { title: string; detail: string }[];
  needs?: string[];
  action: { label: string; url?: string };
  terms?: string[];
  guides: { default: string[] } & Partial<Record<CountryCode, string[]>>;
  figures?: FigureRef[];
  countries?: CountryCode[];
  reviewed: boolean;
};

export type Journey = {
  version: string;
  steps: JourneyStepDTO[];
  safety: { title: string; oneLiner: string; guide: string; stepIds: string[] };
};

type Tier = { value: number; unit: string; validFrom: string; validUntil?: string; source: string; sourceLabel: string };
export type Figures = {
  generatedAt: string;
  verified: Record<string, { id: string; label: string; status: 'verified'; current: Tier; display: string; tiers: Tier[] }>;
  pending: Record<
    string,
    { id: string; label: string; status: 'to_verify'; candidates: { value: number; unit: string; seenIn: string }[]; checkAt: string }
  >;
};

export type ContentCity = {
  slug: string;
  id: string;
  name: string;
  region: string;
  tagline: string;
  students: number;
  monthlyBudget: { min: number; max: number };
  rent: Record<'crous' | 'coloc' | 'studio' | 'habitant', [number, number]> | null;
  transport: number | null;
  food: number | null;
  links: { crous: string; prefecture: string; transport: string; caf: string };
  url: string;
};

export type ContentCountry = {
  code: CountryCode;
  slug: string;
  label: string;
  flag: string;
  defaultCity: string;
  countryPage: string;
  tcfRequired: boolean;
  specificGuides: number;
};

export type Term = { term: string; full?: string; simple: string; example?: string; stepId?: string };

export type BudgetSituation = 'bcs' | 'alternance' | 'salarie' | 'autre_bourse' | 'aucune';
export type BudgetHousing = 'crous' | 'coloc' | 'studio' | 'habitant';
export type BudgetLevel = 'licence' | 'master' | 'doctorat';
export type BudgetInput = { city: string; housing: BudgetHousing; level: BudgetLevel; monthlyTuition: boolean; situation: BudgetSituation };

export type Tools = {
  budget: {
    cities: { slug: string; name: string; crous: [number, number]; coloc: [number, number]; studio: [number, number]; habitant: [number, number]; transport: number; food: number }[];
    aplEstimate: Record<BudgetHousing, { min: number; max: number }>;
    aplEligible: BudgetSituation[];
    situations: BudgetSituation[];
    fixedMonthly: { phone: number; misc: number };
    savings: { ruMeals: number; transportRate: number; css: number };
    tuitionAnnual: Record<BudgetLevel, number>;
    cvec: number;
    cases: { input: BudgetInput; expected: Record<string, number | boolean> | null }[];
  };
};

export type Manifest = {
  version: number;
  generatedAt: string;
  journeyVersion: string;
  counts: { guides: number; cities: number; countries: number };
  guides: GuideSummary[];
};

export type Core = {
  snapshotAt: string;
  manifest: Manifest;
  journey: Journey;
  figures: Figures;
  cities: ContentCity[];
  countries: ContentCountry[];
  glossary: Term[];
  tools: Tools;
};

export type CoreKey = Exclude<keyof Core, 'snapshotAt'>;

// ───────────────────────────── Accès ─────────────────────────────

const FILES: Record<CoreKey, string> = {
  manifest: 'manifest.json',
  journey: 'journey.json',
  figures: 'figures.json',
  cities: 'cities.json',
  countries: 'countries.json',
  glossary: 'glossary.json',
  tools: 'tools.json',
};

export const snapshot: Core = require('../../assets/content/core.json');

let guidesSnapshot: Record<string, Guide> | null = null;
/** Guides embarqués, chargés seulement au premier besoin (1,2 Mo). */
export function snapshotGuide(slug: string): Guide | undefined {
  guidesSnapshot ??= require('../../assets/content/guides.json') as Record<string, Guide>;
  return guidesSnapshot[slug];
}

async function getJson<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${env.contentUrl}/${path}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`Contenu indisponible (${res.status})`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export function fetchCore<K extends CoreKey>(key: K): Promise<Core[K]> {
  return getJson<Core[K]>(FILES[key]);
}

export function fetchGuide(slug: string): Promise<Guide> {
  return getJson<Guide>(`guides/${encodeURIComponent(slug)}`);
}

// ───────────────────────────── Aides ─────────────────────────────

/** Guides d'une étape pour un pays : ceux du pays d'abord, puis les guides généraux. */
export function guidesForStep(step: JourneyStepDTO, country: CountryCode | null): string[] {
  const own = country ? step.guides[country] ?? [] : [];
  return [...new Set([...own, ...step.guides.default])];
}

export type FigureDisplay = { label: string; value: string; source: string | null; sourceUrl: string | null; toVerify: boolean };

/** Chiffre prêt à afficher : valeur officielle datée, ou « À vérifier » si les sources se contredisent. */
export function displayFigure(ref: FigureRef, figures: Figures): FigureDisplay | null {
  if (ref.kind === 'figure') {
    const f = figures.verified[ref.id];
    if (!f) return null;
    return { label: ref.label, value: `≈ ${f.display}`, source: f.current.sourceLabel, sourceUrl: f.current.source, toVerify: false };
  }
  const p = figures.pending[ref.id];
  if (!p) return null;
  return { label: ref.label, value: 'À vérifier', source: 'En cours de vérification par l’équipe DALILI', sourceUrl: p.checkAt, toVerify: true };
}

/** Chiffres d'une étape applicables à un pays. */
export function figuresForStep(step: JourneyStepDTO, country: CountryCode | null, figures: Figures): FigureDisplay[] {
  return (step.figures ?? [])
    .filter((f) => !f.countries || (country ? f.countries.includes(country) : false))
    .map((f) => displayFigure(f, figures))
    .filter((f): f is FigureDisplay => !!f);
}

/** « 12 min » → 12. */
export const readMinutes = (readTime: string) => Number(readTime.match(/\d+/)?.[0] ?? 5);

/** Formule du simulateur : copie exacte de lib/tools/budget.ts (vérifiée par les cas de test de tools.json). */
export function computeBudget(input: BudgetInput, t: Tools['budget']) {
  const city = t.cities.find((c) => c.slug === input.city);
  if (!city) return null;
  const mid = (r: [number, number]) => Math.round((r[0] + r[1]) / 2);
  const housing = mid(city[input.housing]);
  const fixed = t.fixedMonthly.phone + t.fixedMonthly.misc;
  const tuitionAnnual = t.tuitionAnnual[input.level] ?? 0;
  const tuitionMonthly = input.monthlyTuition ? Math.round(tuitionAnnual / 12) : 0;
  const gross = housing + city.transport + city.food + fixed + tuitionMonthly;
  const aplEligible = t.aplEligible.includes(input.situation);
  const aplMin = aplEligible ? t.aplEstimate[input.housing]?.min ?? 0 : 0;
  const aplMax = aplEligible ? t.aplEstimate[input.housing]?.max ?? 0 : 0;
  const aplMid = Math.round((aplMin + aplMax) / 2);
  const savings = aplMid + t.savings.ruMeals + Math.round(city.transport * t.savings.transportRate) + t.savings.css;
  return {
    housing,
    food: city.food,
    transport: city.transport,
    fixed,
    tuitionMonthly,
    tuitionAnnual,
    cvec: t.cvec,
    gross,
    aplEligible,
    aplMin,
    aplMax,
    aplMid,
    afterApl: Math.max(0, gross - aplMid),
    net: Math.max(0, gross - savings),
  };
}
