import { TOTEM_WIDTH } from "./constants";
import { HERA_COLORS } from "./constants";
import type { ColorScores } from "./types";

const CARD_WIDTH = TOTEM_WIDTH;
const CARD_HEIGHT = 1700;
const MARGIN = 64;

function normalizeWeights(scores: ColorScores): { verde: number; ciano: number; magenta: number } {
  const total = scores.verde + scores.ciano + scores.magenta;
  if (total === 0) return { verde: 1 / 3, ciano: 1 / 3, magenta: 1 / 3 };
  return { verde: scores.verde / total, ciano: scores.ciano / total, magenta: scores.magenta / total };
}

/** Stessa logica di src/app/page.tsx (buildRingSegments) ma in radianti per Canvas 2D. */
function buildRingArcs(
  weights: { verde: number; ciano: number; magenta: number },
  gapDeg = 10
): { color: string; startRad: number; endRad: number }[] {
  const order: { key: keyof typeof weights; color: string }[] = [
    { key: "verde", color: HERA_COLORS.verde },
    { key: "ciano", color: HERA_COLORS.ciano },
    { key: "magenta", color: HERA_COLORS.magenta },
  ];
  const floored = order.map((o) => ({ ...o, w: Math.max(weights[o.key], 0.08) }));
  const totalW = floored.reduce((s, o) => s + o.w, 0);
  const availableDeg = 360 - gapDeg * floored.length;

  let cursorDeg = -90; // parte dall'alto, come sullo schermo
  return floored.map((o) => {
    const sweepDeg = (o.w / totalW) * availableDeg;
    const startDeg = cursorDeg;
    const endDeg = startDeg + sweepDeg;
    cursorDeg = endDeg + gapDeg;
    return { color: o.color, startRad: (startDeg * Math.PI) / 180, endRad: (endDeg * Math.PI) / 180 };
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function generatePostcard(options: {
  scores: ColorScores;
  profileName: string;
  claim: string;
  description?: string;
  photoUrl?: string;
}): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d")!;

  // Sfondo — stessa tinta soft della schermata a video
  const bg = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  bg.addColorStop(0, `${HERA_COLORS.verde}18`);
  bg.addColorStop(0.5, `${HERA_COLORS.ciano}18`);
  bg.addColorStop(1, `${HERA_COLORS.magenta}18`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const weights = normalizeWeights(options.scores);

  // Logo + eyebrow
  try {
    const logo = await loadImage("/brand/hera-logo.webp");
    const logoH = 56;
    const logoW = (logo.width / logo.height) * logoH;
    ctx.drawImage(logo, (CARD_WIDTH - logoW) / 2, 56, logoW, logoH);
  } catch {
    // logo non disponibile — si procede senza, non blocca la cartolina
  }
  ctx.fillStyle = "#64748b";
  ctx.textAlign = "center";
  ctx.font = "600 26px sans-serif";
  ctx.fillText("PROFILO ARMONICO GENERATO", CARD_WIDTH / 2, 158);

  // Card bianca centrale
  const cardX = MARGIN;
  const cardY = 200;
  const cardW = CARD_WIDTH - MARGIN * 2;
  const cardH = CARD_HEIGHT - cardY - MARGIN;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, cardX, cardY, cardW, cardH, 40);
  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.15)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  ctx.fill();
  ctx.restore();

  let cursorY = cardY + 70;

  // Nome profilo
  ctx.fillStyle = "#0f172a";
  ctx.font = "900 56px sans-serif";
  ctx.fillText(options.profileName, CARD_WIDTH / 2, cursorY);
  cursorY += 50;

  // Claim
  if (options.claim) {
    ctx.fillStyle = "#64748b";
    ctx.font = "500 28px sans-serif";
    const claimLines = wrapText(ctx, options.claim, cardW - 120);
    for (const line of claimLines) {
      cursorY += 38;
      ctx.fillText(line, CARD_WIDTH / 2, cursorY);
    }
  }
  cursorY += 60;

  // Foto con anello segmentato
  const ringR = 150;
  const ringCx = CARD_WIDTH / 2;
  const ringCy = cursorY + ringR;
  const arcs = buildRingArcs(weights);
  ctx.lineCap = "round";
  ctx.lineWidth = 16;
  for (const arc of arcs) {
    ctx.strokeStyle = arc.color;
    ctx.beginPath();
    ctx.arc(ringCx, ringCy, ringR, arc.startRad, arc.endRad);
    ctx.stroke();
  }
  const photoR = ringR - 28;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ringCx, ringCy, photoR, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (options.photoUrl) {
    const img = await loadImage(options.photoUrl);
    ctx.drawImage(img, ringCx - photoR, ringCy - photoR, photoR * 2, photoR * 2);
  } else {
    ctx.fillStyle = "#e8e0ec";
    ctx.fillRect(ringCx - photoR, ringCy - photoR, photoR * 2, photoR * 2);
    drawPlaceholderAvatar(ctx, ringCx, ringCy, photoR * 2);
  }
  ctx.restore();

  cursorY = ringCy + ringR + 70;

  // Percentuali per categoria
  const percentages = {
    verde: Math.round(weights.verde * 100),
    ciano: Math.round(weights.ciano * 100),
    magenta: Math.round(weights.magenta * 100),
  };
  const tiles: { key: keyof typeof percentages; label: string; sub: string; color: string }[] = [
    { key: "verde", label: "AMBIENTE", sub: "Rispetto per l'ambiente", color: HERA_COLORS.verde },
    { key: "ciano", label: "ACQUA", sub: "Consumo consapevole", color: HERA_COLORS.ciano },
    { key: "magenta", label: "ENERGIA", sub: "Efficienza energetica", color: HERA_COLORS.magenta },
  ];
  const tileGap = 24;
  const tileW = (cardW - 80 - tileGap * 2) / 3;
  const tileH = 170;
  const tileY = cursorY;
  tiles.forEach((tile, i) => {
    const tileX = cardX + 40 + i * (tileW + tileGap);
    ctx.fillStyle = `${tile.color}14`;
    roundRect(ctx, tileX, tileY, tileW, tileH, 20);
    ctx.fill();

    ctx.fillStyle = "#0f172a";
    ctx.font = "900 40px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${percentages[tile.key]}%`, tileX + tileW / 2, tileY + 60);

    ctx.fillStyle = tile.color;
    ctx.font = "700 20px sans-serif";
    ctx.fillText(tile.label, tileX + tileW / 2, tileY + 96);

    ctx.fillStyle = "#64748b";
    ctx.font = "400 17px sans-serif";
    const subLines = wrapText(ctx, tile.sub, tileW - 20);
    subLines.forEach((line, li) => {
      ctx.fillText(line, tileX + tileW / 2, tileY + 122 + li * 22);
    });
  });

  cursorY = tileY + tileH + 56;

  // Descrizione profilo
  if (options.description) {
    const descX = cardX + 40;
    const descW = cardW - 80;
    ctx.font = "400 24px sans-serif";
    const descLines = wrapText(ctx, options.description, descW - 48);
    const descBoxH = 56 + descLines.length * 32;

    ctx.fillStyle = "#f1f5f9";
    roundRect(ctx, descX, cursorY, descW, descBoxH, 20);
    ctx.fill();

    ctx.fillStyle = "#0f172a";
    ctx.font = "700 22px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Il tuo profilo Heraviglioso", descX + 24, cursorY + 40);

    ctx.fillStyle = "#64748b";
    ctx.font = "400 21px sans-serif";
    descLines.forEach((line, li) => {
      ctx.fillText(line, descX + 24, cursorY + 74 + li * 30);
    });
  }

  return canvas.toDataURL("image/png");
}

export function downloadPostcard(dataUrl: string, filename = "armocromia-heravigliosa.png"): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawPlaceholderAvatar(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#ffffff";

  // Head
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.08, size * 0.16, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.28, size * 0.24, Math.PI, 0);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.restore();
}
