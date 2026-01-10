import React, { useMemo, useRef, useState, useEffect } from "react";
import type { RuleDTO } from "../../hooks/useRuleViewerData";

export type CanvasBlock = {
  id: string;            // = block_Name
  x: number;             // world x
  y: number;             // world y
  w: number;
  h: number;
  type: RuleDTO["block_Type"];
  label: string;         // 顯示文字
  raw: RuleDTO;          // 原始資料（點擊用）
};

export type CanvasEdge = {
  id: string;
  from: string; // pre_Block
  to: string;   // block_Name
};

// 從 API 轉成 Canvas 資料（重點）
async function loadRules(): Promise<{
  blocks: CanvasBlock[];
  edges: CanvasEdge[];
}> {
  const res = await fetch("https://localhost:7215/api/RuleViewer/names"); // 抓後端 API
  const data: RuleDTO[] = await res.json();

  const blocks: CanvasBlock[] = data.map((r) => ({
    id: r.block_Name,
    x: r.posx,
    y: r.posy,
    w: 100,
    h: 100,
    type: r.block_Type,
    label: r.block_Name,
    raw: r,
  }));

  const edges: CanvasEdge[] = data
    .filter((r) => r.pre_Block)
    .map((r) => ({
      id: `${r.pre_Block}->${r.block_Name}`,
      from: r.pre_Block!,
      to: r.block_Name,
    }));

  return { blocks, edges };
}


