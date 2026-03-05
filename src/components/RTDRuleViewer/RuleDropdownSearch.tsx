// ============================================================
// RuleDropdownSearch.tsx
// 兩階段 Rule 選擇：先選 Phase，再搜尋選 Rule Name
// 未選 Phase 時 Rule 輸入框禁用
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
  const [ruleInput, setRuleInput]   = useState("");
  const [ruleOpen, setRuleOpen]     = useState(false);
  const ruleWrapperRef              = useRef<HTMLDivElement>(null);

  // 切換 Phase 時清空 Rule 輸入
  useEffect(() => { setRuleInput(""); setRuleOpen(false); }, [selectedPhase]);

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

  const phaseOptions = phases.map((p) => ({ label: p, value: p }));

  return (
    <div className="flex items-center gap-2">

      {/* ── Stage 1: Phase ── */}
      <Select
        placeholder="選擇 Phase"
        options={phaseOptions}
        value={selectedPhase ?? undefined}
        onChange={(v) => onPhaseChange(v ?? null)}
        allowClear
        style={{ width: 130 }}
        popupMatchSelectWidth={false}
        styles={{ popup: { root: { zIndex: 2000 } } }}
      />

      {/* ── Stage 2: Rule Name ── */}
      <div ref={ruleWrapperRef} className="relative w-[240px]">
        <input
          className={[
            "w-full h-[32px] px-3 text-sm rounded border outline-none",
            "bg-white border-[#d9d9d9] placeholder:text-[#bfbfbf]",
            selectedPhase
              ? "cursor-text focus:border-[#4096ff] focus:shadow-[0_0_0_2px_rgba(5,145,255,0.1)]"
              : "cursor-not-allowed bg-[#f5f5f5] text-[#00000040]",
          ].join(" ")}
          placeholder={selectedPhase ? "搜尋 Rule Name" : "請先選擇 Phase"}
          disabled={!selectedPhase}
          value={ruleInput}
          onFocus={() => selectedPhase && setRuleOpen(true)}
          onChange={(e) => { setRuleInput(e.target.value); setRuleOpen(true); }}
        />

        {ruleOpen && selectedPhase && (
          <ul className="absolute top-full left-0 mt-1 w-full max-h-[220px] overflow-y-auto border border-[#d9d9d9] bg-white shadow-md list-none p-0 m-0 z-[2000] rounded">
            {filteredRules.length === 0 ? (
              <li className="px-3 py-2 text-[#bfbfbf] text-sm cursor-default">No matches</li>
            ) : (
              filteredRules.map((opt) => (
                <li
                  key={opt}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-[#f5f5f5]"
                  onMouseDown={(e) => {
                    e.preventDefault(); // 不觸發 blur
                    setRuleInput(opt);
                    setRuleOpen(false);
                    onRuleSelect(opt);
                  }}
                >
                  {opt}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
