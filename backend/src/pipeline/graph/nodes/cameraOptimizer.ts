import { PipelineState } from '../state';
import { createLLM } from '../../../common/llm.factory';
import { HumanMessage } from '@langchain/core/messages';
import * as fs from 'fs';
import * as path from 'path';

function loadCameraRef(): string {
  const promptsDir = process.env.PROMPTS_DIR || path.join(__dirname, '../../../../../prompts');
  try {
    return fs.readFileSync(path.join(promptsDir, 'camera_moves.txt'), 'utf-8');
  } catch {
    return `Camera moves reference:
- Slow push in: Camera slowly moves toward subject, building tension
- Pull back reveal: Camera pulls back to reveal larger environment
- Dutch angle: Camera tilted to convey unease or disorientation
- Overhead crane shot: Bird's eye view descending to subject
- Tracking shot: Camera follows subject laterally
- Whip pan: Fast horizontal camera swing between subjects
- Rack focus: Focus shifts between foreground and background subjects
- Dolly zoom: Zoom out while tracking in (Vertigo effect)
- Low angle: Camera points up at subject, conveying power
- Over-the-shoulder: Camera positioned behind a character's shoulder`;
  }
}

export async function optimizeCameraNode(
  state: PipelineState,
): Promise<Partial<PipelineState>> {
  const llm = createLLM();
  const cameraRef = loadCameraRef();
  const sceneIdx = state.currentSceneIndex;
  const scene = state.scenes[sceneIdx];

  if (!scene || scene.videoMotionPrompts.length === 0) {
    return {};
  }

  const promptsBlock = scene.videoMotionPrompts
    .map((v, i) => `VIDEO ${i + 1}: ${v.rawPrompt}`)
    .join('\n\n');

  const prompt = `${cameraRef}

Given these video motion prompts for a cinematic scene, enrich each one with the most appropriate camera move from the reference above. Add the camera technique naturally into the prompt wording.

Scene context: ${scene.goal || scene.sceneText}

Original prompts:
${promptsBlock}

Output format — one line per video, starting with "VIDEO N OPTIMIZED:":
VIDEO 1 OPTIMIZED: [enriched prompt with camera technique integrated]
VIDEO 2 OPTIMIZED: [enriched prompt]
(and so on for each video)`;

  let fullText = '';
  const stream = await llm.stream([new HumanMessage(prompt)]);
  for await (const chunk of stream) {
    fullText += chunk.content;
  }

  // Parse optimized prompts
  const updatedVideos = [...scene.videoMotionPrompts];
  const lines = fullText.split('\n');
  for (const line of lines) {
    const match = line.match(/VIDEO\s+(\d+)\s+OPTIMIZED:\s*(.+)/i);
    if (match) {
      const idx = parseInt(match[1]) - 1;
      if (updatedVideos[idx]) {
        updatedVideos[idx] = {
          ...updatedVideos[idx],
          optimizedPrompt: match[2].trim(),
        };
      }
    }
  }

  const updatedScenes = [...state.scenes];
  updatedScenes[sceneIdx] = { ...scene, videoMotionPrompts: updatedVideos };

  return { scenes: updatedScenes };
}
