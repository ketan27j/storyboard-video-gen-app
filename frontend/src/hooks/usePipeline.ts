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
    mutationFn: (regenerate = false) =>
      apiFetch(`/api/pipeline/${sessionId}/approve-plan`, {
        method: 'POST',
        body: JSON.stringify({ regenerate }),
      }),
    onSuccess: () => setLoading(true),
  });
}

export function useApproveScene() {
  const { sessionId, setLoading } = usePipelineStore();

  return useMutation({
    mutationFn: ({ regenerate = false, skip = false } = {}) =>
      apiFetch(`/api/pipeline/${sessionId}/approve-scene`, {
        method: 'POST',
        body: JSON.stringify({ regenerate, skip }),
      }),
    onSuccess: () => setLoading(true),
  });
}

export function useGenerateImage() {
  const { sessionId, updateImageStatus } = usePipelineStore();

  return useMutation({
    mutationFn: ({
      sceneIndex, imageIndex, prompt,
    }: { sceneIndex: number; imageIndex: number; prompt: string }) => {
      updateImageStatus(sceneIndex, imageIndex, { status: 'generating' });
      return apiFetch(`/api/pipeline/${sessionId}/generate-image`, {
        method: 'POST',
        body: JSON.stringify({ sceneIndex, imageIndex, prompt }),
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
