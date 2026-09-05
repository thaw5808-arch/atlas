/**
 * A deterministic topographic field. It gives every glass surface something
 * with structure to blur, and ties the interface to the atlas idea without
 * decorative gradients.
 */
function ring(cx: number, cy: number, radius: number, seed: number): string {
  const points: string[] = [];
  const steps = 48;
  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    const wobble =
      1 +
      0.09 * Math.sin(angle * 3 + seed) +
      0.05 * Math.sin(angle * 5 + seed * 1.7) +
      0.03 * Math.sin(angle * 8 + seed * 0.6);
    const x = cx + Math.cos(angle) * radius * wobble * 1.35;
    const y = cy + Math.sin(angle) * radius * wobble;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(" ");
}

export function ContourField() {
  const peaks = [
    { cx: 210, cy: 180, seed: 1.2, count: 11, step: 26 },
    { cx: 980, cy: 620, seed: 3.4, count: 9, step: 32 },
    { cx: 640, cy: 90, seed: 5.1, count: 6, step: 22 },
  ];

  return (
    <div className="contour-field" aria-hidden="true">
      <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        {peaks.map((peak, peakIndex) =>
          Array.from({ length: peak.count }).map((_, index) => (
            <polygon
              key={`${peakIndex}-${index}`}
              points={ring(peak.cx, peak.cy, peak.step * (index + 1), peak.seed + index * 0.35)}
              fill="none"
              stroke="#0b1f29"
              strokeOpacity={0.05 + (peak.count - index) * 0.004}
              strokeWidth={index % 4 === 0 ? 1.2 : 0.6}
            />
          )),
        )}
      </svg>
    </div>
  );
}
