import { useMutation, useQuery } from '@tanstack/react-query';
import { usePipelineStore } from '../stores/pipelineStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

export function useStartPipeline() {
  const { setSessionId, setLoading, setError, setScreen } = usePipelineStore();

  return useMutation({
    mutationFn: (movieIdea: string) =>
      apiFetch('/api/pipeline/start', {
        method: 'POST',
        body: JSON.stringify({ movieIdea }),
      }),
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setLoading(true);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
      setLoading(false);
    },
  });
}

export function useApprovePlan() {
  const { sessionId, setLoading } = usePipelineStore();

  return useMutation({
    mutationFn: (variables: { regenerate?: boolean } = {}) =>
      apiFetch(`/api/pipeline/${sessionId}/approve-plan`, {
        method: 'POST',
        body: JSON.stringify({ regenerate: variables.regenerate ?? false }),
      }),
    onSuccess: () => setLoading(true),
  });
}

export function useApproveScene() {
  const { sessionId, setLoading } = usePipelineStore();

  return useMutation({
    mutationFn: (variables: { regenerate?: boolean; skip?: boolean } = {}) =>
      apiFetch(`/api/pipeline/${sessionId}/approve-scene`, {
        method: 'POST',
        body: JSON.stringify({ regenerate: variables.regenerate ?? false, skip: variables.skip ?? false }),
      }),
    onSuccess: () => setLoading(true),
  });
}

export function useUpdatePrompt() {
  const { sessionId, updateImageStatus, updateVideoStatus } = usePipelineStore();

  return useMutation({
    mutationFn: ({
      sceneIndex, type, index, prompt,
    }: { sceneIndex: number; type: 'image' | 'video'; index: number; prompt: string }) => {
      // Optimistically update frontend store
      if (type === 'image') {
        updateImageStatus(sceneIndex, index, { prompt });
      } else {
        updateVideoStatus(sceneIndex, index, { rawPrompt: prompt });
      }
      return apiFetch(`/api/pipeline/${sessionId}/update-prompt`, {
        method: 'POST',
        body: JSON.stringify({ sceneIndex, type, index, prompt }),
      });
    },
  });
}

export function useGenerateImage() {
  const { sessionId, updateImageStatus } = usePipelineStore();

  return useMutation({
    mutationFn: ({
      sceneIndex, imageIndex, prompt, referenceImages,
    }: { sceneIndex: number; imageIndex: number; prompt: string; referenceImages?: string[] }) => {
      updateImageStatus(sceneIndex, imageIndex, { status: 'generating' });
      return apiFetch(`/api/pipeline/${sessionId}/generate-image`, {
        method: 'POST',
        body: JSON.stringify({ sceneIndex, imageIndex, prompt, referenceImages }),
      });
    },
  });
}

export function useGenerateVideo() {
  const { sessionId, updateVideoStatus } = usePipelineStore();

  return useMutation({
    mutationFn: ({
      sceneIndex, videoIndex, prompt, imagePath,
    }: { sceneIndex: number; videoIndex: number; prompt: string; imagePath?: string }) => {
      updateVideoStatus(sceneIndex, videoIndex, { status: 'generating' });
      return apiFetch(`/api/pipeline/${sessionId}/generate-video`, {
        method: 'POST',
        body: JSON.stringify({ sceneIndex, videoIndex, prompt, imagePath }),
      });
    },
  });
}

export function usePipelineState() {
  const { sessionId } = usePipelineStore();

  return useQuery({
    queryKey: ['pipeline', sessionId],
    queryFn: () => apiFetch(`/api/pipeline/${sessionId}/state`),
    enabled: !!sessionId,
    refetchInterval: false,
  });
}

export function useDownloadAll() {
  const { sessionId } = usePipelineStore();

  return useMutation({
    mutationFn: (type: 'images' | 'videos') =>
      apiFetch(`/api/pipeline/${sessionId}/download-all?type=${type}`),
  });
}

export function useGenerateReferenceImage() {
  const { sessionId } = usePipelineStore();

  return useMutation({
    mutationFn: (prompt: string) =>
      apiFetch(`/api/pipeline/${sessionId}/generate-reference-image`, {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      }),
  });
}

export function useUploadSceneImage() {
  const { sessionId, updateImageStatus } = usePipelineStore();

  return useMutation({
    mutationFn: ({
      sceneIndex,
      imageIndex,
      imageData,
    }: {
      sceneIndex: number;
      imageIndex: number;
      imageData: string;
    }) => {
      // Optimistically update the UI
      updateImageStatus(sceneIndex, imageIndex, { status: 'generating' });
      return apiFetch(`/api/pipeline/${sessionId}/upload-scene-image`, {
        method: 'POST',
        body: JSON.stringify({ sceneIndex, imageIndex, imageData }),
      });
    },
    onSuccess: (data, variables) => {
      // Update with the uploaded image URL
      const { sceneIndex, imageIndex } = variables;
      updateImageStatus(sceneIndex, imageIndex, { 
        status: 'done',
        customUploadUrl: data.url 
      });
    },
    onError: (error, variables) => {
      // Revert to error state on failure
      const { sceneIndex, imageIndex } = variables;
      updateImageStatus(sceneIndex, imageIndex, { status: 'error' });
      console.error('Upload failed:', error);
    },
  });
}
