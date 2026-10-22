import { createContext, useContext } from 'react';
import type { SharedValue } from 'react-native-reanimated';

/** Position de défilement de l'écran courant (thread UI), fournie par `Screen`. `null` hors d'un écran qui défile. */
export const ScrollContext = createContext<SharedValue<number> | null>(null);

export const useScrollY = () => useContext(ScrollContext);
