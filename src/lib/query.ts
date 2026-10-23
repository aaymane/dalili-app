import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import { AppState, Platform } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

// Retour sur l'app = « fenêtre active » : les données de plus d'une minute sont relues
// (la réponse d'un mentor, une nouvelle demande). Le web le fait déjà tout seul.
if (Platform.OS !== 'web') {
  focusManager.setEventListener((setFocused) => {
    const sub = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
    return () => sub.remove();
  });
}

/** Cache hors ligne : seul le contenu du site (guides, parcours, chiffres) est gardé sur le téléphone. */
export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister: createAsyncStoragePersister({ storage: AsyncStorage, key: 'dalili.content-cache' }),
  maxAge: 30 * 86_400_000,
  buster: 'content-v2',
  dehydrateOptions: {
    shouldDehydrateQuery: (q) => q.queryKey[0] === 'content' && q.state.status === 'success',
  },
};
