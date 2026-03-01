import React, { useMemo, useState } from "react";
import { Button, Divider, Input, Segmented, Space, Switch, Tabs, Typography, Badge } from "antd";
import { PlayCircleOutlined, SearchOutlined, InfoCircleOutlined } from "@ant-design/icons";

import BasicCanvas from "./Canvas";

const { Text } = Typography;

type Mode = "View" | "Trace" | "Explain";
type DetailTab = "summary" | "condition" | "context" | "path";

const RuleViewerNew = () => {
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
    <div style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* ===== Top Bar 1: 分析入口 ===== */}
      <div
        style={{
          borderRadius: 12,
          padding: 12,
          background: "#1f2a44",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
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

        <div style={{ marginLeft: "auto" }}>
          <Button icon={<InfoCircleOutlined />}>Information</Button>
        </div>
      </div>

      {/* ===== Top Bar 2: Toggles + Mode ===== */}
      <div
        style={{
          borderRadius: 12,
          padding: 12,
          background: "#0f1629",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <Space size={16}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Switch checked={showMiniMap} onChange={setShowMiniMap} />
            <span style={{ color: "#cfd6e6" }}>Show Mini Map</span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Switch checked={showSkipped} onChange={setShowSkipped} />
            <span style={{ color: "#cfd6e6" }}>Show Skipped Nodes</span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Switch checked={showConditionValues} onChange={setShowConditionValues} />
            <span style={{ color: "#cfd6e6" }}>Show Conditional Values</span>
          </label>
        </Space>

        <div style={{ marginLeft: "auto" }}>
          <Segmented<Mode>
            options={["View", "Trace", "Explain"]}
            value={mode}
            onChange={(v) => setMode(v)}
          />
        </div>
      </div>

      {/* ===== Body: Canvas + Right Detail ===== */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 12 }}>
        {/* Canvas area */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            borderRadius: 12,
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.12)",
            position: "relative",
            overflow: "hidden",
          }}
          onClick={() => setSelectedNodeId("Decision Node C")}
        >
          <div style={{ position: "absolute", top: 10, left: 12, color: "#cfd6e6", fontWeight: 600 }}>
            Rule Viewer Canvas（{mode}）
          </div>

          <div
            style={{
              height: "100%",
              display: "grid",
              placeItems: "center",
              color: "rgba(255,255,255,0.45)",
              fontSize: 22,
            }}
          >
            <BasicCanvas />
          </div>

          {/* MiniMap placeholder */}
          {showMiniMap && (
            <div
              style={{
                position: "absolute",
                right: 16,
                bottom: 16,
                width: 180,
                height: 120,
                borderRadius: 10,
                background: "rgb(255, 255, 255)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <div style={{ padding: 8, color: "#cfd6e6", fontSize: 12 }}>Mini Map</div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div
          style={{
            width: 420,
            minWidth: 420,
            borderRadius: 12,
            background: "#0e1428",
            border: "1px solid rgba(0,0,0,0.12)",
            padding: 12,
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          {/* header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>Detail Panel</Text>
            <Badge status={modeBadgeStatus} text={<span style={{ color: "#cfd6e6" }}>{mode}</span>} />
          </div>

          <Divider style={{ borderColor: "rgba(255,255,255,0.1)", margin: "10px 0" }} />

          <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <Tabs
              activeKey={detailTab}
              onChange={(k) => setDetailTab(k as DetailTab)}
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



const SummaryView = ({ ruleName, searchInput, selectedNodeId }: { ruleName: string; searchInput: string; selectedNodeId: string }) => {
  return (
    <div style={{ color: "#cfd6e6", lineHeight: 1.8 }}>
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

      <div style={{ marginTop: 8 }}>
        <Text style={{ color: "#fff" }}>Hint</Text>: Trace/Explain 模式下，點 Timeline 或 Canvas 節點會更新右側內容。
      </div>
    </div>
  );
};

const ConditionView = ({ selectedNodeId, showConditionValues }: { selectedNodeId: string; showConditionValues: boolean }) => {
  return (
    <div style={{ color: "#cfd6e6" }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
        {selectedNodeId}
      </div>

      <div style={{ marginBottom: 8 }}>
        <Text style={{ color: "#fff" }}>Condition Expression</Text>
        <div
          style={{
            marginTop: 6,
            padding: 10,
            borderRadius: 10,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          TotalWIPCount(EquipGroup_ABC) ≥ MaxWIPLimit(EquipGroup_ABC)
        </div>
      </div>

      {showConditionValues && (
        <>
          <div style={{ marginTop: 12 }}>
            <Text style={{ color: "#fff" }}>Runtime Values</Text>
            <div
              style={{
                marginTop: 6,
                padding: 10,
                borderRadius: 10,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <div>
                Total WIP Count (EquipGroup_ABC) = <b style={{ color: "#fff" }}>13</b>
              </div>
              <div>
                Max WIP Limit (EquipGroup_ABC) = <b style={{ color: "#fff" }}>10</b>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <Text style={{ color: "#fff" }}>Evaluation Result</Text>
            <div
              style={{
                marginTop: 6,
                padding: 10,
                borderRadius: 10,
                background: "rgba(255,77,79,0.12)",
                border: "1px solid rgba(255,77,79,0.25)",
              }}
            >
              <b style={{ color: "#ff4d4f" }}>13 ≥ 10 → FALSE</b>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const ContextView = ({ lotId }: { lotId: string }) => {
  return (
    <div style={{ color: "#cfd6e6", lineHeight: 1.8 }}>
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

const PathView = ({ activeNodeId, showSkipped, onSelectNode }: { activeNodeId: string; showSkipped: boolean; onSelectNode: (id: string) => void }) => {
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
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {steps.map((s, idx) => {
        const active = s.id === activeNodeId;
        return (
          <button
            key={s.id}
            onClick={() => onSelectNode(s.id)}
            style={{
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: 10,
              border: active ? "1px solid rgba(82,196,26,0.5)" : "1px solid rgba(255,255,255,0.10)",
              background: active ? "rgba(82,196,26,0.12)" : "rgba(255,255,255,0.04)",
              color: "#cfd6e6",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <b style={{ color: "#fff" }}>{idx + 1}.</b> {s.label}
              </div>
              <span style={{ color: statusColor(s.status), fontWeight: 700 }}>{s.status}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
