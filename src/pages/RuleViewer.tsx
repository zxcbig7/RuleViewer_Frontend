import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import style from '../css/RuleViewer/RuleViewer.module.css'
import { Input } from 'antd';

// #region Data Process
async function loadRules(): Promise<string[]> {
  const res = await fetch("https://localhost:7215/api/RuleViewer/names");

  if (!res.ok) {
    throw new Error(`loadRules failed: ${res.status}`);
  }

  const data = (await res.json()) as string[];
  return data;
}

async function loadRule(ruleName: string): Promise<RuleDTO[]> {

  // encodeURIComponent 防止 ruleName 有空白、斜線、特殊字元直接炸掉
  const res = await fetch(`https://localhost:7215/api/RuleViewer/${encodeURIComponent(ruleName)}`);

  if (!res.ok) {
    throw new Error(`loadRules failed: ${res.status}`);
  }

  const data = (await res.json()) as RuleDTO[];

  console.log(JSON.stringify(data, null,2));
  return data;
}

type RuleDTO = {
  PHASE: string;
  RULE_NAME: string;
  BLOCK_NAME: string;
  BLOCK_TYPE: string;
  BLOCK_GROUP: string;
  BLOCK_SEQ: string;
  KEY: string | null;
  POSX: number;
  POSY: number;
  PRE_BLOCK: string | null;
  COLUMN1: string | null;
  COLUMN2: string | null;
  VALUE1: string | null;
  VALUE2: string | null;
  VALUE3: string | null;
  VALUE4: string | null;
  VALUE5: string | null;
};

type BlockValue = {
  COLUMN1: string | null;
  COLUMN2: string | null;
  VALUE: string;
};


type RuleData = {
  PHASE: string;
  RULE_NAME: string;
  BLOCK_NAME: string;     // 合併後的 A
  BLOCK_TYPE: string;
  BLOCK_GROUP: string;
  BLOCK_SEQ: string;
  KEY: string | null;
  POSX: number;
  POSY: number;
  PRE_BLOCK: string[] | null;
  VALUES: BlockValue[];   // ← 重點：集中存放
};

// 判斷 Base Block Name（去掉陣列後綴）
// TODO: 未來如果有需要可以改成更通用的方式
function getBaseBlockName(blockName: string): string {
  const match = blockName.match(/^(.+?)\[\d+\]$/);
  return match ? match[1] : blockName;
}

function convertDtosToData(dtos: RuleDTO[]): RuleData[] {
  const blockMap = new Map<string, RuleData>();

  for (const dto of dtos) {
    const baseName = getBaseBlockName(dto.BLOCK_NAME);

    const preBlock =
      dto.PRE_BLOCK && dto.PRE_BLOCK.trim() !== ""
        ? dto.PRE_BLOCK.split(",").map(s => s.trim())
        : null;

    const values = [
      dto.VALUE1,
      dto.VALUE2,
      dto.VALUE3,
      dto.VALUE4,
      dto.VALUE5,
    ].filter((v): v is string => v !== null && v.trim() !== "")
      .join("");

    // 尚未建立該 Block
    if (!blockMap.has(baseName)) {
      blockMap.set(baseName, {
        PHASE: dto.PHASE,
        RULE_NAME: dto.RULE_NAME,
        BLOCK_NAME: baseName,
        BLOCK_TYPE: dto.BLOCK_TYPE,
        BLOCK_GROUP: dto.BLOCK_GROUP,
        BLOCK_SEQ: dto.BLOCK_SEQ,
        KEY: dto.KEY,
        POSX: dto.POSX,
        POSY: dto.POSY,
        PRE_BLOCK: preBlock,
        VALUES: [],
      });
    }

    // 將 VALUE 推入集中陣列
    if (values !== "") {
      blockMap.get(baseName)!.VALUES.push({
        COLUMN1: dto.COLUMN1,
        COLUMN2: dto.COLUMN2,
        VALUE: values,
      });
    }
  }

  return Array.from(blockMap.values());
}


// #endregion

// #region RuleViewer
export default function RuleViewer() {
  const [ruleNames, setRuleNames] = useState<string[]>([]); // 所有 Rule Name
  const [selectedRule, setSelectedRule] = useState<string | null>(null); // 當下被選擇的 Rule
  const [rules, setRules] = useState<RuleData[]>([]); // 被選擇rule的所有資料

  const [matchedBlockIds, setMatchedBlockIds] = useState<Set<string> | null>(null); // 符合搜尋的 Block Ids

  // effect 只在第一次 render 後讀取Rule Name
  useEffect(() => {
    // Promise resolve 的值會當參數傳入 setRuleNames
    loadRules().then(setRuleNames);
  }, []);

  // 當 selectedRule 改變時要讀取 Data 並重新 Render
  useEffect(() => {
    if (!selectedRule) return;

    // 讀取資料後做資料轉換的處理
    loadRule(selectedRule).then((data) => setRules(convertDtosToData(data)))

  }, [selectedRule]);

  return (
    <>
      <div className={style.ruleViewerRoot}>
        <div className={style.toolbar}>
          <RuleDropdownSearch
            options={ruleNames}
            // 把 setSelectedRule 函式 callback 傳到 DropDown 的每一個選項裡面
            onSelect={setSelectedRule}
          />
          <RuleContentSearch
            rules={rules}
            onMatchChange={setMatchedBlockIds}
          />
        </div>
        <div className={style.canvasWrapper}>
          <RuleView rules={rules} matchedBlockIds={matchedBlockIds} />
        </div>
      </div>
    </>
  );
}
// #endregion

