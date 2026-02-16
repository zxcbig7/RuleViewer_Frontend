import React, { useEffect, useRef } from "react";

const CanvasTest: React.FC = () => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = (w: number, h: number) => {
      // 重要：這裡的 w/h 是 CSS 尺寸（邏輯座標）
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = "red";
      ctx.fillRect(50, 50, 200, 100);
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = wrapper.getBoundingClientRect();

      // 避免 0 尺寸造成問題
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));

      // 設定實際像素大小
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);

      // 設定 CSS 顯示大小
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // 重置 transform，避免縮放疊加
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      draw(width, height);
    };

    // 監聽 wrapper 尺寸變化（包含 Sider 收合導致的內容區變寬）
    const ro = new ResizeObserver(() => resize());
    ro.observe(wrapper);

    // 初始化
    resize();

    return () => {
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
};

export default CanvasTest;
