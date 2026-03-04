// ============================================================
// RuleView.tsx
// Canvas 主體元件：負責渲染 Block、Arrow、Grid、Minimap，
// 以及處理所有滑鼠互動（拖曳、縮放、hover、雙擊）
// ============================================================

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import type { Block, RuleData, RuleViewHandle } from "./types";
import { buildBlocks, drawBlocks, hitTestBlock } from "./blockUtils";
import { buildArrows, drawArrows } from "./arrowUtils";
import { drawGrid, drawMinimap, getWorldBounds, snap, GRID_SIZE } from "./canvasUtils";
import { BlockTooltip } from "./BlockTooltip";
import { BlockInspector } from "./BlockInspector";

type RuleViewProps = {
  rules: RuleData[];
  matchedBlockIds: Set<string> | null;
};

type InspectorState = {
  block: Block;
  x: number;
  y: number;
};

export const RuleView = forwardRef<RuleViewHandle, RuleViewProps>(
  function RuleView({ rules, matchedBlockIds }, ref) {

    // ── Canvas refs ────────────────────────────────────────
    const canvasStageRef = useRef<HTMLDivElement | null>(null);
    const canvasRef      = useRef<HTMLCanvasElement | null>(null);
    const ctxRef         = useRef<CanvasRenderingContext2D | null>(null);
    const wrapperRef     = useRef<HTMLDivElement | null>(null);
    const minimapRef     = useRef<HTMLCanvasElement | null>(null);
    const dprRef         = useRef(1);
    const sizeRef        = useRef({ w: 0, h: 0 });

    // ── 資料 ─────────────────────────────────────────────
    const blocks = useMemo(() => buildBlocks(rules), [rules]);
    const arrows = useMemo(() => buildArrows(rules), [rules]);

    // ── UI 狀態 ───────────────────────────────────────────
    const [inspectors, setInspectors]       = useState<InspectorState[]>([]);
    const [hoveredBlock, setHoveredBlock]   = useState<Block | null>(null);
    const [mousePos, setMousePos]           = useState<{ x: number; y: number } | null>(null);

    const inspectorDraggingRef = useRef(false);
    const activeBlockRef       = useRef<Block | null>(null);

    const inspectedBlockIds = useMemo(
      () => new Set(inspectors.map((i) => i.block.id)),
      [inspectors]
    );

    // ── Inspector 面板的當前位置（用於畫虛線連線） ────────
    const inspectorPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

    useEffect(() => {
      // 初始化新開的 inspector 位置
      inspectors.forEach(({ block, x, y }) => {
        if (!inspectorPositionsRef.current.has(block.id)) {
          inspectorPositionsRef.current.set(block.id, { x, y });
        }
      });
      // 移除已關閉的 inspector
      for (const id of inspectorPositionsRef.current.keys()) {
        if (!inspectors.some((i) => i.block.id === id)) {
          inspectorPositionsRef.current.delete(id);
        }
      }
    }, [inspectors]);

    // ── 視圖狀態（pan / zoom） ────────────────────────────
    const viewRef = useRef({ translateX: 0, translateY: 0, scale: 1 });

    const dragRef = useRef({ dragging: false, lastX: 0, lastY: 0 });

    // ── redraw ────────────────────────────────────────────
    const redraw = useCallback(
      (ctx: CanvasRenderingContext2D, blocks: Block[]) => {
        const view    = viewRef.current;
        const dpr     = dprRef.current;
        const { w, h } = sizeRef.current;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.translate(view.translateX, view.translateY);
        ctx.scale(view.scale, view.scale);

        drawGrid(ctx, view, sizeRef.current);
        drawArrows(ctx, blocks, arrows, view.scale);
        drawBlocks(ctx, blocks, inspectedBlockIds, matchedBlockIds);

        // ── Inspector 虛線連線（切回螢幕像素空間繪製） ────
        const posMap = inspectorPositionsRef.current;
        if (posMap.size > 0) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

          const INSP_W      = 340;
          const INSP_HEADER = 40;

          for (const [blockId, pos] of posMap) {
            const b = blocks.find((bl) => bl.id === blockId);
            if (!b) continue;

            // Block 中心的螢幕座標
            const bCx = view.translateX + (b.x + b.w / 2) * view.scale;
            const bCy = view.translateY + (b.y + b.h / 2) * view.scale;

            // Inspector header 四側中點，選最近的作為連線起點
            const icx = pos.x + INSP_W / 2;
            const icy = pos.y + INSP_HEADER / 2;
            const candidates = [
              { x: icx,            y: pos.y },
              { x: icx,            y: pos.y + INSP_HEADER },
              { x: pos.x,          y: icy },
              { x: pos.x + INSP_W, y: icy },
            ];
            const anchor = candidates.reduce((best, a) =>
              Math.hypot(a.x - bCx, a.y - bCy) <
              Math.hypot(best.x - bCx, best.y - bCy) ? a : best
            );

            ctx.save();

            // 虛線段
            ctx.setLineDash([5, 4]);
            ctx.strokeStyle = "rgba(99, 102, 241, 0.65)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(anchor.x, anchor.y);
            ctx.lineTo(bCx, bCy);
            ctx.stroke();

            // Block 中心圓點
            ctx.setLineDash([]);
            ctx.fillStyle = "rgba(99, 102, 241, 0.8)";
            ctx.beginPath();
            ctx.arc(bCx, bCy, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          }
        }

        const mm = minimapRef.current;
        if (mm) {
          const mmCtx = mm.getContext("2d");
          if (mmCtx) drawMinimap(mmCtx, blocks, viewRef.current, mm, sizeRef.current);
        }
      },
      [arrows, inspectedBlockIds, matchedBlockIds]
    );

    // ── 初始化 Canvas（只在 blocks 變更時重設畫布尺寸） ──
    useEffect(() => {
      const canvas  = canvasRef.current;
      const wrapper = canvasStageRef.current;
      if (!canvas || !wrapper) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctxRef.current = ctx;

      const rect = wrapper.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = window.devicePixelRatio || 1;
      dprRef.current  = dpr;
      sizeRef.current = { w: rect.width, h: rect.height };

      canvas.width        = rect.width  * dpr;
      canvas.height       = rect.height * dpr;
      canvas.style.width  = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blocks]);

    // ── Canvas 尺寸追蹤（ResizeObserver，容器縮放也能即時反應） ──
    useEffect(() => {
      const wrapper = canvasStageRef.current;
      if (!wrapper) return;

      const ro = new ResizeObserver(() => {
        const canvas = canvasRef.current;
        const ctx    = ctxRef.current;
        if (!canvas || !ctx) return;

        const rect = wrapper.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const dpr = window.devicePixelRatio || 1;
        sizeRef.current = { w: rect.width, h: rect.height };
        dprRef.current  = dpr;

        canvas.width        = rect.width  * dpr;
        canvas.height       = rect.height * dpr;
        canvas.style.width  = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        redraw(ctx, blocks);
      });

      ro.observe(wrapper);
      return () => ro.disconnect();
    }, [blocks, redraw]);

    // ── 主 Canvas 滑鼠事件 ────────────────────────────────
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      function screenToWorld(mx: number, my: number) {
        const view = viewRef.current;
        return {
          x: (mx - view.translateX) / view.scale,
          y: (my - view.translateY) / view.scale,
        };
      }

      function onMouseDown(e: MouseEvent) {
        if (inspectorDraggingRef.current) return;
        if (e.button !== 0) return;

        const rect = canvas!.getBoundingClientRect();
        const mx   = e.clientX - rect.left;
        const my   = e.clientY - rect.top;
        const { x: wx, y: wy } = screenToWorld(mx, my);
        const hitBlock = hitTestBlock(wx, wy, blocks);

        dragRef.current.lastX = e.clientX;
        dragRef.current.lastY = e.clientY;

        if (hitBlock) {
          activeBlockRef.current = hitBlock; // 拖 Block
        } else {
          dragRef.current.dragging = true;   // 拖 Canvas
          canvas!.style.cursor = "grabbing";
        }
      }

      function onDoubleClick(e: MouseEvent) {
        const wrapper = wrapperRef.current;
        if (!wrapper || !canvas) return;

        const wrapperRect = wrapper.getBoundingClientRect();
        const canvasRect  = canvas.getBoundingClientRect();

        // Inspector 位置：相對 wrapper
        const mx = e.clientX - canvasRect.left + (canvasRect.left - wrapperRect.left);
        const my = e.clientY - canvasRect.top  + (canvasRect.top  - wrapperRect.top);

        // hit-test 用 canvas 座標
        const cx = e.clientX - canvasRect.left;
        const cy = e.clientY - canvasRect.top;
        const { x: wx, y: wy } = screenToWorld(cx, cy);
        const hitBlock = hitTestBlock(wx, wy, blocks);

        if (!hitBlock) return;

        setInspectors((prev) => {
          if (prev.some((i) => i.block.id === hitBlock.id)) return prev;
          return [...prev, { block: hitBlock, x: mx, y: my }];
        });
      }

      function onMouseMove(e: MouseEvent) {
        if (inspectorDraggingRef.current) return;

        const ctx = ctxRef.current;
        if (!ctx) return;

        const rect = canvas!.getBoundingClientRect();
        const mx   = e.clientX - rect.left;
        const my   = e.clientY - rect.top;
        const dx   = e.clientX - dragRef.current.lastX;
        const dy   = e.clientY - dragRef.current.lastY;

        if (activeBlockRef.current) {
          // 拖曳 Block
          const b     = activeBlockRef.current;
          const scale = viewRef.current.scale;
          b.x += dx / scale;
          b.y += dy / scale;
          setHoveredBlock(null);
          setMousePos(null);
        } else if (dragRef.current.dragging) {
          // 拖曳 Canvas
          viewRef.current.translateX += dx;
          viewRef.current.translateY += dy;
          setHoveredBlock(null);
          setMousePos(null);
        } else {
          // Hover
          const { x: wx, y: wy } = screenToWorld(mx, my);
          setHoveredBlock(hitTestBlock(wx, wy, blocks));
          setMousePos({ x: mx, y: my });
        }

        dragRef.current.lastX = e.clientX;
        dragRef.current.lastY = e.clientY;
        redraw(ctx, blocks);
      }

      function onMouseUp() {
        if (activeBlockRef.current) {
          const b = activeBlockRef.current;
          b.x = snap(b.x, GRID_SIZE);
          b.y = snap(b.y, GRID_SIZE);
        }
        activeBlockRef.current   = null;
        dragRef.current.dragging = false;
        canvas!.style.cursor = "default";
      }

      function onWheel(e: WheelEvent) {
        if (!e.ctrlKey) return;
        e.preventDefault();

        const ctx    = ctxRef.current;
        if (!ctx || !canvas) return;

        const view = viewRef.current;
        const rect = canvas.getBoundingClientRect();
        const mx   = e.clientX - rect.left;
        const my   = e.clientY - rect.top;

        const wx = (mx - view.translateX) / view.scale;
        const wy = (my - view.translateY) / view.scale;

        const newScale = Math.max(0.05, Math.min(5,
          view.scale * Math.exp(-e.deltaY * 0.0015)
        ));

        view.scale      = newScale;
        view.translateX = mx - wx * newScale;
        view.translateY = my - wy * newScale;

        redraw(ctx, blocks);
      }

      function onWindowBlur() {
        dragRef.current.dragging = false;
        activeBlockRef.current   = null;
        canvas!.style.cursor     = "default";
      }

      canvas.style.cursor     = "default";
      canvas.style.touchAction = "none";

      canvas.addEventListener("dblclick",  onDoubleClick);
      canvas.addEventListener("mousedown", onMouseDown);
      canvas.addEventListener("mousemove", onMouseMove);
      canvas.addEventListener("wheel",     onWheel, { passive: false });
      window.addEventListener("mouseup",   onMouseUp);
      window.addEventListener("blur",      onWindowBlur);

      return () => {
        canvas.removeEventListener("dblclick",  onDoubleClick);
        canvas.removeEventListener("mousedown", onMouseDown);
        canvas.removeEventListener("mousemove", onMouseMove);
        canvas.removeEventListener("wheel",     onWheel);
        window.removeEventListener("mouseup",   onMouseUp);
        window.removeEventListener("blur",      onWindowBlur);
      };
    }, [blocks, redraw]);

    // ── Minimap 點擊跳轉 ──────────────────────────────────
    useEffect(() => {
      const canvas = minimapRef.current;
      if (!canvas) return;

      function onMouseDown(e: MouseEvent) {
        if (inspectorDraggingRef.current) return;

        const rect   = canvas!.getBoundingClientRect();
        const mx     = e.clientX - rect.left;
        const my     = e.clientY - rect.top;
        const bounds = getWorldBounds(blocks);

        const FIT_RATIO = 0.9;
        const worldW  = bounds.maxX - bounds.minX;
        const worldH  = bounds.maxY - bounds.minY;
        const mmScale = Math.min(canvas!.width / worldW, canvas!.height / worldH) * FIT_RATIO;
        const ox = (canvas!.width  - worldW * mmScale) / 2 - bounds.minX * mmScale;
        const oy = (canvas!.height - worldH * mmScale) / 2 - bounds.minY * mmScale;

        const wx = (mx - ox) / mmScale;
        const wy = (my - oy) / mmScale;

        const view      = viewRef.current;
        view.translateX = sizeRef.current.w / 2 - wx * view.scale;
        view.translateY = sizeRef.current.h / 2 - wy * view.scale;

        redraw(ctxRef.current!, blocks);
      }

      canvas.addEventListener("mousedown", onMouseDown);
      return () => canvas.removeEventListener("mousedown", onMouseDown);
    }, [blocks, redraw]);

    // ── Rules 換了 → 清空 Inspectors ─────────────────────
    useEffect(() => {
      setInspectors([]);
    }, [rules]);

    // ── 重新 Render（matchedIds / inspectedIds 改變時） ──
    useEffect(() => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      redraw(ctx, blocks);
    }, [blocks, redraw]);

    // ── 聚焦 Block ────────────────────────────────────────
    const focusBlock = useCallback(
      (b: Block) => {
        const ctx = ctxRef.current;
        if (!ctx) return;

        const view    = viewRef.current;
        const { w, h } = sizeRef.current;

        view.translateX = w / 2 - (b.x + b.w / 2) * view.scale;
        view.translateY = h / 2 - (b.y + b.h / 2) * view.scale;

        redraw(ctx, blocks);
      },
      [blocks, redraw]
    );

    const focusBlockById = useCallback(
      (id: string) => {
        const b = blocks.find((x) => x.id === id);
        if (b) focusBlock(b);
      },
      [blocks, focusBlock]
    );

    useImperativeHandle(ref, () => ({ focusBlockById }), [focusBlockById]);

    // ── Inspector 位置更新（拖曳時同步並觸發重繪） ────────
    const updateInspectorPosition = useCallback(
      (blockId: string, x: number, y: number) => {
        inspectorPositionsRef.current.set(blockId, { x, y });
        const ctx = ctxRef.current;
        if (ctx) redraw(ctx, blocks);
      },
      [blocks, redraw]
    );

    // ── Render ────────────────────────────────────────────
    return (
      <div ref={wrapperRef} className="relative w-full h-full">
        <div ref={canvasStageRef} className="relative w-full h-full">
          <canvas ref={canvasRef} className="block w-full h-full" />

          {/* Tooltip（穿透滑鼠事件） */}
          <div className="absolute inset-0 pointer-events-none">
            <BlockTooltip
              block={hoveredBlock}
              mousePos={mousePos}
              canvasSize={sizeRef.current}
            />
          </div>

          {/* Inspectors */}
          {inspectors.map(({ block, x, y }) => (
            <BlockInspector
              key={block.id}
              block={block}
              initialX={x}
              initialY={y}
              wrapperRef={canvasStageRef}
              inspectorDraggingRef={inspectorDraggingRef}
              onPositionChange={(nx, ny) => updateInspectorPosition(block.id, nx, ny)}
              onClose={() =>
                setInspectors((prev) =>
                  prev.filter((i) => i.block.id !== block.id)
                )
              }
            />
          ))}
        </div>

        {/* Minimap */}
        <div className="absolute left-5 bottom-5 border border-[#9ca3af] bg-white">
          <canvas ref={minimapRef} width={160} height={120} />
        </div>
      </div>
    );
  }
);
