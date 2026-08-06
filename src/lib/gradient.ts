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

export function scoresToGradient(scores: ColorScores): GradientResult {
  const weights = normalizeScores(scores);
  const profileKey = determineProfile(scores, 2);

  const stops: string[] = [];
  let position = 0;

  const entries = [
    { weight: weights.verde, color: HERA_COLORS.verde },
    { weight: weights.ciano, color: HERA_COLORS.ciano },
    { weight: weights.magenta, color: HERA_COLORS.magenta },
  ].sort((a, b) => b.weight - a.weight);

  for (const entry of entries) {
    const span = Math.max(entry.weight * 100, 5);
    stops.push(`${entry.color} ${position.toFixed(1)}%`);
    position += span;
    stops.push(`${entry.color} ${Math.min(position, 100).toFixed(1)}%`);
  }

  const css = `linear-gradient(135deg, ${stops.join(", ")})`;

  return { css, profileKey, weights };
}

export function drawGradientOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scores: ColorScores
): void {
  const weights = normalizeScores(scores);

  const gradient = ctx.createLinearGradient(0, 0, width, height);

  const entries = [
    { weight: weights.verde, color: HERA_COLORS.verde },
    { weight: weights.ciano, color: HERA_COLORS.ciano },
    { weight: weights.magenta, color: HERA_COLORS.magenta },
  ].sort((a, b) => b.weight - a.weight);

  let position = 0;
  for (const entry of entries) {
    const span = Math.max(entry.weight, 0.05);
    gradient.addColorStop(Math.min(position, 1), entry.color);
    position += span;
    gradient.addColorStop(Math.min(position, 1), entry.color);
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}
