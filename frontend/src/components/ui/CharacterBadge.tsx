const COLORS = [
  'bg-amber-900/60 text-amber-300 border-amber-700/50',
  'bg-cyan-900/60 text-cyan-300 border-cyan-700/50',
  'bg-rose-900/60 text-rose-300 border-rose-700/50',
  'bg-violet-900/60 text-violet-300 border-violet-700/50',
  'bg-emerald-900/60 text-emerald-300 border-emerald-700/50',
  'bg-orange-900/60 text-orange-300 border-orange-700/50',
];

interface CharacterBadgeProps {
  name: string;
  description?: string;
  index?: number;
  size?: 'sm' | 'md';
}

export function CharacterBadge({ name, description, index = 0, size = 'md' }: CharacterBadgeProps) {
  const color = COLORS[index % COLORS.length];
  const initials = name.slice(0, 2).toUpperCase();

  if (size === 'sm') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border ${color}`}>
        {name}
      </span>
    );
  }

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${color} bg-opacity-30`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border ${color}`}>
        {initials}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold font-mono tracking-wide">{name}</p>
        {description && (
          <p className="text-xs opacity-70 mt-0.5 leading-relaxed line-clamp-2">{description}</p>
        )}
      </div>
    </div>
  );
}