// #region RuleView
type RuleViewProps = {
  rules: RuleData[];
  matchedBlockIds: Set<string> | null;
};

type InspectorState = {
  block: Block;
  x: number;
  y: number;
};

function RuleView({ rules, matchedBlockIds }: RuleViewProps) {
  // 控制canvas
  const canvasStageRef = useRef<HTMLDivElement | null>(null); // 外框
  const canvasRef = useRef<HTMLCanvasElement | null>(null); // Canvas
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null); // Canvas 設定
  const wrapperRef = useRef<HTMLDivElement | null>(null); //wrapper
  const minimapRef = useRef<HTMLCanvasElement | null>(null); // 小地圖
  const dprRef = useRef(1); // 電腦的 Pixel Ratio (縮放用)
  const sizeRef = useRef({ w: 0, h: 0 }); // CSS Pixel Size
  const inspectorDraggingRef = useRef(false); // Dragging inspector

  const blocks = useMemo(() => buildBlocks(rules), [rules]); // Block 資訊（用 ref 保存可變狀態） 
  const arrows = useMemo(() => buildArrows(rules), [rules]); // 箭頭資訊

  // 點 Block 跳資訊
  const [inspectors, setInspectors] = useState<InspectorState[]>([]); // 多個
  const [hoveredBlock, setHoveredBlock] = useState<Block | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const activeBlockRef = useRef<Block | null>(null); // 目前被拖曳的Block

  // 依據「是否被 inspect」決定畫不畫高亮邊框
  const inspectedBlockIds = useMemo(() => {
    return new Set(inspectors.map(i => i.block.id));
  }, [inspectors]);



  // Canvas 視圖狀態（平移 / 縮放）
  const viewRef = useRef({
    translateX: 0,
    translateY: 0,
    scale: 1,
  });

  // 滑鼠拖曳
  const dragRef = useRef({
    dragging: false,
    lastX: 0,
    lastY: 0,
  });

  // 使用 useCallback 固定 redraw 的函式 reference，避免每次 render 產生新函式
  const redraw = useCallback((
    ctx: CanvasRenderingContext2D,
    blocks: Block[]
  ) => {
    const view = viewRef.current; // Camera 狀態（pan / zoom）
    const dpr = dprRef.current;   // 電腦的 Pixel Ratio
    const { w, h } = sizeRef.current; // Canvas 的 CSS 尺寸

    // 先恢復 基準座標系（DPR）（避免模糊與座標錯亂）
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // clearRect 用 CSS 尺寸（因為 transform 已經含 dpr）
    ctx.clearRect(0, 0, w, h);

    // 把整個 Canvas 的座標系「平移」，實際位置都要加上 (dx, dy)。
    ctx.translate(view.translateX, view.translateY);
    ctx.scale(view.scale, view.scale);

    // 畫 grid
    drawGrid(ctx, view, sizeRef.current);

    // 畫 Arrows
    drawArrows(ctx, blocks, arrows, view.scale);

    // 畫 blocks
    drawBlocks(ctx, blocks, inspectedBlockIds, matchedBlockIds);

    // minimap
    const mm = minimapRef.current;
    if (mm) {
      const mmCtx = mm.getContext("2d");
      if (mmCtx) {
        drawMinimap(mmCtx, blocks, viewRef.current, mm, sizeRef.current);
      }
    }

  }, [arrows, inspectedBlockIds]);


  // initCanvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = canvasStageRef.current;
    if (!canvas || !wrapper) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctxRef.current = ctx;

    const rect = wrapper.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;

    sizeRef.current = { w: rect.width, h: rect.height };

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    redraw(ctx, blocks);
  }, [redraw, blocks]);

  // 視窗大小修改
  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      const wrapper = canvasStageRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !wrapper || !ctx) return;

      const rect = wrapper.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      sizeRef.current = { w: rect.width, h: rect.height };
      dprRef.current = dpr;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw(ctx, blocks);
    }

    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [blocks, redraw]);


  // attachMouseEvents
  useEffect(() => {
    const canvas = canvasRef.current; // 檢查 canvas
    if (!canvas) return;

    function screenToWorld(mx: number, my: number) {
      const view = viewRef.current;
      return {
        x: (mx - view.translateX) / view.scale,
        y: (my - view.translateY) / view.scale,
      };
    }

    function onMouseDown(e: MouseEvent) {
      if (inspectorDraggingRef.current) return; // 修正 inspector 拖曳順移問題
      if (e.button !== 0) return;

      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const { x: wx, y: wy } = screenToWorld(mx, my);
      const hitBlock = hitTestBlock(wx, wy, blocks);

      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;

      if (hitBlock) {
        // 單擊拖 block
        activeBlockRef.current = hitBlock;
      } else {
        // 空白拖 canvas
        dragRef.current.dragging = true;
      }


    }

    function onDoubleClick(e: MouseEvent) {

      const wrapper = wrapperRef.current;
      const canvas = canvasRef.current!;
      if (!wrapper || !canvas) return;

      const wrapperRect = wrapper.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();

      const mx = e.clientX - canvasRect.left + (canvasRect.left - wrapperRect.left);
      const my = e.clientY - canvasRect.top + (canvasRect.top - wrapperRect.top);

      // 命中判斷仍然用 canvas 座標
      const cx = e.clientX - canvasRect.left;
      const cy = e.clientY - canvasRect.top;

      const { x: wx, y: wy } = screenToWorld(cx, cy);

      const hitBlock = hitTestBlock(wx, wy, blocks);

      if (!hitBlock) return;

      setInspectors(prev => {

        // 如果先前已經生成就不重覆生成
        if (prev.some(i => i.block.id === hitBlock.id)) return prev;

        // 如果沒有就生成
        return [...prev, { block: hitBlock, x: mx, y: my, },];
      });

    }

    function onMouseMove(e: MouseEvent) {

      if (inspectorDraggingRef.current) return;

      const ctx = ctxRef.current;
      if (!ctx) return;

      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();

      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const dx = e.clientX - dragRef.current.lastX;
      const dy = e.clientY - dragRef.current.lastY;

      // ===== 拖曳優先處理 =====
      if (activeBlockRef.current) {
        const b = activeBlockRef.current;
        const scale = viewRef.current.scale;

        b.x += dx / scale;
        b.y += dy / scale;
        setHoveredBlock(null);
        setMousePos(null);
      }
      else if (dragRef.current.dragging) {
        viewRef.current.translateX += dx;
        viewRef.current.translateY += dy;

        setHoveredBlock(null);
        setMousePos(null);
      }
      else {
        // =====  只有在「沒拖曳」時才做 hover =====
        const { x: wx, y: wy } = screenToWorld(mx, my);
        const hit = hitTestBlock(wx, wy, blocks);

        setHoveredBlock(hit);
        setMousePos({ x: mx, y: my });
      }

      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;

      redraw(ctx, blocks);

    }

    // 滑鼠放開設定
    function onMouseUp() {
      if (activeBlockRef.current) {
        const b = activeBlockRef.current;
        b.x = snap(b.x, GRID_SIZE);
        b.y = snap(b.y, GRID_SIZE);
      }

      activeBlockRef.current = null;
      dragRef.current.dragging = false;
    }

    // Ctrl + 滑鼠滾輪縮放
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey) return; // 只吃 Ctrl + 滾輪
      e.preventDefault(); // 禁止瀏覽器縮放

      const ctx = ctxRef.current;
      const canvas = canvasRef.current;
      if (!ctx || !canvas) return;

      const view = viewRef.current;

      // 滑鼠在 canvas 內的螢幕座標
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // 反推縮放前的世界座標 (wx, wy)
      // 縮放前的 world 座標
      const wx = (mx - view.translateX) / view.scale;
      const wy = (my - view.translateY) / view.scale;

      // 縮放倍率
      const zoomFactor = e.deltaY < 0 ? 1.075 : 0.975;
      const newScale = view.scale * zoomFactor;

      // 建議限制縮放範圍
      if (newScale < 0.01 || newScale > 4) return;

      view.scale = newScale;

      // 修正平移，讓滑鼠位置不動
      view.translateX = mx - wx * newScale;
      view.translateY = my - wy * newScale;

      redraw(ctx, blocks);
    }

    // addEventListener
    canvas.addEventListener("dblclick", onDoubleClick);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp); // 在 canvas 裡按下滑鼠，但在 canvas 外(windows)放開。
    canvas.addEventListener("wheel", onWheel, { passive: false }); // Ctrl + 滾輪縮放

    // removeEventListener
    return () => {
      canvas.removeEventListener("dblclick", onDoubleClick);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [blocks, redraw]);

  useEffect(() => {
    const canvas = minimapRef.current!;
    if (!canvas) return;

    function onMouseDown(e: MouseEvent) {
      if (inspectorDraggingRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const bounds = getWorldBounds(blocks);
      const scale = Math.min(
        canvas.width / (bounds.maxX - bounds.minX),
        canvas.height / (bounds.maxY - bounds.minY)
      );

      const wx = (mx - (-bounds.minX * scale)) / scale + bounds.minX;
      const wy = (my - (-bounds.minY * scale)) / scale + bounds.minY;

      const view = viewRef.current;

      view.translateX = sizeRef.current.w / 2 - wx * view.scale;
      view.translateY = sizeRef.current.h / 2 - wy * view.scale;

      redraw(ctxRef.current!, blocks);
    }

    canvas.addEventListener("mousedown", onMouseDown);
    return () => canvas.removeEventListener("mousedown", onMouseDown);
  }, [blocks, redraw]);

  // rules 換了 → 關掉所有 Inspector
  useEffect(() => {
    setInspectors([]);
  }, [rules]);

  // redrawCanvas
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    redraw(ctx, blocks);
  }, [blocks, redraw]);

  return (
    <>
      <div ref={wrapperRef} className={style.canvasWrapper}>
        <div ref={canvasStageRef} className={style.canvasStage}>
          <canvas ref={canvasRef} />

          {/* Tooltip：穿透 */}
          <div className={style.overlay}>
            <BlockTooltip
              block={hoveredBlock}
              mousePos={mousePos}
              canvasSize={sizeRef.current}
            />
          </div>

          {/* Inspector：可互動 */}
          {inspectors.map(({ block, x, y }) => (
            <BlockInspector
              key={block.id}
              block={block}
              initialX={x}
              initialY={y}
              wrapperRef={canvasStageRef}
              inspectorDraggingRef={inspectorDraggingRef}

              onClose={() => {
                setInspectors(prev =>
                  prev.filter(i => i.block.id !== block.id)
                );
              }}
            />
          ))}

        </div>

        <div className={style.minimapWrapper}>
          <canvas ref={minimapRef} width={160} height={120} />
        </div>
      </div>

    </>

  );
}
// #endregion

