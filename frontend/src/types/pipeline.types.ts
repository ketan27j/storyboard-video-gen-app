export type Screen = 'idea' | 'plan' | 'workshop' | 'gallery';

export type GenerationStatus = 'pending' | 'generating' | 'done' | 'error';

export interface ImageData {
  index: number;
  label: string;
  prompt: string;
  generatedUrl?: string;
  localPath?: string;
  customUploadUrl?: string; // URL for user-uploaded custom image
  status: GenerationStatus;
}

export interface VideoData {
  index: number;
  inputImages: string;
  rawPrompt: string;
  optimizedPrompt?: string;
  generatedUrl?: string;
  localPath?: string;
  status: GenerationStatus;
}

export interface SceneData {
  sceneNumber: number;
  sceneText: string;
  goal?: string;
  location?: string;
  charactersPresent: string[];
  characterDescriptions: Record<string, string>;
  characterImagePrompts: string[];
  characterReferenceImages?: Record<string, string>;
  imageSequence: ImageData[];
  videoMotionPrompts: VideoData[];
  approved: boolean;
  skipped: boolean;
}

export interface PipelineState {
  sessionId: string | null;
  movieIdea: string;
  storySnapshot: string;
  characterDefinitions: Record<string, string>;
  scenes: SceneData[];
  finalResolution: string;
  currentSceneIndex: number;
  scenesApproved: boolean;
}
