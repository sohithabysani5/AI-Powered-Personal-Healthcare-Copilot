/**
 * Voice utilities for Web Speech API (SpeechSynthesis & SpeechRecognition).
 * Supports English, Hindi, Telugu, and Tamil where browser synthesis voices are installed.
 */

export const getSpeechVoiceForLanguage = (language: string): SpeechSynthesisVoice | null => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const langCodePrefixMap: Record<string, string> = {
    en: 'en',
    hi: 'hi',
    te: 'te',
    ta: 'ta',
  };

  const prefix = langCodePrefixMap[language] || 'en';
  // Try matching primary language
  const found = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
  return found || voices[0] || null;
};

export const speakText = (
  text: string,
  language: string = 'en',
  onEnd?: () => void,
  onError?: () => void
): SpeechSynthesisUtterance | null => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  // Clean markdown asterisks and hashtags for clean vocalization
  const cleanText = text
    .replace(/[*#_`>]/g, '')
    .replace(/\[.*?\]/g, '')
    .trim();

  window.speechSynthesis.cancel(); // Stop any pending speech

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 0.95; // Slightly slower, clear conversational pace
  utterance.pitch = 1.0;

  const voice = getSpeechVoiceForLanguage(language);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : language === 'ta' ? 'ta-IN' : 'en-US';
  }

  if (onEnd) utterance.onend = onEnd;
  if (onError) utterance.onerror = onError;

  window.speechSynthesis.speak(utterance);
  return utterance;
};

export const stopSpeech = () => {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};
