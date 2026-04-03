import { useEffect, useRef } from 'react';
import { usePipelineStore } from '../stores/pipelineStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

export function useSocket(sessionId: string | null) {
  const store = usePipelineStore();
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (!sessionId) return;

    // Dynamically import socket.io-client
    import('socket.io-client').then(({ io }) => {
      const socket = io(`${WS_URL}/pipeline`, {
        transports: ['websocket'],
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join_session', { sessionId });
      });

      socket.on('pipeline:status', ({ status }: { status: string }) => {
        store.setLoading(status === 'running');
      });

      socket.on('pipeline:interrupt', ({ type, state }: { type: string; state: any }) => {
        store.updateFromBackend(state);
        store.setLoading(false);
        if (type === 'approve_plan') store.setScreen('plan');
        if (type === 'approve_scene') store.setScreen('workshop');
        store.setStreamingText('');
      });

      socket.on('pipeline:update', ({ state }: { state: any }) => {
        store.updateFromBackend(state);
      });

      socket.on('pipeline:stream', ({ text }: { text: string }) => {
        store.setStreamingText(text);
      });

      socket.on('pipeline:complete', ({ state }: { state: any }) => {
        store.updateFromBackend(state);
        store.setLoading(false);
        store.setScreen('gallery');
      });

      socket.on('pipeline:error', ({ message }: { message: string }) => {
        store.setError(message);
        store.setLoading(false);
      });

      socket.on('image:progress', ({
        sceneIndex, imageIndex, status, url,
      }: { sceneIndex: number; imageIndex: number; status: string; url?: string }) => {
        store.updateImageStatus(sceneIndex, imageIndex, {
          status: status as any,
          generatedUrl: url,
        });
      });

      socket.on('video:progress', ({
        sceneIndex, videoIndex, status, url,
      }: { sceneIndex: number; videoIndex: number; status: string; url?: string }) => {
        store.updateVideoStatus(sceneIndex, videoIndex, {
          status: status as any,
          generatedUrl: url,
        });
      });

      socket.on('reference-image:progress', ({
        status, url,
      }: { status: string; url?: string }) => {
        store.setReferenceImageStatus({
          status: status as any,
          url,
        });
      });

      socket.on('character-image:progress', ({
        characterName, status, url,
      }: { characterName: string; status: string; url?: string }) => {
        console.log('Character image progress:', { characterName, status, url });
        // Emit a custom event that StoryPlanReview can listen to
        window.dispatchEvent(new CustomEvent('character-image-progress', { 
          detail: { characterName, status, url } 
        }));
      });

      return () => {
        socket.disconnect();
      };
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [sessionId]);

  return socketRef;
}
