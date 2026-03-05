// ============================================================
// api.ts
// 所有後端 API 呼叫集中在這裡
// ============================================================

import axios from "axios";
import type { RuleDTO } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE;
const CID = "ruleviewer-frontend";

const client = axios.create({
  baseURL: API_BASE,
  headers: { CID },
});

/** 取得所有 Phase 清單 */
export async function loadPhases(): Promise<string[]> {
  const res = await client.get<string[]>("/api/RuleViewer/phases");
  return res.data;
}

/** 取得指定 Phase 下的 Rule Name 清單 */
export async function loadRuleNamesByPhase(phase: string): Promise<string[]> {
  const res = await client.get<string[]>(
    `/api/RuleViewer/names/${encodeURIComponent(phase)}`
  );
  return res.data;
}

/** 取得指定 Rule 的完整資料 */
export async function loadRule(ruleName: string): Promise<RuleDTO[]> {
  // encodeURIComponent 防止 ruleName 有空白、斜線、特殊字元直接炸掉
  const res = await client.get<RuleDTO[]>(
    `/api/RuleViewer/${encodeURIComponent(ruleName)}`
  );
  return res.data;
}
