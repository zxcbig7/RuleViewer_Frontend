import React, { useEffect, useRef } from "react";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const CanvasTest: React.FC = () => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // =============================
    // State
    // =============================

    let width = 0;
    let height = 0;
    let dpr = 1;

    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartOffsetX = 0;
    let dragStartOffsetY = 0;

    let frameRequested = false;

    // =============================
    // Render Engine
    // =============================

    const requestRender = () => {
      if (frameRequested) return;
      frameRequested = true;
      requestAnimationFrame(render);
    };

    const render = () => {
      frameRequested = false;

      if (width === 0 || height === 0) return;

      // 清畫布（物理像素）
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 設定 DPR × View transform
      ctx.setTransform(
        dpr * scale,
        0,
        0,
        dpr * scale,
        dpr * offsetX,
        dpr * offsetY
      );

      drawGrid();
      drawScene();
      drawOrigin();
    };

    const drawGrid = () => {
      const base = 25;
      const gridSize = scale < 0.6 ? base * 2 : base; // 縮小時變粗格

      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = "#e9e9e9";
      ctx.lineWidth = 1 / scale;

      const left = (-offsetX) / scale;
      const top = (-offsetY) / scale;
      const right = (width - offsetX) / scale;
      const bottom = (height - offsetY) / scale;

      const startX = Math.floor(left / gridSize) * gridSize;
      const startY = Math.floor(top / gridSize) * gridSize;

      for (let x = startX; x <= right; x += gridSize) {
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
      }

      for (let y = startY; y <= bottom; y += gridSize) {
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
      }

      ctx.stroke();
      ctx.restore();
    };

    const drawScene = () => {
      ctx.fillStyle = "red";
      ctx.fillRect(50, 50, 50, 50);
    };

    const drawOrigin = () => {
      // world 原點在 screen 的座標（CSS px）
      const { x: sx, y: sy } = worldToScreen(0, 0);

      // 先畫 world 的十字（用目前 transform）
      ctx.save();
      const size = 20;
      ctx.lineWidth = 2 / scale;
      ctx.strokeStyle = "#ff0000";

      ctx.beginPath();
      ctx.moveTo(-size, 0);
      ctx.lineTo(size, 0);
      ctx.moveTo(0, -size);
      ctx.lineTo(0, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = "#ff0000";
      ctx.arc(0, 0, 4 / scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 再畫 screen 的文字（固定字體大小）
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // screen space
      ctx.fillStyle = "#ff0000";
      ctx.font = "12px sans-serif";
      ctx.fillText("(0,0)", sx + 8, sy - 8);
      ctx.restore();
    };

    // =============================
    // Coordinate Transform
    // =============================
    const screenToWorld = (sx: number, sy: number) => ({
      x: (sx - offsetX) / scale,
      y: (sy - offsetY) / scale,
    });

    const worldToScreen = (wx: number, wy: number) => ({
      x: wx * scale + offsetX,
      y: wy * scale + offsetY,
    });

    // =============================
    // Resize
    // =============================
    const resize = () => {
      const rect = wrapper.getBoundingClientRect();

      width = Math.floor(rect.width);
      height = Math.floor(rect.height);
      dpr = window.devicePixelRatio || 1;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      requestRender();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(wrapper);

    // =============================
    // Zoom (Ctrl + Wheel)
    // =============================

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomIntensity = 0.0015;
      const zoomFactor = Math.exp(-e.deltaY * zoomIntensity);

      const prevScale = scale;
      const nextScale = clamp(prevScale * zoomFactor, 0.2, 5);

      const worldX = (mouseX - offsetX) / prevScale;
      const worldY = (mouseY - offsetY) / prevScale;

      scale = nextScale;
      offsetX = mouseX - worldX * nextScale;
      offsetY = mouseY - worldY * nextScale;

      requestRender();
    };


    canvas.addEventListener("wheel", onWheel, { passive: false });

    // =============================
    // Drag (Pan)
    // =============================

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;

      isDragging = true;
      canvas.style.cursor = "grabbing";

      canvas.setPointerCapture(e.pointerId);

      const rect = canvas.getBoundingClientRect();
      dragStartX = e.clientX - rect.left;
      dragStartY = e.clientY - rect.top;

      dragStartOffsetX = offsetX;
      dragStartOffsetY = offsetY;

      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      offsetX = dragStartOffsetX + (x - dragStartX);
      offsetY = dragStartOffsetY + (y - dragStartY);

      requestRender();
    };

    const endDrag = (e: PointerEvent) => {
      if (!isDragging) return;

      isDragging = false;
      canvas.style.cursor = "default";

      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch { }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

    const onWindowBlur = () => {
      isDragging = false;
      canvas.style.cursor = "default";
    };

    window.addEventListener("blur", onWindowBlur);

    canvas.style.cursor = "default";
    canvas.style.touchAction = "none";

    resize();

    return () => {
      ro.disconnect();
      canvas.removeEventListener("wheel", onWheel as EventListener);
      canvas.removeEventListener("pointerdown", onPointerDown as EventListener);
      canvas.removeEventListener("pointermove", onPointerMove as EventListener);
      canvas.removeEventListener("pointerup", endDrag as EventListener);
      canvas.removeEventListener("pointercancel", endDrag as EventListener);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, []);

  return (
    <div ref={wrapperRef} style={{ width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
};

export default CanvasTest;
