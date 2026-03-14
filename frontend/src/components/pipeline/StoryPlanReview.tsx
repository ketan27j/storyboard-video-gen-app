import { usePipelineStore } from '../../stores/pipelineStore';
import { useApprovePlan } from '../../hooks/usePipeline';
import { CharacterBadge } from '../ui/CharacterBadge';
import { SceneCard } from '../ui/SceneCard';

export function StoryPlanReview() {
  const { storySnapshot, characterDefinitions, scenes, isLoading, streamingText } = usePipelineStore();
  const approvePlan = useApprovePlan();

  const characterEntries = Object.entries(characterDefinitions);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Story Snapshot */}
        <div className="lg:col-span-2 border border-stone-700/50 rounded-2xl p-5 bg-stone-900/30">
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
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">👥</span>
            <h3 className="text-sm font-bold text-stone-300 tracking-wide">CHARACTERS</h3>
          </div>
          {characterEntries.length > 0 ? (
            <div className="space-y-2">
              {characterEntries.map(([name, desc], i) => (
                <div
                  key={name}
                  className="animate-fade-in"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <CharacterBadge name={name} description={desc} index={i} />
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
          onClick={() => approvePlan.mutate(false)}
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
          onClick={() => approvePlan.mutate(true)}
          disabled={isLoading}
          className="sm:w-48 py-3.5 rounded-xl border border-stone-600 hover:border-stone-400 text-stone-400 hover:text-stone-200 font-bold text-sm tracking-widest uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          🔄 REGENERATE
        </button>
      </div>
    </div>
  );
}
