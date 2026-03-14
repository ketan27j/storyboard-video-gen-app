import { PipelineState, SceneData } from '../state';
import { createLLM } from '../../../common/llm.factory';
import { HumanMessage } from '@langchain/core/messages';
import * as fs from 'fs';
import * as path from 'path';

function loadPrompt(filename: string): string {
  const promptsDir = process.env.PROMPTS_DIR || path.join(__dirname, '../../../../prompts');
  const filePath = path.join(promptsDir, filename);
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    // Fallback inline prompt if file not found
    return `You are a professional screenwriter. Given a movie idea, generate:

STEP 1: STORY SNAPSHOT
A 2-3 sentence description of the overall story.

STEP 2: CHARACTER DEFINITIONS
List each major character with name and description (one per line):
CHARACTER: [NAME] — [description]

STEP 3: SCENE BREAKDOWN
Break the story into 4-6 scenes. For each scene:
SCENE [N]:
Goal: [what happens in this scene]
Location: [where it takes place]
Characters present: [comma-separated character names]
Description: [2-3 sentences describing the scene]

FINAL RESOLUTION:
[One sentence summing up the story outcome]`;
  }
}

function parseSceneOutput(raw: string): {
  storySnapshot: string;
  characterDefinitions: Record<string, string>;
  scenes: SceneData[];
  finalResolution: string;
} {
  const storySnapshot = extractSection(raw, 'STORY SNAPSHOT', 'CHARACTER DEFINITIONS') ||
    extractSection(raw, 'STORY SNAPSHOT', 'SCENE BREAKDOWN') || '';

  const charSection = extractSection(raw, 'CHARACTER DEFINITIONS', 'SCENE BREAKDOWN') || '';
  const characterDefinitions: Record<string, string> = {};
  const charLines = charSection.split('\n');
  for (const line of charLines) {
    const match = line.match(/CHARACTER:\s*([^—\-]+)[—\-]\s*(.+)/i) ||
      line.match(/^([A-Z][A-Z\s]+)[—\-:]\s*(.+)/);
    if (match) {
      const name = match[1].trim().toUpperCase();
      const desc = match[2].trim();
      if (name && desc) characterDefinitions[name] = desc;
    }
  }

  // Parse scenes
  const sceneMatches = raw.matchAll(/SCENE\s+(\d+)[\s\S]*?(?=SCENE\s+\d+|FINAL RESOLUTION|$)/gi);
  const scenes: SceneData[] = [];
  for (const m of sceneMatches) {
    const block = m[0];
    const num = parseInt(m[1]);
    const goal = extractField(block, 'Goal') || extractField(block, 'Title');
    const location = extractField(block, 'Location');
    const charsRaw = extractField(block, 'Characters present') || extractField(block, 'Characters');
    const description = extractField(block, 'Description') || extractField(block, 'Action');

    const charactersPresent = charsRaw
      ? charsRaw.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean)
      : [];

    // Filter character descriptions to only those present in this scene
    const characterDescriptions: Record<string, string> = {};
    for (const name of charactersPresent) {
      if (characterDefinitions[name]) {
        characterDescriptions[name] = characterDefinitions[name];
      }
    }

    scenes.push({
      sceneNumber: num,
      sceneText: description || block.trim(),
      goal,
      location,
      charactersPresent,
      characterDescriptions,
      characterImagePrompts: [],
      imageSequence: [],
      videoMotionPrompts: [],
      approved: false,
      skipped: false,
    });
  }

  const finalResolution = extractSection(raw, 'FINAL RESOLUTION', null) || '';

  return { storySnapshot, characterDefinitions, scenes, finalResolution };
}

function extractSection(text: string, startMarker: string, endMarker: string | null): string {
  const startIdx = text.toUpperCase().indexOf(startMarker.toUpperCase());
  if (startIdx === -1) return '';
  let start = text.indexOf('\n', startIdx) + 1;
  let end = text.length;
  if (endMarker) {
    const endIdx = text.toUpperCase().indexOf(endMarker.toUpperCase(), start);
    if (endIdx !== -1) end = endIdx;
  }
  return text.slice(start, end).trim();
}

function extractField(block: string, field: string): string {
  const regex = new RegExp(`${field}:\\s*(.+)`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : '';
}

export async function generateScenesNode(
  state: PipelineState,
  config?: any,
): Promise<Partial<PipelineState>> {
  const llm = createLLM();
  const promptTemplate = loadPrompt('char_scene_gen.txt');

  const prompt = promptTemplate.includes('{movieIdea}')
    ? promptTemplate.replace('{movieIdea}', state.movieIdea)
    : `${promptTemplate}\n\nMovie Idea: ${state.movieIdea}`;

  let fullText = '';
  const stream = await llm.stream([new HumanMessage(prompt)]);
  for await (const chunk of stream) {
    fullText += chunk.content;
  }

  const parsed = parseSceneOutput(fullText);

  return {
    storySnapshot: parsed.storySnapshot,
    characterDefinitions: parsed.characterDefinitions,
    scenes: parsed.scenes,
    finalResolution: parsed.finalResolution,
    regenerateScenes: false,
  };
}
