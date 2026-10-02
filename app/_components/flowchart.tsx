"use client";

import React, {
  useEffect,
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
  Copy,
  Check,
} from "lucide-react";

import { Topic, Node } from "@/types";

interface FlowchartProps {
  topic: Topic;
  topics: Topic[];
  setTopics: React.Dispatch<
    React.SetStateAction<Topic[]>
  >;
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

const languages = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C",
  "C++",
  "C#",
  "HTML",
  "CSS",
  "SQL",
  "JSON",
  "Bash",
  "Outro",
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

  const canvasRef =
    useRef<HTMLDivElement>(null);

  const isDark = theme === "dark";

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
            (c) =>
              (c.from === connectingNodeId &&
                c.to === nodeId) ||
              (c.from === nodeId &&
                c.to === connectingNodeId)
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

    if (!node || !canvasRef.current) return;

    const rect =
      canvasRef.current.getBoundingClientRect();

    setDraggingNodeId(nodeId);

    setDragOffset({
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y,
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
        e.clientX - resizeState.startX;

      const deltaY =
        e.clientY - resizeState.startY;

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
      e.clientX -
        rect.left -
        dragOffset.x
    );

    const newY = Math.max(
      10,
      e.clientY -
        rect.top -
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
          ? 260
          : 130),
    });
  };

  const addImageNodeFromFile = (
    file: File,
    xPos = 160,
    yPos = 160
  ) => {
    if (!file.type.startsWith("image/")) return;

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

    const x =
      e.clientX - rect.left;

    const y =
      e.clientY - rect.top;

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
      x:
        150 +
        Math.random() * 80,
      y:
        150 +
        Math.random() * 80,
      width: 240,
      height: 140,
      color: "#3b82f6",
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
      x:
        180 +
        Math.random() * 80,
      y:
        180 +
        Math.random() * 80,
      width: 240,
      height: 130,
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

  const addCode = () => {
    const newNode: Node = {
      id: `code-${Date.now()}`,
      title: "Código",
      description: "",
      type: "code",
      x:
        200 +
        Math.random() * 80,
      y:
        200 +
        Math.random() * 80,
      width: 420,
      height: 280,
      language: "JavaScript",
      code: "",
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
                  (c) =>
                    c.from !== nodeId &&
                    c.to !== nodeId
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
                  (_, i) => i !== index
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
      minHeight: `${height}px`,
    };
  };

  return (
    <div
      className={`flex-1 flex flex-col h-full z-10 transition-colors duration-200 ${
        isDark
          ? "bg-black text-zinc-100"
          : "bg-white text-zinc-900"
      }`}
    >
      <div
        className={`h-14 border-b px-6 flex items-center justify-between backdrop-blur-md ${
          isDark
            ? "border-zinc-900/80 bg-zinc-950/90"
            : "border-zinc-200 bg-white/90"
        }`}
      >
        <div className="flex items-center gap-2">
          <GitFork
            size={16}
            className={
              isDark
                ? "text-zinc-400"
                : "text-zinc-500"
            }
          />

          <h2
            className={`text-sm font-medium ${
              isDark
                ? "text-zinc-200"
                : "text-zinc-800"
            }`}
          >
            {topic.name}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={undoConnection}
            disabled={
              topic.connections.length === 0
            }
            className={`flex items-center gap-1.5 border text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-30 ${
              isDark
                ? "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200"
                : "bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-800"
            }`}
          >
            <Undo2 size={13} />
            Desfazer conexão
          </button>

          <button
            onClick={addNote}
            className={`flex items-center gap-1.5 border text-xs px-3 py-1.5 rounded-lg transition-colors ${
              isDark
                ? "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200"
                : "bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-800"
            }`}
          >
            <Plus size={14} />
            Anotação
          </button>

          <button
            onClick={addCode}
            className={`flex items-center gap-1.5 border text-xs px-3 py-1.5 rounded-lg transition-colors ${
              isDark
                ? "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200"
                : "bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-800"
            }`}
          >
            <Code2 size={14} />
            Código
          </button>

          <button
            onClick={addNode}
            className={`flex items-center gap-1.5 border text-xs px-3 py-1.5 rounded-lg transition-colors ${
              isDark
                ? "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200"
                : "bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-800"
            }`}
          >
            <Plus size={14} />
            Tópico
          </button>
        </div>
      </div>

      <div
        ref={canvasRef}
        tabIndex={0}
        onMouseMove={handleMouseMoveCanvas}
        onMouseUp={handleMouseUpCanvas}
        onMouseLeave={handleMouseUpCanvas}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => {
          if (colorNodeId) {
            setColorNodeId(null);
          }
        }}
        className={`flex-1 relative overflow-auto outline-none transition-colors ${
          isDark
            ? "bg-black bg-[radial-gradient(#27272a_1px,transparent_1px)]"
            : "bg-white bg-[radial-gradient(#d4d4d8_1px,transparent_1px)]"
        } [background-size:20px_20px]`}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <polygon
                points="0 0, 8 4, 0 8"
                fill={
                  isDark
                    ? "#71717a"
                    : "#a1a1aa"
                }
              />
            </marker>
          </defs>

          {topic.connections.map(
            (conn, idx) => {
              const fromNode =
                topic.nodes.find(
                  (n) =>
                    n.id === conn.from
                );

              const toNode =
                topic.nodes.find(
                  (n) =>
                    n.id === conn.to
                );

              if (
                !fromNode ||
                !toNode
              )
                return null;

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

              const middleY =
                (startY + endY) / 2;

              const path = `
                M ${startX} ${startY}
                C ${middleX} ${startY},
                  ${middleX} ${endY},
                  ${endX} ${endY}
              `;

              return (
                <g key={idx}>
                  <path
                    d={path}
                    stroke={
                      isDark
                        ? "#52525b"
                        : "#a1a1aa"
                    }
                    strokeWidth="8"
                    fill="none"
                    opacity="0"
                    className="pointer-events-auto cursor-pointer"
                    onClick={() =>
                      deleteConnection(
                        idx
                      )
                    }
                  />

                  <path
                    d={path}
                    stroke={
                      isDark
                        ? "#71717a"
                        : "#a1a1aa"
                    }
                    strokeWidth="2"
                    fill="none"
                    markerEnd="url(#arrowhead)"
                    pointerEvents="none"
                  />

                  <g
                    transform={`translate(${middleX}, ${middleY})`}
                    className="pointer-events-auto cursor-pointer"
                    onClick={() =>
                      deleteConnection(
                        idx
                      )
                    }
                  >
                    <circle
                      r="10"
                      className={
                        isDark
                          ? "fill-zinc-900"
                          : "fill-white"
                      }
                      stroke={
                        isDark
                          ? "#52525b"
                          : "#a1a1aa"
                      }
                    />

                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="12"
                      className={
                        isDark
                          ? "fill-zinc-300"
                          : "fill-zinc-600"
                      }
                    >
                      ×
                    </text>
                  </g>
                </g>
              );
            }
          )}
        </svg>

        {topic.nodes.map((node) => {
          const nodeColor =
            node.color ||
            "#3b82f6";

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
                    ? `${nodeColor}18`
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
                ${
                  isImage
                    ? "rounded-xl"
                    : "rounded-xl border shadow-2xl"
                }
                ${
                  isImage
                    ? ""
                    : "backdrop-blur-md"
                }
                z-10
                cursor-move
                select-none
                group
                ${
                  isConnecting
                    ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-black"
                    : ""
                }
                ${
                  isImage
                    ? ""
                    : isDark
                    ? isMain
                      ? "bg-zinc-900/90"
                      : isTopic
                      ? "bg-zinc-900/80 border-transparent"
                      : isCode
                      ? "bg-zinc-950 border-zinc-800"
                      : "bg-zinc-950 border-zinc-800"
                    : isMain
                    ? "bg-white"
                    : isTopic
                    ? "bg-white border-transparent"
                    : isCode
                    ? "bg-zinc-950 border-zinc-200"
                    : "bg-zinc-50 border-zinc-200"
                }
              `}
            >
              {isImage ? (
                <div
                  className="relative w-full h-full min-h-[100px] flex flex-col overflow-visible"
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
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-1 text-zinc-500 p-4">
                      <ImageIcon
                        size={28}
                      />
                      <span className="text-xs mt-1">
                        Sem imagem
                      </span>
                    </div>
                  )}

                  {editingImageId ===
                    node.id && (
                    <div
                      className={`absolute bottom-2 left-2 right-2 z-30 rounded-lg p-2 ${
                        isDark
                          ? "bg-zinc-950/95"
                          : "bg-white/95"
                      }`}
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
                        placeholder="Digite uma descrição..."
                        rows={2}
                        className={`w-full bg-transparent text-[11px] outline-none resize-none ${
                          isDark
                            ? "text-zinc-200 placeholder:text-zinc-600"
                            : "text-zinc-700 placeholder:text-zinc-400"
                        }`}
                      />
                    </div>
                  )}

                  {node.imageDescription &&
                    editingImageId !==
                      node.id && (
                      <div
                        className={`absolute bottom-2 left-2 right-2 rounded-lg px-2 py-1 text-[11px] ${
                          isDark
                            ? "bg-black/80 text-zinc-300"
                            : "bg-white/90 text-zinc-600"
                        }`}
                      >
                        {
                          node.imageDescription
                        }
                      </div>
                    )}

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button
                      onClick={(e) =>
                        deleteNode(
                          node.id,
                          e
                        )
                      }
                      className={`p-1.5 rounded-lg border shadow-sm ${
                        isDark
                          ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                          : "bg-white border-zinc-200 text-zinc-500 hover:text-red-500"
                      }`}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div
                    className={`absolute bottom-2 right-2 text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                      isDark
                        ? "bg-black/70 text-zinc-400"
                        : "bg-white/80 text-zinc-500"
                    }`}
                  >
                    Duplo clique para descrever
                  </div>
                </div>
              ) : isCode ? (
                <div
                  className="w-full h-full flex flex-col"
                  onMouseDown={(e) =>
                    e.stopPropagation()
                  }
                >
                  <div
                    className={`flex items-center justify-between px-3 py-2 border-b ${
                      isDark
                        ? "border-zinc-800"
                        : "border-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Code2
                        size={14}
                        className="text-blue-500"
                      />

                      <input
                        value={
                          node.title ||
                          "Código"
                        }
                        onChange={(e) =>
                          updateNodeText(
                            node.id,
                            "title",
                            e.target.value
                          )
                        }
                        className={`bg-transparent outline-none text-xs font-semibold w-full ${
                          isDark
                            ? "text-zinc-200"
                            : "text-zinc-800"
                        }`}
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <select
                        value={
                          node.language ||
                          "JavaScript"
                        }
                        onChange={(e) =>
                          updateNodeText(
                            node.id,
                            "language",
                            e.target.value
                          )
                        }
                        className={`text-[10px] rounded-md px-2 py-1 outline-none ${
                          isDark
                            ? "bg-zinc-900 text-zinc-300 border-zinc-800"
                            : "bg-zinc-100 text-zinc-700 border-zinc-200"
                        }`}
                      >
                        {languages.map(
                          (language) => (
                            <option
                              key={language}
                              value={language}
                            >
                              {language}
                            </option>
                          )
                        )}
                      </select>

                      <button
                        onClick={() =>
                          copyCode(node)
                        }
                        className={`p-1.5 rounded-md ${
                          isDark
                            ? "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                            : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                        }`}
                        title="Copiar código"
                      >
                        {copiedCodeId ===
                        node.id ? (
                          <Check
                            size={13}
                          />
                        ) : (
                          <Copy
                            size={13}
                          />
                        )}
                      </button>

                      <button
                        onClick={(e) =>
                          deleteNode(
                            node.id,
                            e
                          )
                        }
                        className={`p-1.5 rounded-md ${
                          isDark
                            ? "text-zinc-500 hover:text-red-400"
                            : "text-zinc-400 hover:text-red-500"
                        }`}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={node.code || ""}
                    onChange={(e) =>
                      updateNodeText(
                        node.id,
                        "code",
                        e.target.value
                      )
                    }
                    spellCheck={false}
                    placeholder={`Cole seu código ${node.language || "aqui"}...`}
                    className={`flex-1 w-full p-3 resize-none outline-none font-mono text-[11px] leading-relaxed ${
                      isDark
                        ? "bg-zinc-950 text-zinc-300 placeholder:text-zinc-700"
                        : "bg-zinc-50 text-zinc-800 placeholder:text-zinc-400"
                    }`}
                  />

                  <div
                    className={`px-3 py-1.5 text-[9px] border-t ${
                      isDark
                        ? "border-zinc-800 text-zinc-600"
                        : "border-zinc-200 text-zinc-400"
                    }`}
                  >
                    {node.language ||
                      "JavaScript"}{" "}
                    • bloco de código
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-3.5 pb-1">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {isTopic && (
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              nodeColor,
                          }}
                        />
                      )}

                      <input
                        type="text"
                        value={
                          node.title
                        }
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
                          bg-transparent outline-none w-full mr-2
                          ${
                            isMain
                              ? "text-base font-bold text-center"
                              : "text-sm font-semibold"
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

                    <div className="flex items-center gap-1">
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
                            className={`p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${
                              isDark
                                ? "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                                : "hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"
                            }`}
                          >
                            <Palette
                              size={14}
                            />
                          </button>

                          {colorNodeId ===
                            node.id && (
                            <div
                              className={`absolute right-0 top-8 z-50 p-2.5 rounded-xl border shadow-2xl grid grid-cols-5 gap-2 color-picker ${
                                isDark
                                  ? "bg-zinc-950 border-zinc-800"
                                  : "bg-white border-zinc-200"
                              }`}
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
                                    className="w-6 h-6 rounded-full border border-white/20 hover:scale-110 transition-transform"
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
                        className={`p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${
                          connectingNodeId ===
                          node.id
                            ? "bg-blue-600 text-white opacity-100"
                            : isDark
                            ? "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                            : "hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"
                        }`}
                        title="Conectar nó"
                      >
                        <ArrowRight
                          size={14}
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
                          className={`p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${
                            isDark
                              ? "hover:bg-zinc-800 text-zinc-400 hover:text-red-400"
                              : "hover:bg-zinc-100 text-zinc-400 hover:text-red-500"
                          }`}
                        >
                          <X
                            size={14}
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 pt-1">
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
                      placeholder="Descrição..."
                      className={`w-full bg-transparent text-xs outline-none resize-none ${
                        isDark
                          ? "text-zinc-400 placeholder:text-zinc-700"
                          : "text-zinc-600 placeholder:text-zinc-400"
                      }`}
                      rows={3}
                      onMouseDown={(e) =>
                        e.stopPropagation()
                      }
                    />
                  </div>
                </>
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
                  absolute -right-3 top-1/2 -translate-y-1/2 z-30
                  w-7 h-7 rounded-full border shadow-lg flex items-center justify-center
                  transition-all duration-150
                  ${
                    isConnecting
                      ? "bg-blue-600 border-blue-400 text-white scale-110 opacity-100"
                      : "opacity-0 group-hover:opacity-100 hover:scale-110"
                  }
                  ${
                    isDark
                      ? "bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-blue-600 hover:border-blue-500 hover:text-white"
                      : "bg-white border-zinc-300 text-zinc-700 hover:bg-blue-600 hover:border-blue-500 hover:text-white"
                  }
                `}
                title="Ligar a outro elemento"
              >
                <ArrowRight size={13} />
              </button>

              <div
                onMouseDown={(e) =>
                  startResize(e, node)
                }
                className={`
                  resize-handle absolute -bottom-2 -right-2 z-30
                  w-6 h-6 rounded-md border shadow-md
                  flex items-center justify-center cursor-se-resize
                  transition-all opacity-0 group-hover:opacity-100 hover:scale-110
                  ${
                    isDark
                      ? "bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                      : "bg-white border-zinc-300 text-zinc-600 hover:bg-zinc-100"
                  }
                `}
                title="Redimensionar"
              >
                <Scaling size={12} />
              </div>
            </div>
          );
        })}

        {topic.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={`text-center ${
                isDark
                  ? "text-zinc-600"
                  : "text-zinc-400"
              }`}
            >
              <ImageIcon
                size={22}
                className="mx-auto mb-2 opacity-50"
              />

              <p className="text-xs">
                Ctrl + V para colar uma
                imagem
              </p>

              <p className="text-[10px] mt-1 opacity-70">
                Arraste imagens ou blocos
                pelo canvas
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}