// Préparation des tests (Jest, preset jest-expo) : ce que le téléphone fournit et que Node n'a pas.
// Stockage : AsyncStorage en mémoire. Sans clés Supabase dans l'environnement de test, l'app est en mode démo.
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// Notifications : la doublure fournie ne gère pas `setNotificationHandler`, appelé au chargement des alertes.
// Ici, aucune autorisation et aucun jeton : l'app se comporte comme sur un téléphone qui a dit non.
jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  scheduleNotificationAsync: jest.fn(async () => ''),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: false })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: false })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: '' })),
  getLastNotificationResponse: jest.fn(() => null),
  clearLastNotificationResponse: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Langue : un téléphone réglé en français (la langue de référence des textes testés).
jest.mock('expo-localization', () => {
  const locales = [{ languageCode: 'fr', languageTag: 'fr-FR', textDirection: 'ltr', regionCode: 'FR' }];
  return { getLocales: () => locales, useLocales: () => locales, getCalendars: () => [{ timeZone: 'Europe/Paris' }] };
});
