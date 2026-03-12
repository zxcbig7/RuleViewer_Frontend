// ============================================================
// RuleDropdownSearch.tsx
// 兩階段 Rule 選擇：先選 Phase，再搜尋選 Rule Name，按鈕後載入
// 鍵盤支援：Phase↑↓Enter → 聚焦 Rule；Rule↑↓Enter → 載入
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { Select } from "antd";
import { cn } from "../../utls/clsx";

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
        confirmRule(filteredRules[ruleHighlightIdx]);
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
        <div ref={ruleWrapperRef} className="relative w-60">
          <input
            ref={ruleInputRef}
            className="w-full h-8 px-3 pr-7 text-sm rounded border outline-none
              bg-white border-gray-300 placeholder:text-gray-400
              cursor-text focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
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
          {ruleInput && (
            <button
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault();
                setRuleInput("");
                setPendingRule(null);
                setRuleOpen(false);
                ruleInputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer leading-none"
            >
              ×
            </button>
          )}

          {ruleOpen && (
            <ul
              ref={ruleListRef}
              className="absolute top-full left-0 mt-1 w-full max-h-55 overflow-y-auto border border-gray-300 bg-white shadow-md list-none p-0 m-0 z-2000 rounded"
            >
              {filteredRules.length === 0 ? (
                <li className="px-3 py-2 text-gray-400 text-sm cursor-default">No matches</li>
              ) : (
                filteredRules.map((opt, i) => (
                  <li
                    key={opt}
                    data-item
                    className={cn("px-3 py-2 text-sm cursor-pointer",
                      i === ruleHighlightIdx
                        ? "bg-blue-200 text-blue-500"
                        : opt === pendingRule
                        ? "bg-blue-50 text-blue-500"
                        : "hover:bg-gray-100"
                    )}
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
          className={cn("h-8 px-4 rounded text-sm font-semibold transition-colors",
            canLoad
              ? "bg-blue-500 text-white hover:bg-blue-400 cursor-pointer"
              : "bg-gray-100 text-black/25 cursor-not-allowed border border-gray-300"
          )}
        >
          載入
        </button>
      )}
    </div>
  );
}
