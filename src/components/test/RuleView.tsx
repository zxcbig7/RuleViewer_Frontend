import { useRef, useMemo, useEffect, useState } from "react";
import type { RuleDTO } from "../components/Rule";
import styles from "../css/RuleView.module.css";

import { MdOutlineStart } from "react-icons/md";
import { FiStopCircle } from "react-icons/fi";
import { GiProcessor, GiChoice } from "react-icons/gi";


/* ===============================
   基本設定
================================ */
const BLOCK_SIZE = 50;

/* ===============================
   型別定義
================================ */
type BlockType = "START" | "PROCESS" | "DECISION" | "END";

type Block = {
  id: string;                  // block_Name
  x: number;
  y: number;
  w: number;
  h: number;
  type: BlockType;
  label: string;
  raw: RuleDTO;
};

// 對應  BlockType的Icon
const blockIconMap: Record<BlockType, React.ReactNode> = {
  START: <MdOutlineStart size={25} />,
  PROCESS: <GiProcessor size={25} />,
  DECISION: <GiChoice size={25} />,
  END: <FiStopCircle size={25} />,
};

type Arrow = {
  from: string;
  to: string;
};

/* ===============================
   資料轉換
================================ */
function buildBlocks(rules: RuleDTO[]): Block[] {
  return rules.map((r) => ({
    id: r.block_Name,
    x: r.posx,
    y: r.posy,
    w: BLOCK_SIZE,
    h: BLOCK_SIZE,
    type: r.block_Type,
    label: r.block_Name,
    raw: r,
  }));
}

function buildArrows(rules: RuleDTO[]): Arrow[] {
  return rules
    .filter((r) => r.pre_Block)
    .map((r) => ({
      from: r.pre_Block as string,
      to: r.block_Name,
    }));
}

/* ===============================
   Draggable Block
================================ */
type DraggableBlockProps = {
  block: Block;
  onMove: (id: string, x: number, y: number) => void;
};



function DraggableBlock({ block, onMove }: DraggableBlockProps) {
  const dragOffset = useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      className={styles.blockWrapper}
      style={{
        left: block.x,
        top: block.y,
        width: block.w,
      }}
    >
      {/* 方塊本體（只放 icon） */}
      <div
        className={styles.block}
        style={{
          width: block.w,
          height: block.h,
        }}
        onMouseDown={(e) => {
          dragOffset.current = {
            x: e.clientX - block.x,
            y: e.clientY - block.y,
          };

          const onMouseMove = (ev: MouseEvent) => {
            if (!dragOffset.current) return;
            onMove(
              block.id,
              ev.clientX - dragOffset.current.x,
              ev.clientY - dragOffset.current.y
            );
          };

          const onMouseUp = () => {
            dragOffset.current = null;
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
          };

          window.addEventListener("mousemove", onMouseMove);
          window.addEventListener("mouseup", onMouseUp);
        }}
      >
        <div className={styles.blockIcon}>
          {blockIconMap[block.type]}
        </div>
      </div>

      {/* 文字在方塊下方 */}
      <div className={styles.blockLabel}>
        {block.label}
      </div>
    </div>
  );
}

/* ===============================
   Arrow Drawing
================================ */
function drawAllArrows(
  canvas: HTMLCanvasElement | null,
  blocks: Block[],
  arrows: Arrow[]
) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  arrows.forEach((a) => {
    const from = blocks.find((b) => b.id === a.from);
    const to = blocks.find((b) => b.id === a.to);
    if (!from || !to) return;

    drawArrow(
      ctx,
      from.x + from.w / 2,
      from.y + from.h / 2,
      to.x + to.w / 2,
      to.y + to.h / 2
    );
  });
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  const headlen = 10;
  const angle = Math.atan2(y2 - y1, x2 - x1);

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headlen * Math.cos(angle - Math.PI / 6),
    y2 - headlen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - headlen * Math.cos(angle + Math.PI / 6),
    y2 - headlen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fillStyle = "#333";
  ctx.fill();
}

/* ===============================
   主元件 RuleView
================================ */

export default function RuleView({
  rules,
  showGrid,
  snapToGrid,
  showLabels,
}: {
  rules: RuleDTO[];
  showGrid: boolean;
  snapToGrid: boolean;
  showLabels: boolean;
}) {

  const canvasRef = useRef<HTMLCanvasElement>(null);        // canvas 本體
  const [viewport, setViewport] = useState({ x: 0, y: 0 }); // 左上角現在看到整個畫面的哪個位置



  const arrows = useMemo(() => buildArrows(rules), [rules]); // 動態調整連線線條
  const [blocks, setBlocks] = useState<Block[]>(() => buildBlocks(rules)); // 方塊資訊以用於拖曳

  // 讓 Canvas 可被拖曳（Pan）
  const isPanning = useRef(false);
  const panStart = useRef<{ x: number; y: number } | null>(null);

  // 當 API rules 改變時重建 blocks
  useEffect(() => {
    setBlocks(buildBlocks(rules));
  }, [rules]);


  // 掛全域滑鼠事件：Pan 拖曳
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isPanning.current || !panStart.current) return;

      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;

      setViewport((v) => ({
        x: v.x - dx,
        y: v.y - dy,
      }));

      panStart.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isPanning.current = false;
      panStart.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // block 位置改變就重畫箭頭
  useEffect(() => {
    drawAllArrows(canvasRef.current, blocks, arrows);
  }, [blocks, arrows]);

  function updateBlockPosition(id: string, x: number, y: number) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, x, y } : b
      )
    );
  }

  return (
    <div
      className={styles.wrapper}
    >
      <canvas
        ref={canvasRef}
        width={2000}
        height={1200}
        className={styles.canvas}

        // Canvas 上監聽滑鼠事件
        onMouseDown={(e) => {
          isPanning.current = true;
          panStart.current = { x: e.clientX, y: e.clientY };
        }}
      />

      {blocks.map((b) => (
        <DraggableBlock
          key={b.id}
          block={b}
          onMove={updateBlockPosition}
        />
      ))}
    </div>
  );
}
