interface Bar {
  label: string;
  value: number;
  color: string;
}

export function SubjectBarChart({ bars, max = 20 }: { bars: Bar[]; max?: number }) {
  if (bars.length === 0) return null;
  return (
    <div className="flex h-40 items-end gap-2 sm:gap-3">
      {bars.map((b, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{b.value.toFixed(1)}</span>
          <div className="flex h-28 w-full items-end overflow-hidden rounded-md bg-slate-100 dark:bg-slate-700">
            <div
              className="w-full rounded-md transition-all duration-500"
              style={{ height: `${Math.max(4, (b.value / max) * 100)}%`, background: b.color }}
            />
          </div>
          <span className="max-w-[3.5rem] truncate text-[10px] text-slate-400" title={b.label}>
            {b.label}
          </span>
        </div>
      ))}
    </div>
  );
}
