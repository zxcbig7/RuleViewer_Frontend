// ============================================================
// RuleViewer.tsx
// 主入口元件：Canvas + 右側面板（搜尋 / Tracker 分頁）
// ============================================================

import { useState, useEffect, useRef, useMemo } from "react";
import { Divider } from "antd";
import type { RuleViewHandle, RuleData } from "./types";
import { loadPhases, loadRuleNamesByPhase, loadRule } from "./api";
import { convertDtosToData } from "./dataTransform";
import {
  DEV_MOCK_PHASE, DEV_MOCK_RULE_NAME, DEV_MOCK_RULES,
  MOCK_PHASES, MOCK_RULES_BY_PHASE, MOCK_RULE_DATA,
} from "./devMock";
import { RuleView } from "./RuleView";
import { RuleDropdownSearch } from "./RuleDropdownSearch";
import { RuleContentSearch, SearchNavigator } from "./RuleContentSearch";
import type { MatchResult } from "./RuleContentSearch";
import { CaseQuery } from "./CaseQuery";

type RightTab = "search" | "tracker";

export default function RuleViewer() {
  // ── 兩階段 Rule 載入 ──────────────────────────────────────
  const [phases, setPhases] = useState<string[]>([DEV_MOCK_PHASE, ...MOCK_PHASES]);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(DEV_MOCK_PHASE);
  const [ruleNamesByPhase, setRuleNamesByPhase] = useState<string[]>([DEV_MOCK_RULE_NAME]);
  const [selectedRule, setSelectedRule] = useState<string | null>(DEV_MOCK_RULE_NAME);
  const [rules, setRules] = useState<RuleData[]>(DEV_MOCK_RULES);

  // ── Block 搜尋 ────────────────────────────────────────────
  const [matchedBlockList, setMatchedBlockList] = useState<MatchResult[] | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);

  // ── Tracker 高亮 ──────────────────────────────────────────
  const [trackerLogIds, setTrackerLogIds] = useState<string[]>([]);
  const [trackerVarIds, setTrackerVarIds] = useState<string[]>([]);

  const ruleViewRef = useRef<RuleViewHandle | null>(null);

  const matchedBlockIds = useMemo(() => {
    if (!matchedBlockList) return null;
    return new Set(matchedBlockList.map((m) => m.id));
  }, [matchedBlockList]);

  // ── 右側面板寬度 / 收合 / 分頁 ───────────────────────────
  const [rightPanelWidth, setRightPanelWidth] = useState(300);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [rightTab, setRightTab] = useState<RightTab>("search");
  const dividerDragRef = useRef({ dragging: false, startX: 0, startW: 300 });

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dividerDragRef.current.dragging) return;
      const dx = dividerDragRef.current.startX - e.clientX;
      const newW = Math.max(220, Math.min(600, dividerDragRef.current.startW + dx));
      setRightPanelWidth(newW);
    }
    function onMouseUp() {
      if (!dividerDragRef.current.dragging) return;
      dividerDragRef.current.dragging = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // Phase 清單
  useEffect(() => {
    loadPhases()
      .then((names) => setPhases([DEV_MOCK_PHASE, ...MOCK_PHASES, ...names]))
      .catch(() => { });
  }, []);

  // Phase 變更
  useEffect(() => {
    setSelectedRule(null);
    setRules([]);
    setMatchedBlockList(null);
    setMatchIndex(0);

    if (!selectedPhase) { setRuleNamesByPhase([]); return; }
    if (selectedPhase === DEV_MOCK_PHASE) { setRuleNamesByPhase([DEV_MOCK_RULE_NAME]); return; }
    if (selectedPhase in MOCK_RULES_BY_PHASE) {
      setRuleNamesByPhase(MOCK_RULES_BY_PHASE[selectedPhase as keyof typeof MOCK_RULES_BY_PHASE]);
      return;
    }
    loadRuleNamesByPhase(selectedPhase).then(setRuleNamesByPhase);
  }, [selectedPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rule 變更
  useEffect(() => {
    if (!selectedRule) return;
    if (selectedRule === DEV_MOCK_RULE_NAME) { setRules(DEV_MOCK_RULES); return; }
    if (selectedRule in MOCK_RULE_DATA) { setRules(MOCK_RULE_DATA[selectedRule]); return; }
    loadRule(selectedRule).then((data) => setRules(convertDtosToData(data)));
  }, [selectedRule]);

  function handlePrev() {
    if (!matchedBlockList?.length) return;
    const next = Math.max(0, matchIndex - 1);
    setMatchIndex(next);
    ruleViewRef.current?.focusBlockById(matchedBlockList[next].id);
  }

  function handleNext() {
    if (!matchedBlockList?.length) return;
    const next = Math.min(matchedBlockList.length - 1, matchIndex + 1);
    setMatchIndex(next);
    ruleViewRef.current?.focusBlockById(matchedBlockList[next].id);
  }

  function handlePick(i: number) {
    if (!matchedBlockList) return;
    setMatchIndex(i);
    ruleViewRef.current?.focusBlockById(matchedBlockList[i].id);
  }

  function highlightSnippet(snippet: string, kw: string) {
    if (!kw) return <span>{snippet}</span>;
    const idx = snippet.toLowerCase().indexOf(kw.toLowerCase());
    if (idx === -1) return <span>{snippet}</span>;
    return (
      <>
        {snippet.slice(0, idx)}
        <span className="text-[#fadb14] font-semibold">{snippet.slice(idx, idx + kw.length)}</span>
        {snippet.slice(idx + kw.length)}
      </>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-3 p-3">

      {/* ── TopBar：Rule 選擇 ── */}
      <div className="rounded-xl px-4 py-2.5 bg-[#1f2a44] flex items-center gap-3 flex-shrink-0">
        <RuleDropdownSearch
          phases={phases}
          selectedPhase={selectedPhase}
          ruleNames={ruleNamesByPhase}
          onPhaseChange={setSelectedPhase}
          onRuleSelect={setSelectedRule}
        />
      </div>

      {/* ── 主體：Canvas + 右側面板 ── */}
      <div className="flex-1 min-h-0 flex">

        {/* Canvas */}
        <div className="flex-1 min-w-0 rounded-xl bg-white border border-black/[.12] relative overflow-hidden">
          <RuleView
            ref={ruleViewRef}
            rules={rules}
            matchedBlockIds={matchedBlockIds}
            trackerLogIds={trackerLogIds.length ? new Set(trackerLogIds) : undefined}
            trackerVarIds={trackerVarIds.length ? new Set(trackerVarIds) : undefined}
          />
        </div>

        {/* 拖曳分隔線（收合時不可見） */}
        <div
          className={`w-2 flex-shrink-0 mx-1 flex items-center justify-center cursor-col-resize select-none group self-stretch ${rightCollapsed ? "invisible" : ""}`}
          onMouseDown={(e) => {
            if (rightCollapsed) return;
            e.preventDefault();
            dividerDragRef.current.dragging = true;
            dividerDragRef.current.startX = e.clientX;
            dividerDragRef.current.startW = rightPanelWidth;
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
        >
          <div className="w-0.5 h-10 rounded-full bg-white/25 group-hover:bg-white/60 transition-colors" />
        </div>

        {/* 右側面板（始終掛載，收合時僅顯示展開按鈕） */}
        <div
          className={`flex-shrink-0 rounded-xl bg-[#0e1428] border border-black/[.12] text-white flex flex-col min-h-0 overflow-hidden ${rightCollapsed ? "" : "p-3"}`}
          style={{ width: rightCollapsed ? 32 : rightPanelWidth }}
        >
          {/* 收合狀態：僅展開按鈕 */}
          <div className={rightCollapsed ? "flex flex-col items-center py-2" : "hidden"}>
            <button
              onClick={() => setRightCollapsed(false)}
              title="展開面板"
              className="w-6 h-6 flex items-center justify-center rounded text-white/50 hover:text-white hover:bg-white/10 cursor-pointer text-base leading-none"
            >
              ‹
            </button>
          </div>

          {/* 展開狀態：完整面板內容 */}
          <div className={rightCollapsed ? "hidden" : "flex-1 min-h-0 flex flex-col"}>

            {/* 分頁標頭 */}
            <div className="flex items-center justify-between gap-2 flex-shrink-0">
              <div className="flex gap-0.5">
                {(["search", "tracker"] as RightTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setRightTab(tab)}
                    className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${rightTab === tab
                        ? "bg-white/15 text-white"
                        : "text-[#8b9ab8] hover:text-white hover:bg-white/[.07]"
                      }`}
                  >
                    {tab === "search" ? "搜尋" : "Tracker"}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setRightCollapsed(true)}
                title="收合面板"
                className="w-6 h-6 flex items-center justify-center rounded text-white/50 hover:text-white hover:bg-white/10 cursor-pointer text-base leading-none flex-shrink-0"
              >
                ›
              </button>
            </div>

            <Divider style={{ borderColor: "rgba(255,255,255,0.1)", margin: "8px 0" }} />

            {/* ── 搜尋分頁 ── */}
            <div className={rightTab === "search" ? "flex-1 min-h-0 flex flex-col gap-2" : "hidden"}>

              {/* 搜尋列 */}
              <div className="flex-shrink-0">
                <RuleContentSearch
                  rules={rules}
                  onMatchChange={(list, kw) => {
                    setMatchedBlockList(list);
                    setSearchKeyword(kw);
                    setMatchIndex(0);
                  }}
                />
              </div>

              {/* 導覽列 + 結果數 */}
              {matchedBlockList && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <SearchNavigator
                    total={matchedBlockList.length}
                    index={matchIndex}
                    onPrev={handlePrev}
                    onNext={handleNext}
                  />
                  <span className="ml-auto text-xs text-[#8b9ab8] flex-shrink-0">
                    {matchedBlockList.length} match{matchedBlockList.length !== 1 ? "es" : ""}
                  </span>
                </div>
              )}

              {/* 結果列表 */}
              <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-1.5">
                {!selectedRule && (
                  <p className="text-[#8b9ab8] text-xs">請先選擇 Rule。</p>
                )}
                {selectedRule && !matchedBlockList && (
                  <p className="text-[#8b9ab8] text-xs">在上方輸入關鍵字，搜尋相關 Block。</p>
                )}
                {matchedBlockList?.length === 0 && (
                  <p className="text-[#8b9ab8] text-xs">No matches found.</p>
                )}
                {matchedBlockList?.map((m, i) => (
                  <button
                    key={m.id}
                    onClick={() => handlePick(i)}
                    className={`text-left px-3 py-2 rounded-[8px] border text-xs cursor-pointer transition-colors ${i === matchIndex
                        ? "border-[#52c41a]/50 bg-[#52c41a]/[.12] text-white"
                        : "border-white/10 bg-white/[.04] text-[#cfd6e6] hover:bg-white/[.08]"
                      }`}
                  >
                    <div className="font-semibold truncate">
                      <span className="text-white/40 mr-1.5">{i + 1}.</span>
                      {m.id}
                    </div>
                    {m.snippet && (
                      <div className="mt-0.5 text-[10px] text-white/50 truncate">
                        {highlightSnippet(m.snippet, searchKeyword)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Tracker 分頁 ── */}
            <div className={rightTab === "tracker" ? "flex-1 min-h-0 flex flex-col" : "hidden"}>
              <CaseQuery
                rules={rules}
                selectedRule={selectedRule}
                onHighlight={(logIds, varIds) => {
                  setTrackerLogIds(logIds);
                  setTrackerVarIds(varIds);
                }}
              />
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
