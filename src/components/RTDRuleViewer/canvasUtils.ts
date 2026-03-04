// ============================================================
// canvasUtils.ts
// Grid 繪製、Minimap 繪製、Snap 對齊
// ============================================================

import type { Block } from "./types";
import { BLOCK_SIZE } from "./blockUtils";

export const GRID_SIZE = BLOCK_SIZE / 2;

// ── Grid 繪製 ────────────────────────────────────────────────
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  view: { translateX: number; translateY: number; scale: number },
  size: { w: number; h: number }
) {
  const grid = GRID_SIZE;

  // 反推目前可視的 world 範圍
  const startX = Math.floor((-view.translateX) / view.scale / grid) * grid;
  const endX   = Math.ceil((size.w - view.translateX) / view.scale / grid) * grid;
  const startY = Math.floor((-view.translateY) / view.scale / grid) * grid;
  const endY   = Math.ceil((size.h - view.translateY) / view.scale / grid) * grid;

  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1 / view.scale; // 縮放後線條仍維持 1px 視覺寬

  ctx.beginPath();
  for (let x = startX; x <= endX; x += grid) {
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
  }
  for (let y = startY; y <= endY; y += grid) {
    ctx.moveTo(startX, y);
    ctx.lineTo(endX,   y);
  }
  ctx.stroke();
}

// ── Snap 對齊（拖曳放開時吸附到格線） ──────────────────────
export function snap(value: number, grid: number) {
  return Math.round(value / grid) * grid;
}

// ── 取得所有 Block 的世界座標邊界 ───────────────────────────
export function getWorldBounds(blocks: Block[]) {
  const PADDING = 50;

  const xs = blocks.flatMap((b) => [b.x, b.x + b.w]);
  const ys = blocks.flatMap((b) => [b.y, b.y + b.h]);

  return {
    minX: Math.min(...xs) - PADDING,
    maxX: Math.max(...xs) + PADDING,
    minY: Math.min(...ys) - PADDING,
    maxY: Math.max(...ys) + PADDING,
  };
}

// ── Minimap 繪製 ─────────────────────────────────────────────
export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  blocks: Block[],
  view: { translateX: number; translateY: number; scale: number },
  canvas: HTMLCanvasElement,
  viewportSize: { w: number; h: number }
) {
  if (blocks.length === 0) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bounds = getWorldBounds(blocks);
  const worldW = bounds.maxX - bounds.minX;
  const worldH = bounds.maxY - bounds.minY;

  // 90% 塞滿，留 10% 邊距
  const FIT_RATIO = 0.9;
  const scale = Math.min(
    canvas.width  / worldW,
    canvas.height / worldH
  ) * FIT_RATIO;

  const worldWpx = worldW * scale;
  const worldHpx = worldH * scale;

  // 置中偏移
  const ox = (canvas.width  - worldWpx) / 2 - bounds.minX * scale;
  const oy = (canvas.height - worldHpx) / 2 - bounds.minY * scale;

  // 繪製 Block 縮圖
  ctx.fillStyle = "#9ca3af";
  blocks.forEach((b) => {
    ctx.fillRect(
      b.x * scale + ox,
      b.y * scale + oy,
      b.w * scale,
      b.h * scale
    );
  });

  // 繪製目前視窗範圍框
  const vx = -view.translateX / view.scale;
  const vy = -view.translateY / view.scale;
  const vw = viewportSize.w / view.scale;
  const vh = viewportSize.h / view.scale;

  ctx.strokeStyle = "rgba(30, 110, 110, 0.8)";
  ctx.lineWidth = 1;
  ctx.strokeRect(
    vx * scale + ox,
    vy * scale + oy,
    vw * scale,
    vh * scale
  );
}
