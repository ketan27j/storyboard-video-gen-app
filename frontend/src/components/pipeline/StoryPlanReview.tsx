import { usePipelineStore } from '../../stores/pipelineStore';
import { useApprovePlan } from '../../hooks/usePipeline';
import { useCharacterEdit } from '../../hooks/useCharacterEdit';
import { CharacterBadge } from '../ui/CharacterBadge';
import { EditableCharacter } from '../ui/EditableCharacter';
import { SceneCard } from '../ui/SceneCard';
import { useState } from 'react';
import { useSocket } from '../../hooks/useSocket';

export function StoryPlanReview() {
  const { storySnapshot, characterDefinitions, scenes, isLoading, streamingText, sessionId } = usePipelineStore();
  const approvePlan = useApprovePlan();
  const socketRef = useSocket(sessionId);
  const [uploading, setUploading] = useState(false);

  const characterEntries = Object.entries(characterDefinitions);

  const handleCharacterImageUpload = async (characterName: string, file: File) => {
    if (!sessionId) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const imageData = reader.result as string;
        
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

        if (response.ok) {
          const result = await response.json();
          console.log('Character image uploaded:', result);
        } else {
          console.error('Failed to upload character image');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading character image:', error);
    } finally {
      setUploading(false);
    }
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
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
            <p className="text-xs text-stone-500">Upload character images for consistent appearance</p>
          </div>
          {characterEntries.length > 0 ? (
            <div className="space-y-3">
              {characterEntries.map(([name, desc], i) => (
                <div
                  key={name}
                  className="animate-fade-in"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <EditableCharacter
                    name={name}
                    description={desc}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCharacterImageUpload(name, file);
                      }}
                      className="text-xs text-stone-400 file:mr-2 file:px-2 file:py-1 file:rounded file:border file:border-stone-600 file:bg-stone-800 file:text-stone-200 file:font-bold file:cursor-pointer hover:file:bg-stone-700"
                    />
                    {uploading && (
                      <div className="flex items-center gap-2 text-xs text-amber-400">
                        <div className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                        Uploading...
                      </div>
                    )}
                  </div>
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
          onClick={() => approvePlan.mutate()}
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
          onClick={() => approvePlan.mutate()}
          disabled={isLoading}
          className="sm:w-48 py-3.5 rounded-xl bg-black border border-stone-600 hover:border-stone-400 text-stone-400 hover:text-stone-200 font-bold text-sm tracking-widest uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          🔄 REGENERATE
        </button>
      </div>
    </div>
  );
}
