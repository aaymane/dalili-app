import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { toast } from '@/components/feedback/Toast';
import { t } from '@/i18n';

/** Langue détectée par le cerveau (événement `meta`) → voix système. */
const LANGUAGES: Record<string, string> = { fr: 'fr-FR', en: 'en-US', ar: 'ar-SA', darija: 'ar-SA' };

/** Une seule réponse lue à la fois : on retient laquelle, pour le bouton « Arrêter ». */
export const useSpeech = create<{ speakingId: string | null }>(() => ({ speakingId: null }));

// Emojis, pictogrammes, drapeaux et leurs liants : la voix les lirait (« visage souriant »).
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]/gu;

/** Le texte tel qu'on le dit : sans emojis, sans markdown, sans crochets du lexique, sans adresses. */
export function spokenText(md: string) {
  return md
    .replace(EMOJI, '')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/\*\*|__|`/g, '')
    .replace(/≈\s*/g, 'environ ')
    .replace(/\s*[→➜]\s*/g, ', ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/**
 * La plus belle voix installée pour cette langue : « Premium » puis « Améliorée », jamais les voix fantaisie
 * ni la synthèse robotique d'accessibilité (Eloquence). `null` = la voix par défaut du téléphone.
 */
const chosen = new Map<string, { id: string | null; good: boolean }>();
async function bestVoice(language: string) {
  const known = chosen.get(language);
  if (known) return known;
  let pick: { id: string | null; good: boolean } = { id: null, good: false };
  try {
    const voices = (await Speech.getAvailableVoicesAsync()).filter(
      (v) => v.language.replace('_', '-').startsWith(language.slice(0, 2)) && !/eloquence|speech\.synthesis\.voice|novelty/i.test(v.identifier),
    );
    const rank = (v: Speech.Voice) =>
      (/premium/i.test(v.identifier) ? 4 : 0) + (v.quality === Speech.VoiceQuality.Enhanced ? 2 : 0) + (v.language.replace('_', '-') === language ? 1 : 0);
    const best = voices.sort((a, b) => rank(b) - rank(a))[0];
    if (best) pick = { id: best.identifier, good: rank(best) >= 2 };
  } catch {
    // liste indisponible : voix par défaut
  }
  chosen.set(language, pick);
  return pick;
}

let tipShown = false;

export function stopSpeaking() {
  useSpeech.setState({ speakingId: null });
  void Speech.stop();
}

/** Lit une réponse à voix haute ; relancer sur la même réponse l'arrête. */
export async function speakAnswer(id: string, text: string, lang = 'fr') {
  const current = useSpeech.getState().speakingId;
  void Speech.stop();
  if (current === id) {
    useSpeech.setState({ speakingId: null });
    return;
  }
  useSpeech.setState({ speakingId: id });
  const language = LANGUAGES[lang] ?? 'fr-FR';
  const voice = await bestVoice(language);
  if (useSpeech.getState().speakingId !== id) return;

  // La darija n'a pas de voix système : on lit en arabe standard, et on le dit.
  if (lang === 'darija') toast(t('ai.darija'), 'info');
  // Seule la voix de base est installée : on explique comment en avoir une plus naturelle (une fois).
  else if (!voice.good && !tipShown && Platform.OS === 'ios') {
    tipShown = true;
    toast(t('ai.voiceTip'), 'info');
  }

  const done = () => {
    if (useSpeech.getState().speakingId === id) useSpeech.setState({ speakingId: null });
  };
  Speech.speak(spokenText(text), {
    language,
    ...(voice.id ? { voice: voice.id } : null),
    onDone: done,
    onStopped: done,
    onError: done,
  });
}
