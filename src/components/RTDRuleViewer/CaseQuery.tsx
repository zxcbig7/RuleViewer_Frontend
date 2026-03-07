// ============================================================
// CaseQuery.tsx  (Tracker mode)
//
// 反藍 Log 溯源流程：
//   Step 1. 搜尋反藍 Log（[$LOG_NAME$]）
//           → 找出 VALUE 含該 Log 的 Block，顯示卡片
//           → 解析 VALUE 表達式，列出相關變數 Pill
//
//   Step 2. 點擊任一變數 Pill
//           → 找出定義該變數（COLUMN1 = 變數名）的 Block，顯示卡片
//           → 只有一層，不自動繼續展開
//
//   Breadcrumb 可返回上一層
// ============================================================

import { useState, useMemo, useRef, useEffect } from "react";
import type { RuleData } from "./types";

// ─── Types ────────────────────────────────────────────────────

type VariableSource = {
  variable: string;
  varType: "INPUT" | "COMPUTED" | "LOCAL";
  description?: string;
  sourceTable?: string;
  sourceColumn?: string;
  filterConditions?: string;
  sqlHint?: string;
};

type TrackerMode =
  | { tag: "idle" }
  | { tag: "log"; logName: string; logBlocks: RuleData[]; relatedVars: string[] }
  | { tag: "var"; logName: string; varName: string; varBlocks: RuleData[] };

// ─── Mock 資料來源（實際由後端 API 提供） ─────────────────────

