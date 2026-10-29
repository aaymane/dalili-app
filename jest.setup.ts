// Préparation des tests (Jest, preset jest-expo) : ce que le téléphone fournit et que Node n'a pas.
// Stockage : AsyncStorage en mémoire. Sans clés Supabase dans l'environnement de test, l'app est en mode démo.
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