// #region Block
// BLOCK 相關設定
const block_size = 80;

type BlockType = RuleData["BLOCK_TYPE"];

type Block = {
  id: string;          // block_Name
  x: number;           // posx
  y: number;           // posy
  w: number;
  h: number;
  type: BlockType; // 直接設定四種情況
  label: string;

  raw: RuleData; // 原始資料
};

function buildBlocks(data: RuleData[]): Block[] {
  return data.map((r) => ({
    id: r.BLOCK_NAME,
    x: r.POSX,
    y: r.POSY,
    w: block_size,
    h: block_size,
    type: r.BLOCK_TYPE,
    label: r.BLOCK_NAME,

    raw: r,
  }));
}

// 繪製單一方塊
function drawBlock(
  ctx: CanvasRenderingContext2D,
  b: Block,
  highlighted: boolean,
  isMatched: boolean
) {
  ctx.save();

  if (!isMatched) {
    ctx.filter = "grayscale(1)";
  }

  // 先畫白底
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(b.x, b.y, b.w, b.h);


  const img = getBlockImage(b.type);

  if (img.complete && img.naturalWidth > 0) {
    // 用圖片當方塊
    ctx.drawImage(img, b.x, b.y, b.w, b.h);
  }

  // 邊框 (選取時候高亮)
  if (highlighted) {
    ctx.save();

    ctx.strokeStyle = "#2563eb";          // 高亮藍
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(37,99,235,0.6)";
    ctx.shadowBlur = 8;

    ctx.strokeRect(
      b.x - 2,
      b.y - 2,
      b.w + 4,
      b.h + 4
    );

    ctx.restore();
  } else {
    ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
  }

  // 文字
  ctx.fillStyle = "rgba(0, 0, 0, 0.53)";
  ctx.font = "8px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h + 4);

  ctx.restore();

}

