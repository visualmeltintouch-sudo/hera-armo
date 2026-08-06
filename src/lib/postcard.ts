import { TOTEM_WIDTH } from "./constants";
import { drawGradientOnCanvas } from "./gradient";
import type { ColorScores } from "./types";

const CARD_WIDTH = TOTEM_WIDTH;
const CARD_HEIGHT = 1350;

export async function generatePostcard(options: {
  scores: ColorScores;
  profileName: string;
  claim: string;
  photoUrl?: string;
}): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d")!;

  drawGradientOnCanvas(ctx, CARD_WIDTH, CARD_HEIGHT, options.scores);

  if (options.photoUrl) {
    const img = await loadImage(options.photoUrl);
    const size = Math.min(CARD_WIDTH * 0.6, CARD_HEIGHT * 0.45);
    const x = (CARD_WIDTH - size) / 2;
    const y = CARD_HEIGHT * 0.08;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
  } else {
    drawPlaceholderAvatar(ctx, CARD_WIDTH, CARD_HEIGHT);
  }

  // Profile name
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.font = "bold 64px sans-serif";
  ctx.fillText(options.profileName, CARD_WIDTH / 2, CARD_HEIGHT * 0.68);

  // Claim
  ctx.font = "36px sans-serif";
  ctx.fillText(options.claim, CARD_WIDTH / 2, CARD_HEIGHT * 0.75);

  // Hashtag
  ctx.font = "28px sans-serif";
  ctx.globalAlpha = 0.8;
  ctx.fillText(
    "#LaTuaArmocromiaHeravigliosa",
    CARD_WIDTH / 2,
    CARD_HEIGHT * 0.92
  );
  ctx.globalAlpha = 1;

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

function drawPlaceholderAvatar(
  ctx: CanvasRenderingContext2D,
  cardWidth: number,
  cardHeight: number
): void {
  const size = Math.min(cardWidth * 0.5, cardHeight * 0.35);
  const cx = cardWidth / 2;
  const cy = cardHeight * 0.08 + size / 2;

  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.1, size * 0.18, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.25, size * 0.25, Math.PI, 0);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.restore();
}
