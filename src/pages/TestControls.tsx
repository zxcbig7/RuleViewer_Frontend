// ============================================================
// TestControls.tsx
// RuleDropdownSearch + RuleContentSearch 控制元件獨立測試頁
// ============================================================

import { useState } from "react";
import { RuleDropdownSearch } from "../components/RTDRuleViewer/RuleDropdownSearch";
import { RuleContentSearch, SearchNavigator } from "../components/RTDRuleViewer/RuleContentSearch";
import { MOCK_PHASES, MOCK_RULES_BY_PHASE, MOCK_RULE_DATA, DEV_MOCK_PHASE, DEV_MOCK_RULE_NAME, DEV_MOCK_RULES } from "../components/RTDRuleViewer/devMock";
import type { RuleData } from "../components/RTDRuleViewer/types";
import type { MockPhase } from "../components/RTDRuleViewer/devMock";

const ALL_PHASES = [DEV_MOCK_PHASE, ...MOCK_PHASES];

function getRuleNames(phase: string | null): string[] {
  if (!phase) return [];
  if (phase === DEV_MOCK_PHASE) return [DEV_MOCK_RULE_NAME];
  if (phase in MOCK_RULES_BY_PHASE) return MOCK_RULES_BY_PHASE[phase as MockPhase];
  return [];
}

function getRuleData(ruleName: string | null): RuleData[] {
  if (!ruleName) return [];
  if (ruleName === DEV_MOCK_RULE_NAME) return DEV_MOCK_RULES;
  return MOCK_RULE_DATA[ruleName] ?? [];
}

export default function TestControls() {
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [selectedRule,  setSelectedRule]  = useState<string | null>(null);
  const [matchedList,   setMatchedList]   = useState<string[] | null>(null);
  const [matchIndex,    setMatchIndex]    = useState(0);

  const ruleNames = getRuleNames(selectedPhase);
  const rules     = getRuleData(selectedRule);

  function handlePhaseChange(phase: string | null) {
    setSelectedPhase(phase);
    setSelectedRule(null);
    setMatchedList(null);
    setMatchIndex(0);
  }

  function handlePrev() {
    if (!matchedList?.length) return;
    setMatchIndex((i) => Math.max(0, i - 1));
  }
  function handleNext() {
    if (!matchedList?.length) return;
    setMatchIndex((i) => Math.min(matchedList.length - 1, i + 1));
  }
  function handlePick(i: number) {
    setMatchIndex(i);
  }

  return (
    <div className="p-6 bg-[#f3f4f6] min-h-full flex flex-col gap-8">
      <h2 className="text-lg font-bold text-[#374151]">Controls — 控制元件測試</h2>

      {/* ── RuleDropdownSearch ── */}
      <section className="bg-white rounded-xl p-5 shadow-sm border border-[#e5e7eb]">
        <h3 className="text-sm font-semibold text-[#374151] mb-3">RuleDropdownSearch</h3>
        <div className="flex items-center gap-3 flex-wrap">
          <RuleDropdownSearch
            phases={ALL_PHASES}
            selectedPhase={selectedPhase}
            ruleNames={ruleNames}
            onPhaseChange={handlePhaseChange}
            onRuleSelect={(r) => { setSelectedRule(r); setMatchedList(null); }}
          />
        </div>
        <div className="mt-3 text-xs text-[#6b7280]">
          Phase: <b>{selectedPhase ?? "—"}</b>　Rule: <b>{selectedRule ?? "—"}</b>
        </div>
      </section>

      {/* ── RuleContentSearch ── */}
      <section className="bg-white rounded-xl p-5 shadow-sm border border-[#e5e7eb]">
        <h3 className="text-sm font-semibold text-[#374151] mb-3">RuleContentSearch + Navigator</h3>
        <div className="flex items-center gap-3 flex-wrap bg-[#1f2a44] rounded-lg px-4 py-2.5">
          <div className="flex-1 min-w-0">
            <RuleContentSearch
              rules={rules}
              onMatchChange={(list) => { setMatchedList(list); setMatchIndex(0); }}
            />
          </div>
          <SearchNavigator
            matched={matchedList}
            index={matchIndex}
            onPrev={handlePrev}
            onNext={handleNext}
            onPick={handlePick}
          />
        </div>
        <div className="mt-3 text-xs text-[#6b7280]">
          {matchedList === null
            ? "尚未搜尋"
            : matchedList.length === 0
            ? "無結果"
            : `共 ${matchedList.length} 筆，目前第 ${matchIndex + 1} 筆：${matchedList[matchIndex]}`}
        </div>

        {/* 搜尋結果清單 */}
        {matchedList && matchedList.length > 0 && (
          <div className="mt-3 flex flex-col gap-1">
            {matchedList.map((id, i) => (
              <button
                key={id}
                onClick={() => handlePick(i)}
                className={`text-left px-3 py-1.5 rounded border text-xs cursor-pointer transition-colors ${
                  i === matchIndex
                    ? "border-green-400/50 bg-green-50 text-green-800 font-semibold"
                    : "border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f9fafb]"
                }`}
              >
                <span className="text-[#9ca3af] mr-1.5">{i + 1}.</span>{id}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