// 繪製所有方塊
function drawBlocks(
  ctx: CanvasRenderingContext2D,
  blocks: Block[],
  inspectedIds: Set<string>,
  matchedIds: Set<string> | null
) {
  blocks.forEach((b) =>
    drawBlock(
      ctx,
      b,
      inspectedIds.has(b.id),
      matchedIds ? matchedIds.has(b.id) : true
    )
  );
}


// hit-test（判斷有沒有點到 Block）

function hitTestBlock(wx: number, wy: number, blocks: Block[]): Block | null {
  let best: Block | null = null;
  let bestDist = Infinity;

  for (const b of blocks) {
    if (
      wx >= b.x &&
      wx <= b.x + b.w &&
      wy >= b.y &&
      wy <= b.y + b.h
    ) {
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const d = (wx - cx) ** 2 + (wy - cy) ** 2;

      if (d < bestDist) {
        bestDist = d;
        best = b;
      }
    }
  }
  return best;
}


// Block Type 對應圖片
// 圖片放在 public 資料夾
const BLOCK_IMAGE_SRC: Record<Block["type"], string> = {
  START: "/RuleViewerBlock/start.png",
  PROCESS: "/RuleViewerBlock/process.png",
  DECISION: "/RuleViewerBlock/decision.png",
  FUNCTION: "/RuleViewerBlock/function.png",
  END: "/RuleViewerBlock/end.png",
};

