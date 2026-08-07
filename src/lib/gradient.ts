import { HERA_COLORS } from "./constants";
import type { ColorScores, ProfileKey } from "./types";

export interface GradientResult {
  css: string;
  profileKey: ProfileKey;
  weights: { verde: number; ciano: number; magenta: number };
}

function normalizeScores(scores: ColorScores): {
  verde: number;
  ciano: number;
  magenta: number;
} {
  const total = scores.verde + scores.ciano + scores.magenta;
  if (total === 0) return { verde: 1 / 3, ciano: 1 / 3, magenta: 1 / 3 };
  return {
    verde: scores.verde / total,
    ciano: scores.ciano / total,
    magenta: scores.magenta / total,
  };
}

export function determineProfile(
  scores: ColorScores,
  heraThreshold: number
): ProfileKey {
  const max = Math.max(scores.verde, scores.ciano, scores.magenta);
  const min = Math.min(scores.verde, scores.ciano, scores.magenta);

  if (max - min <= heraThreshold) return "hera";
  if (scores.verde >= scores.ciano && scores.verde >= scores.magenta)
    return "ambiente";
  if (scores.ciano >= scores.verde && scores.ciano >= scores.magenta)
    return "acqua";
  return "energia";
}

/**
 * Places one stop per color at the midpoint of its cumulative weight share,
 * so the blend is continuous (no repeated-color bands) and the dominant
 * color still occupies visibly more of the gradient.
 */
function weightedStops(weights: { verde: number; ciano: number; magenta: number }) {
  const order: { key: keyof typeof weights; color: string }[] = [
    { key: "verde", color: HERA_COLORS.verde },
    { key: "ciano", color: HERA_COLORS.ciano },
    { key: "magenta", color: HERA_COLORS.magenta },
  ];

  // Floor so no color ever fully disappears from the blend.
  const floored = order.map((o) => ({ ...o, w: Math.max(weights[o.key], 0.08) }));
  const total = floored.reduce((s, o) => s + o.w, 0);

  let cumulative = 0;
  return floored.map((o) => {
    const midpoint = (cumulative + o.w / 2) / total;
    cumulative += o.w;
    return { color: o.color, position: midpoint * 100 };
  });
}

export function scoresToGradient(scores: ColorScores): GradientResult {
  const weights = normalizeScores(scores);
  const profileKey = determineProfile(scores, 2);

  const stops = weightedStops(weights);
  const css = `linear-gradient(135deg, ${stops
    .map((s) => `${s.color} ${s.position.toFixed(1)}%`)
    .join(", ")})`;

  return { css, profileKey, weights };
}

export function drawGradientOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scores: ColorScores
): void {
  const weights = normalizeScores(scores);
  const stops = weightedStops(weights);

  // Diagonal gradient matching the CSS `135deg` direction.
  const angle = (135 * Math.PI) / 180;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const halfDiag = (Math.abs(dx) * width + Math.abs(dy) * height) / 2;
  const cx = width / 2;
  const cy = height / 2;

  const gradient = ctx.createLinearGradient(
    cx - dx * halfDiag,
    cy - dy * halfDiag,
    cx + dx * halfDiag,
    cy + dy * halfDiag
  );

  for (const s of stops) {
    gradient.addColorStop(Math.min(Math.max(s.position / 100, 0), 1), s.color);
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}