const MOCK_VAR_SOURCES: Record<string, VariableSource> = {
  LOT_ID:        { variable: "LOT_ID",        varType: "INPUT",    description: "呼叫端傳入的批次 ID" },
  EQUIP_CODE:    { variable: "EQUIP_CODE",    varType: "INPUT",    description: "呼叫端傳入的設備代碼" },
  EQUIP_ID:      { variable: "EQUIP_ID",      varType: "INPUT",    description: "呼叫端傳入的設備 ID" },
  RECIPE_NAME:   { variable: "RECIPE_NAME",   varType: "INPUT",    description: "呼叫端傳入的 Recipe 名稱" },
  STEP_ID:       { variable: "STEP_ID",       varType: "INPUT",    description: "呼叫端傳入的製程步驟 ID" },
  SOURCE_PATH:   { variable: "SOURCE_PATH",   varType: "INPUT",    description: "呼叫端傳入的 APF 原始資料路徑" },
  OUTPUT_FORMAT: { variable: "OUTPUT_FORMAT", varType: "INPUT",    description: "呼叫端指定的輸出格式" },
  FILE_SIZE: {
    variable: "FILE_SIZE", varType: "COMPUTED",
    sourceTable: "FILE_SYSTEM", sourceColumn: "FILE_SIZE_BYTES",
    filterConditions: "FILE_PATH = :source_path",
    sqlHint: "SELECT FILE_SIZE_BYTES\nFROM FILE_SYSTEM\nWHERE FILE_PATH = :source_path",
  },
  RECIPE_VER: {
    variable: "RECIPE_VER", varType: "COMPUTED",
    sourceTable: "RECIPE_MASTER", sourceColumn: "VERSION",
    filterConditions: "RECIPE_NAME = :recipe_name\nAND EQUIP_CODE = :equip_code\nAND EFFECTIVE_DATE <= SYSDATE",
    sqlHint: "SELECT VERSION\nFROM RECIPE_MASTER\nWHERE RECIPE_NAME = :recipe_name\n  AND EQUIP_CODE = :equip_code\n  AND EFFECTIVE_DATE <= SYSDATE\nORDER BY EFFECTIVE_DATE DESC\nFETCH FIRST 1 ROWS ONLY",
  },
  LOT_GRADE: {
    variable: "LOT_GRADE", varType: "COMPUTED",
    sourceTable: "WIP_LOT", sourceColumn: "GRADE",
    filterConditions: "LOT_ID = :lot_id",
    sqlHint: "SELECT GRADE\nFROM WIP_LOT\nWHERE LOT_ID = :lot_id",
  },
  HOLD_FLAG: {
    variable: "HOLD_FLAG", varType: "COMPUTED",
    sourceTable: "WIP_LOT", sourceColumn: "HOLD_FLAG",
    filterConditions: "LOT_ID = :lot_id",
    sqlHint: "SELECT HOLD_FLAG\nFROM WIP_LOT\nWHERE LOT_ID = :lot_id",
  },
  EQUIP_STATUS: {
    variable: "EQUIP_STATUS", varType: "COMPUTED",
    sourceTable: "EQP_STATUS", sourceColumn: "STATUS",
    filterConditions: "EQUIP_CODE = :equip_code\nAND RECORD_TIME = (\n  SELECT MAX(RECORD_TIME) FROM EQP_STATUS\n  WHERE EQUIP_CODE = :equip_code\n)",
    sqlHint: "SELECT STATUS\nFROM EQP_STATUS\nWHERE EQUIP_CODE = :equip_code\n  AND RECORD_TIME = (\n    SELECT MAX(RECORD_TIME) FROM EQP_STATUS\n    WHERE EQUIP_CODE = :equip_code\n  )",
  },
  WAIT_HR: {
    variable: "WAIT_HR", varType: "COMPUTED",
    sourceTable: "WIP_QUEUE", sourceColumn: "WAIT_HOURS",
    filterConditions: "LOT_ID = :lot_id AND STAGE = :stage",
    sqlHint: "SELECT WAIT_HOURS\nFROM WIP_QUEUE\nWHERE LOT_ID = :lot_id\n  AND STAGE = :stage",
  },
  MAX_WAIT_HR: {
    variable: "MAX_WAIT_HR", varType: "COMPUTED",
    sourceTable: "STAGE_CONFIG", sourceColumn: "MAX_WAIT_HOURS",
    filterConditions: "STAGE = :stage AND LOT_GRADE = :lot_grade",
    sqlHint: "SELECT MAX_WAIT_HOURS\nFROM STAGE_CONFIG\nWHERE STAGE = :stage\n  AND LOT_GRADE = :lot_grade",
  },
  QUEUE_DEPTH: {
    variable: "QUEUE_DEPTH", varType: "COMPUTED",
    sourceTable: "EQP_QUEUE", sourceColumn: "QUEUE_COUNT",
    filterConditions: "EQUIP_CODE = :equip_code",
    sqlHint: "SELECT QUEUE_COUNT\nFROM EQP_QUEUE\nWHERE EQUIP_CODE = :equip_code",
  },
  MAX_QUEUE: {
    variable: "MAX_QUEUE", varType: "COMPUTED",
    sourceTable: "EQP_CONFIG", sourceColumn: "MAX_QUEUE_SIZE",
    filterConditions: "EQUIP_CODE = :equip_code",
    sqlHint: "SELECT MAX_QUEUE_SIZE\nFROM EQP_CONFIG\nWHERE EQUIP_CODE = :equip_code",
  },
  APPLY_STATUS: {
    variable: "APPLY_STATUS", varType: "COMPUTED",
    sourceTable: "RECIPE_APPLY_LOG", sourceColumn: "STATUS",
    filterConditions: "RECIPE_NAME = :recipe_name AND EQUIP_CODE = :equip_code",
    sqlHint: "SELECT STATUS\nFROM RECIPE_APPLY_LOG\nWHERE RECIPE_NAME = :recipe_name\n  AND EQUIP_CODE = :equip_code\nORDER BY APPLY_TIME DESC\nFETCH FIRST 1 ROWS ONLY",
  },
};

// ─── 拓撲排序 ─────────────────────────────────────────────────

