import { useState, useEffect, useRef } from 'react';
import { ImageData } from '../../types/pipeline.types';
import { useGenerateImage, useUpdatePrompt, useUploadSceneImage } from '../../hooks/usePipeline';
import { usePipelineStore } from '../../stores/pipelineStore';

interface ImagePromptCardProps {
  image: ImageData;
  sceneIndex: number;
  imageIndex: number;
}

export function ImagePromptCard({ image, sceneIndex, imageIndex }: ImagePromptCardProps) {
  const generateImage = useGenerateImage();
  const updatePrompt = useUpdatePrompt();
  const uploadSceneImage = useUploadSceneImage();
  const { scenes } = usePipelineStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [localPrompt, setLocalPrompt] = useState(image.prompt);
  const [promptChanged, setPromptChanged] = useState(false);
  const [selectedCharacterRefs, setSelectedCharacterRefs] = useState<string[]>([]);
  const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

  const currentScene = scenes[sceneIndex];
  const charactersInScene = currentScene?.charactersPresent || [];
  
  // Get character reference images for characters in this scene
  const characterRefImages = charactersInScene
    .filter(char => currentScene?.characterReferenceImages?.[char])
    .map(char => ({
      name: char,
      url: (currentScene.characterReferenceImages as Record<string, string>)?.[char].startsWith('http')
        ? (currentScene.characterReferenceImages as Record<string, string>)?.[char]
        : `${API_URL}/${(currentScene.characterReferenceImages as Record<string, string>)?.[char]}`,
      type: 'character' as const
    }));
  
  // Get previously generated images for this scene (excluding current image)
  const sceneGeneratedImages = (currentScene?.imageSequence || [])
    .filter((_, idx) => idx !== imageIndex && (_.generatedUrl || _.localPath))
    .map((img, idx) => ({
      name: `Image ${idx + 1}`,
      url: img.generatedUrl?.startsWith('http')
        ? img.generatedUrl
        : img.generatedUrl
          ? `${API_URL}/${img.generatedUrl}`
          : `${API_URL}/${img.localPath}`,
      type: 'scene' as const
    }));
  
  // Determine which image to display (custom upload takes priority over generated)
  const customImgSrc = image.customUploadUrl
    ? image.customUploadUrl.startsWith('http')
      ? image.customUploadUrl
      : `${API_URL}/${image.customUploadUrl}`
    : null;
  const imgSrc = image.generatedUrl
    ? image.generatedUrl.startsWith('http')
      ? image.generatedUrl
      : `${API_URL}/${image.generatedUrl}`
    : null;
  const displayImgSrc = customImgSrc || imgSrc;
  const hasCustomImage = !!customImgSrc;
  
  // Add custom uploaded image as a reference option
  const customImageRef = hasCustomImage ? [{
    name: 'Custom Upload',
    url: customImgSrc,
    type: 'custom' as const
  }] : [];
  
  // Combine all reference images
  const allRefImages = [...characterRefImages, ...sceneGeneratedImages, ...customImageRef];

  useEffect(() => {
    setLocalPrompt(image.prompt);
    setPromptChanged(false);
  }, [image.prompt]);

  const handleGenerate = () => {
    // Get the actual image URLs for selected character references
    const referenceImageUrls = selectedCharacterRefs
      .map((charName: string) => {
        const charRef = characterRefImages.find(c => c.name === charName);
        return charRef?.url || null;
      })
      .filter(Boolean) as string[];
    
    generateImage.mutate({ sceneIndex, imageIndex, prompt: localPrompt, referenceImages: referenceImageUrls });
    setPromptChanged(false);
  };

  const handleBlur = () => {
    if (localPrompt !== image.prompt) {
      updatePrompt.mutate({ sceneIndex, type: 'image', index: imageIndex, prompt: localPrompt });
      setPromptChanged(true);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      uploadSceneImage.mutate({ sceneIndex, imageIndex, imageData });
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleCharacterRef = (charName: string) => {
    setSelectedCharacterRefs(prev => 
      prev.includes(charName) 
        ? prev.filter(c => c !== charName)
        : [...prev, charName]
    );
  };

  // Only show "REGENERATE" if there's a generated image (not just custom upload)
  const hasGeneratedImage = !!imgSrc;
  const isRegenerate = hasGeneratedImage && (promptChanged || image.status === 'done');

  return (
    <div className="border border-stone-700/50 rounded-xl overflow-hidden bg-stone-900/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-stone-800/40 border-b border-stone-700/40">
        <span className="text-xs font-mono text-amber-400/80 tracking-widest">
          {image.label || `IMAGE ${imageIndex + 1}`}
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
            image.status === 'done' ? 'bg-emerald-900/60 text-emerald-400' :
            image.status === 'generating' ? 'bg-amber-900/60 text-amber-400' :
            image.status === 'error' ? 'bg-rose-900/60 text-rose-400' :
            'bg-stone-800 text-stone-500'
          }`}>
            {image.status}
          </span>
          {promptChanged && image.status === 'done' && (
            <span className="text-[10px] text-cyan-400 font-mono">
              ✏️ Prompt modified
            </span>
          )}
        </div>
      </div>

      {/* Prompt */}
      <div className="px-4 py-3">
        <textarea
          value={localPrompt}
          onChange={(e) => {
            setLocalPrompt(e.target.value);
            setPromptChanged(e.target.value !== image.prompt);
          }}
          onBlur={handleBlur}
          className="w-full text-xs font-mono text-stone-400 leading-relaxed bg-stone-900/50 border border-stone-700/50 rounded-lg p-2 resize-y focus:outline-none focus:border-amber-500/50"
          rows={3}
        />
      </div>

      {/* Reference Images Selector (Characters + Scene Images) - Always Visible */}
      {allRefImages.length > 0 && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-mono text-amber-400 uppercase tracking-wider font-bold">
              📷 REFERENCE IMAGES
            </span>
            <span className="text-[10px] text-stone-500 font-mono">
              ({selectedCharacterRefs.length}/{allRefImages.length} selected)
            </span>
          </div>
          
          <div className="space-y-3">
            {/* Character References */}
            {characterRefImages.length > 0 && (
              <div>
                <p className="text-[10px] font-mono text-stone-500 mb-2 uppercase tracking-wide">Characters</p>
                <div className="flex flex-wrap gap-2 p-2 bg-stone-800/30 rounded-lg border border-stone-700/30">
                  {characterRefImages.map((char) => (
                    <div
                      key={char.name}
                      onClick={() => toggleCharacterRef(char.name)}
                      className={`relative cursor-pointer transition-all ${
                        selectedCharacterRefs.includes(char.name)
                          ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-stone-900'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={char.url}
                        alt={char.name}
                        className="w-14 h-14 object-cover rounded border border-stone-600"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-stone-900 text-[10px] text-stone-300 px-1.5 py-0.5 rounded">
                        {char.name}
                      </div>
                      {selectedCharacterRefs.includes(char.name) && (
                        <div className="absolute top-0 right-0 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-white text-[11px]">
                          ✓
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Scene Generated Images */}
            {sceneGeneratedImages.length > 0 && (
              <div>
                <p className="text-[10px] font-mono text-stone-500 mb-2 uppercase tracking-wide">Scene Images</p>
                <div className="flex flex-wrap gap-2 p-2 bg-stone-800/30 rounded-lg border border-stone-700/30">
                  {sceneGeneratedImages.map((img) => (
                    <div
                      key={img.name}
                      onClick={() => toggleCharacterRef(img.name)}
                      className={`relative cursor-pointer transition-all ${
                        selectedCharacterRefs.includes(img.name)
                          ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-stone-900'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-14 h-14 object-cover rounded border border-stone-600"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-stone-900 text-[10px] text-stone-300 px-1.5 py-0.5 rounded">
                        {img.name}
                      </div>
                      {selectedCharacterRefs.includes(img.name) && (
                        <div className="absolute top-0 right-0 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center text-white text-[11px]">
                          ✓
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Custom Uploaded Image */}
            {customImageRef.length > 0 && (
              <div>
                <p className="text-[10px] font-mono text-stone-500 mb-2 uppercase tracking-wide">Custom Upload</p>
                <div className="flex flex-wrap gap-2 p-2 bg-stone-800/30 rounded-lg border border-stone-700/30">
                  {customImageRef.map((img) => (
                    <div
                      key={img.name}
                      onClick={() => toggleCharacterRef(img.name)}
                      className={`relative cursor-pointer transition-all ${
                        selectedCharacterRefs.includes(img.name)
                          ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-stone-900'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-14 h-14 object-cover rounded border border-stone-600"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-cyan-900 text-[10px] text-cyan-300 px-1.5 py-0.5 rounded">
                        CUSTOM
                      </div>
                      {selectedCharacterRefs.includes(img.name) && (
                        <div className="absolute top-0 right-0 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[11px]">
                          ✓
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Image Upload - Integrated into Reference Images */}
      <div className="px-4 pb-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadSceneImage.isPending}
          className="w-full py-2 rounded-lg text-xs font-mono tracking-widest border border-stone-600/50 hover:border-cyan-500/50 text-stone-400 hover:text-cyan-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-stone-800/20 mb-3"
        >
          {uploadSceneImage.isPending ? (
            <>
              <div className="w-3 h-3 border border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              UPLOADING…
            </>
          ) : hasCustomImage ? (
            <>
              <span>🖼️</span>
              <span>REPLACE CUSTOM IMAGE</span>
            </>
          ) : (
            <>
              <span>📤</span>
              <span>UPLOAD CUSTOM IMAGE</span>
            </>
          )}
        </button>
      </div>

      {/* Display image (custom or generated) */}
      {displayImgSrc && (
        <div className="px-4 pb-3">
          <div
            className="relative rounded-lg overflow-hidden cursor-pointer group"
            onClick={() => setExpanded(true)}
          >
            <img
              src={displayImgSrc}
              alt={image.label}
              className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {hasCustomImage && (
              <div className="absolute top-2 left-2 bg-cyan-600/90 text-white text-[10px] font-mono px-2 py-1 rounded">
                CUSTOM
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-mono tracking-widest transition-opacity">
                EXPAND ↗
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Spinner while generating/uploading */}
      {(image.status === 'generating' || uploadSceneImage.isPending) && !displayImgSrc && (
        <div className="px-4 pb-4 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          <span className="text-xs text-stone-400 font-mono">
            {uploadSceneImage.isPending ? 'Uploading image…' : 'Generating image…'}
          </span>
        </div>
      )}

      {/* Generate/Regenerate button */}
      <div className="px-4 pb-4">
        <button
          onClick={handleGenerate}
          disabled={image.status === 'generating'}
          className={`w-full py-2 rounded-lg text-xs font-mono tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            isRegenerate
              ? 'bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-600/50 text-cyan-400'
              : 'bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/50 text-amber-400'
          }`}
        >
          {image.status === 'generating' ? (
            <>
              <div className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" />
              GENERATING…
            </>
          ) : isRegenerate ? (
            '🔄 REGENERATE (Prompt Changed)'
          ) : hasGeneratedImage ? (
            '🔄 REGENERATE'
          ) : (
            '🎨 GENERATE IMAGE'
          )}
        </button>
      </div>

      {/* Expanded modal */}
      {expanded && displayImgSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8"
          onClick={() => setExpanded(false)}
        >
          <img src={displayImgSrc} alt={image.label} className="max-h-full max-w-full rounded-xl object-contain" />
          {hasCustomImage && (
            <div className="absolute top-6 left-6 bg-cyan-600/90 text-white text-xs font-mono px-3 py-1.5 rounded">
              CUSTOM IMAGE
            </div>
          )}
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