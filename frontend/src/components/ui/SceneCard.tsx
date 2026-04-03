import { useState } from 'react';
import { SceneData } from '../../types/pipeline.types';
import { CharacterBadge } from './CharacterBadge';
import { EditableSceneText } from './EditableSceneText';
import { useCharacterEdit } from '../../hooks/useCharacterEdit';

interface SceneCardProps {
  scene: SceneData;
  active?: boolean;
  style?: React.CSSProperties;
}

export function SceneCard({ scene, active, style }: SceneCardProps) {
  const { updateSceneGoal, updateSceneLocation, isUpdating } = useCharacterEdit();
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [goalValue, setGoalValue] = useState(scene.goal || '');
  const [locationValue, setLocationValue] = useState(scene.location || '');

  const handleSaveGoal = () => {
    if (goalValue.trim() !== scene.goal) {
      updateSceneGoal(scene.sceneNumber - 1, goalValue.trim());
    }
    setIsEditingGoal(false);
  };

  const handleCancelGoal = () => {
    setGoalValue(scene.goal || '');
    setIsEditingGoal(false);
  };

  const handleSaveLocation = () => {
    if (locationValue.trim() !== scene.location) {
      updateSceneLocation(scene.sceneNumber - 1, locationValue.trim());
    }
    setIsEditingLocation(false);
  };

  const handleCancelLocation = () => {
    setLocationValue(scene.location || '');
    setIsEditingLocation(false);
  };

  const handleGoalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveGoal();
    } else if (e.key === 'Escape') {
      handleCancelGoal();
    }
  };

  const handleLocationKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveLocation();
    } else if (e.key === 'Escape') {
      handleCancelLocation();
    }
  };

  return (
    <div
      style={style}
      className={`border rounded-xl p-4 transition-all duration-500 ${
        active
          ? 'border-amber-500/60 bg-amber-950/20'
          : 'border-stone-700/50 bg-stone-900/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <span className="text-xs font-mono text-amber-400/70 tracking-widest uppercase">
            Scene {scene.sceneNumber}
          </span>
          {isEditingGoal ? (
            <div className="mt-1 flex items-start gap-2">
              <textarea
                value={goalValue}
                onChange={(e) => setGoalValue(e.target.value)}
                onKeyDown={handleGoalKeyDown}
                className="flex-1 text-sm font-semibold bg-stone-800 border border-amber-500/50 rounded px-3 py-2 text-stone-100 focus:outline-none focus:border-amber-400 resize-none"
                placeholder="Scene goal..."
                rows={2}
                autoFocus
              />
              <button
                onClick={handleSaveGoal}
                disabled={isUpdating}
                className="px-2 py-1 text-xs bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white rounded disabled:opacity-50"
              >
                ✓
              </button>
              <button
                onClick={handleCancelGoal}
                disabled={isUpdating}
                className="px-2 py-1 text-xs bg-stone-600 hover:bg-stone-500 disabled:bg-stone-800 text-white rounded disabled:opacity-50"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 group">
              <p className="text-sm font-semibold text-stone-200 mt-0.5">{scene.goal}</p>
              <button
                onClick={() => setIsEditingGoal(true)}
                disabled={isUpdating}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-400 hover:text-amber-300 text-xs disabled:opacity-30"
              >
                ✏️
              </button>
            </div>
          )}
        </div>
        {isEditingLocation ? (
          <div className="flex items-start gap-1">
            <textarea
              value={locationValue}
              onChange={(e) => setLocationValue(e.target.value)}
              onKeyDown={handleLocationKeyDown}
              className="w-48 text-sm bg-stone-800 border border-amber-500/50 rounded px-3 py-2 text-stone-100 focus:outline-none focus:border-amber-400 resize-none"
              placeholder="Location..."
              rows={2}
              autoFocus
            />
            <button
              onClick={handleSaveLocation}
              disabled={isUpdating}
              className="px-1 py-1 text-xs bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white rounded disabled:opacity-50"
            >
              ✓
            </button>
            <button
              onClick={handleCancelLocation}
              disabled={isUpdating}
              className="px-1 py-1 text-xs bg-stone-600 hover:bg-stone-500 disabled:bg-stone-800 text-white rounded disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 group">
            {scene.location && (
              <span className="text-xs font-mono text-stone-400 bg-stone-800/60 px-2 py-1 rounded">
                📍 {scene.location}
              </span>
            )}
            <button
              onClick={() => setIsEditingLocation(true)}
              disabled={isUpdating}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-400 hover:text-amber-300 text-xs disabled:opacity-30"
            >
              ✏️
            </button>
          </div>
        )}
      </div>

      {scene.sceneText && (
        <div className="mb-3">
          <EditableSceneText
            sceneIndex={scene.sceneNumber - 1}
            sceneText={scene.sceneText}
          />
        </div>
      )}

      {scene.charactersPresent.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {scene.charactersPresent.map((char, i) => (
            <CharacterBadge key={char} name={char} index={i} size="sm" />
          ))}
        </div>
      )}
    </div>
  );
}