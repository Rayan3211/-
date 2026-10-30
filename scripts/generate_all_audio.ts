import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { MUDROS_SCENES } from '../src/data/mudrosScript';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Error: GEMINI_API_KEY not found in environment.');
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const outputDir = path.resolve(process.cwd(), 'public/audio');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateSceneAudio(scene: any) {
  const filename = `scene_${scene.id}.wav`;
  const filePath = path.join(outputDir, filename);

  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
    console.log(`[Scene ${scene.id}] Already exists, skipping.`);
    return;
  }

  console.log(`[Scene ${scene.id}] Generating with gemini-3.8-flash-tts: "${scene.title}"...`);

  // Models to try in order
  const models = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: scene.cleanNarrationText,
                speechMetadata: {
                  style: scene.speechStyleInstruction,
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
                voiceName: 'Charon',
              },
            },
          },
        },
      });

      const candidate = response.candidates?.[0];
      const inlineData = candidate?.content?.parts?.[0]?.inlineData;
      const base64Audio = inlineData?.data;

      if (base64Audio) {
        const buffer = Buffer.from(base64Audio, 'base64');
        fs.writeFileSync(filePath, buffer);
        console.log(`✓ Saved ${filename} (${buffer.length} bytes) using ${model}`);
        return;
      }
    } catch (err: any) {
      console.warn(`Attempt with ${model} failed: ${err.message}. Trying next if available...`);
    }
  }
}

async function run() {
  for (const scene of MUDROS_SCENES) {
    await generateSceneAudio(scene);
    // Pause briefly to be polite with rate limits
    await new Promise((r) => setTimeout(r, 1500));
  }
  console.log('Finished generating audio!');
}

run();
