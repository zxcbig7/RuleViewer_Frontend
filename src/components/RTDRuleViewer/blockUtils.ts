// ============================================================
// blockUtils.ts
// Block 的建構、圖片快取、命中測試、繪製邏輯
// ============================================================

import type { Block, RuleData } from "./types";

export const BLOCK_SIZE = 80;

// ── 建構 Block 陣列 ─────────────────────────────────────────
export function buildBlocks(data: RuleData[]): Block[] {
  return data.map((r) => ({
    id: r.BLOCK_NAME,
    x: r.POSX,
    y: r.POSY,
    w: BLOCK_SIZE,
    h: BLOCK_SIZE,
    type: r.BLOCK_TYPE,
    label: r.BLOCK_NAME,
    raw: r,
  }));
}

// ── 圖片快取 ────────────────────────────────────────────────
// 圖片放在 public 資料夾
const BLOCK_IMAGE_SRC: Record<Block["type"], string> = {
  START:    "/RuleViewerBlock/start.png",
  PROCESS:  "/RuleViewerBlock/process.png",
  DECISION: "/RuleViewerBlock/decision.png",
  FUNCTION: "/RuleViewerBlock/function.png",
  END:      "/RuleViewerBlock/end.png",
};

const BLOCK_IMAGE_CACHE: Partial<Record<Block["type"], HTMLImageElement>> = {};

export function getBlockImage(type: Block["type"]): HTMLImageElement {
  let img = BLOCK_IMAGE_CACHE[type];
  if (!img) {
    img = new Image();
    img.src = BLOCK_IMAGE_SRC[type];
    BLOCK_IMAGE_CACHE[type] = img;
  }
  return img;
}

// ── 取得 Block 中心點 ────────────────────────────────────────
export function blockCenter(b: Block) {
  return {
    x: b.x + b.w / 2,
    y: b.y + b.h / 2,
  };
}

// ── Hit Test：判斷滑鼠是否點到某個 Block ─────────────────────
export function hitTestBlock(wx: number, wy: number, blocks: Block[]): Block | null {
  let best: Block | null = null;
  let bestDist = Infinity;

  for (const b of blocks) {
    if (wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h) {
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const d = (wx - cx) ** 2 + (wy - cy) ** 2;

      if (d < bestDist) {
        bestDist = d;
        best = b;
      }
    }
  }

  return best;
}

// ── 繪製單一 Block ───────────────────────────────────────────
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  b: Block,
  highlighted: boolean,
  isMatched: boolean,
  isSelected: boolean,
  trackerRole?: "log" | "var"
) {
  ctx.save();

  if (!isMatched) {
    ctx.globalAlpha = 0.4;
  }

  // 白底
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(b.x, b.y, b.w, b.h);

  // 圖片
  const img = getBlockImage(b.type);
  if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, b.x, b.y, b.w, b.h);
  }

  // 邊框
  if (isSelected) {
    ctx.save();
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "rgba(34,197,94,0.7)";
    ctx.shadowBlur = 10;
    ctx.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
    ctx.restore();
  } else if (highlighted) {
    ctx.save();
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(37,99,235,0.6)";
    ctx.shadowBlur = 8;
    ctx.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
    ctx.restore();
  } else {
    ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
  }

  // Label 文字
  ctx.fillStyle = "rgba(0, 0, 0, 0.53)";
  ctx.font = "8px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h + 4);

  ctx.restore();

  // Tracker 光環（在 restore 之後繪製，不受 globalAlpha 影響）
  if (trackerRole) {
    const isLog = trackerRole === "log";
    ctx.save();
    ctx.strokeStyle  = isLog ? "#f59e0b" : "#a855f7";
    ctx.lineWidth    = 2.5;
    ctx.shadowColor  = isLog ? "rgba(245,158,11,0.8)" : "rgba(168,85,247,0.8)";
    ctx.shadowBlur   = 14;
    ctx.strokeRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6);
    ctx.restore();
  }
}

// ── 繪製所有 Block ───────────────────────────────────────────
export function drawBlocks(
  ctx: CanvasRenderingContext2D,
  blocks: Block[],
  inspectedIds: Set<string>,
  matchedIds: Set<string> | null,
  selectedId?: string | null,
  trackerLogIds?: Set<string>,
  trackerVarIds?: Set<string>
) {
  blocks.forEach((b) =>
    drawBlock(
      ctx,
      b,
      inspectedIds.has(b.id),
      matchedIds ? matchedIds.has(b.id) : true,
      !!selectedId && b.id === selectedId,
      trackerLogIds?.has(b.id) ? "log" : trackerVarIds?.has(b.id) ? "var" : undefined
    )
  );
}
