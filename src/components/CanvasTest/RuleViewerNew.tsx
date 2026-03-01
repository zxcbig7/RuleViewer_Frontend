import { useMemo, useState } from "react";
import { Button, Divider, Input, Segmented, Space, Switch, Tabs, Typography, Badge } from "antd";
import { PlayCircleOutlined, SearchOutlined, InfoCircleOutlined } from "@ant-design/icons";

import CanvasComponent from "./BasicCanvas";

const { Text } = Typography;

type Mode = "View" | "Trace" | "Explain";
type DetailTab = "summary" | "condition" | "context" | "path";

function RuleViewerNew() {
  // ===== Analysis input =====
  const [ruleName, setRuleName] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [mode, setMode] = useState<Mode>("Trace");

  // ===== Toggles =====
  const [showMiniMap, setShowMiniMap] = useState<boolean>(true);
  const [showSkipped, setShowSkipped] = useState<boolean>(true);
  const [showConditionValues, setShowConditionValues] = useState<boolean>(true);

  // ===== Right panel =====
  const [detailTab, setDetailTab] = useState<DetailTab>("condition");
  const [selectedNodeId, setSelectedNodeId] = useState<string>("Decision Node C");

  // ===== Mock =====
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const modeBadgeStatus = useMemo(() => {
    if (mode === "Explain") return "processing" as const;
    if (mode === "Trace") return "success" as const;
    return "default" as const;
  }, [mode]);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    // TODO: 換成你的 API call
    await new Promise((r) => setTimeout(r, 600));
    setIsAnalyzing(false);

    // 分析後的預設 UX：進 Trace，右側切到 Condition
    setMode("Trace");
    setDetailTab("condition");
    setSelectedNodeId("Decision Node C");
  };

  // 注意：HomePage 內層 container 已經有 padding + scroll
  // 這裡用 flex 撐滿即可
  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      {/* ===== Top Bar 1: 分析入口 ===== */}
      <div className="rounded-xl p-3 bg-[#1f2a44] flex items-center gap-2.5">
        <Input
          prefix={<SearchOutlined />}
          value={ruleName}
          onChange={(e) => setRuleName(e.target.value)}
          placeholder="Rule Name"
          style={{ width: 180 }}
        />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search Input"
          style={{ width: 240 }}
        />

        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          loading={isAnalyzing}
          onClick={runAnalysis}
        >
          Run Analysis
        </Button>

        <div className="ml-auto">
          <Button icon={<InfoCircleOutlined />}>Information</Button>
        </div>
      </div>

      {/* ===== Top Bar 2: Toggles + Mode ===== */}
      <div className="rounded-xl p-3 bg-[#0f1629] flex items-center gap-4">
        <Space size={16}>
          <label className="flex items-center gap-2">
            <Switch checked={showMiniMap} onChange={setShowMiniMap} />
            <span className="text-[#cfd6e6]">Show Mini Map</span>
          </label>

          <label className="flex items-center gap-2">
            <Switch checked={showSkipped} onChange={setShowSkipped} />
            <span className="text-[#cfd6e6]">Show Skipped Nodes</span>
          </label>

          <label className="flex items-center gap-2">
            <Switch checked={showConditionValues} onChange={setShowConditionValues} />
            <span className="text-[#cfd6e6]">Show Conditional Values</span>
          </label>
        </Space>

        <div className="ml-auto">
          <Segmented<Mode>
            options={["View", "Trace", "Explain"]}
            value={mode}
            onChange={(v) => setMode(v)}
          />
        </div>
      </div>

      {/* ===== Body: Canvas + Right Detail ===== */}
      <div className="flex-1 min-h-0 flex gap-3">
        {/* Canvas area */}
        <div
          className="flex-1 min-w-0 rounded-xl bg-white border border-black/[.12] relative overflow-hidden"
          onClick={() => setSelectedNodeId("Decision Node C")}
        >
          <div className="absolute top-2.5 left-3 text-[#cfd6e6] font-semibold">
            Rule Viewer Canvas（{mode}）
          </div>

          <div className="h-full grid place-items-center text-white/45 text-[22px]">
            <CanvasComponent />
          </div>

          {/* MiniMap placeholder */}
          {showMiniMap && (
            <div className="absolute right-4 bottom-4 w-[180px] h-[120px] rounded-[10px] bg-white border border-white/[.12]">
              <div className="p-2 text-[#cfd6e6] text-xs">Mini Map</div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-[420px] min-w-[420px] rounded-xl bg-[#0e1428] border border-black/[.12] p-3 text-white flex flex-col min-h-0">
          {/* header */}
          <div className="flex items-center justify-between">
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>Detail Panel</Text>
            <Badge status={modeBadgeStatus} text={<span className="text-[#cfd6e6]">{mode}</span>} />
          </div>

          <Divider style={{ borderColor: "rgba(255,255,255,0.1)", margin: "10px 0" }} />

          <div className="flex-1 min-h-0 overflow-auto">
            <Tabs
              activeKey={detailTab} onChange={(k) => setDetailTab(k as DetailTab)}
              items={[
                {
                  key: "summary",
                  label: "Summary",
                  children: (
                    <SummaryView
                      ruleName={ruleName}
                      searchInput={searchInput}
                      selectedNodeId={selectedNodeId}
                    />
                  ),
                },
                {
                  key: "condition",
                  label: "Condition",
                  children: (
                    <ConditionView
                      selectedNodeId={selectedNodeId}
                      showConditionValues={showConditionValues}
                    />
                  ),
                },
                {
                  key: "context",
                  label: "Context",
                  children: <ContextView lotId={ruleName} />,
                },
                {
                  key: "path",
                  label: "Path",
                  children: (
                    <PathView
                      activeNodeId={selectedNodeId}
                      onSelectNode={(id) => setSelectedNodeId(id)}
                      showSkipped={showSkipped}
                    />
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RuleViewerNew;

function SummaryView({ ruleName, searchInput, selectedNodeId }: {
  ruleName: string;
  searchInput: string;
  selectedNodeId: string;
}) {
  return (
    <div className="text-[#cfd6e6] leading-[1.8]">
      <div>
        <Text style={{ color: "#fff" }}>Rule Name</Text>: {ruleName || "-"}
      </div>

      <Divider style={{ borderColor: "rgba(255,255,255,0.1)" }} />

      <div>
        <Text style={{ color: "#fff" }}>Search Input</Text>: {searchInput || "-"}
      </div>

      <div>
        <Text style={{ color: "#fff" }}>Selected Node</Text>: {selectedNodeId}
      </div>

      <div className="mt-2">
        <Text style={{ color: "#fff" }}>Hint</Text>: Trace/Explain 模式下，點 Timeline 或 Canvas 節點會更新右側內容。
      </div>
    </div>
  );
};

function ConditionView({ selectedNodeId, showConditionValues }: {
  selectedNodeId: string;
  showConditionValues: boolean;
}) {
  const boxCls = "mt-1.5 p-2.5 rounded-[10px] bg-white/[.06] border border-white/10";

  return (
    <div className="text-[#cfd6e6]">
      <div className="text-[15px] font-bold text-white mb-2">{selectedNodeId}</div>

      <div className="mb-2">
        <Text style={{ color: "#fff" }}>Condition Expression</Text>
        <div className={boxCls}>
          TotalWIPCount(EquipGroup_ABC) ≥ MaxWIPLimit(EquipGroup_ABC)
        </div>
      </div>

      {showConditionValues && (
        <>
          <div className="mt-3">
            <Text style={{ color: "#fff" }}>Runtime Values</Text>
            <div className={boxCls}>
              <div>
                Total WIP Count (EquipGroup_ABC) = <b className="text-white">13</b>
              </div>
              <div>
                Max WIP Limit (EquipGroup_ABC) = <b className="text-white">10</b>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <Text style={{ color: "#fff" }}>Evaluation Result</Text>
            <div className="mt-1.5 p-2.5 rounded-[10px] bg-[#ff4d4f]/[.12] border border-[#ff4d4f]/25">
              <b className="text-[#ff4d4f]">13 ≥ 10 → FALSE</b>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function ContextView({ lotId }: { lotId: string }) {
  return (
    <div className="text-[#cfd6e6] leading-[1.8]">
      <div>
        <Text style={{ color: "#fff" }}>Lot</Text>: {lotId || "-"}
      </div>
      <Divider style={{ borderColor: "rgba(255,255,255,0.1)" }} />
      <div>
        <Text style={{ color: "#fff" }}>Machine Status</Text>: M2 = IDLE, M5 = BUSY（示意）
      </div>
      <div>
        <Text style={{ color: "#fff" }}>Queue</Text>: Bank A = 12（示意）
      </div>
      <div>
        <Text style={{ color: "#fff" }}>WIP</Text>: EquipGroup_ABC = 13（示意）
      </div>
    </div>
  );
};

function PathView({ activeNodeId, showSkipped, onSelectNode }: {
  activeNodeId: string;
  showSkipped: boolean;
  onSelectNode: (id: string) => void;
}) {
  const steps = [
    { id: "BEGIN", label: "BEGIN", status: "PASS" as const },
    { id: "Rule A", label: "Rule A", status: "PASS" as const },
    { id: "Decision Node B", label: "Decision Node B", status: "TRUE" as const },
    { id: "Rule D", label: "Rule D", status: "SKIP" as const },
    { id: "Decision Node C", label: "Decision Node C", status: "FALSE" as const },
    { id: "ASSIGN", label: "ASSIGN Lot to Machine M2", status: "PASS" as const },
  ].filter((s) => (showSkipped ? true : s.status !== "SKIP"));

  const statusColor = (s: string) => {
    if (s === "TRUE" || s === "PASS") return "#52c41a";
    if (s === "FALSE") return "#ff4d4f";
    if (s === "SKIP") return "#8c8c8c";
    return "#cfd6e6";
  };

  return (
    <div className="flex flex-col gap-2">
      {steps.map((s, idx) => {
        const active = s.id === activeNodeId;
        return (
          <button
            key={s.id}
            onClick={() => onSelectNode(s.id)}
            className={`text-left px-3 py-2.5 rounded-[10px] border text-[#cfd6e6] cursor-pointer ${
              active
                ? "border-[#52c41a]/50 bg-[#52c41a]/[.12]"
                : "border-white/10 bg-white/[.04]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <b className="text-white">{idx + 1}.</b> {s.label}
              </div>
              <span style={{ color: statusColor(s.status) }} className="font-bold">
                {s.status}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
