// ============================================================
// RuleContentSearch.tsx
// 右側面板搜尋分頁：在當前 Rule 內搜尋關鍵字
// ============================================================

import { useState, useCallback } from "react";
import { Input } from "antd";
import type { RuleData } from "./types";

// ── 型別 ──────────────────────────────────────────────────────

export type MatchResult = {
  id: string;      // BLOCK_NAME
  snippet: string; // 命中的上下文摘要
};

type RuleContentSearchProps = {
  rules: RuleData[];
  onMatchChange: (matched: MatchResult[] | null, keyword: string) => void;
};

// ── 工具函式 ──────────────────────────────────────────────────

function matchRule(rule: RuleData, kw: string): boolean {
  if (rule.BLOCK_NAME.toLowerCase().includes(kw)) return true;
  if (rule.KEY && rule.KEY.toLowerCase().includes(kw)) return true;
  return rule.VALUES.some(
    (v) =>
      (v.COLUMN1 && v.COLUMN1.toLowerCase().includes(kw)) ||
      (v.COLUMN2 && v.COLUMN2.toLowerCase().includes(kw)) ||
      (v.VALUE != null && v.VALUE.toLowerCase().includes(kw))
  );
}

/** 取最具代表性的命中摘要（優先 VALUE > COLUMN > KEY > BLOCK_NAME） */
function getSnippet(rule: RuleData, keyword: string): string {
  const kw = keyword.toLowerCase();

  // 先找 VALUE 命中（最有資訊量）
  for (const v of rule.VALUES) {
    const val = v.VALUE;
    if (val && val.toLowerCase().includes(kw)) {
      const flat = val.replace(/\n/g, " ");
      const idx  = flat.toLowerCase().indexOf(kw);
      const s    = Math.max(0, idx - 18);
      const e    = Math.min(flat.length, idx + kw.length + 18);
      return (s > 0 ? "…" : "") + flat.slice(s, e) + (e < flat.length ? "…" : "");
    }
    if (v.COLUMN1?.toLowerCase().includes(kw)) return `col: ${v.COLUMN1}`;
    if (v.COLUMN2?.toLowerCase().includes(kw)) return `ref: ${v.COLUMN2}`;
  }
  if (rule.KEY?.toLowerCase().includes(kw)) return `key: ${rule.KEY}`;
  return "";
}

/** 拓撲排序（Kahn BFS），同層以 BLOCK_SEQ 次排序 */
function topoSort(rules: RuleData[]): string[] {
  const nameSet  = new Set(rules.map((r) => r.BLOCK_NAME));
  const seqOf    = new Map(rules.map((r) => [r.BLOCK_NAME, Number(r.BLOCK_SEQ)]));
  const children = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const r of rules) {
    children.set(r.BLOCK_NAME, []);
    inDegree.set(r.BLOCK_NAME, 0);
  }
  for (const r of rules) {
    for (const pre of r.PRE_BLOCK ?? []) {
      if (nameSet.has(pre)) {
        children.get(pre)!.push(r.BLOCK_NAME);
        inDegree.set(r.BLOCK_NAME, (inDegree.get(r.BLOCK_NAME) ?? 0) + 1);
      }
    }
  }

  const bySeq = (a: string, b: string) => (seqOf.get(a) ?? 0) - (seqOf.get(b) ?? 0);
  const queue = [...inDegree.entries()]
    .filter(([, d]) => d === 0)
    .map(([n]) => n)
    .sort(bySeq);
  const result: string[] = [];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    result.push(curr);
    const next = (children.get(curr) ?? []).sort(bySeq);
    for (const child of next) {
      const deg = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, deg);
      if (deg === 0) {
        const pos = queue.findIndex((n) => (seqOf.get(n) ?? 0) > (seqOf.get(child) ?? 0));
        pos === -1 ? queue.push(child) : queue.splice(pos, 0, child);
      }
    }
  }
  return result;
}

// ── Components ────────────────────────────────────────────────

export function RuleContentSearch({ rules, onMatchChange }: RuleContentSearchProps) {
  const [keyword, setKeyword] = useState("");

  const handleSearch = useCallback(() => {
    const kw = keyword.trim();
    if (!kw) { onMatchChange(null, ""); return; }

    const matchedSet = new Set(
      rules.filter((r) => matchRule(r, kw.toLowerCase())).map((r) => r.BLOCK_NAME)
    );
    const sorted  = topoSort(rules).filter((name) => matchedSet.has(name));
    const ruleMap = new Map(rules.map((r) => [r.BLOCK_NAME, r]));

    const results: MatchResult[] = sorted.map((id) => ({
      id,
      snippet: getSnippet(ruleMap.get(id)!, kw),
    }));

    onMatchChange(results, kw);
  }, [keyword, rules, onMatchChange]);

  const handleClear = useCallback(() => {
    setKeyword("");
    onMatchChange(null, "");
  }, [onMatchChange]);

  return (
    <Input.Search
      placeholder="Search blocks, keys, columns, values…"
      style={{ width: "100%" }}
      value={keyword}
      enterButton="Search"
      allowClear
      onChange={(e) => setKeyword(e.target.value)}
      onSearch={handleSearch}
      onClear={handleClear}
    />
  );
}

// ── SearchNavigator（無下拉）────────────────────────────────────

type SearchNavigatorProps = {
  total: number;
  index: number;
  onPrev: () => void;
  onNext: () => void;
};

export function SearchNavigator({ total, index, onPrev, onNext }: SearchNavigatorProps) {
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      <button
        onClick={onPrev}
        disabled={index <= 0}
        className="w-6 h-6 flex items-center justify-center rounded text-white bg-white/10
          hover:bg-white/20 disabled:opacity-30 disabled:cursor-default cursor-pointer text-sm"
      >
        ‹
      </button>
      <span className="text-xs text-[#cfd6e6] px-1 whitespace-nowrap tabular-nums">
        {index + 1} / {total}
      </span>
      <button
        onClick={onNext}
        disabled={index >= total - 1}
        className="w-6 h-6 flex items-center justify-center rounded text-white bg-white/10
          hover:bg-white/20 disabled:opacity-30 disabled:cursor-default cursor-pointer text-sm"
      >
        ›
      </button>
    </div>
  );
}
