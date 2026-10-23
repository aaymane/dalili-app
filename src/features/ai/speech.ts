import * as Speech from 'expo-speech';
import { create } from 'zustand';

import { toast } from '@/components/feedback/Toast';

/** Langue détectée par le cerveau (événement `meta`) → voix système. */
const VOICES: Record<string, string> = { fr: 'fr-FR', en: 'en-US', ar: 'ar-SA', darija: 'ar-SA' };

/** Une seule réponse lue à la fois : on retient laquelle, pour le bouton « Arrêter ». */
export const useSpeech = create<{ speakingId: string | null }>(() => ({ speakingId: null }));

/** Le texte tel qu'on le dit : sans markdown, sans crochets du lexique, sans adresses. */
export function spokenText(md: string) {
  return md
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/\*\*|__|`/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function stopSpeaking() {
  useSpeech.setState({ speakingId: null });
  void Speech.stop();
}

/** Lit une réponse à voix haute ; relancer sur la même réponse l'arrête. */
export function speakAnswer(id: string, text: string, lang = 'fr') {
  const current = useSpeech.getState().speakingId;
  void Speech.stop();
  if (current === id) {
    useSpeech.setState({ speakingId: null });
    return;
  }
  // La darija n'a pas de voix système : on lit en arabe standard, et on le dit.
  if (lang === 'darija') toast('Lecture en arabe standard : la darija n’a pas encore de voix.', 'info');
  useSpeech.setState({ speakingId: id });
  const done = () => {
    if (useSpeech.getState().speakingId === id) useSpeech.setState({ speakingId: null });
  };
  Speech.speak(spokenText(text), { language: VOICES[lang] ?? 'fr-FR', rate: 0.98, onDone: done, onStopped: done, onError: done });
}
