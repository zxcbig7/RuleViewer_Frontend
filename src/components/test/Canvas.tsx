import React, { useRef, useState } from "react";
import type { Rule } from "../../hooks/useRuleViewerData";

const GRID_SIZE = 20;

type CanvasProps = {
  rules: Rule[];
  settings: {
    grid: boolean;
    snap: boolean;
    showLabels: boolean;
  };
  onMoveBlock: (ruleName: string, x: number, y: number) => void;
};


function Canvas({ rules, settings, onMoveBlock }: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{
    ruleName: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const onMouseDown = (
    e: React.MouseEvent,
    ruleName: string,
    x: number,
    y: number
  ) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    setDragging({
      ruleName,
      offsetX: e.clientX - rect.left - x,
      offsetY: e.clientY - rect.top - y,
    });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    let x = e.clientX - rect.left - dragging.offsetX;
    let y = e.clientY - rect.top - dragging.offsetY;

    if (settings.snap) {
      x = Math.round(x / GRID_SIZE) * GRID_SIZE;
      y = Math.round(y / GRID_SIZE) * GRID_SIZE;
    }

    onMoveBlock(dragging.ruleName, x, y);
  };

  const onMouseUp = () => setDragging(null);

  return (
    <div
      ref={canvasRef}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{
        position: "relative",
        height: 400,
        border: "1px dashed #cbd5e1",
        backgroundSize: settings.grid ? "20px 20px" : undefined,
        backgroundImage: settings.grid
          ? "linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)"
          : undefined,
      }}
    >
      {rules.map((r) => (
        <div
          key={r.Rule_Name}
          onMouseDown={(e) =>
            onMouseDown(e, r.Rule_Name, r.POSX, r.POSY)
          }
          style={{
            position: "absolute",
            left: r.POSX,
            top: r.POSY,
            width: 140,
            padding: 8,
            cursor: "move",
            borderRadius: 8,
            background: "#ffffff",
            border: "1px solid #94a3b8",
            boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
            userSelect: "none",
          }}
        >
          <strong>{r.Block_Name}</strong>
          {settings.showLabels && (
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {r.Block_Type}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


export default Canvas;