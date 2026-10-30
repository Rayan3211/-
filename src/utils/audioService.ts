export interface NarrationResponse {
  success: boolean;
  audioBase64?: string;
  mimeType?: string;
  voice?: string;
  error?: string;
}

// In-memory cache for generated audio blobs: key = `${sceneId}_${voice}`
const audioCache = new Map<string, { blob: Blob; url: string; base64: string }>();

export async function fetchNarrationAudio(
  text: string,
  voice: string = 'Charon',
  stylePrompt?: string,
  cacheKey?: string
): Promise<{ url: string; blob: Blob; base64: string }> {
  if (cacheKey && audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey)!;
  }

  const res = await fetch('/api/tts/narrate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voice,
      stylePrompt,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: Failed to generate narration`);
  }

  const data: NarrationResponse = await res.json();
  if (!data.audioBase64) {
    throw new Error('No audio data received from server');
  }

  // Convert base64 to Blob
  const byteCharacters = atob(data.audioBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: data.mimeType || 'audio/wav' });
  const url = URL.createObjectURL(blob);

  const entry = { blob, url, base64: data.audioBase64 };
  if (cacheKey) {
    audioCache.set(cacheKey, entry);
  }

  return entry;
}

export function downloadWavBlob(blob: Blob, filename: string = 'mudros-narration.wav') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Browser SpeechSynthesis fallback in case API key is missing or offline
 */
export function playWebSpeechFallback(
  text: string,
  rate: number = 0.85,
  onEnd?: () => void
): SpeechSynthesisUtterance | null {
  if (!('speechSynthesis' in window)) return null;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar-SA';
  utterance.rate = rate;
  utterance.pitch = 0.85; // slightly lower pitch for documentary tone

  // Attempt to select an Arabic voice
  const voices = window.speechSynthesis.getVoices();
  const arabicVoice = voices.find((v) => v.lang.startsWith('ar') && v.name.toLowerCase().includes('male'))
    || voices.find((v) => v.lang.startsWith('ar'))
    || voices[0];

  if (arabicVoice) {
    utterance.voice = arabicVoice;
  }

  if (onEnd) {
    utterance.onend = onEnd;
  }

  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stopWebSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
