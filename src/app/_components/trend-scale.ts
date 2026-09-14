export function scaleTrendPoints(points: readonly (number | null)[]): readonly (number | null)[] {
  const readings = points.filter((point): point is number => point !== null);

  if (readings.length === 0) return points;

  const minimum = Math.min(...readings);
  const range = Math.max(...readings) - minimum;

  return points.map((point) => (point === null ? null : range === 0 ? 55 : 18 + ((point - minimum) / range) * 82));
}
