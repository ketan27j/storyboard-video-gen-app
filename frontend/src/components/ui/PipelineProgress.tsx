interface PipelineProgressProps {
  current: number;
  total: number;
  label?: string;
}

export function PipelineProgress({ current, total, label }: PipelineProgressProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-mono text-amber-400/80 tracking-widest uppercase">
          {label ?? `Scene ${current} of ${total}`}
        </span>
        <span className="text-xs font-mono text-stone-400">{pct}%</span>
      </div>
      <div className="h-0.5 bg-stone-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
