// ============================================================
// BlockInspector.tsx
// 雙擊 Block 後浮出的詳細資訊面板（可拖曳、可縮放、可收合）
// ============================================================

import React, { useEffect, useRef, useState } from "react";
import type { Block } from "./types";

type BlockInspectorProps = {
  block: Block;
  initialX: number;
  initialY: number;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  inspectorDraggingRef: React.MutableRefObject<boolean>;
  onPositionChange?: (x: number, y: number) => void;
};

export function BlockInspector({
  block,
  initialX,
  initialY,
  wrapperRef,
  onClose,
  inspectorDraggingRef,
  onPositionChange,
}: BlockInspectorProps) {
  // 用 ref 儲存 callback，避免 useEffect 重新綁定事件
  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;
  const [collapsedMap, setCollapsedMap] = useState<Record<number, boolean>>({});

  const panelRef = useRef<HTMLDivElement | null>(null);

  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    originX: initialX,
    originY: initialY,
  });

  const resizeRef = useRef({
    resizing: false,
    startX: 0,
    startY: 0,
    startW: 0,
    startH: 0,
  });

  // 展開 / 收合全部
  function expandAll() {
    setCollapsedMap({});
  }

  function collapseAll() {
    const next: Record<number, boolean> = {};
    block.raw.VALUES.forEach((_, idx) => { next[idx] = true; });
    setCollapsedMap(next);
  }

  // 初始位置
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.transform = `translate(${initialX}px, ${initialY}px)`;
    onPositionChangeRef.current?.(initialX, initialY);
  }, [initialX, initialY]);

  // 拖曳 / resize 的 mousemove + mouseup
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const panel   = panelRef.current;
      const wrapper = wrapperRef.current;
      if (!panel || !wrapper) return;

      /* ── Resize ── */
      if (resizeRef.current.resizing) {
        const dx = e.clientX - resizeRef.current.startX;
        const dy = e.clientY - resizeRef.current.startY;

        let newW = Math.max(220, resizeRef.current.startW + dx);
        let newH = Math.max(160, resizeRef.current.startH + dy);

        const wrapperRect = wrapper.getBoundingClientRect();
        const panelRect   = panel.getBoundingClientRect();

        const maxW = wrapperRect.width  - panelRect.left + wrapperRect.left;
        const maxH = wrapperRect.height - panelRect.top  + wrapperRect.top;

        panel.style.width  = Math.min(newW, maxW) + "px";
        panel.style.height = Math.min(newH, maxH) + "px";
        return;
      }

      /* ── Drag ── */
      if (!dragRef.current.dragging) return;

      const rect = wrapper.getBoundingClientRect();
      const mx   = e.clientX - rect.left;
      const my   = e.clientY - rect.top;

      const dx = mx - dragRef.current.startX;
      const dy = my - dragRef.current.startY;

      let x = dragRef.current.originX + dx;
      let y = dragRef.current.originY + dy;

      // 限制在 wrapper 內
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

      if (resizeRef.current.resizing) {
        resizeRef.current.resizing = false;
        dragRef.current.originX = panel.getBoundingClientRect().left - rect.left;
        dragRef.current.originY = panel.getBoundingClientRect().top  - rect.top;
        inspectorDraggingRef.current = false;
      }

      if (dragRef.current.dragging) {
        dragRef.current.dragging = false;
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

  const r = block.raw;

  return (
    <div
      ref={panelRef}
      className="absolute top-0 left-0 w-[340px] min-w-[360px] min-h-[320px] bg-white border border-[#e5e7eb] shadow-[0_12px_30px_rgba(0,0,0,0.18)] z-[100] pointer-events-auto"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* 內容區 */}
      <div className="h-full overflow-auto p-0">

        {/* Header（拖曳把手） */}
        <div
          className="flex items-center justify-between select-none px-3 py-2 border-b border-[#e5e7eb] cursor-move"
          onMouseDown={(e) => {
            e.stopPropagation();
            const wrapper = wrapperRef.current;
            if (!wrapper) return;
            const rect = wrapper.getBoundingClientRect();

            inspectorDraggingRef.current = true;
            dragRef.current.dragging = true;
            dragRef.current.startX = e.clientX - rect.left;
            dragRef.current.startY = e.clientY - rect.top;
          }}
        >
          <div>
            <strong>{r.BLOCK_NAME}</strong>
            <span className="ml-2 text-[#6b7280]">
              ({r.BLOCK_TYPE})
            </span>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-0 text-sm cursor-pointer px-1.5 py-0.5 leading-none hover:text-red-500"
          >
            ✕
          </button>
        </div>

        {/* Meta */}
        <div className="px-3 py-2.5">
          <div className="text-xs font-semibold text-[#374151] mb-1.5">Meta</div>
          <div className="grid grid-cols-2 gap-[6px_12px]">
            <MetaItem label="Key:" value={r.KEY} />
          </div>
        </div>

        {/* Conditions */}
        <div className="px-3 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-xs font-semibold text-[#374151]">Conditions</div>
            <div className="flex gap-2">
              <button
                onClick={expandAll}
                className="text-xs px-1.5 py-0.5 cursor-pointer border border-[#e5e7eb] rounded hover:bg-[#f9fafb]"
              >
                全部展開
              </button>
              <button
                onClick={collapseAll}
                className="text-xs px-1.5 py-0.5 cursor-pointer border border-[#e5e7eb] rounded hover:bg-[#f9fafb]"
              >
                全部收合
              </button>
            </div>
          </div>

          {r.VALUES.map((v, idx) => {
            const collapsed = collapsedMap[idx] ?? false;
            return (
              <div key={idx} className="mt-2 rounded border border-[#e5e7eb] p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-[#6b7280]">Condition {idx + 1}</div>
                  <button
                    className="text-[11px] text-[#2563eb] bg-transparent border-none cursor-pointer p-0 hover:underline"
                    onClick={() =>
                      setCollapsedMap((prev) => ({ ...prev, [idx]: !collapsed }))
                    }
                  >
                    {collapsed ? "展開" : "收合"}
                  </button>
                </div>

                {!collapsed && (
                  <div className="mt-2 flex flex-col gap-1 text-sm">
                    {v.COLUMN1 && <div><b>Column1:</b> {v.COLUMN1}</div>}
                    {v.COLUMN2 && <div><b>Column2:</b> {v.COLUMN2}</div>}
                    <pre className="font-mono text-xs leading-[1.5] bg-[#f9fafb] border border-[#e5e7eb] rounded px-[10px] py-2 m-0 whitespace-pre-wrap break-all">
                      <HighlightedValue code={v.VALUE} />
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Resize Handle */}
      <div
        className="absolute right-0.5 bottom-0.5 w-3.5 h-3.5 cursor-se-resize flex items-end justify-end"
        onMouseDown={(e) => {
          e.stopPropagation();
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
        <span className="text-[10px] text-[#9ca3af] leading-none select-none">◢</span>
      </div>
    </div>
  );
}

// ── 語法高亮 ─────────────────────────────────────────────────
type TokenType = "comment" | "string" | "keyword" | "text";
type Token = { type: TokenType; text: string };

const HIGHLIGHT_RE =
  /("(?:[^"\\]|\\.)*")|(\/\*[\s\S]*?\*\/)|(\/\/[^\n]*)|(\b(?:IF|ELSE|THEN|OR)\b)|(函\S*)/g;
//  ^^^^ string ^^^^   ^^^ block comment ^^  ^ line //  ^^^^^^^^^^ keyword ^^^^^^^^^  ^ func

function tokenize(code: string): Token[] {
  const result: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  HIGHLIGHT_RE.lastIndex = 0;

  while ((m = HIGHLIGHT_RE.exec(code)) !== null) {
    if (m.index > last) result.push({ type: "text", text: code.slice(last, m.index) });
    if      (m[1]) result.push({ type: "string",  text: m[1] });
    else if (m[2]) result.push({ type: "comment", text: m[2] });
    else if (m[3]) result.push({ type: "comment", text: m[3] });
    else           result.push({ type: "keyword", text: m[4] ?? m[5] });
    last = HIGHLIGHT_RE.lastIndex;
  }

  if (last < code.length) result.push({ type: "text", text: code.slice(last) });
  return result;
}

const TOKEN_COLOR: Record<TokenType, string | undefined> = {
  comment: "#16a34a", // 綠
  string:  "#92400e", // 褐
  keyword: "#1d4ed8", // 藍
  text:    undefined,
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

// ── 小工具：單一 Meta 欄位 ───────────────────────────────────
function MetaItem({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold text-[#6b7280]">{label}</span>
      <span className="text-xs text-[#111827] break-all">{value}</span>
    </div>
  );
}