function sortBlocks(rules: RuleData[]): RuleData[] {
  const nameToRule = new Map(rules.map((r) => [r.BLOCK_NAME, r]));
  const sorted: RuleData[] = [];
  const visited = new Set<string>();

  function visit(rule: RuleData) {
    if (visited.has(rule.BLOCK_NAME)) return;
    for (const pre of rule.PRE_BLOCK ?? []) {
      const parent = nameToRule.get(pre);
      if (parent) visit(parent);
    }
    visited.add(rule.BLOCK_NAME);
    sorted.push(rule);
  }

  for (const rule of rules) visit(rule);
  return sorted;
}

// ─── 核心邏輯 ─────────────────────────────────────────────────

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 從輸入字串解析出 Log 名稱（支援 [$NAME$] 或直接輸入 NAME） */
function parseLogName(input: string): string {
  const trimmed = input.trim();
  const m = trimmed.match(/^\[?\$?([A-Z][A-Z0-9_]*)\$?\]?$/);
  return m ? m[1] : trimmed.toUpperCase();
}

/** 找出 VALUE 含有 [$logName$] 的所有 Block */
function findLogBlocks(logName: string, rules: RuleData[]): RuleData[] {
  const re = new RegExp(`\\[\\$${escapeRegex(logName)}\\$\\]`);
  return rules.filter((r) => r.VALUES.some((v) => v.VALUE && re.test(v.VALUE)));
}

const LOG_KEYWORDS = new Set([
  "IF", "THEN", "ELSE", "AND", "OR", "NOT", "NULL", "TRUE", "FALSE",
  "IN", "IS", "SYSDATE", "TODAY",
]);

