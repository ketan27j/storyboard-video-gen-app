import { useState, useRef } from 'react';
import { useCharacterEdit } from '../../hooks/useCharacterEdit';

interface EditableCharacterProps {
  name: string;
  description: string;
  uploadedImageUrl?: string;
  onImageUpload?: (characterName: string, file: File) => Promise<void>;
  onGenerateImage?: () => Promise<void>;
  onRegenerateImage?: () => Promise<void>;
  isGenerating?: boolean;
}

export function EditableCharacter({ 
  name, 
  description, 
  uploadedImageUrl,
  onImageUpload,
  onGenerateImage,
  onRegenerateImage,
  isGenerating = false
}: EditableCharacterProps) {
  const { updateCharacterDescription, isUpdating } = useCharacterEdit();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(description);
  const [isUploading, setIsUploading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (value.trim() && value !== description) {
      updateCharacterDescription(name, value.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setValue(description);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageUpload) return;

    setIsUploading(true);
    try {
      await onImageUpload(name, file);
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    console.log('Remove image for character:', name);
  };

  const handleExpandImage = () => {
    if (uploadedImageUrl) {
      setIsExpanded(true);
    }
  };

  const handleCollapseImage = () => {
    setIsExpanded(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-amber-400/70 tracking-widest uppercase">
          Character: {name}
        </span>
        <div className="flex gap-1">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={isUpdating}
                className="px-2 py-1 text-xs bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white rounded disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                disabled={isUpdating}
                className="px-2 py-1 text-xs bg-stone-600 hover:bg-stone-500 disabled:bg-stone-800 text-white rounded disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              disabled={isUpdating}
              className="px-2 py-1 text-xs bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-black rounded disabled:opacity-50"
            >
              Edit
            </button>
          )}
        </div>
      </div>
      
      {isEditing ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full p-2 text-sm bg-stone-800 border border-stone-600 rounded text-stone-100 focus:outline-none focus:border-amber-400 resize-none"
          rows={3}
          autoFocus
        />
      ) : (
        <p className="text-sm text-stone-300 leading-relaxed bg-stone-800/50 p-2 rounded border border-stone-700/50">
          {description}
        </p>
      )}

      {/* Character Image Display Area */}
      <div className="space-y-3">
        {uploadedImageUrl ? (
          isExpanded ? (
            // Expanded view - full image
            <div className="relative">
              <div className="relative rounded-xl overflow-hidden border border-stone-500 bg-stone-800">
                <img
                  src={uploadedImageUrl}
                  alt={`${name} reference`}
                  className="w-full h-auto max-h-96 object-contain bg-stone-900"
                />
                <button
                  onClick={handleCollapseImage}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/70 hover:bg-black/90 rounded-full flex items-center justify-center text-white text-lg transition-all shadow-lg"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <div className="bg-green-600/20 text-green-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <span>✓</span> Character Reference Ready
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {onRegenerateImage && (
                    <button
                      onClick={onRegenerateImage}
                      disabled={isGenerating}
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>🔄</span> Regenerate
                    </button>
                  )}
                  <button
                    onClick={handleRemoveImage}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <span>🗑</span> Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Collapsed view with image - show image + small action buttons
            <div className="space-y-2">
              <div 
                onClick={handleExpandImage}
                className="relative group cursor-pointer"
              >
                <div className="relative rounded-xl overflow-hidden border border-stone-600 bg-stone-800">
                  <img
                    src={uploadedImageUrl}
                    alt={`${name} reference`}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                    <div className="bg-black/70 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
                      <span>🔍</span> Click to view full image
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              {/* Action buttons - always visible */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleImageClick}
                  disabled={isUploading}
                  className="flex-1 py-1.5 px-2 text-[10px] font-bold rounded-md bg-stone-700/50 hover:bg-stone-700 text-stone-300 border border-stone-600 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <span>📁</span> Upload
                </button>
                {onGenerateImage && (
                  <button
                    onClick={onGenerateImage}
                    disabled={isGenerating}
                    className="flex-1 py-1.5 px-2 text-[10px] font-bold rounded-md bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-600/50 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <span>✨</span> AI
                  </button>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                disabled={isUploading}
              />
            </div>
          )
        ) : isGenerating ? (
          <div className="relative rounded-xl overflow-hidden border-2 border-cyan-500/50 bg-stone-800 h-48 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
              </div>
              <p className="text-cyan-400 text-sm font-bold">Generating character image...</p>
              <p className="text-stone-500 text-xs">This may take a few moments</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {/* Upload Area */}
            <div 
              onClick={handleImageClick}
              className="relative rounded border border-dashed border-stone-700 hover:border-amber-500 hover:bg-amber-900/10 flex flex-col items-center justify-center h-12 cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                disabled={isUploading}
              />
              <span className="text-xs text-stone-400 group-hover:text-amber-400">📁 Upload</span>
              {isUploading && (
                <div className="absolute inset-0 bg-stone-900/80 flex items-center justify-center rounded">
                  <div className="w-3 h-3 border border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Generate Area */}
            <div 
              onClick={onGenerateImage}
              className="relative rounded border border-dashed border-cyan-700/50 hover:border-cyan-500 hover:bg-cyan-900/10 flex flex-col items-center justify-center h-12 cursor-pointer transition-all group"
            >
              <span className="text-xs text-stone-400 group-hover:text-cyan-400">✨ AI</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}