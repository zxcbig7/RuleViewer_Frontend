// ============================================================
// BlockInspector.tsx
// 雙擊 Block 後浮出的詳細資訊面板（可拖曳、可縮放）
//
// 架構：
//   BlockInspector  ── Shell：拖曳 / resize / z-index，與型別無關
//     └─ InspectorBody ── Factory：依 block.type 分派
//         ├─ StartEndBody  (START / END)
//         ├─ DecisionBody  (DECISION)
//         └─ ProcessBody   (PROCESS / 其他)
//
// 共用元件：SectionTitle / MetaRow / ValueCard / HighlightedValue
// ============================================================

import React, { useEffect, useRef } from "react";
import type { Block, BlockValue, RuleData } from "./types";

// ─────────────────────────────────────────────────────────────
// Shell Props
// ─────────────────────────────────────────────────────────────
type BlockInspectorProps = {
  block: Block;
  initialX: number;
  initialY: number;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  inspectorDraggingRef: React.MutableRefObject<boolean>;
  onPositionChange?: (x: number, y: number) => void;
  onFocus?: () => void;
  zIndex?: number;
};

// ─────────────────────────────────────────────────────────────
// Type Accent Config
// ─────────────────────────────────────────────────────────────
type TypeAccent = {
  headerBg: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
};

const TYPE_ACCENT: Record<string, TypeAccent> = {
  START:    { headerBg: "#f0fdf4", borderColor: "#16a34a", badgeBg: "#dcfce7", badgeText: "#15803d" },
  END:      { headerBg: "#f9fafb", borderColor: "#6b7280", badgeBg: "#f3f4f6", badgeText: "#374151" },
  DECISION: { headerBg: "#fffbeb", borderColor: "#d97706", badgeBg: "#fef3c7", badgeText: "#92400e" },
  PROCESS:  { headerBg: "#eff6ff", borderColor: "#2563eb", badgeBg: "#dbeafe", badgeText: "#1e40af" },
};

function getAccent(type: string): TypeAccent {
  return TYPE_ACCENT[type] ?? TYPE_ACCENT["PROCESS"];
}

