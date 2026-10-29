export function playPronunciation(textToSpeak: string, audioUrl?: string, rate = 0.92): void {
  if (audioUrl) {
    const audio = new Audio(audioUrl);
    audio.play().catch(() => {
      speakWithSynthesis(textToSpeak, rate);
    });
    return;
  }
  speakWithSynthesis(textToSpeak, rate);
}

function speakWithSynthesis(text: string, rate: number): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const preferredVoice =
    voices.find((v) => v.lang === 'en-US' && (v.name.includes('Google') || v.name.includes('Samantha'))) ||
    voices.find((v) => v.lang.startsWith('en'));

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  window.speechSynthesis.speak(utterance);
}
