import { Briefcase, Folder, GraduationCap, HeartPulse, House, IdCard, Wallet, type LucideIcon } from 'lucide-react-native';

import type { Tone } from '@/theme/tokens';

/** Les rubriques du coffre (même liste que la base : `vault_documents.category`). */
export const CATEGORIES = ['identity', 'studies', 'housing', 'money', 'health', 'work', 'other'] as const;
export type Category = (typeof CATEGORIES)[number];

export const isCategory = (v: unknown): v is Category => typeof v === 'string' && (CATEGORIES as readonly string[]).includes(v);

/** L'icône et le ton de chaque rubrique : on la reconnaît sans lire. */
export const CATEGORY_LOOK: Record<Category, { icon: LucideIcon; tone: Tone }> = {
  identity: { icon: IdCard, tone: 'blue' },
  studies: { icon: GraduationCap, tone: 'violet' },
  housing: { icon: House, tone: 'orange' },
  money: { icon: Wallet, tone: 'green' },
  health: { icon: HeartPulse, tone: 'red' },
  work: { icon: Briefcase, tone: 'amber' },
  other: { icon: Folder, tone: 'slate' },
};

export type SuggestionKey = 'passport' | 'photos' | 'birth' | 'diplomas' | 'tcf' | 'admission' | 'cvec' | 'lease' | 'visale' | 'homeInsurance' | 'resources' | 'rib';
type HintKey = 'passport' | 'photos' | 'birth';

/**
 * Les documents conseillés (l'ancienne checklist). `id` : la clé gardée sur le téléphone et dans
 * `vault_documents.kind` (ne change pas) ; `key` : le texte dans `tools.documents.items` ; `hint` : la ligne d'aide.
 * Un conseillé est prêt quand un document du coffre y répond, ou quand on l'a coché (« je l'ai en papier »).
 */
export const SUGGESTIONS: { id: string; key: SuggestionKey; category: Category; hint?: HintKey }[] = [
  { id: 'passport', key: 'passport', category: 'identity', hint: 'passport' },
  { id: 'photos', key: 'photos', category: 'identity', hint: 'photos' },
  { id: 'birth', key: 'birth', category: 'identity', hint: 'birth' },
  { id: 'diplomas', key: 'diplomas', category: 'studies' },
  { id: 'tcf', key: 'tcf', category: 'studies' },
  { id: 'admission', key: 'admission', category: 'studies' },
  { id: 'cvec', key: 'cvec', category: 'studies' },
  { id: 'lease', key: 'lease', category: 'housing' },
  { id: 'visale', key: 'visale', category: 'housing' },
  { id: 'home-insurance', key: 'homeInsurance', category: 'housing' },
  { id: 'resources', key: 'resources', category: 'money' },
  { id: 'rib', key: 'rib', category: 'money' },
];

export const suggestionById = (id?: string | null) => SUGGESTIONS.find((s) => s.id === id);
