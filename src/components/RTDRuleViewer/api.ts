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

export async function loadRuleNames(): Promise<string[]> {
  const res = await client.get<string[]>("/api/RuleViewer/names");
  return res.data;
}

export async function loadRule(ruleName: string): Promise<RuleDTO[]> {
  // encodeURIComponent 防止 ruleName 有空白、斜線、特殊字元直接炸掉
  const res = await client.get<RuleDTO[]>(
    `/api/RuleViewer/${encodeURIComponent(ruleName)}`
  );
  return res.data;
}
