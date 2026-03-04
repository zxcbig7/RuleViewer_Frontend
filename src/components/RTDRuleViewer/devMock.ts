// ============================================================
// devMock.ts
// 開發用假資料：展示主線（深灰實線）與副線（橘色虛線）
//
//   START → DECISION → TRUE_PATH  ─(主線)→ MERGE → END
//                    ↘ FALSE_PATH ─(副線)↗
// ============================================================

import type { RuleData } from "./types";

export const DEV_MOCK_RULE_NAME = "__DEV_主副線範例__";

export const DEV_MOCK_RULES: RuleData[] = [
  {
    PHASE: "DEV", RULE_NAME: DEV_MOCK_RULE_NAME,
    BLOCK_NAME: "START",     BLOCK_TYPE: "START",    BLOCK_GROUP: "G1", BLOCK_SEQ: "1",
    KEY: null, POSX: 300, POSY: 100,
    PRE_BLOCK: null,
    VALUES: [],
  },
  {
    PHASE: "DEV", RULE_NAME: DEV_MOCK_RULE_NAME,
    BLOCK_NAME: "DECISION",  BLOCK_TYPE: "DECISION", BLOCK_GROUP: "G1", BLOCK_SEQ: "2",
    KEY: null, POSX: 300, POSY: 250,
    PRE_BLOCK: ["START"],
    VALUES: [{ COLUMN1: "COND", COLUMN2: null, VALUE: 'IF COLUMN = "A" THEN TRUE' }],
  },
  {
    PHASE: "DEV", RULE_NAME: DEV_MOCK_RULE_NAME,
    BLOCK_NAME: "TRUE_PATH",  BLOCK_TYPE: "PROCESS",  BLOCK_GROUP: "G1", BLOCK_SEQ: "3",
    KEY: null, POSX: 150, POSY: 420,
    PRE_BLOCK: ["DECISION"],
    VALUES: [{ COLUMN1: null, COLUMN2: null, VALUE: "/* 條件成立走這裡 */ IF A THEN B" }],
  },
  {
    PHASE: "DEV", RULE_NAME: DEV_MOCK_RULE_NAME,
    BLOCK_NAME: "FALSE_PATH", BLOCK_TYPE: "PROCESS",  BLOCK_GROUP: "G1", BLOCK_SEQ: "4",
    KEY: null, POSX: 450, POSY: 420,
    PRE_BLOCK: ["DECISION"],
    VALUES: [{ COLUMN1: null, COLUMN2: null, VALUE: "/* 條件不成立走這裡 */" }],
  },
  {
    PHASE: "DEV", RULE_NAME: DEV_MOCK_RULE_NAME,
    // 主線來源 TRUE_PATH（深灰實線），副線來源 FALSE_PATH（橘色虛線）
    BLOCK_NAME: "MERGE",     BLOCK_TYPE: "PROCESS",  BLOCK_GROUP: "G1", BLOCK_SEQ: "5",
    KEY: null, POSX: 300, POSY: 600,
    PRE_BLOCK: ["TRUE_PATH", "FALSE_PATH"],
    VALUES: [{ COLUMN1: null, COLUMN2: null, VALUE: '函Merge("TRUE_PATH", "FALSE_PATH")' }],
  },
  {
    PHASE: "DEV", RULE_NAME: DEV_MOCK_RULE_NAME,
    BLOCK_NAME: "END",       BLOCK_TYPE: "END",      BLOCK_GROUP: "G1", BLOCK_SEQ: "6",
    KEY: null, POSX: 300, POSY: 760,
    PRE_BLOCK: ["MERGE"],
    VALUES: [],
  },
];
