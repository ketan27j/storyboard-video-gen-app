import { usePipelineStore } from '../../stores/pipelineStore';
import { useApprovePlan } from '../../hooks/usePipeline';
import { CharacterBadge } from '../ui/CharacterBadge';
import { EditableCharacter } from '../ui/EditableCharacter';
import { SceneCard } from '../ui/SceneCard';
import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../hooks/useSocket';

export function StoryPlanReview() {
  const { storySnapshot, characterDefinitions, scenes, isLoading, streamingText, sessionId } = usePipelineStore();
  const approvePlan = useApprovePlan();
  useSocket(sessionId);
  const [uploadedCharacterImages, setUploadedCharacterImages] = useState<Record<string, string>>({});
  const [generatingForCharacter, setGeneratingForCharacter] = useState<Record<string, boolean>>({});

  const characterEntries = Object.entries(characterDefinitions);

  // Listen for character image generation progress via custom event
  useEffect(() => {
    const handleCharacterImageProgress = (event: CustomEvent) => {
      const { characterName, status, url } = event.detail;
      console.log('Received character image progress:', { characterName, status, url });

      if (status === 'generating') {
        setGeneratingForCharacter(prev => ({ ...prev, [characterName]: true }));
      } else if (status === 'done' && url) {
        setGeneratingForCharacter(prev => ({ ...prev, [characterName]: false }));
        setUploadedCharacterImages(prev => ({
          ...prev,
          [characterName]: url
        }));
      } else if (status === 'error') {
        setGeneratingForCharacter(prev => ({ ...prev, [characterName]: false }));
        console.error('Character image generation failed for:', characterName);
      }
    };

    window.addEventListener('character-image-progress', handleCharacterImageProgress as EventListener);

    return () => {
      window.removeEventListener('character-image-progress', handleCharacterImageProgress as EventListener);
    };
  }, []);

  const handleCharacterImageUpload = async (characterName: string, file: File) => {
    if (!sessionId) return;

    // Create a local preview URL
    const previewUrl = URL.createObjectURL(file);
    
    // Optimistically update the UI with the preview
    setUploadedCharacterImages(prev => ({
      ...prev,
      [characterName]: previewUrl
    }));

    // Upload to backend
    const reader = new FileReader();
    reader.onload = async () => {
      const imageData = reader.result as string;
      
      try {
        const response = await fetch(`/api/pipeline/${sessionId}/upload-character-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            characterName,
            imageData
          }),
        });

        if (!response.ok) {
          console.error('Failed to upload character image');
          // Revert the optimistic update on failure
          setUploadedCharacterImages(prev => {
            const updated = { ...prev };
            delete updated[characterName];
            return updated;
          });
        } else {
          const result = await response.json();
          console.log('Character image uploaded:', result);
        }
      } catch (error) {
        console.error('Error uploading character image:', error);
        // Revert the optimistic update on error
        setUploadedCharacterImages(prev => {
          const updated = { ...prev };
          delete updated[characterName];
          return updated;
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateCharacterImage = useCallback(async (characterName: string, characterDescription: string) => {
    if (!sessionId || !storySnapshot) return;

    // Set generating state
    setGeneratingForCharacter(prev => ({ ...prev, [characterName]: true }));

    // Create a prompt that combines the story context with the character description
    const prompt = `Character reference image for "${characterName}": ${characterDescription}. Story context: ${storySnapshot}. Generate a clear, well-lit portrait-style image of this character suitable for use as a visual reference for consistent character appearance across scenes. Full body or half-body shot, neutral background, professional character design sheet style.`;

    console.log('Generating character image for:', characterName);
    console.log('Prompt:', prompt);
    console.log('Session ID:', sessionId);

    try {
      const response = await fetch(`/api/pipeline/${sessionId}/generate-character-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterName,
          prompt
        }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to queue character image generation:', errorText);
        setGeneratingForCharacter(prev => ({ ...prev, [characterName]: false }));
      } else {
        const result = await response.json();
        console.log('Character image generation queued:', result);
      }
    } catch (error) {
      console.error('Error queuing character image generation:', error);
      setGeneratingForCharacter(prev => ({ ...prev, [characterName]: false }));
    }
  }, [sessionId, storySnapshot]);

  return (
    <div className="min-h-screen px-6 py-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-mono text-amber-400/70 tracking-widest mb-1">STEP 2 OF 4 · STORY PLAN</p>
        <h2 className="text-3xl font-black text-white">Review Your Story Plan</h2>
        <p className="text-stone-500 text-sm mt-1">
          Approve to continue to the scene workshop, or regenerate for a different take.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8">
        {/* Story Snapshot */}
        <div className="border border-stone-700/50 rounded-2xl p-5 bg-stone-900/30">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">📖</span>
            <h3 className="text-sm font-bold text-stone-300 tracking-wide">STORY SNAPSHOT</h3>
          </div>
          {storySnapshot ? (
            <p className="text-sm text-stone-300 leading-relaxed">{storySnapshot}</p>
          ) : streamingText ? (
            <p className="text-sm text-stone-300 leading-relaxed font-mono">
              {streamingText}
              <span className="inline-block w-0.5 h-4 bg-amber-400 ml-0.5 align-middle animate-pulse" />
            </p>
          ) : (
            <div className="space-y-2">
              {[80, 60, 90, 50].map((w, i) => (
                <div key={i} className={`h-3 bg-stone-800 rounded animate-pulse`} style={{ width: `${w}%` }} />
              ))}
            </div>
          )}
        </div>

        {/* Characters */}
        <div className="border border-stone-700/50 rounded-2xl p-5 bg-stone-900/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">👥</span>
              <h3 className="text-sm font-bold text-stone-300 tracking-wide">CHARACTERS</h3>
            </div>
            <p className="text-xs text-stone-500">Upload or generate character images for consistent appearance</p>
          </div>
          {characterEntries.length > 0 ? (
            <div className="space-y-4">
              {characterEntries.map(([name, desc], i) => (
                <div
                  key={name}
                  className="animate-fade-in"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <EditableCharacter
                    name={name}
                    description={desc}
                    uploadedImageUrl={uploadedCharacterImages[name]}
                    onImageUpload={handleCharacterImageUpload}
                    onGenerateImage={() => handleGenerateCharacterImage(name, desc)}
                    onRegenerateImage={() => handleGenerateCharacterImage(name, desc)}
                    isGenerating={generatingForCharacter[name] || false}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-stone-800/50 rounded-lg animate-pulse" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scene Cards */}
      {scenes.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-bold text-stone-400 tracking-widest mb-3 flex items-center gap-2">
            <span>🎬</span> SCENE BREAKDOWN
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {scenes.map((scene, i) => (
              <div
                key={scene.sceneNumber}
                className="animate-fade-in"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
              >
                <SceneCard scene={scene} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading skeleton for scenes */}
      {scenes.length === 0 && !streamingText && (
        <div className="mb-8">
          <div className="h-4 w-32 bg-stone-800 rounded animate-pulse mb-3" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-stone-900/50 rounded-xl border border-stone-800 animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 sticky bottom-6">
        <button
          onClick={() => approvePlan.mutate({ regenerate: false })}
          disabled={isLoading || scenes.length === 0}
          className="flex-1 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-600 text-black font-black text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              PROCESSING…
            </>
          ) : (
            '✅ APPROVE PLAN'
          )}
        </button>
        <button
          onClick={() => approvePlan.mutate({ regenerate: true })}
          disabled={isLoading}
          className="sm:w-48 py-3.5 rounded-xl bg-black border border-stone-600 hover:border-stone-400 text-stone-400 hover:text-stone-200 font-bold text-sm tracking-widest uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          🔄 REGENERATE
        </button>
      </div>
    </div>
  );
}