const BLOCK_IMAGE_CACHE: Partial<Record<Block["type"], HTMLImageElement>> = {};

function getBlockImage(type: Block["type"]): HTMLImageElement {
  let img = BLOCK_IMAGE_CACHE[type];
  if (!img) {
    img = new Image();
    img.src = BLOCK_IMAGE_SRC[type];
    BLOCK_IMAGE_CACHE[type] = img;
  }
  return img;
}

// 取得 Block 中心點
function blockCenter(b: Block) {
  return {
    x: b.x + b.w / 2,
    y: b.y + b.h / 2,
  };
}
// #endregion

// #region Arrow
type Arrow = {
  from: string; // pre_Block (block_Name)
  to: string;   // block_Name
  isPrimary: boolean; //判斷是否為主線
};

function buildArrows(data: RuleData[]): Arrow[] {
  return data.flatMap(r => {
    if (!r.PRE_BLOCK || r.PRE_BLOCK.length === 0) return [];

    const arrows: Arrow[] = [];

    // 主線
    arrows.push({
      from: r.PRE_BLOCK[0],
      to: r.BLOCK_NAME,
      isPrimary: true,
    });

    // 副線（可選）
    if (r.PRE_BLOCK.length >= 2) {
      arrows.push({
        from: r.PRE_BLOCK[1],
        to: r.BLOCK_NAME,
        isPrimary: false,
      });
    }

    return arrows;
  });
}

type ArrowRenderStyle = {
  isPrimary: boolean;
  scale: number;
};

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  style: ArrowRenderStyle
) {
  const { isPrimary, scale } = style;

  // 箭頭頭大小：副線小一點
  const headLen = (isPrimary ? 10 : 8) / scale;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);

  // 線段
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // 箭頭頭（主線：實心；副線：空心）
  const xA = x2 - headLen * Math.cos(angle - Math.PI / 6);
  const yA = y2 - headLen * Math.sin(angle - Math.PI / 6);
  const xB = x2 - headLen * Math.cos(angle + Math.PI / 6);
  const yB = y2 - headLen * Math.sin(angle + Math.PI / 6);

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(xA, yA);
  ctx.lineTo(xB, yB);
  ctx.closePath();

  if (isPrimary) {
    ctx.fill();
  } else {
    // 副線：空心箭頭，避免跟主線視覺混淆
    ctx.stroke();
  }
}

function drawArrows(
  ctx: CanvasRenderingContext2D,
  blocks: Block[],
  arrows: Arrow[],
  scale: number
) {
  const stroke = "#374151";

  arrows.forEach(a => {
    const from = blocks.find(b => b.id === a.from);
    const to = blocks.find(b => b.id === a.to);
    if (!from || !to) return;

    const { fromSide, toSide } = decideConnectionSides(from, to);
    const start = getSideCenter(from, fromSide);
    const end = getSideCenter(to, toSide);

    ctx.save();

    // 共用樣式
    ctx.strokeStyle = stroke;
    ctx.fillStyle = stroke;
    ctx.lineWidth = (a.isPrimary ? 1.8 : 1.2) / scale;

    // 副線：虛線（dash 長度也要跟 scale 反比）
    if (a.isPrimary) {
      ctx.setLineDash([]);
    } else {
      ctx.setLineDash([6 / scale, 4 / scale]);
    }

    drawArrow(ctx, start.x, start.y, end.x, end.y, {
      isPrimary: a.isPrimary,
      scale,
    });

    ctx.restore();
  });
}

// 連線規範
type Side = "left" | "right" | "top" | "bottom";

function getSideCenter(b: Block, side: Side) {
  switch (side) {
    case "left":
      return { x: b.x, y: b.y + b.h / 2 };
    case "right":
      return { x: b.x + b.w, y: b.y + b.h / 2 };
    case "top":
      return { x: b.x + b.w / 2, y: b.y };
    case "bottom":
      return { x: b.x + b.w / 2, y: b.y + b.h };
  }
}

// 依 from / to 相對位置決定連線邊
function decideConnectionSides(
  from: Block,
  to: Block
): { fromSide: Side; toSide: Side } {

  const c1 = blockCenter(from);
  const c2 = blockCenter(to);

  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;

  // 水平優先
  const EPS = 5; // 在 dx / dy 非常接近時，加一個 dead zone
  if (Math.abs(dx) > Math.abs(dy) + EPS) {
    if (dx > 0) {
      return { fromSide: "right", toSide: "left" };
    } else {
      return { fromSide: "left", toSide: "right" };
    }
  }

  // 垂直
  if (dy > 0) {
    return { fromSide: "bottom", toSide: "top" };
  } else {
    return { fromSide: "top", toSide: "bottom" };
  }
}
// #endregion

