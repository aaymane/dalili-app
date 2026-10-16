import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/** Stockage persistant partagé par tous les stores Zustand. */
export const persistStorage = createJSONStorage(() => AsyncStorage);
