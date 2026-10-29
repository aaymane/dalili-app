/** Sur le web, pas de Daily natif : l'écran d'appel reste un aperçu (voir daily.native.ts). */
type DailyModule = typeof import('@daily-co/react-native-daily-js');

export function loadDaily(): DailyModule | null {
  return null;
}
