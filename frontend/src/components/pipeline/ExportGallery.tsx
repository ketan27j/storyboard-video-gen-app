import { useState } from 'react';
import { usePipelineStore } from '../../stores/pipelineStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function resolveUrl(url?: string) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_URL}/${url}`;
}

export function ExportGallery() {
  const { scenes, storySnapshot } = usePipelineStore();
  const [activeScene, setActiveScene] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const allImages = scenes.flatMap((s, si) =>
    s.imageSequence
      .filter((img) => img.status === 'done' && img.generatedUrl)
      .map((img) => ({ ...img, sceneNumber: s.sceneNumber, sceneIndex: si }))
  );

  const allVideos = scenes.flatMap((s, si) =>
    s.videoMotionPrompts
      .filter((v) => v.status === 'done' && v.generatedUrl)
      .map((v) => ({ ...v, sceneNumber: s.sceneNumber, sceneIndex: si }))
  );

  const filteredImages = activeScene !== null
    ? allImages.filter((img) => img.sceneIndex === activeScene)
    : allImages;

  const filteredVideos = activeScene !== null
    ? allVideos.filter((v) => v.sceneIndex === activeScene)
    : allVideos;

  const handleDownloadAll = (type: 'images' | 'videos') => {
    const items = type === 'images' ? allImages : allVideos;
    items.forEach((item) => {
      const url = resolveUrl(item.generatedUrl);
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = url.split('/').pop() || 'file';
        a.click();
      }
    });
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 py-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-mono text-amber-400/70 tracking-widest mb-1">STEP 4 OF 4 · EXPORT GALLERY</p>
        <h2 className="text-3xl font-black text-white mb-2">Your Storyboard</h2>
        {storySnapshot && (
          <p className="text-stone-400 text-sm max-w-2xl leading-relaxed">{storySnapshot}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'SCENES', value: scenes.length, color: 'text-amber-400' },
          { label: 'IMAGES', value: allImages.length, color: 'text-amber-400' },
          { label: 'VIDEOS', value: allVideos.length, color: 'text-cyan-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="border border-stone-700/50 rounded-xl p-4 bg-stone-900/30 text-center">
            <p className={`text-3xl font-black ${color}`}>{value}</p>
            <p className="text-xs font-mono text-stone-500 tracking-widest mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Scene filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveScene(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono tracking-widest transition-all ${
            activeScene === null
              ? 'bg-amber-500 text-black font-black'
              : 'border border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-200'
          }`}
        >
          ALL SCENES
        </button>
        {scenes.map((s, i) => (
          <button
            key={s.sceneNumber}
            onClick={() => setActiveScene(i === activeScene ? null : i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono tracking-widest transition-all ${
              activeScene === i
                ? 'bg-amber-500 text-black font-black'
                : 'border border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-200'
            }`}
          >
            SCENE {s.sceneNumber}
          </button>
        ))}
      </div>

      {/* Images grid */}
      {filteredImages.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-mono text-amber-400/80 tracking-widest">🎨 GENERATED IMAGES</h3>
            <button
              onClick={() => handleDownloadAll('images')}
              className="text-xs font-mono text-stone-400 hover:text-stone-200 border border-stone-700 hover:border-stone-500 px-3 py-1.5 rounded-lg transition-all"
            >
              ⬇ DOWNLOAD ALL IMAGES
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredImages.map((img, i) => (
              <div
                key={i}
                className="group relative rounded-xl overflow-hidden border border-stone-700/50 cursor-pointer"
                onClick={() => setExpanded(resolveUrl(img.generatedUrl))}
              >
                <img
                  src={resolveUrl(img.generatedUrl)}
                  alt={img.label}
                  className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <div>
                    <p className="text-xs font-mono text-amber-400">SCENE {img.sceneNumber}</p>
                    <p className="text-xs text-white/80 line-clamp-2">{img.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Videos */}
      {filteredVideos.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-mono text-cyan-400/80 tracking-widest">🎬 GENERATED VIDEOS</h3>
            <button
              onClick={() => handleDownloadAll('videos')}
              className="text-xs font-mono text-stone-400 hover:text-stone-200 border border-stone-700 hover:border-stone-500 px-3 py-1.5 rounded-lg transition-all"
            >
              ⬇ DOWNLOAD ALL VIDEOS
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVideos.map((vid, i) => (
              <div key={i} className="border border-stone-700/50 rounded-xl overflow-hidden bg-stone-900/30">
                <video
                  src={resolveUrl(vid.generatedUrl)}
                  controls
                  className="w-full"
                  style={{ maxHeight: '200px' }}
                />
                <div className="px-4 py-3">
                  <p className="text-xs font-mono text-cyan-400">SCENE {vid.sceneNumber} · VIDEO {vid.index + 1}</p>
                  <p className="text-xs text-stone-400 mt-1 line-clamp-2">{vid.optimizedPrompt || vid.rawPrompt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {allImages.length === 0 && allVideos.length === 0 && (
        <div className="text-center py-24 text-stone-600">
          <p className="text-5xl mb-4">🎞️</p>
          <p className="font-mono text-sm tracking-widest">NO GENERATED CONTENT YET</p>
          <p className="text-xs mt-2">Go back to the scene workshop to generate images and videos.</p>
        </div>
      )}

      {/* Image lightbox */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-8"
          onClick={() => setExpanded(null)}
        >
          <img src={expanded} alt="expanded" className="max-h-full max-w-full rounded-xl object-contain" />
          <button
            className="absolute top-6 right-6 text-white/60 hover:text-white text-2xl"
            onClick={() => setExpanded(null)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
