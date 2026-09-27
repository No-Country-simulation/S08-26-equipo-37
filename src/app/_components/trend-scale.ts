export function scaleTrendPoints(points: readonly (number | null)[]): readonly (number | null)[] {
  const readings = points.filter((point): point is number => point !== null);

  if (readings.length === 0) return points;

  const minimum = Math.min(...readings);
  const range = Math.max(...readings) - minimum;

  return points.map((point) => (point === null ? null : range === 0 ? 55 : 18 + ((point - minimum) / range) * 82));
}

/** A missing reading starts a new segment; never draw a line across a gap. */
export function trendPath(points: readonly (number | null)[]): string {
  let connected = false;

  return points.map((point, index) => {
    if (point === null) {
      connected = false;
      return "";
    }

    const command = connected ? "L" : "M";
    connected = true;
    const x = 5 + (index / Math.max(1, points.length - 1)) * 190;
    return `${command}${x},${10 + (100 - point) * 0.7}`;
  }).filter(Boolean).join(" ");
}
