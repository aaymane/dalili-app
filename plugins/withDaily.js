// Appels vidéo Daily (@daily-co/react-native-daily-js) : ce que le build natif doit savoir.
// Même contenu que le plugin officiel @daily-co/config-plugin-rn-daily-js, qui n'accepte pas encore Expo 58,
// sans le partage d'écran ni l'affichage par-dessus les autres apps (inutiles ici).
const { AndroidConfig, createRunOncePlugin, withAndroidManifest, withAppBuildGradle, withInfoPlist } = require('expo/config-plugins');

const CAMERA = 'DALILI utilise l’appareil photo pour ta photo de profil et tes appels vidéo avec un mentor.';
const MICROPHONE = 'DALILI utilise le micro pendant tes appels avec un mentor.';

const withDaily = (config) => {
  // Android : le service qui garde l'appel actif quand l'écran change, et ses permissions.
  config = AndroidConfig.Permissions.withPermissions(config, [
    'android.permission.ACCESS_NETWORK_STATE',
    'android.permission.INTERNET',
    'android.permission.WAKE_LOCK',
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.CAMERA',
    'android.permission.FOREGROUND_SERVICE_CAMERA',
    'android.permission.RECORD_AUDIO',
    'android.permission.MODIFY_AUDIO_SETTINGS',
    'android.permission.FOREGROUND_SERVICE_MICROPHONE',
  ]);
  config = withAndroidManifest(config, (c) => {
    const app = AndroidConfig.Manifest.getMainApplication(c.modResults);
    if (!app) return c;
    app.service = (app.service ?? []).filter((s) => s.$['android:name'] !== 'com.daily.reactlibrary.DailyOngoingMeetingForegroundService');
    app.service.push({
      $: {
        'android:name': 'com.daily.reactlibrary.DailyOngoingMeetingForegroundService',
        'android:exported': 'false',
        'android:foregroundServiceType': 'camera|microphone',
      },
    });
    return c;
  });
  // Bibliothèques natives de WebRTC (problème connu d'Expo avec Hermes, expo/expo#17450).
  config = withAppBuildGradle(config, (c) => {
    if (!c.modResults.contents.includes('useLegacyPackaging = true')) {
      c.modResults.contents += '\nandroid.packagingOptions.jniLibs.useLegacyPackaging = true\n';
    }
    return c;
  });
  // iOS : sans ces deux phrases, l'app se ferme dès qu'on ouvre la caméra ou le micro.
  config = withInfoPlist(config, (c) => {
    c.modResults.NSCameraUsageDescription = CAMERA;
    c.modResults.NSMicrophoneUsageDescription = MICROPHONE;
    return c;
  });
  return config;
};

module.exports = createRunOncePlugin(withDaily, 'dalili-with-daily', '1.0.0');
