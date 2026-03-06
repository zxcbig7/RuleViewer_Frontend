// ============================================================
// TestBlockInspector.tsx
// 四種 Block Type 的 Inspector 並排展示
// ============================================================

import { useRef } from "react";
import { BlockInspector } from "../components/RTDRuleViewer/BlockInspector";
import { buildBlocks } from "../components/RTDRuleViewer/blockUtils";
import { DEV_MOCK_RULES, MOCK_RULE_DATA } from "../components/RTDRuleViewer/devMock";
import type { Block } from "../components/RTDRuleViewer/types";

// 每種 type 各取一個代表性 Block
const devBlocks   = buildBlocks(DEV_MOCK_RULES);
const valBlocks   = buildBlocks(MOCK_RULE_DATA["APF_LOT_VALIDATOR"]);
const schedBlocks = buildBlocks(MOCK_RULE_DATA["APF_LOT_SCHEDULER"]);

const DEMO: { label: string; block: Block }[] = [
  {
    label: "START",
    block: devBlocks.find((b) => b.type === "START")!,
  },
  {
    label: "END",
    block: devBlocks.find((b) => b.type === "END")!,
  },
  {
    label: "DECISION",
    block: valBlocks.find((b) => b.type === "DECISION")!,
  },
  {
    label: "PROCESS（含 $ 變數）",
    block: schedBlocks.find(
      (b) => b.type === "PROCESS" && b.raw.BLOCK_NAME === "GET_LOT_INFO"
    )!,
  },
];

export default function TestBlockInspector() {
  // 每個 panel 有自己的 wrapper，不共用拖曳狀態
  return (
    <div className="p-6 bg-[#f3f4f6] min-h-full">
      <h2 className="text-lg font-bold text-[#374151] mb-4">
        BlockInspector — 各 Type 樣式展示
      </h2>
      <div className="grid grid-cols-2 gap-6">
        {DEMO.map(({ label, block }) =>
          block ? (
            <PanelSlot key={block.id} label={label} block={block} />
          ) : null
        )}
      </div>
    </div>
  );
}

/** 每個展示格：relative 容器讓 Inspector 在內部絕對定位 */
function PanelSlot({ label, block }: { label: string; block: Block }) {
  const wrapperRef      = useRef<HTMLDivElement>(null);
  const draggingRef     = useRef(false);

  return (
    <div>
      <div className="text-xs font-semibold text-[#6b7280] mb-1.5 tracking-wide uppercase">
        {label}
      </div>
      {/* min-h 讓面板有足夠空間展開 */}
      <div ref={wrapperRef} className="relative min-h-[420px] rounded-xl border border-[#e5e7eb] bg-white overflow-hidden">
        <BlockInspector
          block={block}
          initialX={0}
          initialY={0}
          wrapperRef={wrapperRef}
          inspectorDraggingRef={draggingRef}
          onClose={() => {}}
        />
      </div>
    </div>
  );
}