// ─────────────────────────────────────────────────────────────
// Shell
// ─────────────────────────────────────────────────────────────
export function BlockInspector({
  block,
  initialX,
  initialY,
  wrapperRef,
  onClose,
  inspectorDraggingRef,
  onPositionChange,
  onFocus,
  zIndex = 100,
}: BlockInspectorProps) {
  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;

  const panelRef = useRef<HTMLDivElement | null>(null);

  const dragRef = useRef({
    dragging: false,
    startX: 0, startY: 0,
    originX: initialX, originY: initialY,
  });

  const resizeRef = useRef({
    resizing: false,
    startX: 0, startY: 0,
    startW: 0, startH: 0,
  });

  // 初始位置
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.transform = `translate(${initialX}px, ${initialY}px)`;
    onPositionChangeRef.current?.(initialX, initialY);
  }, [initialX, initialY]);

  // 拖曳 / resize mousemove + mouseup
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const panel   = panelRef.current;
      const wrapper = wrapperRef.current;
      if (!panel || !wrapper) return;

      if (resizeRef.current.resizing) {
        const dx = e.clientX - resizeRef.current.startX;
        const dy = e.clientY - resizeRef.current.startY;
        const wrapperRect = wrapper.getBoundingClientRect();
        const panelRect   = panel.getBoundingClientRect();
        const maxW = wrapperRect.width  - panelRect.left + wrapperRect.left;
        const maxH = wrapperRect.height - panelRect.top  + wrapperRect.top;
        panel.style.width  = Math.min(Math.max(240, resizeRef.current.startW + dx), maxW) + "px";
        panel.style.height = Math.min(Math.max(180, resizeRef.current.startH + dy), maxH) + "px";
        return;
      }

      if (!dragRef.current.dragging) return;
      const rect = wrapper.getBoundingClientRect();
      const mx   = e.clientX - rect.left;
      const my   = e.clientY - rect.top;
      let x = dragRef.current.originX + (mx - dragRef.current.startX);
      let y = dragRef.current.originY + (my - dragRef.current.startY);
      const panelRect = panel.getBoundingClientRect();
      x = Math.max(0, Math.min(x, rect.width  - panelRect.width));
      y = Math.max(0, Math.min(y, rect.height - panelRect.height));
      panel.style.transform = `translate(${x}px, ${y}px)`;
      onPositionChangeRef.current?.(x, y);
    }

    function onMouseUp() {
      const panel   = panelRef.current;
      const wrapper = wrapperRef.current;
      if (!panel || !wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      if (resizeRef.current.resizing || dragRef.current.dragging) {
        resizeRef.current.resizing = false;
        dragRef.current.dragging   = false;
        dragRef.current.originX = panel.getBoundingClientRect().left - rect.left;
        dragRef.current.originY = panel.getBoundingClientRect().top  - rect.top;
        inspectorDraggingRef.current = false;
      }
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
    };
  }, []);

  if (!block) return null;

  const accent = getAccent(block.type);
  const r = block.raw;

  return (
    <div
      ref={panelRef}
      className="absolute top-0 left-0 w-[360px] min-w-[300px] min-h-[200px] flex flex-col bg-white shadow-[0_12px_30px_rgba(0,0,0,0.18)] pointer-events-auto overflow-hidden"
      style={{ zIndex, borderLeft: `3px solid ${accent.borderColor}`, border: `1px solid #e5e7eb`, borderLeftWidth: 3, borderLeftColor: accent.borderColor }}
      onMouseDown={(e) => { e.stopPropagation(); onFocus?.(); }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between select-none px-3 py-2 flex-shrink-0 cursor-move border-b border-[#e5e7eb]"
        style={{ backgroundColor: accent.headerBg }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onFocus?.();
          const wrapper = wrapperRef.current;
          if (!wrapper) return;
          const rect = wrapper.getBoundingClientRect();
          inspectorDraggingRef.current = true;
          dragRef.current.dragging = true;
          dragRef.current.startX = e.clientX - rect.left;
          dragRef.current.startY = e.clientY - rect.top;
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0"
            style={{ backgroundColor: accent.badgeBg, color: accent.badgeText }}
          >
            {block.type}
          </span>
          <strong className="text-sm truncate">{r.BLOCK_NAME}</strong>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[10px] text-[#d1d5db] select-none">Esc</span>
          <button
            onClick={onClose}
            className="bg-transparent border-0 text-sm cursor-pointer px-1.5 py-0.5 leading-none text-[#9ca3af] hover:text-red-500"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body（捲動區） */}
      <div className="flex-1 min-h-0 overflow-auto">
        <InspectorBody block={block} r={r} />
      </div>

      {/* Resize Handle */}
      <div
        className="absolute right-0.5 bottom-0.5 w-3.5 h-3.5 cursor-se-resize flex items-end justify-end"
        onMouseDown={(e) => {
          e.stopPropagation();
          onFocus?.();
          const panel = panelRef.current;
          if (!panel) return;
          resizeRef.current.resizing = true;
          inspectorDraggingRef.current = true;
          resizeRef.current.startX = e.clientX;
          resizeRef.current.startY = e.clientY;
          resizeRef.current.startW = panel.offsetWidth;
          resizeRef.current.startH = panel.offsetHeight;
        }}
      >
        <span className="text-[10px] text-[#d1d5db] leading-none select-none">◢</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Body Factory
// ─────────────────────────────────────────────────────────────
function InspectorBody({ block, r }: { block: Block; r: RuleData }) {
  switch (block.type) {
    case "START":
    case "END":
      return <StartEndBody r={r} />;
    case "DECISION":
      return <DecisionBody r={r} />;
    default:
      return <ProcessBody r={r} />;
  }
}

// ─────────────────────────────────────────────────────────────
// StartEndBody — 僅元資料，無 Values
// ─────────────────────────────────────────────────────────────
function StartEndBody({ r }: { r: RuleData }) {
  return (
    <div className="p-3 flex flex-col gap-2">
      <SectionTitle>Metadata</SectionTitle>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <MetaRow label="Phase"  value={r.PHASE} />
        <MetaRow label="Rule"   value={r.RULE_NAME} />
        <MetaRow label="Group"  value={r.BLOCK_GROUP} />
        <MetaRow label="Seq"    value={r.BLOCK_SEQ} />
      </div>

      {r.PRE_BLOCK && r.PRE_BLOCK.length > 0 && (
        <>
          <SectionTitle>Pre-Blocks</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {r.PRE_BLOCK.map((name, i) => (
              <PreBlockBadge key={name} name={name} isPrimary={i === 0} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DecisionBody — Key + 單一判斷條件
// ─────────────────────────────────────────────────────────────
function DecisionBody({ r }: { r: RuleData }) {
  return (
    <div className="p-3 flex flex-col gap-2">
      <SectionTitle>Metadata</SectionTitle>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <MetaRow label="Group" value={r.BLOCK_GROUP} />
        <MetaRow label="Seq"   value={r.BLOCK_SEQ} />
        {r.KEY && <MetaRow label="Decision Key" value={r.KEY} />}
      </div>

      {r.PRE_BLOCK && r.PRE_BLOCK.length > 0 && (
        <>
          <SectionTitle>Pre-Blocks</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {r.PRE_BLOCK.map((name, i) => (
              <PreBlockBadge key={name} name={name} isPrimary={i === 0} />
            ))}
          </div>
        </>
      )}

      {r.VALUES.length > 0 && (
        <>
          <SectionTitle>Branch Condition</SectionTitle>
          {r.VALUES.map((v, i) => (
            <DecisionConditionCard key={i} v={v} />
          ))}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ProcessBody — 多筆賦值（每筆一件事）
// ─────────────────────────────────────────────────────────────
function ProcessBody({ r }: { r: RuleData }) {
  return (
    <div className="p-3 flex flex-col gap-2">
      <SectionTitle>Metadata</SectionTitle>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <MetaRow label="Group" value={r.BLOCK_GROUP} />
        <MetaRow label="Seq"   value={r.BLOCK_SEQ} />
        {r.KEY && <MetaRow label="Key" value={r.KEY} />}
      </div>

      {r.PRE_BLOCK && r.PRE_BLOCK.length > 0 && (
        <>
          <SectionTitle>Pre-Blocks</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {r.PRE_BLOCK.map((name, i) => (
              <PreBlockBadge key={name} name={name} isPrimary={i === 0} />
            ))}
          </div>
        </>
      )}

      {r.VALUES.length > 0 && (
        <>
          <SectionTitle>Assignments ({r.VALUES.length})</SectionTitle>
          <div className="flex flex-col gap-2">
            {r.VALUES.map((v, i) => (
              <AssignmentCard key={i} index={i} v={v} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared Primitives
// ─────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold tracking-wider text-[#9ca3af] uppercase mt-1">
      {children}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-[#9ca3af] font-medium">{label}</span>
      <span className="text-xs text-[#111827] break-all font-mono">{value}</span>
    </div>
  );
}

function PreBlockBadge({ name, isPrimary }: { name: string; isPrimary: boolean }) {
  return (
    <span
      className="text-[11px] px-2 py-0.5 rounded border font-mono"
      style={
        isPrimary
          ? { borderColor: "#374151", color: "#374151", backgroundColor: "#f9fafb" }
          : { borderColor: "#ea580c", color: "#ea580c", backgroundColor: "#fff7ed" }
      }
    >
      {isPrimary ? "●" : "○"} {name}
    </span>
  );
}

/** DECISION 用：顯示判斷條件 */
function DecisionConditionCard({ v }: { v: BlockValue }) {
  return (
    <div className="rounded border border-[#fde68a] bg-[#fffdf0] p-2.5">
      <div className="flex gap-3 text-xs mb-2">
        {v.COLUMN1 && (
          <span className="flex flex-col gap-0.5">
            <span className="text-[10px] text-[#9ca3af]">Output</span>
            <span className="font-mono text-[#92400e] font-semibold">{v.COLUMN1}</span>
          </span>
        )}
        {v.COLUMN2 && (
          <span className="flex flex-col gap-0.5">
            <span className="text-[10px] text-[#9ca3af]">Input</span>
            <span className="font-mono text-[#374151]">{v.COLUMN2}</span>
          </span>
        )}
      </div>
      <pre className="font-mono text-xs leading-relaxed bg-white border border-[#fde68a] rounded px-2.5 py-2 m-0 whitespace-pre-wrap break-all">
        {v.VALUE != null && <HighlightedValue code={v.VALUE} />}
      </pre>
    </div>
  );
}

/** PROCESS 用：顯示單一賦值 */
function AssignmentCard({ index, v }: { index: number; v: BlockValue }) {
  return (
    <div className="rounded border border-[#e5e7eb] bg-[#fafafa] p-2.5">
      {/* 賦值目標 */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] text-[#9ca3af] font-medium w-4 text-right flex-shrink-0">
          {index + 1}
        </span>
        <span className="text-[10px] text-[#9ca3af]">←</span>
        <div className="flex gap-3 text-xs min-w-0">
          {v.COLUMN1 && (
            <span className="flex flex-col gap-0.5">
              <span className="text-[9px] text-[#9ca3af]">Target</span>
              <span className="font-mono text-[#1d4ed8] font-semibold">{v.COLUMN1}</span>
            </span>
          )}
          {v.COLUMN2 && (
            <span className="flex flex-col gap-0.5">
              <span className="text-[9px] text-[#9ca3af]">Depends on</span>
              <span className="font-mono text-[#6b7280]">{v.COLUMN2}</span>
            </span>
          )}
        </div>
      </div>
      {/* 值表達式 */}
      <pre className="font-mono text-xs leading-relaxed bg-white border border-[#e5e7eb] rounded px-2.5 py-1.5 m-0 whitespace-pre-wrap break-all ml-6">
        {v.VALUE != null && <HighlightedValue code={v.VALUE} />}
      </pre>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Syntax Highlighter
// ─────────────────────────────────────────────────────────────
type TokenType = "comment" | "string" | "keyword" | "variable" | "text";
type Token = { type: TokenType; text: string };

const HIGHLIGHT_RE =
  /("(?:[^"\\]|\\.)*")|(\/\*[\s\S]*?\*\/)|(\/\/[^\n]*)|(\b(?:IF|ELSE|THEN|OR|AND)\b)|(\$[^\s"]+)|([^\s"]+)/g;

function tokenize(code: string): Token[] {
  const result: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  HIGHLIGHT_RE.lastIndex = 0;

  while ((m = HIGHLIGHT_RE.exec(code)) !== null) {
    if (m.index > last) result.push({ type: "text", text: code.slice(last, m.index) });
    if      (m[1]) result.push({ type: "string",   text: m[1] });
    else if (m[2]) result.push({ type: "comment",  text: m[2] });
    else if (m[3]) result.push({ type: "comment",  text: m[3] });
    else if (m[4]) result.push({ type: "keyword",  text: m[4] });
    else if (m[5]) result.push({ type: "variable", text: m[5] });
    else           result.push({ type: "text",     text: m[6]! });
    last = HIGHLIGHT_RE.lastIndex;
  }

  if (last < code.length) result.push({ type: "text", text: code.slice(last) });
  return result;
}

const TOKEN_COLOR: Record<TokenType, string | undefined> = {
  comment:  "#16a34a",
  string:   "#92400e",
  keyword:  "#1d4ed8",
  variable: "#b45309",
  text:     undefined,
};

function HighlightedValue({ code }: { code: string }) {
  return (
    <>
      {tokenize(code).map((tok, i) => (
        <span key={i} style={tok.type !== "text" ? { color: TOKEN_COLOR[tok.type] } : undefined}>
          {tok.text}
        </span>
      ))}
    </>
  );
}
