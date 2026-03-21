import { useState, useEffect } from 'react';
import { ImageData } from '../../types/pipeline.types';
import { useGenerateImage, useUpdatePrompt } from '../../hooks/usePipeline';

interface ImagePromptCardProps {
  image: ImageData;
  sceneIndex: number;
  imageIndex: number;
}

export function ImagePromptCard({ image, sceneIndex, imageIndex }: ImagePromptCardProps) {
  const generateImage = useGenerateImage();
  const updatePrompt = useUpdatePrompt();
  const [expanded, setExpanded] = useState(false);
  const [localPrompt, setLocalPrompt] = useState(image.prompt);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    setLocalPrompt(image.prompt);
  }, [image.prompt]);

  const handleGenerate = () => {
    generateImage.mutate({ sceneIndex, imageIndex, prompt: image.prompt });
  };

  const handleBlur = () => {
    if (localPrompt !== image.prompt) {
      updatePrompt.mutate({ sceneIndex, type: 'image', index: imageIndex, prompt: localPrompt });
    }
  };

  const imgSrc = image.generatedUrl
    ? image.generatedUrl.startsWith('http')
      ? image.generatedUrl
      : `${API_URL}/${image.generatedUrl}`
    : null;

  return (
    <div className="border border-stone-700/50 rounded-xl overflow-hidden bg-stone-900/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-stone-800/40 border-b border-stone-700/40">
        <span className="text-xs font-mono text-amber-400/80 tracking-widest">
          {image.label || `IMAGE ${imageIndex + 1}`}
        </span>
        <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
          image.status === 'done' ? 'bg-emerald-900/60 text-emerald-400' :
          image.status === 'generating' ? 'bg-amber-900/60 text-amber-400' :
          image.status === 'error' ? 'bg-rose-900/60 text-rose-400' :
          'bg-stone-800 text-stone-500'
        }`}>
          {image.status}
        </span>
      </div>

      {/* Prompt */}
      <div className="px-4 py-3">
        <textarea
          value={localPrompt}
          onChange={(e) => setLocalPrompt(e.target.value)}
          onBlur={handleBlur}
          className="w-full text-xs font-mono text-stone-400 leading-relaxed bg-stone-900/50 border border-stone-700/50 rounded-lg p-2 resize-y focus:outline-none focus:border-amber-500/50"
          rows={3}
        />
      </div>

      {/* Generated image */}
      {imgSrc && (
        <div className="px-4 pb-3">
          <div
            className="relative rounded-lg overflow-hidden cursor-pointer group"
            onClick={() => setExpanded(true)}
          >
            <img
              src={imgSrc}
              alt={image.label}
              className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-mono tracking-widest transition-opacity">
                EXPAND ↗
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Spinner while generating */}
      {image.status === 'generating' && !imgSrc && (
        <div className="px-4 pb-4 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          <span className="text-xs text-stone-400 font-mono">Generating image…</span>
        </div>
      )}

      {/* Generate button */}
      {image.status !== 'done' && (
        <div className="px-4 pb-4">
          <button
            onClick={handleGenerate}
            disabled={image.status === 'generating'}
            className="w-full py-2 rounded-lg border border-amber-600/50 text-amber-400 text-xs font-mono tracking-widest hover:bg-amber-950/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {image.status === 'generating' ? (
              <>
                <div className="w-3 h-3 border border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                GENERATING…
              </>
            ) : (
              '🎨 GENERATE IMAGE'
            )}
          </button>
        </div>
      )}

      {/* Expanded modal */}
      {expanded && imgSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8"
          onClick={() => setExpanded(false)}
        >
          <img src={imgSrc} alt={image.label} className="max-h-full max-w-full rounded-xl object-contain" />
          <button
            className="absolute top-6 right-6 text-white/60 hover:text-white text-2xl"
            onClick={() => setExpanded(false)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
