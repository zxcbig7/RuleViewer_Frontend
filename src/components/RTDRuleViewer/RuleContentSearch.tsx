// ============================================================
// RuleContentSearch.tsx
// Toolbar 右側：在當前 Rule 內搜尋關鍵字
// ============================================================

import { useState, useCallback } from "react";
import { Input } from "antd";
import type { RuleData } from "./types";

type RuleContentSearchProps = {
  rules: RuleData[];
  onMatchChange: (matched: string[] | null) => void;
};

function matchRule(rule: RuleData, keyword: string): boolean {
  const kw = keyword.toLowerCase();

  if (rule.BLOCK_NAME.toLowerCase().includes(kw)) return true;
  if (rule.KEY && rule.KEY.toLowerCase().includes(kw)) return true;

  return rule.VALUES.some(
    (v) =>
      (v.COLUMN1 && v.COLUMN1.toLowerCase().includes(kw)) ||
      (v.COLUMN2 && v.COLUMN2.toLowerCase().includes(kw)) ||
      (v.VALUE != null && v.VALUE.toLowerCase().includes(kw))
  );
}

/**
 * 對 rules 做拓撲排序（Kahn's BFS），同層以 BLOCK_SEQ 為次排序。
 * 回傳 BLOCK_NAME 陣列，順序即為樹狀流程的延展順序。
 */
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

  // 以 BLOCK_SEQ 排序維護佇列（最小 seq 優先出佇列）
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

export function RuleContentSearch({ rules, onMatchChange }: RuleContentSearchProps) {
  const [keyword, setKeyword] = useState("");

  const handleSearch = useCallback(() => {
    const kw = keyword.trim();
    if (!kw) {
      onMatchChange(null);
      return;
    }

    const matchedSet = new Set(
      rules.filter((r) => matchRule(r, kw)).map((r) => r.BLOCK_NAME)
    );
    const matched = topoSort(rules).filter((name) => matchedSet.has(name));

    onMatchChange(matched);
  }, [keyword, rules, onMatchChange]);

  const handleClear = useCallback(() => {
    setKeyword("");
    onMatchChange(null);
  }, [onMatchChange]);

  return (
    <Input.Search
      placeholder="Search Rule Content (block / key / column / value)"
      style={{ width: 360 }}
      value={keyword}
      enterButton="Search"
      allowClear
      onChange={(e) => setKeyword(e.target.value)}
      onSearch={handleSearch}
      onClear={handleClear}
    />
  );
}

// ============================================================
// SearchNavigator.tsx
// 搜尋結果的前 / 後導覽與下拉跳轉
// ============================================================

type SearchNavigatorProps = {
  matched: string[] | null;
  index: number;
  onPrev: () => void;
  onNext: () => void;
  onPick: (i: number) => void;
};

export function SearchNavigator({
  matched,
  index,
  onPrev,
  onNext,
  onPick,
}: SearchNavigatorProps) {
  const total = matched?.length ?? 0;
  if (!matched || total === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={onPrev}
        disabled={index <= 0}
        className="px-2 py-1 rounded text-white bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-default cursor-pointer"
      >
        ⏮
      </button>
      <span className="px-2 text-[#cfd6e6] whitespace-nowrap">
        {index + 1} / {total}
      </span>
      <button
        onClick={onNext}
        disabled={index >= total - 1}
        className="px-2 py-1 rounded text-white bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-default cursor-pointer"
      >
        ⏭
      </button>

      <select
        value={index}
        onChange={(e) => onPick(Number(e.target.value))}
        className="ml-2 w-[220px] rounded px-2 py-1 bg-white/10 text-white border border-white/20 cursor-pointer"
      >
        {matched.map((id, i) => (
          <option key={id} value={i} className="text-black bg-white">
            {i + 1}. {id}
          </option>
        ))}
      </select>
    </div>
  );
}
