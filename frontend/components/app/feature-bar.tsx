interface FeatureBarProps {
  name: string;
  importance: number; // 0-1 float
  value?: number;
}

export function FeatureBar({ name, importance, value }: FeatureBarProps) {
  const pct = Math.round(importance * 100);
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-zinc-400 font-medium capitalize truncate tracking-wide">
            {name.replace(/_/g, " ")}
          </span>
          <span className="text-[10px] font-mono font-semibold text-zinc-300 tabular-nums ml-2 shrink-0">
            {pct}%
          </span>
        </div>
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full"
            style={{
              width: `${pct}%`,
              transition: "width 0.8s cubic-bezier(0.32, 0.72, 0, 1)",
            }}
          />
        </div>
      </div>
      {value !== undefined && (
        <span className="text-xs font-mono text-zinc-500 w-16 text-right shrink-0 tabular-nums">
          {value.toFixed(2)}
        </span>
      )}
    </div>
  );
}
