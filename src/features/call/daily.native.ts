/**
 * Daily sur iPhone et Android. Son code natif n'existe que dans un build de développement ou de production :
 * dans Expo Go, le charger échoue, et l'écran d'appel reste un aperçu au lieu de planter.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';

type DailyModule = typeof import('@daily-co/react-native-daily-js');

let cached: DailyModule | null | undefined;

export function loadDaily(): DailyModule | null {
  if (cached !== undefined) return cached;
  // Expo Go : on ne tente même pas. En développement, un require qui échoue est signalé comme erreur fatale
  // (écran rouge) même dans un try/catch.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    cached = null;
    return cached;
  }
  try {
    // require() et pas import : un import qui échoue (Expo Go) ferait planter toute l'app au démarrage.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('@daily-co/react-native-daily-js') as DailyModule;
  } catch {
    cached = null;
  }
  return cached;
}
