// ============================================================
// types.ts
// 所有共用型別定義集中在這裡
// ============================================================

// ── API 回傳的原始資料結構 ──────────────────────────────────
export type RuleDTO = {
  PHASE: string;
  RULE_NAME: string;
  BLOCK_NAME: string;
  BLOCK_TYPE: string;
  BLOCK_GROUP: string;
  BLOCK_SEQ: string;
  KEY: string | null;
  POSX: number;
  POSY: number;
  PRE_BLOCK: string | null;
  COLUMN1: string | null;
  COLUMN2: string | null;
  VALUE1: string | null;
  VALUE2: string | null;
  VALUE3: string | null;
  VALUE4: string | null;
  VALUE5: string | null;
};

// ── 合併後單一條件的 Value ──────────────────────────────────
export type BlockValue = {
  COLUMN1: string | null;
  COLUMN2: string | null;
  VALUE: string | null;
};

// ── 資料轉換後的 Block 資料 ─────────────────────────────────
export type RuleData = {
  PHASE: string;
  RULE_NAME: string;
  BLOCK_NAME: string;
  BLOCK_TYPE: string;
  BLOCK_GROUP: string;
  BLOCK_SEQ: string;
  KEY: string | null;
  POSX: number;
  POSY: number;
  /** 前置 Block 名稱，長度 0-2。[0] = 主線來源，[1] = 副線來源（選用） */
  PRE_BLOCK: string[] | null;
  VALUES: BlockValue[];
};

// ── Canvas 上渲染用的 Block ─────────────────────────────────
export type BlockType = RuleData["BLOCK_TYPE"];

export type Block = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: BlockType;
  label: string;
  raw: RuleData;
};

// ── 箭頭 ────────────────────────────────────────────────────
export type Arrow = {
  from: string;
  to: string;
  isPrimary: boolean;
};

export type ArrowRenderStyle = {
  isPrimary: boolean;
  scale: number;
};

// ── 連線方向 ────────────────────────────────────────────────
export type Side = "left" | "right" | "top" | "bottom";

// ── RuleView 暴露給父層的 handle ────────────────────────────
export type RuleViewHandle = {
  focusBlockById: (id: string) => void;
};
