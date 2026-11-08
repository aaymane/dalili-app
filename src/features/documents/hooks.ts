import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

import { celebrate } from '@/components/feedback/Confetti';
import { useLocalDb } from '@/data/local-db';

import { addDocument, deleteDocument, documentUrl, listDocuments, updateDocument, type NewDocument, type VaultDoc } from './api';
import { SUGGESTIONS, type Category } from './categories';

/** Jamais gardé hors ligne (seul le contenu du site l'est) et oublié quand un autre compte se connecte. */
export const VAULT_KEY = ['vault', 'documents'] as const;

export function useVaultDocuments() {
  return useQuery({ queryKey: VAULT_KEY, queryFn: listDocuments });
}

export function useVaultDocument(id?: string) {
  const q = useVaultDocuments();
  return { ...q, doc: q.data?.find((d) => d.id === id) };
}

export function useAddDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewDocument) => addDocument(input, qc.getQueryData<VaultDoc[]>(VAULT_KEY) ?? []),
    onSuccess: (doc) => qc.setQueryData<VaultDoc[]>(VAULT_KEY, (all = []) => [doc, ...all.filter((d) => d.id !== doc.id)]),
  });
}

type Patch = { id: string; patch: Partial<Pick<VaultDoc, 'title' | 'category' | 'kind'>> };

/** Renommer ou déplacer : affiché tout de suite, remis comme avant si la base refuse. */
export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: Patch) => updateDocument(id, patch),
    onMutate: async ({ id, patch }: Patch) => {
      await qc.cancelQueries({ queryKey: VAULT_KEY });
      const before = qc.getQueryData<VaultDoc[]>(VAULT_KEY);
      qc.setQueryData<VaultDoc[]>(VAULT_KEY, (all = []) => all.map((d) => (d.id === id ? { ...d, ...patch } : d)));
      return { before };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(VAULT_KEY, ctx?.before),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (doc: VaultDoc) => deleteDocument(doc),
    onMutate: async (doc: VaultDoc) => {
      await qc.cancelQueries({ queryKey: VAULT_KEY });
      const before = qc.getQueryData<VaultDoc[]>(VAULT_KEY);
      qc.setQueryData<VaultDoc[]>(VAULT_KEY, (all = []) => all.filter((d) => d.id !== doc.id));
      return { before };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(VAULT_KEY, ctx?.before),
  });
}

/** Le lien d'une photo du coffre, demandé seulement quand on l'affiche (valable 5 minutes). */
export function useDocumentUrl(doc?: VaultDoc) {
  return useQuery({
    queryKey: ['vault', 'url', doc?.path],
    queryFn: () => documentUrl(doc!),
    enabled: !!doc && doc.type === 'image/jpeg',
    staleTime: 4 * 60_000,
    gcTime: 5 * 60_000,
  });
}

/** Les documents d'une rubrique, et le compte par rubrique. */
export function useByCategory(docs: VaultDoc[] | undefined) {
  return useMemo(() => {
    const map = {} as Record<Category, VaultDoc[]>;
    for (const d of docs ?? []) (map[d.category] ??= []).push(d);
    return map;
  }, [docs]);
}

/**
 * La liste « À préparer » : un document conseillé est prêt quand un document du coffre y répond,
 * ou quand on l'a coché soi-même (« je l'ai en papier »).
 */
export function useReadiness(docs: VaultDoc[] | undefined) {
  const ticked = useLocalDb((s) => s.documents);
  return useMemo(() => {
    const stored = new Map<string, VaultDoc>();
    for (const d of docs ?? []) if (d.kind && !stored.has(d.kind)) stored.set(d.kind, d);
    const ready = (id: string) => stored.has(id) || !!ticked[id];
    const done = SUGGESTIONS.filter((s) => ready(s.id)).length;
    return { done, total: SUGGESTIONS.length, ready, stored: (id: string) => stored.get(id), ticked: (id: string) => !!ticked[id] };
  }, [docs, ticked]);
}

/** Confettis quand le dernier papier conseillé devient prêt (rangé ou coché), une fois, où que ce soit dans le coffre. */
export function useCelebrateWhenReady() {
  const { data } = useVaultDocuments();
  const { done, total } = useReadiness(data);
  const complete = !!data && done === total;
  const was = useRef<boolean | null>(null);
  useEffect(() => {
    if (was.current === false && complete) celebrate();
    if (data) was.current = complete;
  }, [complete, data]);
}
