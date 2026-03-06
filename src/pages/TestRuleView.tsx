// ============================================================
// TestRuleView.tsx
// RuleView Canvas 獨立測試頁（可切換資料集）
// ============================================================

import { useRef, useState } from "react";
import { RuleView } from "../components/RTDRuleViewer/RuleView";
import { DEV_MOCK_RULES, MOCK_RULE_DATA, MOCK_RULES_BY_PHASE } from "../components/RTDRuleViewer/devMock";
import type { RuleData, RuleViewHandle } from "../components/RTDRuleViewer/types";

type DatasetKey = string;

// 所有可選資料集
const DATASETS: { label: string; key: DatasetKey; data: RuleData[] }[] = [
  { label: "DEV — 主副線範例",         key: "DEV",               data: DEV_MOCK_RULES },
  ...Object.entries(MOCK_RULE_DATA).map(([key, data]) => ({
    label: key,
    key,
    data,
  })),
];

// 按 Phase 分組顯示
const GROUPS: { phase: string; keys: string[] }[] = [
  { phase: "DEV",        keys: ["DEV"] },
  { phase: "APF_CHECK",  keys: MOCK_RULES_BY_PHASE["APF_CHECK"] },
  { phase: "APF_FORMAT", keys: MOCK_RULES_BY_PHASE["APF_FORMAT"] },
];

export default function TestRuleView() {
  const [activeKey, setActiveKey] = useState<DatasetKey>("DEV");
  const ruleViewRef = useRef<RuleViewHandle>(null);

  const activeData = DATASETS.find((d) => d.key === activeKey)?.data ?? DEV_MOCK_RULES;

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex-shrink-0 bg-[#1f2a44] px-4 py-2 flex items-center gap-3 flex-wrap">
        <span className="text-white/60 text-xs font-semibold">資料集</span>
        {GROUPS.map(({ phase, keys }) => (
          <div key={phase} className="flex items-center gap-1.5">
            <span className="text-white/30 text-[11px]">{phase}</span>
            {keys.map((key) => (
              <button
                key={key}
                onClick={() => setActiveKey(key)}
                className={`text-xs px-2.5 py-1 rounded cursor-pointer transition-colors ${
                  activeKey === key
                    ? "bg-white text-[#1f2a44] font-semibold"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative">
        <RuleView ref={ruleViewRef} rules={activeData} matchedBlockIds={null} />
      </div>
    </div>
  );
}
