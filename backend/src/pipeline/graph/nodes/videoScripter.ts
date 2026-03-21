import { PipelineState, SceneData, ImageData, VideoData } from '../state';
import { createLLM } from '../../../common/llm.factory';
import { HumanMessage } from '@langchain/core/messages';
import * as fs from 'fs';
import * as path from 'path';

function loadPrompt(): string {
  const promptsDir = process.env.PROMPTS_DIR || path.join(__dirname, '../../../../../prompts');
  try {
    return fs.readFileSync(path.join(promptsDir, 'video_gen.txt'), 'utf-8');
  } catch {
    return `You are a cinematic storyboard AI. Given a scene description with characters, generate:

SECTION 1: CHARACTER IMAGE PROMPTS
For each character present, create a detailed image prompt:
CHARACTER PROMPT [NAME]: [detailed visual description for generating a character reference image]

SECTION 2: IMAGE SEQUENCE
Create 3-4 sequential images that tell the scene story:
IMAGE 1: [label]
Prompt: [detailed image generation prompt]

IMAGE 2: [label]
Prompt: [detailed image generation prompt]

IMAGE 3: [label]
Prompt: [detailed image generation prompt]

SECTION 3: VIDEO MOTION PROMPTS
For each image, create a video motion prompt:
VIDEO 1 (uses IMAGE 1): [motion description — what moves, how the camera behaves]
VIDEO 2 (uses IMAGE 2): [motion description]
VIDEO 3 (uses IMAGE 3): [motion description]`;
  }
}

function parseVideoScriptOutput(raw: string, sceneNumber: number): {
  characterImagePrompts: string[];
  imageSequence: ImageData[];
  videoMotionPrompts: VideoData[];
} {
  const characterImagePrompts: string[] = [];
  const charSection = extractSection(raw, 'CHARACTER IMAGE PROMPTS', 'IMAGE SEQUENCE');
  if (charSection) {
    const lines = charSection.split('\n');
    for (const line of lines) {
      const match = line.match(/CHARACTER PROMPT[^:]*:\s*(.+)/i);
      if (match) characterImagePrompts.push(match[1].trim());
    }
  }

  // Parse image sequence
  const imageSequence: ImageData[] = [];
  const imageMatches = raw.matchAll(/IMAGE\s+(\d+)(?:[^:]*)?:\s*([^\n]+)\nPrompt:\s*([\s\S]+?)(?=IMAGE\s+\d+|VIDEO\s+\d+|SECTION|$)/gi);
  for (const m of imageMatches) {
    const idx = parseInt(m[1]) - 1;
    const label = m[2].trim();
    const prompt = m[3].trim();
    imageSequence.push({
      index: idx,
      label,
      prompt,
      status: 'pending',
    });
  }

  // Fallback: simpler image parsing
  if (imageSequence.length === 0) {
    const imgSection = extractSection(raw, 'IMAGE SEQUENCE', 'VIDEO MOTION PROMPTS') ||
      extractSection(raw, 'SECTION 2', 'SECTION 3');
    if (imgSection) {
      const matches = imgSection.matchAll(/IMAGE\s+(\d+)[^:]*:\s*(.+)/gi);
      let i = 0;
      for (const m of matches) {
        imageSequence.push({
          index: i,
          label: m[2].trim(),
          prompt: m[2].trim(),
          status: 'pending',
        });
        i++;
      }
    }
  }

  // Parse video prompts
  const videoMotionPrompts: VideoData[] = [];
  const videoSection = extractSection(raw, 'VIDEO MOTION PROMPTS', null) ||
    extractSection(raw, 'SECTION 3', null);
  if (videoSection) {
    const videoMatches = videoSection.matchAll(/VIDEO\s+(\d+)\s*\(uses?\s*(IMAGE\s*\d+[^)]*)\)[^:]*:\s*([\s\S]+?)(?=VIDEO\s+\d+|$)/gi);
    for (const m of videoMatches) {
      const idx = parseInt(m[1]) - 1;
      videoMotionPrompts.push({
        index: idx,
        inputImages: m[2].trim(),
        rawPrompt: m[3].trim(),
        status: 'pending',
      });
    }

    // Fallback: simpler video parsing
    if (videoMotionPrompts.length === 0) {
      const lines = videoSection.split('\n');
      let i = 0;
      for (const line of lines) {
        const match = line.match(/VIDEO\s+(\d+)[^:]*:\s*(.+)/i);
        if (match) {
          videoMotionPrompts.push({
            index: i,
            inputImages: `IMAGE ${i + 1}`,
            rawPrompt: match[2].trim(),
            status: 'pending',
          });
          i++;
        }
      }
    }
  }

  return { characterImagePrompts, imageSequence, videoMotionPrompts };
}

function extractSection(text: string, startMarker: string, endMarker: string | null): string {
  const upper = text.toUpperCase();
  const startIdx = upper.indexOf(startMarker.toUpperCase());
  if (startIdx === -1) return '';
  let start = text.indexOf('\n', startIdx) + 1;
  let end = text.length;
  if (endMarker) {
    const endIdx = upper.indexOf(endMarker.toUpperCase(), start);
    if (endIdx !== -1) end = endIdx;
  }
  return text.slice(start, end).trim();
}

export async function processSceneNode(
  state: PipelineState,
): Promise<Partial<PipelineState>> {
  const llm = await createLLM();
  const promptTemplate = loadPrompt();
  const sceneIdx = state.currentSceneIndex;
  const scene = state.scenes[sceneIdx];

  if (!scene) {
    return { lastError: `Scene ${sceneIdx} not found` };
  }

  const charBlock = Object.entries(scene.characterDescriptions)
    .map(([name, desc]) => `${name}: ${desc}`)
    .join('\n');

  const prompt = `${promptTemplate}

Scene Number: ${scene.sceneNumber}
Goal: ${scene.goal || ''}
Location: ${scene.location || ''}
Description: ${scene.sceneText}

Characters present:
${charBlock || '(none defined)'}

Generate the complete image sequence and video prompts for this scene.`;

  let fullText = '';
  const stream = await llm.stream([new HumanMessage(prompt)]);
  for await (const chunk of stream) {
    fullText += chunk.content;
  }

  const parsed = parseVideoScriptOutput(fullText, scene.sceneNumber);

  const updatedScenes = [...state.scenes];
  updatedScenes[sceneIdx] = {
    ...scene,
    characterImagePrompts: parsed.characterImagePrompts,
    imageSequence: parsed.imageSequence,
    videoMotionPrompts: parsed.videoMotionPrompts,
  };

  return {
    scenes: updatedScenes,
    regenerateCurrentScene: false,
  };
}
