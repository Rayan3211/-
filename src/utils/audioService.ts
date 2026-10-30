export interface NarrationResponse {
  success: boolean;
  audioBase64?: string;
  mimeType?: string;
  voice?: string;
  error?: string;
  savedToDisk?: boolean;
}

// In-memory cache for generated or loaded audio blobs: key = `${sceneId}_${voice}` or custom
const audioCache = new Map<string, { blob?: Blob; url: string; base64?: string }>();

/**
 * Returns audio for a scene.
 * If isCustomEdited is false and default voice is selected, loads the pre-rendered studio WAV (/audio/scene_{id}.wav).
 * Otherwise, requests a freshly generated audio from the Gemini TTS server.
 */
export async function getSceneAudio(
  sceneId: number,
  cleanText: string,
  voice: string = 'Charon',
  stylePrompt?: string,
  isCustomEdited: boolean = false
): Promise<{ url: string; blob?: Blob }> {
  const cacheKey = `scene_${sceneId}_${voice}_${isCustomEdited ? cleanText.slice(0, 30) : 'default'}`;

  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey)!;
  }

  // If using the official documentary script and Charon voice, load the bundled permanent WAV
  if (!isCustomEdited && (voice === 'Charon' || !voice)) {
    try {
      const staticUrl = `/audio/scene_${sceneId}.wav`;
      const headCheck = await fetch(staticUrl, { method: 'HEAD' });
      if (headCheck.ok) {
        const entry = { url: staticUrl };
        audioCache.set(cacheKey, entry);
        return entry;
      }
    } catch {
      // Fall through to server generation if file not found
    }
  }

  // Generate on server with Gemini TTS
  return await fetchNarrationAudio(cleanText, voice, stylePrompt, cacheKey, sceneId);
}

export async function fetchNarrationAudio(
  text: string,
  voice: string = 'Charon',
  stylePrompt?: string,
  cacheKey?: string,
  sceneId?: number
): Promise<{ url: string; blob: Blob; base64: string }> {
  const res = await fetch('/api/tts/narrate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voice,
      stylePrompt,
      sceneId,
      saveToDisk: !!sceneId,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: فشل توليد الصوت من نموذج Gemini`);
  }

  const data: NarrationResponse = await res.json();
  if (!data.audioBase64) {
    throw new Error('لم يتم استلام بيانات صوتية من الخادم');
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

export async function downloadAudioFromUrl(url: string, filename: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    downloadWavBlob(blob, filename);
  } catch (err) {
    console.error('Failed to download audio file:', err);
  }
}
