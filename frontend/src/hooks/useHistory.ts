import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

export function useHistoryList() {
  return useQuery({
    queryKey: ['history'],
    queryFn: () => apiFetch('/api/pipeline/history/list'),
  });
}

export function useLoadHistorySession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (sessionId: string) => apiFetch(`/api/pipeline/history/${sessionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });
}

export function useDeleteHistorySession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiFetch(`/api/pipeline/history/${sessionId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });
}