interface Point {
  label: string;
  value: number;
}

/** Petit graphique en ligne en SVG pur, sans dépendance externe. */
export function MiniLineChart({ points, max = 20 }: { points: Point[]; max?: number }) {
  if (points.length === 0) return null;
  const width = 100;
  const height = 40;
  const stepX = points.length > 1 ? width / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = points.length > 1 ? i * stepX : width / 2;
    const y = height - (Math.min(p.value, max) / max) * height;
    return { x, y, ...p };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const areaPath = `${path} L${coords[coords.length - 1].x},${height} L${coords[0].x},${height} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full overflow-visible" preserveAspectRatio="none">
        <path d={areaPath} fill="var(--accent)" opacity={0.08} />
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={1.4} fill="var(--accent)" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        {points.map((p, i) => (
          <span key={i} className={i !== 0 && i !== points.length - 1 ? "hidden sm:inline" : ""}>
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}
