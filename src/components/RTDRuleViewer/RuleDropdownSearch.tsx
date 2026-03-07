// ============================================================
// RuleDropdownSearch.tsx
// 兩階段 Rule 選擇：先選 Phase，再搜尋選 Rule Name，按鈕後載入
// 鍵盤支援：Phase↑↓Enter → 聚焦 Rule；Rule↑↓Enter → 載入
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { Select } from "antd";

type Props = {
  phases: string[];
  selectedPhase: string | null;
  ruleNames: string[];
  onPhaseChange: (phase: string | null) => void;
  onRuleSelect: (ruleName: string) => void;
};

export function RuleDropdownSearch({
  phases,
  selectedPhase,
  ruleNames,
  onPhaseChange,
  onRuleSelect,
}: Props) {
  const [ruleInput, setRuleInput]         = useState("");
  const [pendingRule, setPendingRule]     = useState<string | null>(null);
  const [ruleOpen, setRuleOpen]           = useState(false);
  const [ruleHighlightIdx, setRuleHighlightIdx] = useState(-1);

  const ruleWrapperRef = useRef<HTMLDivElement>(null);
  const ruleInputRef   = useRef<HTMLInputElement>(null);
  const ruleListRef    = useRef<HTMLUListElement>(null);

  // 切換 Phase 時清空
  useEffect(() => {
    setRuleInput("");
    setPendingRule(null);
    setRuleOpen(false);
    setRuleHighlightIdx(-1);
  }, [selectedPhase]);

  // 點外部關閉下拉
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ruleWrapperRef.current && !ruleWrapperRef.current.contains(e.target as Node)) {
        setRuleOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredRules = useMemo(() => {
    const kw = ruleInput.trim().toLowerCase();
    if (!kw) return ruleNames;
    return ruleNames.filter((r) => r.toLowerCase().includes(kw));
  }, [ruleNames, ruleInput]);

  // filter 變化時重置 highlight
  useEffect(() => { setRuleHighlightIdx(-1); }, [filteredRules]);

  // 高亮項目捲入可視範圍
  useEffect(() => {
    if (ruleHighlightIdx < 0 || !ruleListRef.current) return;
    const items = ruleListRef.current.querySelectorAll<HTMLLIElement>("li[data-item]");
    items[ruleHighlightIdx]?.scrollIntoView({ block: "nearest" });
  }, [ruleHighlightIdx]);

  const phaseOptions = phases.map((p) => ({ label: p, value: p }));
  const canLoad = !!pendingRule;

  function confirmRule(opt: string) {
    setRuleInput(opt);
    setPendingRule(opt);
    setRuleOpen(false);
    setRuleHighlightIdx(-1);
  }

  function handleLoad(rule?: string) {
    const target = rule ?? pendingRule;
    if (target) onRuleSelect(target);
  }

  function handleRuleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setRuleOpen(true);
      setRuleHighlightIdx((i) => Math.min(i + 1, filteredRules.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setRuleHighlightIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (ruleOpen && ruleHighlightIdx >= 0 && filteredRules[ruleHighlightIdx]) {
        const opt = filteredRules[ruleHighlightIdx];
        confirmRule(opt);
        handleLoad(opt);
      } else if (pendingRule) {
        handleLoad();
      }
    } else if (e.key === "Escape") {
      setRuleOpen(false);
      setRuleHighlightIdx(-1);
    }
  }

  return (
    <div className="flex items-center gap-2">

      {/* ── Stage 1: Phase（antd Select 內建 ↑↓Enter，選後聚焦 Rule） ── */}
      <Select
        placeholder="選擇 Phase"
        options={phaseOptions}
        value={selectedPhase ?? undefined}
        onChange={(v) => onPhaseChange(v ?? null)}
        onSelect={() => setTimeout(() => ruleInputRef.current?.focus(), 50)}
        allowClear
        autoFocus
        style={{ width: 130 }}
        popupMatchSelectWidth={false}
        styles={{ popup: { root: { zIndex: 2000 } } }}
      />

      {/* ── Stage 2: Rule Name（Phase 選完才顯示） ── */}
      {selectedPhase && (
        <div ref={ruleWrapperRef} className="relative w-[240px]">
          <input
            ref={ruleInputRef}
            className="w-full h-[32px] px-3 text-sm rounded border outline-none
              bg-white border-[#d9d9d9] placeholder:text-[#bfbfbf]
              cursor-text focus:border-[#4096ff] focus:shadow-[0_0_0_2px_rgba(5,145,255,0.1)]"
            placeholder="搜尋 Rule Name"
            value={ruleInput}
            onFocus={() => setRuleOpen(true)}
            onChange={(e) => {
              setRuleInput(e.target.value);
              setPendingRule(null);
              setRuleOpen(true);
            }}
            onKeyDown={handleRuleKeyDown}
          />

          {ruleOpen && (
            <ul
              ref={ruleListRef}
              className="absolute top-full left-0 mt-1 w-full max-h-[220px] overflow-y-auto border border-[#d9d9d9] bg-white shadow-md list-none p-0 m-0 z-[2000] rounded"
            >
              {filteredRules.length === 0 ? (
                <li className="px-3 py-2 text-[#bfbfbf] text-sm cursor-default">No matches</li>
              ) : (
                filteredRules.map((opt, i) => (
                  <li
                    key={opt}
                    data-item
                    className={`px-3 py-2 text-sm cursor-pointer ${
                      i === ruleHighlightIdx
                        ? "bg-[#bae0ff] text-[#1677ff]"
                        : opt === pendingRule
                        ? "bg-[#e6f4ff] text-[#1677ff]"
                        : "hover:bg-[#f5f5f5]"
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      confirmRule(opt);
                    }}
                  >
                    {opt}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}

      {/* ── 載入按鈕 ── */}
      {selectedPhase && (
        <button
          onClick={() => handleLoad()}
          disabled={!canLoad}
          className={`h-[32px] px-4 rounded text-sm font-semibold transition-colors ${
            canLoad
              ? "bg-[#1677ff] text-white hover:bg-[#4096ff] cursor-pointer"
              : "bg-[#f5f5f5] text-[#00000040] cursor-not-allowed border border-[#d9d9d9]"
          }`}
        >
          載入
        </button>
      )}
    </div>
  );
}
