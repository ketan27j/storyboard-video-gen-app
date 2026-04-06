import { create } from 'zustand';
import { Screen, SceneData, ImageData, VideoData } from '../types/pipeline.types';

interface ReferenceImageState {
  status: 'idle' | 'generating' | 'done' | 'error';
  url?: string;
}

interface PipelineStore {
  // Session
  sessionId: string | null;
  screen: Screen;

  // Pipeline state
  movieIdea: string;
  storySnapshot: string;
  characterDefinitions: Record<string, string>;
  scenes: SceneData[];
  currentSceneIndex: number;
  finalResolution: string;

  // UI state
  isLoading: boolean;
  streamingText: string;
  interruptType: string | null;
  error: string | null;

  // Reference image state
  referenceImage: ReferenceImageState;

  // Actions
  setSessionId: (id: string) => void;
  setScreen: (screen: Screen) => void;
  setMovieIdea: (idea: string) => void;
  setLoading: (loading: boolean) => void;
  setStreamingText: (text: string) => void;
  setError: (error: string | null) => void;
  setReferenceImageStatus: (data: Partial<ReferenceImageState>) => void;
  updateFromBackend: (state: Partial<PipelineStore>) => void;
  updateImageStatus: (sceneIdx: number, imgIdx: number, data: Partial<ImageData>) => void;
  updateVideoStatus: (sceneIdx: number, vidIdx: number, data: Partial<VideoData>) => void;
  setState: (state: Partial<PipelineStore>) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  screen: 'idea' as Screen,
  movieIdea: '',
  storySnapshot: '',
  characterDefinitions: {},
  scenes: [],
  currentSceneIndex: 0,
  finalResolution: '',
  isLoading: false,
  streamingText: '',
  interruptType: null,
  error: null,
  referenceImage: { status: 'idle' } as ReferenceImageState,
};

export const usePipelineStore = create<PipelineStore>((set) => ({
  ...initialState,

  setSessionId: (id) => set({ sessionId: id }),
  setScreen: (screen) => set({ screen }),
  setMovieIdea: (idea) => set({ movieIdea: idea }),
  setLoading: (isLoading) => set({ isLoading }),
  setStreamingText: (streamingText) => set({ streamingText }),
  setError: (error) => set({ error }),
  setReferenceImageStatus: (data) => set((prev) => ({
    referenceImage: { ...prev.referenceImage, ...data }
  })),

  updateFromBackend: (state) => set((prev) => ({ ...prev, ...state })),
  
  setState: (state) => set((prev) => ({ ...prev, ...state })),

  updateImageStatus: (sceneIdx, imgIdx, data) =>
    set((state) => {
      const scenes = [...state.scenes];
      if (!scenes[sceneIdx]) return state;
      const imageSequence = [...scenes[sceneIdx].imageSequence];
      if (!imageSequence[imgIdx]) return state;
      imageSequence[imgIdx] = { ...imageSequence[imgIdx], ...data };
      scenes[sceneIdx] = { ...scenes[sceneIdx], imageSequence };
      return { scenes };
    }),

  updateVideoStatus: (sceneIdx, vidIdx, data) =>
    set((state) => {
      const scenes = [...state.scenes];
      if (!scenes[sceneIdx]) return state;
      const videoMotionPrompts = [...scenes[sceneIdx].videoMotionPrompts];
      if (!videoMotionPrompts[vidIdx]) return state;
      videoMotionPrompts[vidIdx] = { ...videoMotionPrompts[vidIdx], ...data };
      scenes[sceneIdx] = { ...scenes[sceneIdx], videoMotionPrompts };
      return { scenes };
    }),

  reset: () => set(initialState),
}));