type Point = { x: number; y: number };

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export default function PanZoomBlocks() {
  // 視窗：pan + zoom
  const [zoom, setZoom] = useState<number>(1); // 倍數
  const [pan, setPan] = useState<Point>({ x: 80, y: 60 }); // screen pixels

  // 方塊資料：world 座標系
  const [blocks, setBlocks] = useState<CanvasBlock[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);

  const viewportRef = useRef<HTMLDivElement | null>(null);

  // 拖曳狀態（用 ref 避免 move 時大量 re-render）
  const dragRef = useRef<
    | null
    | {
      mode: "pan";
      startClient: Point;
      startPan: Point;
    }
    | {
      mode: "block";
      blockId: string;
      // 按下那一刻，滑鼠對應的 world 座標
      startWorld: Point;
      // 方塊原始座標
      startBlock: Point;
    }
  >(null);

  const transformStyle = useMemo(() => {
    // pan 是 screen px, zoom 是比例
    // 用 transform 讓整個 world 一起移動與縮放
    return {
      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
      transformOrigin: "0 0",
    } as React.CSSProperties;
  }, [pan.x, pan.y, zoom]);

  function getViewportRect() {
    const el = viewportRef.current;
    if (!el) return null;
    return el.getBoundingClientRect();
  }

  /* -------------------------------------------------------
   *  關鍵修改：阻止瀏覽器 Ctrl + wheel 縮放
   * ----------------------------------------------------- */
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onWheelNative = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    el.addEventListener("wheel", onWheelNative, { passive: false });

    return () => {
      el.removeEventListener("wheel", onWheelNative);
    };
  }, []);
  

  useEffect(() => {
    loadRules()
      .then(({ blocks, edges }) => {
        setBlocks(blocks);
        setEdges(edges);
      })
      .catch((err) => {
        console.error("loadRules failed", err);
      });
  }, []);


  // screen(client) -> world
  function clientToWorld(client: Point): Point | null {
    const rect = getViewportRect();
    if (!rect) return null;

    const sx = client.x - rect.left; // screen px inside viewport
    const sy = client.y - rect.top;

    // world = (screen - pan) / zoom
    return {
      x: (sx - pan.x) / zoom,
      y: (sy - pan.y) / zoom,
    };
  }

  // Wheel: Ctrl + 滾輪縮放（以滑鼠點為中心）
  function onWheel(e: React.WheelEvent) {
    if (!e.ctrlKey) return;
    e.preventDefault();

    const rect = getViewportRect();
    if (!rect) return;

    const client = { x: e.clientX, y: e.clientY };
    const before = clientToWorld(client);
    if (!before) return;

    // deltaY > 0 通常表示往下滾（縮小）
    const factor = Math.exp(-e.deltaY * 0.002); // 平滑縮放
    const nextZoom = clamp(zoom * factor, 0.2, 3.5);

    // 計算：縮放後要讓滑鼠下的 world 點保持在同一個 screen 位置
    // screen = pan + world * zoom
    // pan' = screen - world * zoom'
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const nextPan = {
      x: sx - before.x * nextZoom,
      y: sy - before.y * nextZoom,
    };

    setZoom(nextZoom);
    setPan(nextPan);
  }

  // 空白處按下：進入 pan 模式
  function onViewportMouseDown(e: React.MouseEvent) {
    // 只處理左鍵
    if (e.button !== 0) return;

    // 如果點到方塊，方塊自己的 onMouseDown 會 stopPropagation，所以到這裡代表空白
    dragRef.current = {
      mode: "pan",
      startClient: { x: e.clientX, y: e.clientY },
      startPan: { ...pan },
    };

    // 避免拖曳時選到文字
    (e.currentTarget as HTMLDivElement).style.cursor = "grabbing";
  }

  function onMouseMove(e: React.MouseEvent) {
    const d = dragRef.current;
    if (!d) return;

    if (d.mode === "pan") {
      const dx = e.clientX - d.startClient.x;
      const dy = e.clientY - d.startClient.y;
      setPan({
        x: d.startPan.x + dx,
        y: d.startPan.y + dy,
      });
      return;
    }

    if (d.mode === "block") {
      const w = clientToWorld({ x: e.clientX, y: e.clientY });
      if (!w) return;

      const dx = w.x - d.startWorld.x;
      const dy = w.y - d.startWorld.y;

      setBlocks((prev) =>
        prev.map((b) =>
          b.id === d.blockId ? { ...b, x: d.startBlock.x + dx, y: d.startBlock.y + dy } : b
        )
      );

    }
  }

  function endDrag(e: React.MouseEvent) {
    dragRef.current = null;
    const el = viewportRef.current;
    if (el) el.style.cursor = "default";
  }

  // 方塊按下：進入 block 拖曳模式
  function onBlockMouseDown(e: React.MouseEvent, blockId: string) {
    if (e.button !== 0) return;
    e.stopPropagation();

    const w = clientToWorld({ x: e.clientX, y: e.clientY });
    if (!w) return;

    const b = blocks.find((x) => x.id === blockId);
    if (!b) return;

    dragRef.current = {
      mode: "block",
      blockId,
      startWorld: w,
      startBlock: { x: b.x, y: b.y },
    };
  }

  return (
    <div
      style={{
        height: "100vh",
        padding: 16,
        background: "#f6f7fb",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans TC", "Microsoft JhengHei", Arial',
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={{ fontWeight: 700 }}>Canvas Demo</div>
        <div style={{ color: "#475569" }}>
          Ctrl + 滾輪縮放，空白處拖曳平移，拖曳方塊移動
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 80, y: 60 });
            }}
          >
            Reset View
          </button>
          <div style={{ color: "#334155" }}>
            zoom: {zoom.toFixed(2)} | pan: ({Math.round(pan.x)}, {Math.round(pan.y)})
          </div>
        </div>
      </div>

      {/* Viewport */}
      <div
        ref={viewportRef}
        onWheel={onWheel}
        onMouseDown={onViewportMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        style={{
          height: "calc(100vh - 80px)",
          borderRadius: 12,
          background: "#ffffff",
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          position: "relative",
          userSelect: "none",
          cursor: "default",
        }}
      >
        {/* World layer (pan + zoom) */}
        <div style={{ position: "absolute", inset: 0, ...transformStyle }}>
          {/* 背景格線（可選） */}
          <div
            style={{
              position: "absolute",
              inset: -2000,
              backgroundImage:
                "linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          {/* Edges Layer */}
          <svg
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
            }}
          >
            {edges.map((e) => {
              const from = blocks.find((b) => b.id === e.from);
              const to = blocks.find((b) => b.id === e.to);
              if (!from || !to) return null;

              const x1 = from.x + from.w;
              const y1 = from.y + from.h / 2;
              const x2 = to.x;
              const y2 = to.y + to.h / 2;

              return (
                <line
                  key={e.id}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#64748b"
                  strokeWidth={2}
                />
              );
            })}
          </svg>

          {/* Blocks */}
          {blocks.map((b) => (
            <div
              key={b.id}
              onMouseDown={(e) => onBlockMouseDown(e, b.id)}
              style={{
                position: "absolute",
                left: b.x,
                top: b.y,
                width: b.w,
                height: b.h,
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                boxShadow: "0 6px 16px rgba(2,6,23,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                cursor: "grab",
              }}
            >
              {b.label}
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}