// #region Canvas
//  Grid 設定
const GRID_SIZE = block_size / 2;

function drawGrid(
  ctx: CanvasRenderingContext2D,
  view: { translateX: number; translateY: number; scale: number },
  size: { w: number; h: number }
) {
  const grid = GRID_SIZE;

  // 反推目前可視的 world 範圍
  const startX = Math.floor((-view.translateX) / view.scale / grid) * grid;
  const endX = Math.ceil((size.w - view.translateX) / view.scale / grid) * grid;

  const startY = Math.floor((-view.translateY) / view.scale / grid) * grid;
  const endY = Math.ceil((size.h - view.translateY) / view.scale / grid) * grid;

  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1 / view.scale; // 縮放後線條仍為 1px

  ctx.beginPath();
  for (let x = startX; x <= endX; x += grid) {
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
  }
  for (let y = startY; y <= endY; y += grid) {
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
  }
  ctx.stroke();
}


// Snap 調整
function snap(value: number, grid: number) {
  return Math.round(value / grid) * grid;
}

// #endregion

// #region Tooltip
type BlockTooltipProps = {
  block: Block | null;
  mousePos: { x: number; y: number } | null;
  canvasSize: { w: number; h: number };
};

function BlockTooltip({ block, mousePos, canvasSize }: BlockTooltipProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!ref.current || !mousePos) return;

    const rect = ref.current.getBoundingClientRect();

    let x = mousePos.x + 12;
    let y = mousePos.y + 12;

    if (x + rect.width > canvasSize.w) {
      x = canvasSize.w - rect.width - 4;
    }
    if (y + rect.height > canvasSize.h) {
      y = canvasSize.h - rect.height - 4;
    }

    if (x < 4) x = 4;
    if (y < 4) y = 4;

    setPos({ x, y });
  }, [mousePos, canvasSize]);

  if (!block) return null;

  const r = block.raw;

  return (
    <div
      ref={ref}
      className={style.tooltip}
      style={{
        position: "absolute",
        left: pos?.x ?? -9999,
        top: pos?.y ?? -9999,
        pointerEvents: "none",
      }}
    >
      <div><b>Block:</b> {r.BLOCK_NAME}</div>
      <div><b>Type:</b> {r.BLOCK_TYPE}</div>
      {r.KEY && <div><b>Key:</b> {r.KEY}</div>}
      <div>
        <b>Conditions:</b> {r.VALUES.length}
      </div>
    </div>
  );
}


// #endregion

// #region Block Inspector
type BlockInspectorProps = {
  block: Block;
  initialX: number;
  initialY: number;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  inspectorDraggingRef: React.MutableRefObject<boolean>;
};



