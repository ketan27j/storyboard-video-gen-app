import { VideoData, SceneData } from '../../types/pipeline.types';
import { useGenerateVideo } from '../../hooks/usePipeline';

interface VideoPromptCardProps {
  video: VideoData;
  scene: SceneData;
  sceneIndex: number;
  videoIndex: number;
}

export function VideoPromptCard({ video, scene, sceneIndex, videoIndex }: VideoPromptCardProps) {
  const generateVideo = useGenerateVideo();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // Check if the referenced source image is ready
  const sourceImageReady = scene.imageSequence.some(
    (img) => img.status === 'done' && video.inputImages.includes(img.label || `IMAGE ${img.index + 1}`)
  ) || scene.imageSequence.some((img) => img.status === 'done'); // fallback: any image done

  const sourceImage = scene.imageSequence.find((img) => img.status === 'done');
  const imagePath = sourceImage?.localPath || sourceImage?.generatedUrl;

  const handleGenerate = () => {
    generateVideo.mutate({
      sceneIndex,
      videoIndex,
      prompt: video.optimizedPrompt || video.rawPrompt,
      imagePath,
    });
  };

  const videoSrc = video.generatedUrl
    ? video.generatedUrl.startsWith('http')
      ? video.generatedUrl
      : `${API_URL}/${video.generatedUrl}`
    : null;

  return (
    <div className="border border-stone-700/50 rounded-xl overflow-hidden bg-stone-900/30">
      <div className="flex items-center justify-between px-4 py-2.5 bg-stone-800/40 border-b border-stone-700/40">
        <span className="text-xs font-mono text-cyan-400/80 tracking-widest">
          VIDEO {videoIndex + 1} · {video.inputImages}
        </span>
        <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
          video.status === 'done' ? 'bg-emerald-900/60 text-emerald-400' :
          video.status === 'generating' ? 'bg-cyan-900/60 text-cyan-400' :
          video.status === 'error' ? 'bg-rose-900/60 text-rose-400' :
          'bg-stone-800 text-stone-500'
        }`}>
          {video.status}
        </span>
      </div>

      <div className="px-4 py-3 space-y-2">
        {video.rawPrompt && (
          <div>
            <p className="text-xs text-stone-500 font-mono mb-1">RAW PROMPT</p>
            <p className="text-xs font-mono text-stone-400 leading-relaxed">{video.rawPrompt}</p>
          </div>
        )}
        {video.optimizedPrompt && video.optimizedPrompt !== video.rawPrompt && (
          <div className="border-l-2 border-cyan-600/50 pl-3">
            <p className="text-xs text-cyan-400/70 font-mono mb-1">CAMERA OPTIMIZED</p>
            <p className="text-xs font-mono text-cyan-300/80 leading-relaxed">{video.optimizedPrompt}</p>
          </div>
        )}
      </div>

      {/* Video player */}
      {videoSrc && (
        <div className="px-4 pb-3">
          <video
            src={videoSrc}
            controls
            className="w-full rounded-lg"
            style={{ maxHeight: '200px' }}
          />
        </div>
      )}

      {video.status === 'generating' && !videoSrc && (
        <div className="px-4 pb-4 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          <span className="text-xs text-stone-400 font-mono">Generating video… (may take 2–5 min)</span>
        </div>
      )}

      {video.status !== 'done' && (
        <div className="px-4 pb-4">
          <button
            onClick={handleGenerate}
            disabled={video.status === 'generating' || !sourceImageReady}
            title={!sourceImageReady ? 'Generate source image first' : undefined}
            className="w-full py-2 rounded-lg border border-cyan-700/50 text-cyan-400 text-xs font-mono tracking-widest hover:bg-cyan-950/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {video.status === 'generating' ? (
              <>
                <div className="w-3 h-3 border border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                GENERATING…
              </>
            ) : !sourceImageReady ? (
              '🔒 GENERATE IMAGE FIRST'
            ) : (
              '🎬 GENERATE VIDEO'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
