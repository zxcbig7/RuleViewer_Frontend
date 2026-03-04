// ============================================================
// RuleViewer.tsx
// 主入口元件：Viewer 介面（Canvas）+ Case Query 介面，可切換
// ============================================================

import { useState, useEffect, useRef, useMemo } from "react";
import { Segmented, Typography, Divider } from "antd";
import type { RuleViewHandle, RuleData } from "./types";
import { loadRuleNames, loadRule } from "./api";
import { convertDtosToData } from "./dataTransform";
import { RuleView } from "./RuleView";
import { RuleDropdownSearch } from "./RuleDropdownSearch";
import { RuleContentSearch, SearchNavigator } from "./RuleContentSearch";

const { Text } = Typography;

type ViewMode = "Viewer" | "Case Query";

export default function RuleViewer() {
  const [viewMode, setViewMode] = useState<ViewMode>("Viewer");

  // ── Rule 載入 ─────────────────────────────────────────────
  const [ruleNames, setRuleNames]       = useState<string[]>([]);
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [rules, setRules]               = useState<RuleData[]>([]);

  // ── Block 搜尋 ────────────────────────────────────────────
  const [matchedBlockList, setMatchedBlockList] = useState<string[] | null>(null);
  const [matchIndex, setMatchIndex]             = useState(0);

  const ruleViewRef = useRef<RuleViewHandle | null>(null);

  const matchedBlockIds = useMemo(() => {
    if (!matchedBlockList) return null;
    return new Set(matchedBlockList);
  }, [matchedBlockList]);

  // ── 右側面板寬度 / 收合 ───────────────────────────────────
  const [rightPanelWidth, setRightPanelWidth] = useState(280);
  const [rightCollapsed, setRightCollapsed]   = useState(false);
  const dividerDragRef = useRef({ dragging: false, startX: 0, startW: 280 });

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dividerDragRef.current.dragging) return;
      // 往左拖（dx > 0）→ 面板變大
      const dx   = dividerDragRef.current.startX - e.clientX;
      const newW = Math.max(160, Math.min(600, dividerDragRef.current.startW + dx));
      setRightPanelWidth(newW);
    }
    function onMouseUp() {
      if (!dividerDragRef.current.dragging) return;
      dividerDragRef.current.dragging = false;
      document.body.style.cursor     = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
    };
  }, []);

  useEffect(() => {
    loadRuleNames().then(setRuleNames);
  }, []);

  useEffect(() => {
    if (!selectedRule) return;
    loadRule(selectedRule).then((data) => setRules(convertDtosToData(data)));
  }, [selectedRule]);

  useEffect(() => {
    setMatchedBlockList(null);
    setMatchIndex(0);
  }, [selectedRule]);

  function handlePrev() {
    if (!matchedBlockList?.length) return;
    const next = Math.max(0, matchIndex - 1);
    setMatchIndex(next);
    ruleViewRef.current?.focusBlockById(matchedBlockList[next]);
  }

  function handleNext() {
    if (!matchedBlockList?.length) return;
    const next = Math.min(matchedBlockList.length - 1, matchIndex + 1);
    setMatchIndex(next);
    ruleViewRef.current?.focusBlockById(matchedBlockList[next]);
  }

  function handlePick(i: number) {
    if (!matchedBlockList) return;
    setMatchIndex(i);
    ruleViewRef.current?.focusBlockById(matchedBlockList[i]);
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-3 p-3">

      {/* ── TopBar：Rule 選擇 + 搜尋 + 模式切換 ── */}
      <div className="rounded-xl px-4 py-2.5 bg-[#1f2a44] flex items-center gap-3 flex-shrink-0">

        {/* Rule 下拉選擇（兩種模式都顯示） */}
        <RuleDropdownSearch options={ruleNames} onSelect={setSelectedRule} />

        {/* Viewer 模式：顯示關鍵字搜尋 + 導覽 */}
        {viewMode === "Viewer" && (
          <>
            <div className="w-px h-8 bg-white/20 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <RuleContentSearch
                rules={rules}
                onMatchChange={(list) => {
                  setMatchedBlockList(list);
                  setMatchIndex(0);
                }}
              />
            </div>
            <SearchNavigator
              matched={matchedBlockList}
              index={matchIndex}
              onPrev={handlePrev}
              onNext={handleNext}
              onPick={handlePick}
            />
          </>
        )}

        {/* 模式切換（右側） */}
        <div className="ml-auto flex-shrink-0">
          <Segmented<ViewMode>
            options={["Viewer", "Case Query"]}
            value={viewMode}
            onChange={setViewMode}
          />
        </div>
      </div>

      {/* ── Viewer 介面 ── */}
      {viewMode === "Viewer" && (
        <div className="flex-1 min-h-0 flex">

          {/* Canvas 區域 */}
          <div className="flex-1 min-w-0 rounded-xl bg-white border border-black/[.12] relative overflow-hidden">
            <RuleView
              ref={ruleViewRef}
              rules={rules}
              matchedBlockIds={matchedBlockIds}
            />
          </div>

          {/* 拖曳分隔線（收合時隱藏） */}
          {!rightCollapsed && (
            <div
              className="w-2 flex-shrink-0 mx-1 flex items-center justify-center cursor-col-resize select-none group self-stretch"
              onMouseDown={(e) => {
                e.preventDefault();
                dividerDragRef.current.dragging = true;
                dividerDragRef.current.startX  = e.clientX;
                dividerDragRef.current.startW  = rightPanelWidth;
                document.body.style.cursor     = "col-resize";
                document.body.style.userSelect = "none";
              }}
            >
              <div className="w-0.5 h-10 rounded-full bg-white/25 group-hover:bg-white/60 transition-colors" />
            </div>
          )}

          {/* 右側面板（展開） */}
          {!rightCollapsed && (
            <div
              className="flex-shrink-0 rounded-xl bg-[#0e1428] border border-black/[.12] p-3 text-white flex flex-col min-h-0 overflow-hidden"
              style={{ width: rightPanelWidth }}
            >
              {/* 標題 */}
              <div className="flex items-center justify-between gap-2 flex-shrink-0">
                <div className="truncate min-w-0 flex-1">
                  <Text style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>
                    {selectedRule ?? "No Rule Selected"}
                  </Text>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {matchedBlockList && (
                    <span className="text-xs text-[#8b9ab8]">
                      {matchedBlockList.length} match{matchedBlockList.length !== 1 ? "es" : ""}
                    </span>
                  )}
                  {/* 收合按鈕 */}
                  <button
                    onClick={() => setRightCollapsed(true)}
                    title="收合面板"
                    className="w-6 h-6 flex items-center justify-center rounded text-white/50 hover:text-white hover:bg-white/10 cursor-pointer text-base leading-none flex-shrink-0"
                  >
                    ›
                  </button>
                </div>
              </div>

              <Divider style={{ borderColor: "rgba(255,255,255,0.1)", margin: "10px 0" }} />

              {/* 結果列表 */}
              <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-1.5">
                {!selectedRule && (
                  <p className="text-[#cfd6e6] text-sm">Select a rule from the toolbar.</p>
                )}
                {selectedRule && !matchedBlockList && (
                  <p className="text-[#cfd6e6] text-sm">Use the search bar to find blocks.</p>
                )}
                {matchedBlockList?.length === 0 && (
                  <p className="text-[#cfd6e6] text-sm">No matches found.</p>
                )}
                {matchedBlockList?.map((id, i) => (
                  <button
                    key={id}
                    onClick={() => handlePick(i)}
                    className={`text-left px-3 py-2 rounded-[8px] border text-sm cursor-pointer transition-colors ${
                      i === matchIndex
                        ? "border-[#52c41a]/50 bg-[#52c41a]/[.12] text-white"
                        : "border-white/10 bg-white/[.04] text-[#cfd6e6] hover:bg-white/[.08]"
                    }`}
                  >
                    <span className="text-white/40 mr-1.5 text-xs">{i + 1}.</span>
                    {id}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 右側面板（收合狀態） */}
          {rightCollapsed && (
            <div className="ml-2 flex-shrink-0 w-8 rounded-xl bg-[#0e1428] border border-black/[.12] text-white flex flex-col items-center py-2">
              <button
                onClick={() => setRightCollapsed(false)}
                title="展開面板"
                className="w-6 h-6 flex items-center justify-center rounded text-white/50 hover:text-white hover:bg-white/10 cursor-pointer text-base leading-none"
              >
                ‹
              </button>
            </div>
          )}

        </div>
      )}

      {/* ── Case Query 介面 ── */}
      {viewMode === "Case Query" && (
        <div className="flex-1 min-h-0 flex flex-col gap-3">

          {/* 查詢列 */}
          <div className="rounded-xl px-4 py-3 bg-[#0f1629] flex items-center gap-3 flex-shrink-0">
            <span className="text-[#cfd6e6] text-sm font-semibold whitespace-nowrap">
              Case ID
            </span>
            <input
              className="flex-1 rounded px-3 py-1.5 bg-white/10 text-white border border-white/20 placeholder:text-white/30 text-sm outline-none focus:border-white/40"
              placeholder="Enter case / lot ID..."
            />
            <button className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold flex-shrink-0 cursor-pointer">
              Query
            </button>
          </div>

          {/* 結果主體 */}
          <div className="flex-1 min-h-0 flex gap-3">

            {/* 左：結果清單 */}
            <div className="w-[300px] min-w-[300px] rounded-xl bg-[#0e1428] border border-black/[.12] p-3 text-white flex flex-col min-h-0">
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>Results</Text>
              <Divider style={{ borderColor: "rgba(255,255,255,0.1)", margin: "10px 0" }} />
              <div className="flex-1 flex items-center justify-center text-[#8b9ab8] text-sm">
                No results yet.
              </div>
            </div>

            {/* 右：詳細資訊 */}
            <div className="flex-1 min-w-0 rounded-xl bg-[#0e1428] border border-black/[.12] p-3 text-white flex flex-col min-h-0">
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>Detail</Text>
              <Divider style={{ borderColor: "rgba(255,255,255,0.1)", margin: "10px 0" }} />
              <div className="flex-1 flex items-center justify-center text-[#8b9ab8] text-sm">
                Select a result to view details.
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
