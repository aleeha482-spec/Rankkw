interface SparklineProps {
  data: number[];
  trend?: 'Rising' | 'Steady' | 'Seasonal';
}

export function Sparkline({ data, trend = 'Steady' }: SparklineProps) {
  const points = data.length >= 2 ? data : [40, 45, 50, 55, 60, 65];
  const width = 68;
  const height = 22;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((val, idx) => {
    const x = (idx / (points.length - 1)) * (width - 4) + 2;
    const y = height - 3 - ((val - min) / range) * (height - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const strokeColor =
    trend === 'Rising'
      ? '#16A34A'
      : trend === 'Seasonal'
      ? '#D97706'
      : '#64748B';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 overflow-visible"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords.join(' ')}
      />
    </svg>
  );
}
