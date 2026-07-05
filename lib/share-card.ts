// Client-side 1080x1920 story-card renderer. Canvas keeps export dependency-free
// and identical across devices. No UPI IDs on cards — they're social artifacts.

import { formatMoney, formatSignedMoney } from "@/lib/format";

export type ShareCardVariant = "winner" | "standings" | "settlement";

export type ShareCardData = {
  gameName: string;
  dateLabel: string;
  totalTracked: number;
  winner: { name: string; net: number } | null;
  standings: { name: string; net: number }[];
  settlements: { from: string; to: string; amount: number }[];
};

const W = 1080;
const H = 1920;

const colors = {
  background: "#070707",
  surface: "#1B1B1B",
  gold: "#F5B942",
  cream: "#FFF4D6",
  muted: "#9C9587",
  success: "#00D17A",
  danger: "#FF4D5A",
  border: "rgba(255, 244, 214, 0.14)",
};

function font(weight: number, size: number) {
  return `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let result = text;

  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }

  return `${result}…`;
}

function drawChrome(ctx: CanvasRenderingContext2D, data: ShareCardData, subtitle: string) {
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, W, H);

  // ambient glows
  const redGlow = ctx.createRadialGradient(140, 120, 0, 140, 120, 620);
  redGlow.addColorStop(0, "rgba(215, 38, 56, 0.30)");
  redGlow.addColorStop(1, "rgba(215, 38, 56, 0)");
  ctx.fillStyle = redGlow;
  ctx.fillRect(0, 0, W, H);

  const goldGlow = ctx.createRadialGradient(W - 120, H - 160, 0, W - 120, H - 160, 700);
  goldGlow.addColorStop(0, "rgba(245, 185, 66, 0.22)");
  goldGlow.addColorStop(1, "rgba(245, 185, 66, 0)");
  ctx.fillStyle = goldGlow;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.fillStyle = colors.gold;
  ctx.font = font(800, 44);
  ctx.fillText("O N   T H E   H O U S E", W / 2, 150);

  ctx.fillStyle = colors.muted;
  ctx.font = font(600, 34);
  ctx.fillText("house party games", W / 2, 208);

  ctx.fillStyle = colors.cream;
  ctx.font = font(900, 76);
  ctx.fillText(truncate(ctx, data.gameName, W - 160), W / 2, 340);

  ctx.fillStyle = colors.muted;
  ctx.font = font(600, 38);
  ctx.fillText(`${data.dateLabel} · ${formatMoney(data.totalTracked)} tracked`, W / 2, 410);

  ctx.fillStyle = colors.gold;
  ctx.font = font(800, 46);
  ctx.fillText(subtitle, W / 2, 530);

  // footer
  ctx.fillStyle = colors.muted;
  ctx.font = font(600, 32);
  ctx.fillText("settled on the house", W / 2, H - 90);
}

function drawWinner(ctx: CanvasRenderingContext2D, data: ShareCardData) {
  drawChrome(ctx, data, "WINNER OF THE NIGHT");

  const winner = data.winner;

  if (!winner) return;

  ctx.textAlign = "center";
  ctx.font = font(400, 220);
  ctx.fillText("🏆", W / 2, 900);

  ctx.fillStyle = colors.cream;
  ctx.font = font(900, 110);
  ctx.fillText(truncate(ctx, winner.name, W - 200), W / 2, 1080);

  ctx.fillStyle = colors.success;
  ctx.font = font(900, 130);
  ctx.fillText(formatSignedMoney(winner.net), W / 2, 1250);

  const runners = data.standings.filter((s) => s.name !== winner.name).slice(0, 3);
  let y = 1420;

  ctx.font = font(700, 44);

  for (const runner of runners) {
    ctx.fillStyle = colors.muted;
    ctx.textAlign = "left";
    ctx.fillText(truncate(ctx, runner.name, 540), 200, y);
    ctx.textAlign = "right";
    ctx.fillStyle = runner.net > 0 ? colors.success : runner.net < 0 ? colors.danger : colors.muted;
    ctx.fillText(formatSignedMoney(runner.net), W - 200, y);
    y += 80;
  }
}

function drawRows(
  ctx: CanvasRenderingContext2D,
  rows: { left: string; right: string; rightColor: string }[],
  startY: number,
) {
  const rowHeight = 118;
  const x = 90;
  const width = W - 180;

  rows.forEach((row, index) => {
    const y = startY + index * (rowHeight + 24);

    ctx.fillStyle = colors.surface;
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2;
    roundedRect(ctx, x, y, width, rowHeight, 32);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = colors.cream;
    ctx.font = font(800, 46);
    ctx.fillText(truncate(ctx, row.left, width - 420), x + 48, y + rowHeight / 2 + 16);

    ctx.textAlign = "right";
    ctx.fillStyle = row.rightColor;
    ctx.font = font(900, 48);
    ctx.fillText(row.right, x + width - 48, y + rowHeight / 2 + 16);
  });
}

function drawStandings(ctx: CanvasRenderingContext2D, data: ShareCardData) {
  drawChrome(ctx, data, "FINAL DAMAGE REPORT");

  drawRows(
    ctx,
    data.standings.slice(0, 9).map((s, i) => ({
      left: `${i + 1}.  ${s.name}`,
      right: formatSignedMoney(s.net),
      rightColor: s.net > 0 ? colors.success : s.net < 0 ? colors.danger : colors.muted,
    })),
    620,
  );
}

function drawSettlement(ctx: CanvasRenderingContext2D, data: ShareCardData) {
  drawChrome(ctx, data, "WHO PAYS WHOM");

  if (data.settlements.length === 0) {
    ctx.textAlign = "center";
    ctx.fillStyle = colors.cream;
    ctx.font = font(800, 60);
    ctx.fillText("Everyone broke even 🎉", W / 2, 900);
    return;
  }

  drawRows(
    ctx,
    data.settlements.slice(0, 9).map((s) => ({
      left: `${s.from}  →  ${s.to}`,
      right: formatMoney(s.amount),
      rightColor: colors.gold,
    })),
    620,
  );
}

export async function renderShareCard(variant: ShareCardVariant, data: ShareCardData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Canvas is not supported on this device.");

  if (variant === "winner") drawWinner(ctx, data);
  if (variant === "standings") drawStandings(ctx, data);
  if (variant === "settlement") drawSettlement(ctx, data);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not render the card."));
    }, "image/png");
  });
}

export async function shareOrDownloadCard(variant: ShareCardVariant, data: ShareCardData, fileName: string) {
  const blob = await renderShareCard(variant, data);
  const file = new File([blob], fileName, { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: data.gameName });
      return;
    } catch {
      // dismissed or unsupported — fall through to download
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
