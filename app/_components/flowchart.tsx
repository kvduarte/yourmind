"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  Plus,
  ArrowRight,
  X,
  GitFork,
  Undo2,
  Palette,
  Image as ImageIcon,
  Scaling,
  Code2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
  Expand,
  Shrink,
} from "lucide-react";

import { Topic, Node } from "@/types";

import { DEFAULT_ACCENT, useAccent, withAlpha } from "@/lib/theme";
import { useSettings } from "@/lib/settings";

import CodeNode from "./codenode";

import { AUTO_LANGUAGE, detectLanguage } from "@/lib/code/highlight";

interface FlowchartProps {
  topic: Topic;
  topics: Topic[];
  setTopics: React.Dispatch<React.SetStateAction<Topic[]>>;
  theme: "dark" | "light";
}

type ResizeState = {
  nodeId: string;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
};

const colors = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#14b8a6",
];

export default function Flowchart({
  topic,
  topics,
  setTopics,
  theme,
}: FlowchartProps) {
  const [draggingNodeId, setDraggingNodeId] =
    useState<string | null>(null);

  const [dragOffset, setDragOffset] = useState({
    x: 0,
    y: 0,
  });

  const [connectingNodeId, setConnectingNodeId] =
    useState<string | null>(null);

  const [resizeState, setResizeState] =
    useState<ResizeState | null>(null);

  const [colorNodeId, setColorNodeId] =
    useState<string | null>(null);

  const [editingImageId, setEditingImageId] =
    useState<string | null>(null);

  const [copiedCodeId, setCopiedCodeId] =
    useState<string | null>(null);

  /* =========================================================
     ZOOM DO GRAFO
  ========================================================= */

  const [zoom, setZoom] = useState(1);

  const canvasRef =
    useRef<HTMLDivElement>(null);

  const isDark = theme === "dark";

  /* área de trabalho: o desenho começa no CENTRO dela, com espaço livre em todos os lados */
  const CANVAS_BASE_W = 4000;
  const CANVAS_BASE_H = 2600;
  const ORIGIN_X = CANVAS_BASE_W / 2;
  const ORIGIN_Y = CANVAS_BASE_H / 2;

  const MIN_ZOOM = 0.3;
  const MAX_ZOOM = 3;
  const ZOOM_STEP = 0.1;

  const decreaseZoom = () => {
    setZoom((current) =>
      Math.max(
        MIN_ZOOM,
        Number(
          (current - ZOOM_STEP).toFixed(2)
        )
      )
    );
  };

  const increaseZoom = () => {
    setZoom((current) =>
      Math.min(
        MAX_ZOOM,
        Number(
          (current + ZOOM_STEP).toFixed(2)
        )
      )
    );
  };

  const resetZoom = () => {
    setZoom(1);
  };

  /* =========================================================
     ZOOM COM O SCROLL DO MOUSE + ARRASTAR O FUNDO PARA MOVER
  ========================================================= */

  const accent = useAccent();
  const { flowZoomSpeed } = useSettings();
  const zoomSpeedRef = useRef(flowZoomSpeed);
  zoomSpeedRef.current = flowZoomSpeed;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  /** ponto do grafo que deve ficar sob o cursor enquanto o zoom muda */
  const zoomAnchorRef = useRef<{ cx: number; cy: number; mx: number; my: number } | null>(null);
  const panRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    const el = canvasRef.current;

    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;

      /* dentro de um editor/lista com rolagem própria, o scroll continua rolando o conteúdo */
      const scrollable = target.closest("textarea, select") as HTMLElement | null;

      if (scrollable && scrollable.scrollHeight > scrollable.clientHeight + 1) return;

      e.preventDefault();

      /* um "clique" da roda vale no máximo ~100; trackpads mandam valores pequenos */
      const raw = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      const delta = Math.max(-100, Math.min(100, raw));
      const speed = (zoomSpeedRef.current ?? 50) / 100;
      const rect = el.getBoundingClientRect();
      const current = zoomRef.current;
      const next = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, Number((current * Math.exp(-delta * 0.0012 * speed)).toFixed(3)))
      );

      if (next === current) return;

      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      zoomAnchorRef.current = {
        cx: (el.scrollLeft + mx) / current,
        cy: (el.scrollTop + my) / current,
        mx,
        my,
      };

      setZoom(next);
    };

    el.addEventListener("wheel", onWheel, { passive: false });

    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /* mantém o ponto sob o cursor depois que o zoom muda */
  useLayoutEffect(() => {
    const anchor = zoomAnchorRef.current;
    const el = canvasRef.current;

    if (!anchor || !el) return;

    el.scrollLeft = anchor.cx * zoom - anchor.mx;
    el.scrollTop = anchor.cy * zoom - anchor.my;
    zoomAnchorRef.current = null;
  }, [zoom]);

  useEffect(() => {
    if (!isPanning) return;

    const onMove = (e: MouseEvent) => {
      const start = panRef.current;
      const el = canvasRef.current;

      if (!start || !el) return;

      el.scrollLeft = start.left - (e.clientX - start.x);
      el.scrollTop = start.top - (e.clientY - start.y);
    };

    const onUp = () => {
      panRef.current = null;
      setIsPanning(false);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isPanning]);

  /* =========================================================
     CENTRALIZAR, AJUSTAR À TELA E ESPAÇO DE TRABALHO
  ========================================================= */

  /** níveis extras de espaço (cada nível = +1000 de largura e +700 de altura) */
  const [extraSpace, setExtraSpace] = useState(0);
  const MAX_EXTRA_SPACE = 4;

  const nodeBox = (n: Node) => ({
    x: n.x ?? 0,
    y: n.y ?? 0,
    w: n.width || 240,
    h: n.height || (n.type === "image" ? 220 : n.type === "code" ? 280 : 130),
  });

  const boxes = topic.nodes.map(nodeBox);
  const contentRight = boxes.reduce((m, b) => Math.max(m, b.x + b.w), 0);
  const contentBottom = boxes.reduce((m, b) => Math.max(m, b.y + b.h), 0);

  /* a área cresce sozinha quando os blocos chegam perto da borda */
  const canvasW = Math.max(CANVAS_BASE_W + extraSpace * 1000, contentRight + 800);
  const canvasH = Math.max(CANVAS_BASE_H + extraSpace * 700, contentBottom + 600);

  const centerTargetRef = useRef<{ cx: number; cy: number } | null>(null);
  const [centerTick, setCenterTick] = useState(0);

  /** fit = true também ajusta o zoom para o desenho caber (e ficar o maior possível) */
  const centerView = (fit: boolean) => {
    const el = canvasRef.current;

    if (!el || boxes.length === 0) return;

    const minX = Math.min(...boxes.map((b) => b.x));
    const minY = Math.min(...boxes.map((b) => b.y));
    const maxX = Math.max(...boxes.map((b) => b.x + b.w));
    const maxY = Math.max(...boxes.map((b) => b.y + b.h));

    let next = zoomRef.current;

    if (fit) {
      const pad = 90;

      next = Math.min(
        MAX_ZOOM,
        Math.max(
          MIN_ZOOM,
          Math.min(
            (el.clientWidth - pad * 2) / Math.max(1, maxX - minX),
            (el.clientHeight - pad * 2) / Math.max(1, maxY - minY)
          )
        )
      );

      next = Number(next.toFixed(3));
    }

    centerTargetRef.current = { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
    setZoom(next);
    setCenterTick((t) => t + 1);
  };

  useLayoutEffect(() => {
    const target = centerTargetRef.current;
    const el = canvasRef.current;

    if (!target || !el) return;

    el.scrollLeft = target.cx * zoomRef.current - el.clientWidth / 2;
    el.scrollTop = target.cy * zoomRef.current - el.clientHeight / 2;
    centerTargetRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerTick]);

  /**
   * Ao abrir um fluxograma: se o desenho estiver longe do meio da área de trabalho
   * (por exemplo, colado no canto), ele é movido para o centro. Depois a tela
   * rola até o meio, e o espaço livre fica dos dois lados para expandir.
   */
  useEffect(() => {
    const nodes = topic.nodes;
    let target = { cx: ORIGIN_X, cy: ORIGIN_Y };

    if (nodes.length > 0) {
      const list = nodes.map(nodeBox);
      const minX = Math.min(...list.map((b) => b.x));
      const minY = Math.min(...list.map((b) => b.y));
      const maxX = Math.max(...list.map((b) => b.x + b.w));
      const maxY = Math.max(...list.map((b) => b.y + b.h));
      const dx = Math.round(ORIGIN_X - (minX + maxX) / 2);
      const dy = Math.round(ORIGIN_Y - (minY + maxY) / 2);

      if (Math.abs(dx) > 400 || Math.abs(dy) > 300) {
        /* o cálculo é refeito dentro da atualização, então rodar duas vezes não desloca duas vezes */
        setTopics((currentTopics) =>
          currentTopics.map((t) => {
            if (t.id !== topic.id || t.nodes.length === 0) return t;

            const b = t.nodes.map(nodeBox);
            const sx = Math.round(ORIGIN_X - (Math.min(...b.map((n) => n.x)) + Math.max(...b.map((n) => n.x + n.w))) / 2);
            const sy = Math.round(ORIGIN_Y - (Math.min(...b.map((n) => n.y)) + Math.max(...b.map((n) => n.y + n.h))) / 2);

            if (Math.abs(sx) <= 400 && Math.abs(sy) <= 300) return t;

            return {
              ...t,
              nodes: t.nodes.map((n) => ({
                ...n,
                x: Math.max(10, (n.x ?? 0) + sx),
                y: Math.max(10, (n.y ?? 0) + sy),
              })),
            };
          })
        );

        target = { cx: ORIGIN_X, cy: ORIGIN_Y };
      } else {
        target = { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
      }
    }

    centerTargetRef.current = target;
    setCenterTick((t) => t + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic.id]);

  /** ponto no meio do que o usuário está vendo: blocos novos nascem aqui */
  const spawnPoint = (w: number, h: number) => {
    const el = canvasRef.current;
    const z = zoomRef.current;
    const jitter = () => (Math.random() - 0.5) * 60;

    if (!el) return { x: Math.round(ORIGIN_X - w / 2), y: Math.round(ORIGIN_Y - h / 2) };

    return {
      x: Math.max(10, Math.round((el.scrollLeft + el.clientWidth / 2) / z - w / 2 + jitter())),
      y: Math.max(10, Math.round((el.scrollTop + el.clientHeight / 2) / z - h / 2 + jitter())),
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const el = canvasRef.current;

    /* só começa a mover quando o clique é no fundo vazio, nunca em um bloco */
    if (!el || e.button !== 0 || !target.hasAttribute("data-graph-bg")) return;

    panRef.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
    setIsPanning(true);
  };

  const updateNode = (
    nodeId: string,
    changes: Partial<Node>
  ) => {
    setTopics((currentTopics) =>
      currentTopics.map((t) =>
        t.id === topic.id
          ? {
              ...t,
              nodes: t.nodes.map((n) =>
                n.id === nodeId
                  ? {
                      ...n,
                      ...changes,
                    }
                  : n
              ),
            }
          : t
      )
    );
  };

  const handleMouseDownNode = (
    e: React.MouseEvent,
    nodeId: string
  ) => {
    const target = e.target as HTMLElement;

    if (
      target.closest(
        "input, textarea, button, select, .resize-handle, .color-picker"
      )
    ) {
      return;
    }

    if (connectingNodeId) {
      if (connectingNodeId !== nodeId) {
        const exists =
          topic.connections.some(
            (connection) =>
              (connection.from ===
                connectingNodeId &&
                connection.to ===
                  nodeId) ||
              (connection.from ===
                nodeId &&
                connection.to ===
                  connectingNodeId)
          );

        if (!exists) {
          setTopics((currentTopics) =>
            currentTopics.map((t) =>
              t.id === topic.id
                ? {
                    ...t,
                    connections: [
                      ...t.connections,
                      {
                        from: connectingNodeId,
                        to: nodeId,
                      },
                    ],
                  }
                : t
            )
          );
        }
      }

      setConnectingNodeId(null);
      return;
    }

    const node = topic.nodes.find(
      (n) => n.id === nodeId
    );

    if (!node || !canvasRef.current)
      return;

    const rect =
      canvasRef.current.getBoundingClientRect();

    /*
     * O zoom é considerado aqui para que
     * o arrastar continue correto mesmo
     * quando o grafo estiver ampliado/reduzido.
     */
    setDraggingNodeId(nodeId);

    setDragOffset({
      x:
        (e.clientX - rect.left) /
          zoom -
        node.x,
      y:
        (e.clientY - rect.top) /
          zoom -
        node.y,
    });
  };

  const handleMouseMoveCanvas = (
    e: React.MouseEvent
  ) => {
    if (!canvasRef.current) return;

    const rect =
      canvasRef.current.getBoundingClientRect();

    if (resizeState) {
      const deltaX =
        (e.clientX -
          resizeState.startX) /
        zoom;

      const deltaY =
        (e.clientY -
          resizeState.startY) /
        zoom;

      const newWidth = Math.max(
        140,
        resizeState.startWidth + deltaX
      );

      const newHeight = Math.max(
        90,
        resizeState.startHeight + deltaY
      );

      updateNode(resizeState.nodeId, {
        width: newWidth,
        height: newHeight,
      });

      return;
    }

    if (!draggingNodeId) return;

    const newX = Math.max(
      10,
      (e.clientX - rect.left) /
        zoom -
        dragOffset.x
    );

    const newY = Math.max(
      10,
      (e.clientY - rect.top) /
        zoom -
        dragOffset.y
    );

    updateNode(draggingNodeId, {
      x: newX,
      y: newY,
    });
  };

  const handleMouseUpCanvas = () => {
    setDraggingNodeId(null);
    setResizeState(null);
  };

  const startResize = (
    e: React.MouseEvent,
    node: Node
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setResizeState({
      nodeId: node.id,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: node.width || 240,
      startHeight:
        node.height ||
        (node.type === "image"
          ? 220
          : node.type === "code"
          ? 280
          : 130),
    });
  };

  const addImageNodeFromFile = (
    file: File,
    xPos = 160,
    yPos = 160
  ) => {
    if (!file.type.startsWith("image/"))
      return;

    const reader = new FileReader();

    reader.onload = () => {
      const imageUrl =
        reader.result as string;

      const newNode: Node = {
        id: `image-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 5)}`,
        title: "",
        description: "",
        type: "image",
        x: xPos,
        y: yPos,
        width: 320,
        height: 240,
        imageUrl,
        imageDescription: "",
      };

      setTopics((currentTopics) =>
        currentTopics.map((t) =>
          t.id === topic.id
            ? {
                ...t,
                nodes: [
                  ...t.nodes,
                  newNode,
                ],
              }
            : t
        )
      );
    };

    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const handlePaste = (
      event: ClipboardEvent
    ) => {
      const items =
        event.clipboardData?.items;

      if (!items) return;

      const typing = (
        event.target as HTMLElement | null
      )?.closest(
        "input, textarea, [contenteditable='true']"
      );

      const hasImage = Array.from(items).some(
        (item) => item.type.startsWith("image/")
      );

      const pastedText =
        event.clipboardData?.getData("text/plain") ?? "";

      // Colou código no grafo (fora de um campo)? Cria o bloco sozinho.
      if (
        !hasImage &&
        !typing &&
        pastedText.split("\n").length >= 2 &&
        detectLanguage(pastedText)
      ) {
        createCodeNode(pastedText);
        event.preventDefault();
        return;
      }

      for (const item of items) {
        if (
          item.type.startsWith("image/")
        ) {
          const file = item.getAsFile();

          if (file) {
            addImageNodeFromFile(file);
            event.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener(
      "paste",
      handlePaste
    );

    return () => {
      window.removeEventListener(
        "paste",
        handlePaste
      );
    };
  }, [topic.id, setTopics]);

  const handleDrop = (
    e: React.DragEvent
  ) => {
    e.preventDefault();

    if (!canvasRef.current) return;

    const rect =
      canvasRef.current.getBoundingClientRect();

    /*
     * O ponto do drop também precisa
     * respeitar o zoom atual.
     */
    const x =
      (e.clientX - rect.left + canvasRef.current.scrollLeft) /
      zoom;

    const y =
      (e.clientY - rect.top + canvasRef.current.scrollTop) /
      zoom;

    const files = Array.from(
      e.dataTransfer.files
    );

    files.forEach((file) => {
      if (
        file.type.startsWith("image/")
      ) {
        addImageNodeFromFile(
          file,
          x,
          y
        );
      }
    });
  };

  const handleDragOver = (
    e: React.DragEvent
  ) => {
    e.preventDefault();
  };

  const addNode = () => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      title: "",
      description: "",
      type: "topic",
      ...spawnPoint(280, 170),
      width: 280,
      height: 170,
      color: DEFAULT_ACCENT,
    };

    setTopics((currentTopics) =>
      currentTopics.map((t) =>
        t.id === topic.id
          ? {
              ...t,
              nodes: [
                ...t.nodes,
                newNode,
              ],
            }
          : t
      )
    );
  };

  const addNote = () => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      title: "",
      description: "",
      type: "note",
      ...spawnPoint(280, 160),
      width: 280,
      height: 160,
    };

    setTopics((currentTopics) =>
      currentTopics.map((t) =>
        t.id === topic.id
          ? {
              ...t,
              nodes: [
                ...t.nodes,
                newNode,
              ],
            }
          : t
      )
    );
  };

  const createCodeNode = (
    initialCode = "",
    xPos?: number,
    yPos?: number
  ) => {
    const newNode: Node = {
      id: `code-${Date.now()}`,
      title: "",
      description: "",
      type: "code",
      x: xPos ?? spawnPoint(460, 300).x,
      y: yPos ?? spawnPoint(460, 300).y,
      width: 460,
      height: 300,
      language: AUTO_LANGUAGE,
      code: initialCode,
    };

    setTopics((currentTopics) =>
      currentTopics.map((t) =>
        t.id === topic.id
          ? {
              ...t,
              nodes: [...t.nodes, newNode],
            }
          : t
      )
    );
  };

  const addCode = () => createCodeNode("");

  const deleteNode = (
    nodeId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    setTopics((currentTopics) =>
      currentTopics.map((t) =>
        t.id === topic.id
          ? {
              ...t,
              nodes: t.nodes.filter(
                (n) => n.id !== nodeId
              ),
              connections:
                t.connections.filter(
                  (connection) =>
                    connection.from !==
                      nodeId &&
                    connection.to !==
                      nodeId
                ),
            }
          : t
      )
    );
  };

  const deleteConnection = (
    index: number
  ) => {
    setTopics((currentTopics) =>
      currentTopics.map((t) =>
        t.id === topic.id
          ? {
              ...t,
              connections:
                t.connections.filter(
                  (_, i) =>
                    i !== index
                ),
            }
          : t
      )
    );
  };

  const undoConnection = () => {
    if (!topic.connections.length)
      return;

    setTopics((currentTopics) =>
      currentTopics.map((t) =>
        t.id === topic.id
          ? {
              ...t,
              connections:
                t.connections.slice(
                  0,
                  -1
                ),
            }
          : t
      )
    );
  };

  const updateNodeText = (
    nodeId: string,
    field:
      | "title"
      | "description"
      | "imageDescription"
      | "code"
      | "language",
    value: string
  ) => {
    updateNode(nodeId, {
      [field]: value,
    });
  };

  const changeNodeColor = (
    nodeId: string,
    color: string
  ) => {
    updateNode(nodeId, {
      color,
    });

    setColorNodeId(null);
  };

  const copyCode = async (
    node: Node
  ) => {
    try {
      await navigator.clipboard.writeText(
        node.code || ""
      );

      setCopiedCodeId(node.id);

      setTimeout(() => {
        setCopiedCodeId(null);
      }, 1500);
    } catch {}
  };

  const getNodeStyle = (
    node: Node
  ) => {
    const width =
      node.width || 240;

    const height =
      node.height ||
      (node.type === "image"
        ? 220
        : node.type === "code"
        ? 280
        : 130);

    return {
      left: `${node.x}px`,
      top: `${node.y}px`,
      width: `${width}px`,
      height: `${height}px`,
      minHeight: `${height}px`,
    };
  };

  return (
    <div
      className={`
        flex-1
        flex
        flex-col
        h-full
        min-w-0
        z-10
        overflow-hidden
        transition-colors
        duration-300
        ${
          isDark
            ? "bg-zinc-950 text-zinc-100"
            : "bg-zinc-50 text-zinc-900"
        }
      `}
    >
      {/* =========================================================
          HEADER
      ========================================================= */}

      <header
        className={`
          h-[60px]
          shrink-0
          px-4
          sm:px-5
          flex
          items-center
          justify-between
          border-b
          backdrop-blur-xl
          ${
            isDark
              ? "bg-zinc-900/80 border-white/10 backdrop-blur-md"
              : "bg-white/90 border-zinc-200/80"
          }
        `}
      >
        {/* Título */}

        <div className="flex items-center min-w-0">
          <div
            className={`
              w-8
              h-8
              rounded-lg
              flex
              items-center
              justify-center
              shrink-0
              border
              ${
                isDark
                  ? "bg-white/[0.04] border-white/[0.07]"
                  : "bg-zinc-100 border-zinc-200"
              }
            `}
          >
            <GitFork
              size={15}
              className={
                isDark
                  ? "text-zinc-300"
                  : "text-zinc-600"
              }
            />
          </div>

          <div className="ml-3 min-w-0">
            <p
              className={`
                text-xs
                uppercase
                tracking-[0.16em]
                font-medium
                ${
                  isDark
                    ? "text-zinc-500"
                    : "text-zinc-400"
                }
              `}
            >
              Fluxograma
            </p>

            <h2
              className={`
                text-sm
                font-semibold
                truncate
                ${
                  isDark
                    ? "text-zinc-100"
                    : "text-zinc-800"
                }
              `}
            >
              {topic.name}
            </h2>
          </div>
        </div>

        {/* Toolbar */}

        <div className="flex items-center gap-1.5">
          {/* =====================================================
              ZOOM
          ===================================================== */}

          <div
            className={`
              h-8
              flex
              items-center
              rounded-lg
              border
              overflow-hidden
              ${
                isDark
                  ? "bg-white/[0.03] border-white/[0.07]"
                  : "bg-white border-zinc-200"
              }
            `}
          >
            <button
              onClick={decreaseZoom}
              disabled={
                zoom <= MIN_ZOOM
              }
              title="Diminuir zoom"
              className={`
                h-full
                w-8
                flex
                items-center
                justify-center
                transition-colors
                disabled:opacity-30
                disabled:cursor-not-allowed
                ${
                  isDark
                    ? "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                }
              `}
            >
              <ZoomOut size={14} />
            </button>

            <button
              onClick={resetZoom}
              title="Voltar para 100%"
              className={`
                h-full
                min-w-[48px]
                px-1
                text-xs
                font-medium
                border-x
                transition-colors
                ${
                  isDark
                    ? "border-white/[0.07] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
                    : "border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                }
              `}
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              onClick={increaseZoom}
              disabled={
                zoom >= MAX_ZOOM
              }
              title="Aumentar zoom"
              className={`
                h-full
                w-8
                flex
                items-center
                justify-center
                transition-colors
                disabled:opacity-30
                disabled:cursor-not-allowed
                ${
                  isDark
                    ? "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                }
              `}
            >
              <ZoomIn size={14} />
            </button>
          </div>

          {/* Centralizar, ajustar à tela e espaço de trabalho */}
          <div
            className={`
              flex
              h-8
              items-center
              rounded-lg
              border
              overflow-hidden
              ${
                isDark
                  ? "bg-white/[0.03] border-white/[0.07]"
                  : "bg-white border-zinc-200"
              }
            `}
          >
            {(
              [
                ["Centralizar o fluxograma", <Crosshair key="c" size={14} />, () => centerView(false), false],
                ["Ajustar à tela (o maior possível)", <Maximize2 key="m" size={14} />, () => centerView(true), false],
                ["Menos espaço de trabalho", <Shrink key="s" size={14} />, () => setExtraSpace((v) => Math.max(0, v - 1)), extraSpace <= 0],
                ["Mais espaço de trabalho", <Expand key="e" size={14} />, () => setExtraSpace((v) => Math.min(MAX_EXTRA_SPACE, v + 1)), extraSpace >= MAX_EXTRA_SPACE],
              ] as const
            ).map(([label, icon, action, disabled], index) => (
              <button
                key={label}
                onClick={action}
                disabled={disabled}
                title={label}
                aria-label={label}
                className={`
                  flex
                  h-full
                  w-8
                  items-center
                  justify-center
                  transition-colors
                  disabled:opacity-30
                  disabled:cursor-not-allowed
                  ${index === 2 ? (isDark ? "border-l border-white/[0.07]" : "border-l border-zinc-200") : ""}
                  ${
                    isDark
                      ? "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                  }
                `}
              >
                {icon}
              </button>
            ))}
          </div>

          <div
            className={`
              h-5
              w-px
              mx-1
              ${
                isDark
                  ? "bg-white/[0.07]"
                  : "bg-zinc-200"
              }
            `}
          />

          <button
            onClick={undoConnection}
            disabled={
              topic.connections.length === 0
            }
            title="Desfazer conexão"
            className={`
              h-8
              px-2.5
              rounded-lg
              flex
              items-center
              gap-1.5
              text-xs
              border
              transition-all
              disabled:opacity-30
              disabled:cursor-not-allowed
              ${
                isDark
                  ? "bg-white/[0.03] border-white/[0.07] text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]"
                  : "bg-white border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
              }
            `}
          >
            <Undo2 size={13} />

            <span className="hidden md:inline">
              Desfazer
            </span>
          </button>

          <div
            className={`
              h-5
              w-px
              mx-1
              ${
                isDark
                  ? "bg-white/[0.07]"
                  : "bg-zinc-200"
              }
            `}
          />

          <button
            onClick={addNote}
            title="Adicionar anotação"
            className={`
              h-8
              px-2.5
              rounded-lg
              flex
              items-center
              gap-1.5
              text-xs
              border
              transition-all
              ${
                isDark
                  ? "bg-white/[0.03] border-white/[0.07] text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]"
                  : "bg-white border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
              }
            `}
          >
            <Plus size={13} />

            <span className="hidden sm:inline">
              Anotação
            </span>
          </button>

          <button
            onClick={addCode}
            title="Adicionar bloco de código"
            className={`
              h-8
              px-2.5
              rounded-lg
              flex
              items-center
              gap-1.5
              text-xs
              border
              transition-all
              ${
                isDark
                  ? "bg-white/[0.03] border-white/[0.07] text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]"
                  : "bg-white border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
              }
            `}
          >
            <Code2 size={13} />

            <span className="hidden sm:inline">
              Código
            </span>
          </button>

          <button
            onClick={addNode}
            title="Adicionar tópico"
            className="
              h-8
              px-3
              rounded-lg
              flex
              items-center
              gap-1.5
              text-xs
              font-medium
              bg-[var(--accent)]
              hover:brightness-110
              text-white
              shadow-sm
              shadow-black/20
              transition-all
              hover:-translate-y-[1px]
            "
          >
            <Plus size={14} />

            <span className="hidden sm:inline">
              Tópico
            </span>
          </button>
        </div>
      </header>

      {/* =========================================================
          CANVAS
      ========================================================= */}

      <div
        ref={canvasRef}
        tabIndex={0}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={
          handleMouseMoveCanvas
        }
        onMouseUp={
          handleMouseUpCanvas
        }
        onMouseLeave={
          handleMouseUpCanvas
        }
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => {
          if (colorNodeId) {
            setColorNodeId(null);
          }
        }}
        className={`
          flex-1
          relative
          overflow-auto
          outline-none
          transition-colors
          ${
            isDark
              ? `
                bg-zinc-950
                bg-[radial-gradient(circle,#27272a_0.8px,transparent_0.8px)]
              `
              : `
                bg-zinc-50
                bg-[radial-gradient(circle,#d4d4d8_0.8px,transparent_0.8px)]
              `
          }
          [background-size:24px_24px]
        `}
      >
        {/* =====================================================
            ÁREA DO GRAFO COM ZOOM
        ===================================================== */}

        <div
          data-graph-bg
          style={{
            zoom,
            width: `${canvasW}px`,
            height: `${canvasH}px`,
            position: "relative",
            cursor: isPanning ? "grabbing" : "grab",
          }}
        >
          {/* =====================================================
              SVG CONNECTIONS
          ===================================================== */}

          <svg
            className="
              absolute
              inset-0
              w-full
              h-full
              pointer-events-none
              z-0
            "
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="7"
                markerHeight="7"
                refX="6"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 7 3.5, 0 7"
                  fill={
                    isDark
                      ? "#52525b"
                      : "#a1a1aa"
                  }
                />
              </marker>
            </defs>

            {topic.connections.map(
              (connection, index) => {
                const fromNode =
                  topic.nodes.find(
                    (node) =>
                      node.id ===
                      connection.from
                  );

                const toNode =
                  topic.nodes.find(
                    (node) =>
                      node.id ===
                      connection.to
                  );

                if (
                  !fromNode ||
                  !toNode
                ) {
                  return null;
                }

                const fromWidth =
                  fromNode.width || 240;

                const fromHeight =
                  fromNode.height ||
                  (fromNode.type ===
                  "image"
                    ? 220
                    : fromNode.type ===
                      "code"
                    ? 280
                    : 130);

                const toWidth =
                  toNode.width || 240;

                const toHeight =
                  toNode.height ||
                  (toNode.type ===
                  "image"
                    ? 220
                    : toNode.type ===
                      "code"
                    ? 280
                    : 130);

                const startX =
                  fromNode.x +
                  fromWidth / 2;

                const startY =
                  fromNode.y +
                  fromHeight / 2;

                const endX =
                  toNode.x +
                  toWidth / 2;

                const endY =
                  toNode.y +
                  toHeight / 2;

                const middleX =
                  (startX + endX) / 2;

                const path = `
                  M ${startX} ${startY}
                  C ${middleX} ${startY},
                    ${middleX} ${endY},
                    ${endX} ${endY}
                `;

                return (
                  <g key={index}>
                    {/* Área invisível para facilitar clique */}

                    <path
                      d={path}
                      stroke={
                        isDark
                          ? "#71717a"
                          : "#a1a1aa"
                      }
                      strokeWidth="10"
                      fill="none"
                      opacity="0"
                      className="
                        pointer-events-auto
                        cursor-pointer
                      "
                      onClick={() =>
                        deleteConnection(
                          index
                        )
                      }
                    />

                    {/* Linha */}

                    <path
                      d={path}
                      stroke={
                        isDark
                          ? "#52525b"
                          : "#a1a1aa"
                      }
                      strokeWidth="1.5"
                      fill="none"
                      markerEnd="url(#arrowhead)"
                      pointerEvents="none"
                    />

                    {/* Botão de remover */}

                    <g
                      transform={`
                        translate(
                          ${middleX},
                          ${
                            (startY +
                              endY) /
                            2
                          }
                        )
                      `}
                      className="
                        pointer-events-auto
                        cursor-pointer
                      "
                      onClick={() =>
                        deleteConnection(
                          index
                        )
                      }
                    >
                      <circle
                        r="9"
                        className={
                          isDark
                            ? "fill-zinc-900"
                            : "fill-white"
                        }
                        stroke={withAlpha(accent, 0.7)}
                        strokeWidth={1.5}
                      />

                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="13"
                        fill={accent}
                      >
                        ×
                      </text>
                    </g>
                  </g>
                );
              }
            )}
          </svg>

          {/* =====================================================
              NODES
          ===================================================== */}

          {topic.nodes.map((node) => {
            const nodeColor =
              node.color ||
              DEFAULT_ACCENT;

            const isMain =
              node.type === "main";

            const isTopic =
              node.type === "topic";

            const isImage =
              node.type === "image";

            const isCode =
              node.type === "code";

            const isConnecting =
              connectingNodeId ===
              node.id;

            return (
              <div
                key={node.id}
                style={{
                  ...getNodeStyle(node),
                  backgroundColor:
                    isMain
                      ? withAlpha(nodeColor, 0.07)
                      : undefined,
                  borderColor:
                    isMain
                      ? nodeColor
                      : undefined,
                }}
                onMouseDown={(e) =>
                  handleMouseDownNode(
                    e,
                    node.id
                  )
                }
                className={`
                  absolute
                  z-10
                  group
                  select-none
                  cursor-move
                  overflow-visible
                  transition-shadow
                  duration-200
                  flex
                  flex-col
                  ${
                    isImage
                      ? "rounded-2xl"
                      : "rounded-2xl border"
                  }
                  ${
                    isImage
                      ? ""
                      : "shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
                  }
                  ${
                    isConnecting
                      ? `
                        ring-2
                        ring-[var(--accent)]
                        ring-offset-2
                        ${
                          isDark
                            ? "ring-offset-zinc-950"
                            : "ring-offset-zinc-50"
                        }
                      `
                      : ""
                  }
                  ${
                    isDark
                      ? isMain
                        ? "bg-zinc-900/95 border-white/[0.08]"
                        : isTopic
                        ? "bg-zinc-900/90 border-white/[0.07]"
                        : isCode
                        ? "bg-zinc-900 border-white/[0.08]"
                        : "bg-zinc-900/90 border-white/10 backdrop-blur-md"
                      : isMain
                      ? "bg-white border-zinc-200"
                      : isTopic
                      ? "bg-white border-zinc-200"
                      : isCode
                      ? "bg-zinc-950 border-zinc-200"
                      : "bg-white border-zinc-200"
                  }
                  hover:shadow-[0_16px_50px_rgba(0,0,0,0.16)]
                `}
              >
                {/* =================================================
                    IMAGE NODE
                ================================================= */}

                {isImage ? (
                  <div
                    className="
                      relative
                      w-full
                      h-full
                      min-h-[100px]
                      flex
                      flex-col
                      overflow-visible
                      rounded-2xl
                    "
                    onDoubleClick={() =>
                      setEditingImageId(
                        node.id
                      )
                    }
                  >
                    {node.imageUrl ? (
                      <img
                        src={node.imageUrl}
                        alt={
                          node.imageDescription ||
                          "Imagem"
                        }
                        draggable={false}
                        className="
                          w-full
                          h-full
                          object-contain
                          pointer-events-none
                          rounded-2xl
                        "
                      />
                    ) : (
                      <div
                        className={`
                          flex
                          flex-col
                          items-center
                          justify-center
                          flex-1
                          rounded-2xl
                          ${
                            isDark
                              ? "text-zinc-600 bg-zinc-900"
                              : "text-zinc-400 bg-zinc-100"
                          }
                        `}
                      >
                        <ImageIcon
                          size={28}
                        />

                        <span className="text-xs mt-2">
                          Sem imagem
                        </span>
                      </div>
                    )}

                    {/* Descrição em edição */}

                    {editingImageId ===
                      node.id && (
                      <div
                        className={`
                          absolute
                          bottom-2
                          left-2
                          right-2
                          z-30
                          rounded-xl
                          border
                          p-2.5
                          shadow-xl
                          ${
                            isDark
                              ? "bg-zinc-900/90 border-white/10 backdrop-blur-md"
                              : "bg-white/95 border-zinc-200"
                          }
                        `}
                        onMouseDown={(e) =>
                          e.stopPropagation()
                        }
                      >
                        <textarea
                          autoFocus
                          value={
                            node.imageDescription ||
                            ""
                          }
                          onChange={(e) =>
                            updateNodeText(
                              node.id,
                              "imageDescription",
                              e.target.value
                            )
                          }
                          onBlur={() =>
                            setEditingImageId(
                              null
                            )
                          }
                          placeholder="Adicione uma descrição..."
                          rows={2}
                          className={`
                            w-full
                            bg-transparent
                            text-xs
                            text-center
                            outline-none
                            resize-none
                            ${
                              isDark
                                ? "text-zinc-200 placeholder:text-zinc-600"
                                : "text-zinc-700 placeholder:text-zinc-400"
                            }
                          `}
                        />
                      </div>
                    )}

                    {/* Descrição */}

                    {node.imageDescription &&
                      editingImageId !==
                        node.id && (
                        <div
                          className={`
                            absolute
                            bottom-2
                            left-2
                            right-2
                            rounded-lg
                            px-2.5
                            py-1.5
                            text-xs
                            backdrop-blur-md
                            ${
                              isDark
                                ? "bg-black/70 text-zinc-300"
                                : "bg-white/85 text-zinc-600"
                            }
                          `}
                        >
                          {
                            node.imageDescription
                          }
                        </div>
                      )}

                    {/* Delete */}

                    <div
                      className="
                        absolute
                        top-2
                        right-2
                        opacity-0
                        group-hover:opacity-100
                        transition-opacity
                        z-20
                      "
                    >
                      <button
                        onClick={(e) =>
                          deleteNode(
                            node.id,
                            e
                          )
                        }
                        className={`
                          p-1.5
                          rounded-lg
                          border
                          shadow-lg
                          backdrop-blur-md
                          ${
                            isDark
                              ? "bg-zinc-900/80 border-white/10 backdrop-blur-md text-zinc-400 hover:text-red-400"
                              : "bg-white/90 border-zinc-200 text-zinc-500 hover:text-red-500"
                          }
                        `}
                      >
                        <X size={13} />
                      </button>
                    </div>

                    {/* Hint */}

                    <div
                      className={`
                        absolute
                        bottom-2
                        right-2
                        text-[9px]
                        px-2
                        py-1
                        rounded-md
                        opacity-0
                        group-hover:opacity-100
                        transition-opacity
                        pointer-events-none
                        ${
                          isDark
                            ? "bg-black/70 text-zinc-500"
                            : "bg-white/80 text-zinc-400"
                        }
                      `}
                    >
                      Duplo clique para editar
                    </div>
                  </div>
                ) : isCode ? (
                  <CodeNode
                    node={node}
                    isDark={isDark}
                    copied={copiedCodeId === node.id}
                    onChange={(changes) =>
                      updateNode(node.id, changes)
                    }
                    onCopy={() => copyCode(node)}
                    onDelete={(e) =>
                      deleteNode(node.id, e)
                    }
                  />
                ) : (
                  /* =================================================
                     TOPIC / NOTE / MAIN
                  ================================================= */

                  <>
                    <div
                      className="
                        relative
                        flex
                        items-center
                        justify-center
                        px-3.5
                        pt-3.5
                        pb-1
                        shrink-0
                      "
                    >
                      <div className="flex items-center justify-center gap-2 min-w-0 flex-1">
                        {isTopic && (
                          <div
                            className="
                              absolute
                              left-3.5
                              top-1/2
                              mt-1
                              -translate-y-1/2
                              w-2.5
                              h-2.5
                              rounded-full
                              shrink-0
                              ring-4
                              ring-black/[0.02]
                            "
                            style={{
                              backgroundColor:
                                nodeColor,
                            }}
                          />
                        )}

                        <input
                          type="text"
                          value={node.title}
                          placeholder={
                            isMain
                              ? "Título Principal"
                              : "Título do Tópico"
                          }
                          onChange={(e) =>
                            updateNodeText(
                              node.id,
                              "title",
                              e.target.value
                            )
                          }
                          className={`
                            bg-transparent
                            outline-none
                            w-full
                            mr-2
                            ${
                              isMain
                                ? "text-lg font-bold text-center"
                                : "text-base font-semibold text-center"
                            }
                            ${
                              isDark
                                ? "text-zinc-100 placeholder:text-zinc-600"
                                : "text-zinc-900 placeholder:text-zinc-400"
                            }
                          `}
                          onMouseDown={(e) =>
                            e.stopPropagation()
                          }
                        />
                      </div>

                      <div
                        className={`absolute -top-4 right-2 z-30 flex items-center gap-0.5 rounded-xl border px-1 py-0.5 shadow-lg backdrop-blur-md transition-opacity ${
                          colorNodeId === node.id || connectingNodeId === node.id
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        } ${
                          isDark
                            ? "border-white/10 bg-zinc-900/90"
                            : "border-zinc-200 bg-white/95"
                        }`}
                      >
                        {(isMain ||
                          isTopic) && (
                          <div className="relative color-picker">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();

                                setColorNodeId(
                                  colorNodeId ===
                                    node.id
                                    ? null
                                    : node.id
                                );
                              }}
                              className={`
                                p-1.5
                                rounded-md
                                opacity-0
                                group-hover:opacity-100
                                transition-all
                                ${
                                  isDark
                                    ? "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"
                                    : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                }
                              `}
                              title="Cor"
                            >
                              <Palette
                                size={13}
                              />
                            </button>

                            {colorNodeId ===
                              node.id && (
                              <div
                                className={`
                                  absolute
                                  right-0
                                  top-9
                                  z-50
                                  p-2.5
                                  rounded-xl
                                  border
                                  shadow-2xl
                                  grid
                                  grid-cols-5
                                  gap-2
                                  color-picker
                                  ${
                                    isDark
                                      ? "bg-zinc-900 border-white/10"
                                      : "bg-white border-zinc-200"
                                  }
                                `}
                                onClick={(e) =>
                                  e.stopPropagation()
                                }
                              >
                                {colors.map(
                                  (
                                    color
                                  ) => (
                                    <button
                                      key={
                                        color
                                      }
                                      style={{
                                        backgroundColor:
                                          color,
                                      }}
                                      onClick={() =>
                                        changeNodeColor(
                                          node.id,
                                          color
                                        )
                                      }
                                      className="
                                        w-5
                                        h-5
                                        rounded-full
                                        border
                                        border-white/20
                                        hover:scale-110
                                        transition-transform
                                      "
                                    />
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();

                            setConnectingNodeId(
                              connectingNodeId ===
                                node.id
                                ? null
                                : node.id
                            );
                          }}
                          className={`
                            p-1.5
                            rounded-md
                            opacity-0
                            group-hover:opacity-100
                            transition-all
                            ${
                              connectingNodeId ===
                              node.id
                                ? "bg-[var(--accent)] text-white opacity-100"
                                : isDark
                                ? "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-100"
                                : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800"
                            }
                          `}
                          title="Conectar"
                        >
                          <ArrowRight
                            size={13}
                          />
                        </button>

                        {!isMain && (
                          <button
                            onClick={(e) =>
                              deleteNode(
                                node.id,
                                e
                              )
                            }
                            className={`
                              p-1.5
                              rounded-md
                              opacity-0
                              group-hover:opacity-100
                              transition-all
                              ${
                                isDark
                                  ? "text-zinc-600 hover:bg-red-500/10 hover:text-red-400"
                                  : "text-zinc-400 hover:bg-red-50 hover:text-red-500"
                              }
                            `}
                            title="Excluir"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div
                      className="
                        flex-1
                        min-h-0
                        px-3.5
                        pb-3.5
                        pt-1
                        flex
                        flex-col
                        overflow-hidden
                      "
                    >
                      <textarea
                        value={
                          node.description ||
                          ""
                        }
                        onChange={(e) =>
                          updateNodeText(
                            node.id,
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="Adicione uma descrição..."
                        className={`
                          w-full
                          flex-1
                          min-h-0
                          bg-transparent
                          text-sm
                          text-center
                          leading-relaxed
                          outline-none
                          resize-none
                          overflow-auto
                          ${
                            isDark
                              ? "text-zinc-400 placeholder:text-zinc-700"
                              : "text-zinc-600 placeholder:text-zinc-400"
                          }
                        `}
                        rows={3}
                        onMouseDown={(e) =>
                          e.stopPropagation()
                        }
                      />
                    </div>
                  </>
                )}

                {/* =================================================
                    CONNECTION BUTTON
                ================================================= */}

                <button
                  onClick={(e) => {
                    e.stopPropagation();

                    setConnectingNodeId(
                      connectingNodeId ===
                        node.id
                        ? null
                        : node.id
                    );
                  }}
                  className={`
                    absolute
                    -right-3
                    top-1/2
                    -translate-y-1/2
                    z-30
                    w-6
                    h-6
                    rounded-full
                    border
                    shadow-lg
                    flex
                    items-center
                    justify-center
                    transition-all
                    duration-150
                    ${
                      isConnecting
                        ? "bg-[var(--accent)] border-[var(--accent)] text-white scale-110 opacity-100"
                        : "opacity-0 group-hover:opacity-100 hover:scale-110"
                    }
                    ${
                      isDark
                        ? "bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-white"
                        : "bg-white border-zinc-300 text-zinc-500 hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-white"
                    }
                  `}
                  title="Ligar a outro elemento"
                >
                  <ArrowRight
                    size={12}
                  />
                </button>

                {/* =================================================
                    RESIZE
                ================================================= */}

                <div
                  onMouseDown={(e) =>
                    startResize(e, node)
                  }
                  className={`
                    resize-handle
                    absolute
                    -bottom-2
                    -right-2
                    z-30
                    w-5
                    h-5
                    rounded-md
                    border
                    shadow-md
                    flex
                    items-center
                    justify-center
                    cursor-se-resize
                    transition-all
                    opacity-0
                    group-hover:opacity-100
                    hover:scale-110
                    ${
                      isDark
                        ? "bg-zinc-900 border-zinc-700 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                        : "bg-white border-zinc-300 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                    }
                  `}
                  title="Redimensionar"
                >
                  <Scaling size={10} />
                </div>
              </div>
            );
          })}
        </div>

        {/* =====================================================
            EMPTY STATE
        ===================================================== */}

        {topic.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center max-w-xs">
              <div
                className={`
                  w-12
                  h-12
                  mx-auto
                  mb-4
                  rounded-2xl
                  flex
                  items-center
                  justify-center
                  border
                  ${
                    isDark
                      ? "bg-white/[0.03] border-white/[0.07]"
                      : "bg-white border-zinc-200"
                  }
                `}
              >
                <GitFork
                  size={19}
                  className={
                    isDark
                      ? "text-zinc-600"
                      : "text-zinc-400"
                  }
                />
              </div>

              <p
                className={`
                  text-sm
                  font-medium
                  ${
                    isDark
                      ? "text-zinc-400"
                      : "text-zinc-600"
                  }
                `}
              >
                Seu fluxo começa aqui
              </p>

              <p
                className={`
                  text-xs
                  mt-1.5
                  ${
                    isDark
                      ? "text-zinc-600"
                      : "text-zinc-400"
                  }
                `}
              >
                Adicione tópicos, anotações
                ou blocos de código.
              </p>

              <p
                className={`
                  text-xs
                  mt-3
                  ${
                    isDark
                      ? "text-zinc-700"
                      : "text-zinc-400"
                  }
                `}
              >
                Você também pode colar ou
                arrastar imagens.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}