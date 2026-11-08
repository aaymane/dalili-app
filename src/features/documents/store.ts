import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/lib/storage';

import type { Category } from './categories';

/** Un document du coffre. `path` : le chemin dans le bucket privé (ou le nom du fichier local en mode démo). */
export type VaultDoc = {
  id: string;
  category: Category;
  /** Le document conseillé auquel il répond (« passport »…), ou rien. */
  kind: string | null;
  title: string;
  type: 'image/jpeg' | 'application/pdf';
  size: number;
  createdAt: string;
  path: string;
};

/**
 * Mode démo (sans Supabase ou sans session) : le coffre vit sur le téléphone. Les fichiers sont dans le dossier
 * privé de l'app (`files.ts`), cette liste dit lesquels et où ils sont rangés. Vidée à la déconnexion.
 */
type VaultDemo = {
  docs: VaultDoc[];
  add: (d: VaultDoc) => void;
  update: (id: string, patch: Partial<Pick<VaultDoc, 'title' | 'category' | 'kind'>>) => void;
  remove: (id: string) => void;
  reset: () => void;
};

export const useVaultDemo = create<VaultDemo>()(
  persist(
    (set) => ({
      docs: [],
      add: (d) => set((s) => ({ docs: [d, ...s.docs] })),
      update: (id, patch) => set((s) => ({ docs: s.docs.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      remove: (id) => set((s) => ({ docs: s.docs.filter((d) => d.id !== id) })),
      reset: () => set({ docs: [] }),
    }),
    { name: 'dalili.vault-demo', storage: persistStorage, version: 1 },
  ),
);