function BlockInspector({
  block,
  initialX,
  initialY,
  wrapperRef,        // ⭐ 這才是正確的座標基準
  onClose,
  inspectorDraggingRef
}: BlockInspectorProps) {

  // 收合/展開
  const [collapsedMap, setCollapsedMap] = useState<Record<number, boolean>>({});

  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    originX: initialX,
    originY: initialY,
  });

  // 視窗調整大小
  const resizeRef = useRef({
    resizing: false,
    startX: 0,
    startY: 0,
    startW: 0,
    startH: 0,
  });


  // 展開收合處理
  function expandAll() {
    setCollapsedMap({});
  }
  function collapseAll() {
    const next: Record<number, boolean> = {};
    block.raw.VALUES.forEach((_, idx) => {
      next[idx] = true;
    });
    setCollapsedMap(next);
  }

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    panel.style.transform =
      `translate(${initialX}px, ${initialY}px)`;
  }, [initialX, initialY]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const panel = panelRef.current;
      const wrapper = wrapperRef.current;
      if (!panel || !wrapper) return;

      /* ===== Resize ===== */
      if (resizeRef.current.resizing) {
        const dx = e.clientX - resizeRef.current.startX;
        const dy = e.clientY - resizeRef.current.startY;

        let newW = resizeRef.current.startW + dx;
        let newH = resizeRef.current.startH + dy;

        // 最小尺寸限制
        newW = Math.max(220, newW);
        newH = Math.max(160, newH);

        // 不超出 canvas
        const wrapperRect = wrapper.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();

        const maxW = wrapperRect.width - panelRect.left + wrapperRect.left;
        const maxH = wrapperRect.height - panelRect.top + wrapperRect.top;

        panel.style.width = Math.min(newW, maxW) + "px";
        panel.style.height = Math.min(newH, maxH) + "px";

        return;
      }

      /* ===== Drag ===== */
      if (!dragRef.current.dragging) return;

      const rect = wrapper.getBoundingClientRect();

      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const dx = mx - dragRef.current.startX;
      const dy = my - dragRef.current.startY;

      let x = dragRef.current.originX + dx;
      let y = dragRef.current.originY + dy;

      // 限制在 canvas 內
      const panelRect = panel.getBoundingClientRect();
      x = Math.max(0, Math.min(x, rect.width - panelRect.width));
      y = Math.max(0, Math.min(y, rect.height - panelRect.height));

      panel.style.transform = `translate(${x}px, ${y}px)`;
    }

    function onMouseUp(e: MouseEvent) {
      const panel = panelRef.current;
      const wrapper = wrapperRef.current;
      if (!panel || !wrapper) return;

      const rect = wrapper.getBoundingClientRect();

      /* ===== Resize 結束 ===== */
      if (resizeRef.current.resizing) {
        resizeRef.current.resizing = false;

        // 同步 drag origin
        dragRef.current.originX =
          panel.getBoundingClientRect().left - rect.left;
        dragRef.current.originY =
          panel.getBoundingClientRect().top - rect.top;

        inspectorDraggingRef.current = false;
      }

      /* ===== Drag 結束 ===== */
      if (dragRef.current.dragging) {
        dragRef.current.dragging = false;

        dragRef.current.originX =
          panel.getBoundingClientRect().left - rect.left;
        dragRef.current.originY =
          panel.getBoundingClientRect().top - rect.top;

        inspectorDraggingRef.current = false;
      }
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  if (!block) return null;

  const r = block.raw;

  return (
    <div ref={panelRef}
      className={style.inspector}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        className={style.header}
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
          <span style={{ marginLeft: 8, color: "#6b7280" }}>
            ({r.BLOCK_TYPE})
          </span>
        </div>
        <button onClick={onClose}>✕</button>
      </div>
      {/* Meta */}
      <div className={style.section}>
        <div className={style.sectionTitle}>Meta</div>
        <div className={style.metaGrid}>
          {/*<MetaItem label="Main:" value={r.PRE_BLOCK?.[0]} />*/}
          {/*<MetaItem label="Sub:" value={r.PRE_BLOCK?.[1]} />*/}
          <MetaItem label="Key:" value={r.KEY} />
        </div>
      </div>


      {/* Main: Column / Value */}
<div className={style.section}>
  <div className={style.sectionHeader}>
    <div className={style.sectionTitle}>Conditions</div>

    <div className={style.sectionActions}>
      <button onClick={expandAll}>全部展開</button>
      <button onClick={collapseAll}>全部收合</button>
    </div>
  </div>

  {r.VALUES.map((v, idx) => {
    const collapsed = collapsedMap[idx] ?? false;

    return (
      <div key={idx} className={style.conditionCard}>
        <div className={style.fieldHeader}>
          <div className={style.fieldLabel}>
            Condition {idx + 1}
          </div>

          <button
            className={style.toggleBtn}
            onClick={() =>
              setCollapsedMap(prev => ({
                ...prev,
                [idx]: !collapsed,
              }))
            }
          >
            {collapsed ? "展開" : "收合"}
          </button>
        </div>

        {!collapsed && (
          <div className={style.conditionBody}>
            {v.COLUMN1 && <div><b>Column1:</b> {v.COLUMN1}</div>}
            {v.COLUMN2 && <div><b>Column2:</b> {v.COLUMN2}</div>}
            <pre className={style.codeBlock}>{v.VALUE}</pre>
          </div>
        )}
      </div>
    );
  })}
</div>

      <div
        className={style.resizeHandle}
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
      />
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className={style.metaItem}>
      <span className={style.metaLabel}>{label}</span>
      <span className={style.metaValue}>{value}</span>
    </div>
  );
}

// #endregion

// #region Minimap

function getWorldBounds(blocks: Block[]) {
  const PADDING = 50; // world 單位

  const xs = blocks.flatMap(b => [b.x, b.x + b.w]);
  const ys = blocks.flatMap(b => [b.y, b.y + b.h]);

  return {
    minX: Math.min(...xs) - PADDING,
    maxX: Math.max(...xs) + PADDING,
    minY: Math.min(...ys) - PADDING,
    maxY: Math.max(...ys) + PADDING,
  };
}

