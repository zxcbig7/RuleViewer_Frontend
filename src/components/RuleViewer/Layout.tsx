import type { ReactNode } from "react";
import { Button, Divider, Input, Segmented, Space, Switch, Tabs, Typography, Badge } from "antd";
import { PlayCircleOutlined, SearchOutlined, InfoCircleOutlined } from "@ant-design/icons";

const { Text } = Typography;

export type Mode = "View" | "Trace" | "Explain";
export type DetailTab = "summary" | "condition" | "context" | "path";

type Props = {
  // ── TopBar 1 ──────────────────────────────────
  ruleName?: string;
  onRuleNameChange?: (v: string) => void;
  searchInput?: string;
  onSearchInputChange?: (v: string) => void;
  isAnalyzing?: boolean;
  onRunAnalysis?: () => void;
  onInfoClick?: () => void;

  // ── TopBar 2 ──────────────────────────────────
  showMiniMap?: boolean;
  onShowMiniMapChange?: (v: boolean) => void;
  showSkipped?: boolean;
  onShowSkippedChange?: (v: boolean) => void;
  showConditionValues?: boolean;
  onShowConditionValuesChange?: (v: boolean) => void;
  mode?: Mode;
  onModeChange?: (v: Mode) => void;

  // ── Slots ─────────────────────────────────────
  canvas?: ReactNode;
  miniMap?: ReactNode;
  detailTab?: DetailTab;
  onDetailTabChange?: (k: DetailTab) => void;
  tabItems?: {
    summary?: ReactNode;
    condition?: ReactNode;
    context?: ReactNode;
    path?: ReactNode;
  };
};

function RuleViewerLayout({
  ruleName = "",
  onRuleNameChange,
  searchInput = "",
  onSearchInputChange,
  isAnalyzing = false,
  onRunAnalysis,
  onInfoClick,
  showMiniMap = true,
  onShowMiniMapChange,
  showSkipped = true,
  onShowSkippedChange,
  showConditionValues = true,
  onShowConditionValuesChange,
  mode = "Trace",
  onModeChange,
  canvas,
  miniMap,
  detailTab = "condition",
  onDetailTabChange,
  tabItems = {},
}: Props) {

  const modeBadgeStatus =
    mode === "Explain" ? "processing" as const :
      mode === "Trace" ? "success" as const :
        "default" as const;

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">

      {/* ── TopBar 1: 分析入口 ── */}
      <div className="rounded-xl p-3 bg-[#1f2a44] flex items-center gap-2.5">
        <Input
          prefix={<SearchOutlined />}
          value={ruleName}
          onChange={(e) => onRuleNameChange?.(e.target.value)}
          placeholder="Rule Name"
          style={{ width: 180 }}
        />
        <Input
          value={searchInput}
          onChange={(e) => onSearchInputChange?.(e.target.value)}
          placeholder="Search Input"
          style={{ width: 240 }}
        />
        <Button type="primary" icon={<PlayCircleOutlined />} loading={isAnalyzing} onClick={onRunAnalysis}>
          Run Analysis
        </Button>
        <div className="ml-auto">
          <Button icon={<InfoCircleOutlined />} onClick={onInfoClick}>Information</Button>
        </div>
      </div>

      {/* ── TopBar 2: Toggles + Mode ── */}
      <div className="rounded-xl p-3 bg-[#0f1629] flex items-center gap-4">
        <Space size={16}>
          <label className="flex items-center gap-2">
            <Switch checked={showMiniMap} onChange={onShowMiniMapChange} />
            <span className="text-[#cfd6e6]">Show Mini Map</span>
          </label>
          <label className="flex items-center gap-2">
            <Switch checked={showSkipped} onChange={onShowSkippedChange} />
            <span className="text-[#cfd6e6]">Show Skipped Nodes</span>
          </label>
          <label className="flex items-center gap-2">
            <Switch checked={showConditionValues} onChange={onShowConditionValuesChange} />
            <span className="text-[#cfd6e6]">Show Conditional Values</span>
          </label>
        </Space>
        <div className="ml-auto">
          <Segmented<Mode> options={["View", "Trace", "Explain"]} value={mode} onChange={onModeChange} />
        </div>
      </div>

      {/* ── Body: Canvas + Right Panel ── */}
      <div className="flex-1 min-h-0 flex gap-3">

        {/* Canvas slot */}
        <div className="flex-1 min-w-0 rounded-xl bg-white border border-black/[.12] relative overflow-hidden">
          <div className="absolute top-2.5 left-3 text-[#cfd6e6] font-semibold">
            Rule Viewer Canvas（{mode}）
          </div>
          <div className="h-full grid place-items-center">
            {canvas}
          </div>
          {showMiniMap && miniMap && (
            <div className="absolute right-4 bottom-4 w-[180px] h-[120px] rounded-[10px] bg-white border border-white/[.12]">
              {miniMap}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-[420px] min-w-[420px] rounded-xl bg-[#0e1428] border border-black/[.12] p-3 text-white flex flex-col min-h-0">
          <div className="flex items-center justify-between">
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>Detail Panel</Text>
            <Badge status={modeBadgeStatus} text={<span className="text-[#cfd6e6]">{mode}</span>} />
          </div>

          <Divider style={{ borderColor: "rgba(255,255,255,0.1)", margin: "10px 0" }} />

          <div className="flex-1 min-h-0 overflow-auto">
            <Tabs
              activeKey={detailTab}
              onChange={(k) => onDetailTabChange?.(k as DetailTab)}
              items={[
                { key: "summary", label: "Summary", children: tabItems.summary },
                { key: "condition", label: "Condition", children: tabItems.condition },
                { key: "context", label: "Context", children: tabItems.context },
                { key: "path", label: "Path", children: tabItems.path },
              ]}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

export default RuleViewerLayout;