/** 從含有指定 Log 的 VALUE 表達式中萃取相關變數名稱 */
function extractVarsFromLogExpr(logName: string, blocks: RuleData[]): string[] {
  const re = new RegExp(`\\[\\$${escapeRegex(logName)}\\$\\]`);
  const vars = new Set<string>();

  for (const block of blocks) {
    for (const v of block.VALUES) {
      if (!v.VALUE || !re.test(v.VALUE)) continue;

      // 移除 [$...$]、字串字面值、函式名稱（小駝峰或大駝峰後接括號）
      const cleaned = v.VALUE
        .replace(/"?\[\$[^\$]+\$\]"?/g, " ")
        .replace(/"[^"]*"/g, " ")
        .replace(/[A-Za-z_][A-Za-z0-9_]*\s*\(/g, "(");

      const tokens = cleaned.match(/\b[A-Z][A-Z0-9_]+\b/g) ?? [];
      tokens
        .filter((t) => !LOG_KEYWORDS.has(t))
        .forEach((t) => vars.add(t));
    }
  }

  return [...vars];
}

/** 找出 COLUMN1 = varName 的所有 Block */
function findVarDefBlocks(varName: string, rules: RuleData[]): RuleData[] {
  return rules.filter((r) => r.VALUES.some((v) => v.COLUMN1 === varName));
}

// ─── Block Type 樣式 ──────────────────────────────────────────

const BLOCK_TYPE_STYLE: Record<string, { badge: string; border: string }> = {
  START:    { badge: "bg-purple-500/20 text-purple-300 border border-purple-500/30", border: "border-purple-500/30" },
  END:      { badge: "bg-[#8b9ab8]/20  text-[#8b9ab8] border border-[#8b9ab8]/20",  border: "border-[#8b9ab8]/20" },
  DECISION: { badge: "bg-amber-500/20  text-amber-300  border border-amber-500/30", border: "border-amber-500/30" },
  PROCESS:  { badge: "bg-blue-500/20   text-blue-300   border border-blue-500/30",  border: "border-blue-500/30" },
};
function getBlockStyle(type: string) {
  return BLOCK_TYPE_STYLE[type] ?? BLOCK_TYPE_STYLE["PROCESS"];
}

// ─── 反藍 Log 標籤 ────────────────────────────────────────────

function AntiBlueBadge({ name, active }: { name: string; active?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-px rounded text-xs font-bold font-mono mx-0.5 align-middle border ${
      active
        ? "bg-red-500/25 text-red-300 border-red-500/50 ring-1 ring-red-400/30"
        : "bg-red-500/10 text-red-400/70 border-red-500/20"
    }`}>
      <span className="text-red-500/50 text-xs">[$</span>
      {name}
      <span className="text-red-500/50 text-xs">$]</span>
    </span>
  );
}

// ─── VALUE 表達式渲染 ─────────────────────────────────────────

function ExprRenderer({
  text,
  activeLogName,
  activeVar,
}: {
  text: string;
  activeLogName?: string;   // 若設定，此 Log 標籤會高亮
  activeVar?: string;        // 若設定，此變數名稱會高亮
}) {
  const KW: Record<string, string> = {
    IF:   "text-purple-400 font-bold",
    THEN: "text-green-400 font-bold",
    ELSE: "text-orange-400 font-bold",
    AND:  "text-blue-400 font-bold",
    OR:   "text-yellow-400 font-bold",
    NOT:  "text-red-400 font-bold",
  };

  const LOG_PATTERN = /"?\[\$([^\$]+)\$\]"?/g;
  type Part = { kind: "text"; value: string } | { kind: "log"; name: string };

  const parts: Part[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = LOG_PATTERN.exec(text)) !== null) {
    if (m.index > last) parts.push({ kind: "text", value: text.slice(last, m.index) });
    parts.push({ kind: "log", name: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", value: text.slice(last) });

  return (
    <>
      {parts.map((part, pi) => {
        if (part.kind === "log") {
          return (
            <AntiBlueBadge
              key={pi}
              name={part.name}
              active={activeLogName ? part.name === activeLogName : false}
            />
          );
        }

        const segments: { text: string; cls: string }[] = [];
        const lines = part.value.split("\n");
        lines.forEach((line, li) => {
          if (li > 0) segments.push({ text: "\n", cls: "" });
          const tokens = line.split(/(\b\w+\b)/g);
          for (const token of tokens) {
            if (KW[token]) {
              segments.push({ text: token, cls: KW[token] });
            } else if (activeVar && token === activeVar) {
              segments.push({ text: token, cls: "text-[#fcd34d] underline decoration-dotted underline-offset-2 font-bold" });
            } else {
              segments.push({ text: token, cls: "text-[#cfd6e6]" });
            }
          }
        });

        return (
          <span key={pi}>
            {segments.map((s, i) =>
              s.cls ? <span key={i} className={s.cls}>{s.text}</span> : s.text
            )}
          </span>
        );
      })}
    </>
  );
}

// ─── Block 卡片 ───────────────────────────────────────────────

function BlockCard({
  block,
  seqNum,
  mode,            // "log" = 高亮含 Log 的 row；"var" = 高亮 COLUMN1 = varName 的 row
  activeLogName,
  activeVar,
  selectedDbVar,
  onCol1Click,
}: {
  block: RuleData;
  seqNum: number;
  mode: "log" | "var";
  activeLogName?: string;
  activeVar?: string;
  selectedDbVar: string | null;
  onCol1Click: (v: string) => void;
}) {
  const style = getBlockStyle(block.BLOCK_TYPE);
  const logRe = activeLogName
    ? new RegExp(`\\[\\$${escapeRegex(activeLogName)}\\$\\]`)
    : null;

  function isRowRelevant(v: (typeof block.VALUES)[0]): boolean {
    if (mode === "log") return !!(logRe && v.VALUE && logRe.test(v.VALUE));
    if (mode === "var") return v.COLUMN1 === activeVar;
    return false;
  }

  return (
    <div className={`rounded-lg border overflow-hidden ${style.border}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white/[.03] border-b border-white/[.06]">
        <span className="text-[#4b5a72] font-mono text-xs w-5 flex-shrink-0">{seqNum}</span>
        <span className={`text-xs px-2 py-0.5 rounded font-bold font-mono flex-shrink-0 ${style.badge}`}>
          {block.BLOCK_TYPE}
        </span>
        <span className="text-[#cfd6e6] text-xs font-mono font-semibold flex-1 truncate">
          {block.BLOCK_NAME}
        </span>
        {block.KEY && (
          <span className="text-[#4b5a72] text-xs font-mono flex-shrink-0">KEY: {block.KEY}</span>
        )}
      </div>

      {block.VALUES.length > 0 && (
        <div className="flex flex-col divide-y divide-white/[.04]">
          {block.VALUES.map((v, i) => {
            const relevant = isRowRelevant(v);
            return (
              <div
                key={i}
                className={`px-3 py-2 flex flex-col gap-1.5 transition-opacity ${!relevant ? "opacity-30" : ""}`}
              >
                <div className="flex items-start gap-2 flex-wrap">
                  {/* COLUMN1 */}
                  {v.COLUMN1 && (
                    <button
                      onClick={() => onCol1Click(v.COLUMN1!)}
                      className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded border flex-shrink-0 transition-colors cursor-pointer ${
                        selectedDbVar === v.COLUMN1
                          ? "text-[#7dd3fc] border-blue-400/50 bg-blue-500/15"
                          : "text-[#7dd3fc] border-[#7dd3fc]/20 bg-[#7dd3fc]/[.05] hover:bg-[#7dd3fc]/10"
                      }`}
                      title={`查看 ${v.COLUMN1} 來源`}
                    >
                      {v.COLUMN1}
                    </button>
                  )}
                  <span className="text-white/20 text-xs self-center flex-shrink-0">←</span>
                  <pre className="flex-1 min-w-0 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                    <ExprRenderer
                      text={v.VALUE ?? ""}
                      activeLogName={relevant && mode === "log" ? activeLogName : undefined}
                      activeVar={relevant && mode === "var" ? activeVar : undefined}
                    />
                  </pre>
                </div>
                {v.COLUMN2 && (
                  <div className="ml-1 text-[#4b5a72] text-xs font-mono">
                    ref: <span className="text-[#8b9ab8]">{v.COLUMN2}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── DB 資料來源面板 ──────────────────────────────────────────

function VarSourcePanel({ source, varName }: { source: VariableSource | null; varName: string | null }) {
  if (!varName) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[#8b9ab8] text-sm text-center px-4">
        <span className="text-2xl opacity-25">⌕</span>
        點擊<span className="text-[#7dd3fc] mx-1">藍色</span>輸出變數
        <br />
        查看 DB 資料來源
      </div>
    );
  }

  const typeStyle =
    !source ? "bg-white/10 text-white/40 border-white/10" :
    source.varType === "INPUT"    ? "bg-green-500/15  text-green-400 border-green-500/30" :
    source.varType === "COMPUTED" ? "bg-blue-500/15   text-blue-400  border-blue-500/30"  :
                                    "bg-[#8b9ab8]/15  text-[#8b9ab8] border-[#8b9ab8]/30";

  return (
    <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-2.5">
      <div className="rounded-lg bg-white/[.04] border border-white/10 p-3">
        <div className="text-[#8b9ab8] text-xs uppercase tracking-wide mb-1.5">變數</div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[#7dd3fc] font-mono text-sm font-bold">{varName}</span>
          <span className={`text-xs px-2 py-0.5 rounded border font-bold ${typeStyle}`}>
            {source?.varType ?? "UNKNOWN"}
          </span>
        </div>
      </div>

      {!source && <div className="text-[#8b9ab8] text-xs text-center mt-2">尚無資料來源資訊</div>}

      {source?.varType === "INPUT" && source.description && (
        <div className="rounded-lg bg-white/[.04] border border-white/10 p-3">
          <div className="text-[#8b9ab8] text-xs uppercase tracking-wide mb-2">說明</div>
          <p className="text-[#cfd6e6] text-xs leading-relaxed">{source.description}</p>
        </div>
      )}

      {source?.varType === "COMPUTED" && (
        <>
          <div className="rounded-lg bg-white/[.04] border border-white/10 p-3">
            <div className="text-[#8b9ab8] text-xs uppercase tracking-wide mb-2">資料來源</div>
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <span className="text-[#8b9ab8] text-xs w-14 flex-shrink-0 pt-px">TABLE</span>
                <span className="text-[#fcd34d] font-mono text-xs font-bold break-all">{source.sourceTable}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#8b9ab8] text-xs w-14 flex-shrink-0 pt-px">COLUMN</span>
                <span className="text-[#86efac] font-mono text-xs font-bold break-all">{source.sourceColumn}</span>
              </div>
            </div>
          </div>
          {source.filterConditions && (
            <div className="rounded-lg bg-white/[.04] border border-white/10 p-3">
              <div className="text-[#8b9ab8] text-xs uppercase tracking-wide mb-2">篩選條件</div>
              <pre className="text-[#cfd6e6] font-mono text-xs whitespace-pre-wrap leading-relaxed">{source.filterConditions}</pre>
            </div>
          )}
          {source.sqlHint && (
            <div className="rounded-lg bg-black/50 border border-white/[.08] p-3">
              <div className="text-[#8b9ab8] text-xs uppercase tracking-wide mb-2">SQL 參考</div>
              <pre className="text-[#a5f3fc] font-mono whitespace-pre-wrap leading-relaxed" style={{ fontSize: 11 }}>
                {source.sqlHint}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────

export type CaseQueryProps = {
  rules: RuleData[];
  selectedRule: string | null;
  onHighlight?: (logBlockIds: string[], varBlockIds: string[]) => void;
};

export function CaseQuery({ rules, selectedRule, onHighlight }: CaseQueryProps) {
  const [searchInput, setSearchInput]         = useState("");
  const [dropOpen, setDropOpen]               = useState(false);
  const [logHighlightIdx, setLogHighlightIdx] = useState(-1);
  const [mode, setMode]                       = useState<TrackerMode>({ tag: "idle" });
  const [selectedDbVar, setSelectedDbVar]     = useState<string | null>(null);
  const [dbSource, setDbSource]               = useState<VariableSource | null>(null);
  const searchWrapRef                         = useRef<HTMLDivElement>(null);
  const logListRef                            = useRef<HTMLUListElement>(null);

  const sortedRules = useMemo(() => sortBlocks(rules), [rules]);

  // 從所有 VALUES 中萃取 [$...$] Log 名稱清單
  const allLogNames = useMemo(() => {
    const LOG_RE = /\[\$([^\$]+)\$\]/g;
    const names  = new Set<string>();
    for (const r of rules) {
      for (const v of r.VALUES) {
        if (!v.VALUE) continue;
        let m: RegExpExecArray | null;
        LOG_RE.lastIndex = 0;
        while ((m = LOG_RE.exec(v.VALUE)) !== null) names.add(m[1]);
      }
    }
    return [...names].sort();
  }, [rules]);

  // 依輸入過濾（去除 [$...$] 包裝後比對）
  const filteredLogs = useMemo(() => {
    const kw = searchInput.replace(/^\[\$|\$\]$/g, "").trim().toLowerCase();
    if (!kw) return allLogNames;
    return allLogNames.filter((n) => n.toLowerCase().includes(kw));
  }, [allLogNames, searchInput]);

  // 點外部關閉下拉
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node))
        setDropOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // filter 變化時重置 highlight
  useEffect(() => { setLogHighlightIdx(-1); }, [filteredLogs]);

  // 高亮項目捲入可視範圍
  useEffect(() => {
    if (logHighlightIdx < 0 || !logListRef.current) return;
    const items = logListRef.current.querySelectorAll<HTMLLIElement>("li[data-item]");
    items[logHighlightIdx]?.scrollIntoView({ block: "nearest" });
  }, [logHighlightIdx]);

  function handleSearch(overrideName?: string) {
    const logName = overrideName ?? parseLogName(searchInput);
    if (!logName || sortedRules.length === 0) return;
    const logBlocks   = findLogBlocks(logName, sortedRules);
    const relatedVars = extractVarsFromLogExpr(logName, logBlocks);
    setMode({ tag: "log", logName, logBlocks, relatedVars });
    setSelectedDbVar(null);
    setDbSource(null);
    onHighlight?.(logBlocks.map((b) => b.BLOCK_NAME), []);
  }

  function handleVarPill(varName: string) {
    if (mode.tag !== "log") return;
    const varBlocks = findVarDefBlocks(varName, sortedRules);
    const logIds    = mode.logBlocks.map((b) => b.BLOCK_NAME);
    setMode({ tag: "var", logName: mode.logName, varName, varBlocks });
    setSelectedDbVar(null);
    setDbSource(null);
    onHighlight?.(logIds, varBlocks.map((b) => b.BLOCK_NAME));
  }

  function handleBack() {
    if (mode.tag === "var") {
      const logBlocks   = findLogBlocks(mode.logName, sortedRules);
      const relatedVars = extractVarsFromLogExpr(mode.logName, logBlocks);
      setMode({ tag: "log", logName: mode.logName, logBlocks, relatedVars });
      onHighlight?.(logBlocks.map((b) => b.BLOCK_NAME), []);
    } else {
      setMode({ tag: "idle" });
      setSearchInput("");
      onHighlight?.([], []);
    }
    setSelectedDbVar(null);
    setDbSource(null);
  }

  function handleCol1Click(varName: string) {
    if (selectedDbVar === varName) {
      setSelectedDbVar(null);
      setDbSource(null);
    } else {
      setSelectedDbVar(varName);
      setDbSource(MOCK_VAR_SOURCES[varName] ?? null);
    }
  }

  if (!selectedRule || rules.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[#8b9ab8] text-xs text-center">
        <span className="text-2xl opacity-20">⚙</span>
        請先選擇 Rule
      </div>
    );
  }

  // ── 搜尋列（含 Log 下拉 + 鍵盤導航） ────────────────────────
  function handleLogKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDropOpen(true);
      setLogHighlightIdx((i) => Math.min(i + 1, filteredLogs.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setLogHighlightIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (dropOpen && logHighlightIdx >= 0 && filteredLogs[logHighlightIdx]) {
        const name = filteredLogs[logHighlightIdx];
        setSearchInput(`[$${name}$]`);
        setDropOpen(false);
        setLogHighlightIdx(-1);
        handleSearch(name);
      } else {
        setDropOpen(false);
        handleSearch();
      }
    } else if (e.key === "Escape") {
      setDropOpen(false);
      setLogHighlightIdx(-1);
    }
  }

  const searchBar = (
    <div ref={searchWrapRef} className="flex items-center gap-1.5 flex-shrink-0 relative">
      <div className="flex-1 min-w-0 relative">
        <input
          className="w-full rounded px-2 py-1 bg-white/10 text-white border border-white/20
            placeholder:text-white/25 text-xs outline-none focus:border-white/40 font-mono"
          placeholder="[$LOG_NAME$]"
          value={searchInput}
          onChange={(e) => { setSearchInput(e.target.value); setDropOpen(true); setLogHighlightIdx(-1); }}
          onFocus={() => setDropOpen(true)}
          onKeyDown={handleLogKeyDown}
        />

        {dropOpen && filteredLogs.length > 0 && (
          <ul
            ref={logListRef}
            className="absolute top-full left-0 mt-1 w-full max-h-[200px] overflow-y-auto
              rounded border border-white/20 bg-[#1a2540] shadow-xl z-[2000] list-none p-0 m-0"
          >
            {filteredLogs.map((name, i) => (
              <li
                key={name}
                data-item
                className={`px-2.5 py-1.5 text-xs font-mono cursor-pointer flex items-center gap-1 ${
                  i === logHighlightIdx
                    ? "bg-white/15 text-white"
                    : "text-[#cfd6e6] hover:bg-white/10 hover:text-white"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setSearchInput(`[$${name}$]`);
                  setDropOpen(false);
                  setLogHighlightIdx(-1);
                  handleSearch(name);
                }}
              >
                <span className="text-red-400/60">[$</span>
                <span className="text-red-300 font-bold">{name}</span>
                <span className="text-red-400/60">$]</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={() => { setDropOpen(false); handleSearch(); }}
        className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex-shrink-0 cursor-pointer transition-colors"
      >
        Trace
      </button>
    </div>
  );

  if (mode.tag === "idle") {
    return (
      <div className="flex-1 min-h-0 flex flex-col gap-2">
        {searchBar}
        <div className="flex-1 flex flex-col items-center justify-center gap-1.5 text-[#8b9ab8] text-xs text-center">
          <span className="text-xl opacity-20">[$]</span>
          輸入反藍 Log 名稱
          <br />
          追蹤觸發條件與相關變數
        </div>
      </div>
    );
  }

  // ── Log / Var 模式 ────────────────────────────────────────────
  const isLogMode = mode.tag === "log";
  const logName   = mode.logName;
  const varName   = mode.tag === "var" ? mode.varName : undefined;
  const blocks    = mode.tag === "log" ? mode.logBlocks : mode.varBlocks;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2">
      {searchBar}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
        <button
          onClick={handleBack}
          className="text-xs text-[#8b9ab8] hover:text-white cursor-pointer transition-colors"
          title="返回"
        >
          ←
        </button>
        <span className="text-[#4b5a72] text-xs">/</span>
        <button
          onClick={isLogMode ? undefined : handleBack}
          className={`inline-flex items-center gap-0.5 px-1 py-px rounded text-xs font-bold font-mono border transition-colors ${
            isLogMode
              ? "bg-red-500/20 text-red-300 border-red-500/40 cursor-default"
              : "bg-red-500/10 text-red-400/60 border-red-500/20 hover:bg-red-500/20 hover:text-red-300 cursor-pointer"
          }`}
        >
          <span className="opacity-50">[$</span>{logName}<span className="opacity-50">$]</span>
        </button>
        {varName && (
          <>
            <span className="text-[#4b5a72] text-xs">/</span>
            <span className="text-[#fcd34d] font-mono text-xs font-semibold">{varName}</span>
          </>
        )}
        <span className="ml-auto text-[#4b5a72] text-xs">
          {blocks.length > 0 ? `${blocks.length} Block` : "找不到"}
        </span>
      </div>

      {/* 主體：可捲動 */}
      <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-2">
        {blocks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[#8b9ab8] text-xs">
            在當前 Rule 中找不到相關定義
          </div>
        ) : (
          <>
            {blocks.map((block, i) => (
              <BlockCard
                key={block.BLOCK_NAME}
                block={block}
                seqNum={i + 1}
                mode={isLogMode ? "log" : "var"}
                activeLogName={logName}
                activeVar={varName}
                selectedDbVar={selectedDbVar}
                onCol1Click={handleCol1Click}
              />
            ))}

            {/* 相關變數 Pill（Log 模式） */}
            {isLogMode && mode.relatedVars.length > 0 && (
              <div className="rounded-lg border border-white/10 bg-white/[.02] px-2.5 py-2">
                <div className="text-[#8b9ab8] text-xs mb-1.5">相關變數 — 點擊查看定義</div>
                <div className="flex flex-wrap gap-1">
                  {mode.relatedVars.map((v) => (
                    <button
                      key={v}
                      onClick={() => handleVarPill(v)}
                      className="font-mono text-xs px-2 py-0.5 rounded border cursor-pointer transition-colors
                        text-[#fcd34d] border-[#fcd34d]/30 bg-[#fcd34d]/[.05]
                        hover:bg-[#fcd34d]/10 hover:border-[#fcd34d]/50"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* DB 資料來源（inline，點藍色變數後展開） */}
            {selectedDbVar && (
              <div className="rounded-lg border border-[#7dd3fc]/20 bg-[#7dd3fc]/[.03] p-2.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#7dd3fc] font-mono text-xs font-bold">{selectedDbVar}</span>
                  <button
                    onClick={() => { setSelectedDbVar(null); setDbSource(null); }}
                    className="text-white/30 hover:text-white/70 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <VarSourcePanel source={dbSource} varName={selectedDbVar} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
