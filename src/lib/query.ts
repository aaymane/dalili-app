import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

/** Cache hors ligne : seul le contenu du site (guides, parcours, chiffres) est gardé sur le téléphone. */
export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister: createAsyncStoragePersister({ storage: AsyncStorage, key: 'dalili.content-cache' }),
  maxAge: 30 * 86_400_000,
  buster: 'content-v1',
  dehydrateOptions: {
    shouldDehydrateQuery: (q) => q.queryKey[0] === 'content' && q.state.status === 'success',
  },
};
