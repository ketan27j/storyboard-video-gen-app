import { SceneData } from '../../types/pipeline.types';
import { CharacterBadge } from './CharacterBadge';

interface SceneCardProps {
  scene: SceneData;
  active?: boolean;
  style?: React.CSSProperties;
}

export function SceneCard({ scene, active, style }: SceneCardProps) {
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
        <div>
          <span className="text-xs font-mono text-amber-400/70 tracking-widest uppercase">
            Scene {scene.sceneNumber}
          </span>
          {scene.goal && (
            <p className="text-sm font-semibold text-stone-200 mt-0.5">{scene.goal}</p>
          )}
        </div>
        {scene.location && (
          <span className="text-xs font-mono text-stone-400 bg-stone-800/60 px-2 py-1 rounded whitespace-nowrap">
            📍 {scene.location}
          </span>
        )}
      </div>

      {scene.sceneText && (
        <p className="text-xs text-stone-400 leading-relaxed mb-3 line-clamp-3">
          {scene.sceneText}
        </p>
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