function drawMinimap(
  ctx: CanvasRenderingContext2D,
  blocks: Block[],
  view: { translateX: number; translateY: number; scale: number },
  canvas: HTMLCanvasElement,
  viewportSize: { w: number; h: number }
) {
  if (blocks.length === 0) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bounds = getWorldBounds(blocks);

  const worldW = bounds.maxX - bounds.minX;
  const worldH = bounds.maxY - bounds.minY;

  const FIT_RATIO = 0.9; // 90% 塞滿，留 10% 邊距

  const scale = Math.min(
    canvas.width / worldW,
    canvas.height / worldH
  ) * FIT_RATIO;

  // offset，讓世界貼齊 minimap 左上
  const worldWpx = worldW * scale;
  const worldHpx = worldH * scale;

  const ox = (canvas.width - worldWpx) / 2 - bounds.minX * scale;
  const oy = (canvas.height - worldHpx) / 2 - bounds.minY * scale;

  ctx.fillStyle = "#9ca3af";

  blocks.forEach(b => {
    ctx.fillRect(
      b.x * scale + ox,
      b.y * scale + oy,
      b.w * scale,
      b.h * scale
    );
  });

  const mainW = viewportSize.w;
  const mainH = viewportSize.h;

  const vx = -view.translateX / view.scale;
  const vy = -view.translateY / view.scale;
  const vw = mainW / view.scale;
  const vh = mainH / view.scale;

  ctx.strokeStyle = "rgba(30, 110, 110, 0.8)";
  ctx.lineWidth = 1;

  ctx.strokeRect(
    vx * scale + ox,
    vy * scale + oy,
    vw * scale,
    vh * scale
  );

}

// #endregion

// #region RuleDropDownSearch

const { Search } = Input;

/**
 * DropdownProps
 * - options：可選的 Rule 名稱清單
 * - onSelect：使用者確認選擇時通知父層
 */
type DropdownProps = {
  options: string[];
  onSelect?: (value: string) => void;
};

function RuleDropdownSearch({ options, onSelect }: DropdownProps) {

  // inputValue：input 欄位顯示的文字（受控元件）
  const [inputValue, setInputValue] = useState("");

  // open：控制下拉選單是否顯示
  const [open, setOpen] = useState(false);

  // wrapperRef：指向整個 dropdown，用來判斷是否點擊在元件外
  const wrapperRef = useRef<HTMLDivElement>(null);

  // filteredOptions：依 inputValue 即時過濾 options（不分大小寫）
  const filteredOptions = useMemo(() => {
    const keyword = inputValue.trim();
    if (keyword === "") return options;

    return options.filter((o) =>
      o.toLocaleLowerCase().includes(keyword.toLocaleLowerCase())
    );
  }, [options, inputValue]);

  // 點擊元件外部時關閉下拉選單
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    // dropdown 外層容器（用 ref 判斷外部點擊）
    <div ref={wrapperRef} className={style.dropdownWrapper}>

      {/* 搜尋輸入框（antd Search） */}
      <Search
        value={inputValue}
        placeholder="Input Rule Name"

        // 聚焦時顯示下拉選單
        onFocus={() => setOpen(true)}

        // 輸入時更新文字並即時顯示過濾結果
        onChange={(e) => {
          setInputValue(e.target.value);
          setOpen(true);
        }}

        // Enter / 搜尋按鈕時通知父層
        onSearch={() => {
          onSelect?.(inputValue);
        }}

        enterButton
      />

      {/* 下拉選單（只在 open 時顯示） */}
      {open && (
        <ul className={style.dropdownOpt}>

          {/* 沒有符合項目時顯示提示 */}
          {filteredOptions.length === 0 && (
            <li className={style.empty}>No matches</li>
          )}

          {/* 顯示過濾後的選項 */}
          {filteredOptions.map((opt) => (
            <li
              key={opt}
              className={style.option}
              onClick={() => {
                // 點選後更新 input 並關閉下拉
                setInputValue(opt);
                setOpen(false);
              }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
// #endregion

// #region Search only for Rule Content
function matchRule(rule: RuleData, keyword: string): boolean {
  const kw = keyword.toLowerCase();

  if (rule.BLOCK_NAME.toLowerCase().includes(kw)) return true;
  if (rule.KEY && rule.KEY.toLowerCase().includes(kw)) return true;

  // 比對所有資料
  return rule.VALUES.some(v =>
    (v.COLUMN1 && v.COLUMN1.toLowerCase().includes(kw)) ||
    (v.COLUMN2 && v.COLUMN2.toLowerCase().includes(kw)) ||
    v.VALUE.toLowerCase().includes(kw)
  );
}

type RuleContentSearchProps = {
  rules: RuleData[];
  onMatchChange: (matched: Set<string> | null) => void;
};

function RuleContentSearch({ rules, onMatchChange }: RuleContentSearchProps) {
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    const kw = keyword.trim();
    if (!kw) {
      onMatchChange(null);
      return;
    }

    const matched = new Set(
      rules
        .filter(r => matchRule(r, kw))
        .map(r => r.BLOCK_NAME)
    );

    onMatchChange(matched);
  }, [keyword, rules, onMatchChange]);

  return (
    <Input
      placeholder="Search Rule Content (block / key / column / value)"
      allowClear
      style={{ width: 360 }}
      value={keyword}
      onChange={(e) => setKeyword(e.target.value)}
    />
  );
}

// #endregion
