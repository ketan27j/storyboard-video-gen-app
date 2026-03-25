import { useState } from 'react';
import { useCharacterEdit } from '../../hooks/useCharacterEdit';

interface EditableSceneTextProps {
  sceneIndex: number;
  sceneText: string;
}

export function EditableSceneText({ sceneIndex, sceneText }: EditableSceneTextProps) {
  const { updateSceneText, isUpdating } = useCharacterEdit();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(sceneText);

  const handleSave = () => {
    if (value.trim() && value !== sceneText) {
      updateSceneText(sceneIndex, value.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setValue(sceneText);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-amber-400/70 tracking-widest uppercase">
          Scene Text
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
          rows={4}
          autoFocus
        />
      ) : (
        <p className="text-sm text-stone-300 leading-relaxed bg-stone-800/50 p-2 rounded border border-stone-700/50">
          {sceneText}
        </p>
      )}
    </div>
  );
}