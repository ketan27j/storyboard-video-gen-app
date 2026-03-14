import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';

export interface ImageData {
  index: number;
  label: string;
  prompt: string;
  generatedUrl?: string;
  localPath?: string;
  status: 'pending' | 'generating' | 'done' | 'error';
}

export interface VideoData {
  index: number;
  inputImages: string;
  rawPrompt: string;
  optimizedPrompt?: string;
  generatedUrl?: string;
  localPath?: string;
  status: 'pending' | 'generating' | 'done' | 'error';
}

export interface SceneData {
  sceneNumber: number;
  sceneText: string;
  goal?: string;
  location?: string;
  charactersPresent: string[];
  characterDescriptions: Record<string, string>;
  characterImagePrompts: string[];
  imageSequence: ImageData[];
  videoMotionPrompts: VideoData[];
  approved: boolean;
  skipped: boolean;
}

export const PipelineStateAnnotation = Annotation.Root({
  sessionId: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  movieIdea: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  storySnapshot: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  characterDefinitions: Annotation<Record<string, string>>({
    reducer: (_, next) => next,
    default: () => ({}),
  }),
  scenes: Annotation<SceneData[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  finalResolution: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  currentSceneIndex: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  scenesApproved: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
  currentSceneApproved: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
  regenerateScenes: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
  regenerateCurrentScene: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
  lastError: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
});

export type PipelineState = typeof PipelineStateAnnotation.State;
