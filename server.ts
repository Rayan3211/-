import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// Shared Gemini client utility
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Please check Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// TTS Narration endpoint
app.post('/api/tts/narrate', async (req: Request, res: Response) => {
  try {
    const { text, voice = 'Charon', stylePrompt } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text is required for narration.' });
      return;
    }

    const ai = getGeminiClient();

    // Default documentary narrator style instruction
    const defaultDocumentaryStyle =
      'A deep, authoritative, dignified male documentary narrator speaking flawless classical Modern Standard Arabic (فصحى). ' +
      'Pace is measured, deliberate and slow to moderate. Respect all vocalic diacritics (tashkeel). ' +
      'Punctuate with subtle, dramatic pauses at punctuation marks. Conclude with reflective solemnity.';

    const effectiveStyle = stylePrompt || defaultDocumentaryStyle;

    // Use flagship gemini-3.8-flash-tts first, with fallback to gemini-3.8-flash-lite-tts
    const modelsToTry = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];
    let base64Audio: string | undefined;
    let mimeType = 'audio/wav';
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text,
                  speechMetadata: {
                    style: effectiveStyle,
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voice, // 'Charon' (deep male), 'Fenrir', 'Puck', 'Kore', 'Zephyr'
                },
              },
            },
          },
        });

        const candidate = response.candidates?.[0];
        const audioPart = candidate?.content?.parts?.find(
          (part: any) => part?.inlineData && part?.inlineData?.data
        );

        const inlineData = audioPart?.inlineData;
        if (inlineData?.data) {
          base64Audio = inlineData.data;
          mimeType = inlineData.mimeType || 'audio/wav';
          break;
        }
      } catch (e: any) {
        lastError = e;
        console.warn(`Attempt with ${model} failed, trying alternative if available...`, e.message);
      }
    }

    if (!base64Audio) {
      console.error('All TTS models failed:', lastError);
      res.status(lastError?.status || 500).json({
        error: lastError?.message || 'No audio data received from Gemini TTS models.',
      });
      return;
    }

    // If sceneId is specified and saveToDisk is requested, persist directly to public/audio/
    const { sceneId, saveToDisk = true } = req.body;
    if (sceneId && saveToDisk) {
      try {
        const fs = await import('fs');
        const audioDir = path.resolve(process.cwd(), 'public/audio');
        if (!fs.existsSync(audioDir)) {
          fs.mkdirSync(audioDir, { recursive: true });
        }
        const targetPath = path.join(audioDir, `scene_${sceneId}.wav`);
        fs.writeFileSync(targetPath, Buffer.from(base64Audio, 'base64'));
        console.log(`Saved updated audio for Scene ${sceneId} to ${targetPath}`);
      } catch (saveErr) {
        console.warn(`Could not save audio to disk for Scene ${sceneId}:`, saveErr);
      }
    }

    res.json({
      success: true,
      audioBase64: base64Audio,
      mimeType,
      voice,
      savedToDisk: !!sceneId,
    });
  } catch (err: any) {
    console.error('Error generating narration audio:', err);
    res.status(500).json({
      error: err.message || 'Failed to generate narration audio',
      code: err.status || 500,
    });
  }
});

// Setup Vite middlewares in development or serve static in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        port,
        host: '0.0.0.0',
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, '../dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Documentary Narrator server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
