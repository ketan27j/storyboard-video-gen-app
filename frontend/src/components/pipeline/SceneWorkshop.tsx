import { usePipelineStore } from '../../stores/pipelineStore';
import { useApproveScene } from '../../hooks/usePipeline';
import { CharacterBadge } from '../ui/CharacterBadge';
import { ImagePromptCard } from '../ui/ImagePromptCard';
import { VideoPromptCard } from '../ui/VideoPromptCard';
import { PipelineProgress } from '../ui/PipelineProgress';

export function SceneWorkshop() {
  const { scenes, currentSceneIndex, isLoading } = usePipelineStore();
  const approveScene = useApproveScene();

  const scene = scenes[currentSceneIndex];
  const totalScenes = scenes.length;

  if (!scene) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-400 text-sm font-mono">Loading scene…</p>
        </div>
      </div>
    );
  }

  const characterEntries = Object.entries(scene.characterDescriptions || {});

  return (
    <div className="min-h-screen px-4 sm:px-6 py-8 max-w-7xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <PipelineProgress
          current={currentSceneIndex + 1}
          total={totalScenes}
          label={`Scene ${currentSceneIndex + 1} of ${totalScenes}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        {/* Left: Scene Brief */}
        <div className="lg:col-span-2 space-y-4">
          <div className="border border-stone-700/50 rounded-2xl p-5 bg-stone-900/30 sticky top-6">
            <div className="mb-4">
              <p className="text-xs font-mono text-amber-400/70 tracking-widest mb-1">
                SCENE {scene.sceneNumber}
              </p>
              {scene.goal && (
                <h3 className="text-lg font-black text-white">{scene.goal}</h3>
              )}
              {scene.location && (
                <p className="text-sm text-stone-400 mt-1">📍 {scene.location}</p>
              )}
            </div>

            {scene.sceneText && (
              <div className="mb-4 pb-4 border-b border-stone-800">
                <p className="text-xs text-stone-400 leading-relaxed">{scene.sceneText}</p>
              </div>
            )}

            {/* Characters */}
            {characterEntries.length > 0 && (
              <div>
                <p className="text-xs font-mono text-stone-500 tracking-widest mb-2">CHARACTERS IN SCENE</p>
                <div className="space-y-3">
                  {characterEntries.map(([name, desc], i) => {
                    // Check if there's a character reference image
                    const characterRefImage = scene.characterReferenceImages?.[name];
                    return (
                      <div key={name} className="space-y-1">
                        <CharacterBadge name={name} description={desc} index={i} />
                        {characterRefImage && (
                          <div className="ml-1 pl-2 border-l-2 border-stone-700">
                            <p className="text-[10px] text-stone-500 mb-1">Reference:</p>
                            <img
                              src={characterRefImage.startsWith('http') 
                                ? characterRefImage 
                                : `http://localhost:3001/${characterRefImage}`
                              }
                              alt={`${name} reference`}
                              className="w-16 h-16 object-cover rounded border border-stone-700 cursor-pointer hover:border-amber-500 transition-colors"
                              onClick={() => window.open(characterRefImage.startsWith('http') 
                                ? characterRefImage 
                                : `http://localhost:3001/${characterRefImage}`, '_blank')}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="mt-4 pt-4 border-t border-stone-800 grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-2xl font-black text-amber-400">{scene.imageSequence.length}</p>
                <p className="text-xs text-stone-500 font-mono">IMAGES</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-cyan-400">{scene.videoMotionPrompts.length}</p>
                <p className="text-xs text-stone-500 font-mono">VIDEOS</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Generation workspace */}
        <div className="lg:col-span-3 space-y-6">
          {/* Image Sequence */}
          {scene.imageSequence.length > 0 && (
            <div>
              <h4 className="text-xs font-mono text-amber-400/80 tracking-widest mb-3 flex items-center gap-2">
                <span>🎨</span> IMAGE SEQUENCE
              </h4>
              <div className="space-y-3">
                {scene.imageSequence.map((img, imgIdx) => (
                  <ImagePromptCard
                    key={imgIdx}
                    image={img}
                    sceneIndex={currentSceneIndex}
                    imageIndex={imgIdx}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Video Prompts */}
          {scene.videoMotionPrompts.length > 0 && (
            <div>
              <h4 className="text-xs font-mono text-cyan-400/80 tracking-widest mb-3 flex items-center gap-2">
                <span>🎬</span> VIDEO MOTION PROMPTS
              </h4>
              <div className="space-y-3">
                {scene.videoMotionPrompts.map((vid, vidIdx) => (
                  <VideoPromptCard
                    key={vidIdx}
                    video={vid}
                    scene={scene}
                    sceneIndex={currentSceneIndex}
                    videoIndex={vidIdx}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {scene.imageSequence.length === 0 && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 rounded-xl bg-stone-900/50 border border-stone-800 animate-pulse" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row items-center gap-3 sticky bottom-6">
        {currentSceneIndex > 0 && (
          <button
            className="sm:w-32 py-3 rounded-xl border border-stone-700 hover:border-stone-500 text-stone-400 hover:text-stone-200 text-sm font-bold tracking-widest uppercase transition-all"
            onClick={() => {/* prev scene handled by state */}}
          >
            ← PREV
          </button>
        )}

        <button
          onClick={() => approveScene.mutate({ skip: true })}
          disabled={isLoading}
          className="sm:w-32 py-3 rounded-xl border border-stone-700 hover:border-stone-500 text-stone-500 hover:text-stone-300 text-sm font-bold tracking-widest uppercase transition-all disabled:opacity-40"
        >
          ⏭ SKIP
        </button>

        <button
          onClick={() => approveScene.mutate({})}
          disabled={isLoading}
          className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-600 text-black font-black text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              PROCESSING…
            </>
          ) : currentSceneIndex + 1 >= totalScenes ? (
            '✅ FINISH →'
          ) : (
            '✅ APPROVE & NEXT →'
          )}
        </button>
      </div>
    </div>
  );
}
