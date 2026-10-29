"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Plus,
  Minus,
  StickyNote,
  Code2,
  Maximize2,
  LayoutTemplate,
  ExternalLink,
  X,
  Link2,
} from "lucide-react";

import { Node, Theme, Topic } from "@/types";
import { detectLanguage, AUTO_LANGUAGE } from "@/lib/code/highlight";
import { linkLabel, normalizeUrl } from "@/lib/link";

import { useAccent } from "@/lib/theme";
import { useSettings } from "@/lib/settings";

import CodeBlock from "./CodeBlock";

interface CodeFlowProps {
  topic: Topic;
  setTopics: React.Dispatch<React.SetStateAction<Topic[]>>;
  theme: Theme;
}

type TopicWithLink = Topic & { link?: string };

const CODE_W = 520;
const CODE_H = 380;
const NOTE_W = 260;
const NOTE_H = 150;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const sizeOf = (node: Node) => ({
  w: node.width ?? (node.type === "code" ? CODE_W : NOTE_W),
  h: node.height ?? (node.type === "code" ? CODE_H : NOTE_H),
});

function anchors(a: Node, b: Node) {
  const A = sizeOf(a);
  const B = sizeOf(b);

  const acx = a.x + A.w / 2;
  const acy = a.y + A.h / 2;
  const bcx = b.x + B.w / 2;
  const bcy = b.y + B.h / 2;

  const dx = bcx - acx;
  const dy = bcy - acy;

  if (Math.abs(dx) * 0.6 >= Math.abs(dy)) {
    const right = dx >= 0;

    return {
      horizontal: true,
      dir: right ? 1 : -1,
      x1: right ? a.x + A.w : a.x,
      y1: acy,
      x2: right ? b.x : b.x + B.w,
      y2: bcy,
    };
  }

  const down = dy >= 0;

  return {
    horizontal: false,
    dir: down ? 1 : -1,
    x1: acx,
    y1: down ? a.y + A.h : a.y,
    x2: bcx,
    y2: down ? b.y : b.y + B.h,
  };
}

function edgePath(a: Node, b: Node) {
  const p = anchors(a, b);

  if (p.horizontal) {
    const c = Math.max(60, Math.abs(p.x2 - p.x1) / 2);

    return {
      d: `M ${p.x1} ${p.y1} C ${p.x1 + p.dir * c} ${p.y1}, ${p.x2 - p.dir * c} ${p.y2}, ${p.x2} ${p.y2}`,
      mx: (p.x1 + p.x2) / 2,
      my: (p.y1 + p.y2) / 2,
    };
  }

  const c = Math.max(60, Math.abs(p.y2 - p.y1) / 2);

  return {
    d: `M ${p.x1} ${p.y1} C ${p.x1} ${p.y1 + p.dir * c}, ${p.x2} ${p.y2 - p.dir * c}, ${p.x2} ${p.y2}`,
    mx: (p.x1 + p.x2) / 2,
    my: (p.y1 + p.y2) / 2,
  };
}

type Drag =
  | { kind: "pan"; sx: number; sy: number; vx: number; vy: number }
  | { kind: "node"; id: string; sx: number; sy: number; nx: number; ny: number }
  | {
      kind: "resize";
      id: string;
      sx: number;
      sy: number;
      w: number;
      h: number;
      minW: number;
      minH: number;
    };

/** Fluxograma visual de código: limpo, escuro e com a cor de acento do app. */
export default function CodeFlow({ topic, setTopics, theme }: CodeFlowProps) {
  const dark = theme === "dark";
  const accent = useAccent();
  const { flowZoomSpeed } = useSettings();
  const zoomSpeedRef = useRef(flowZoomSpeed);
  zoomSpeedRef.current = flowZoomSpeed;
  const topicLink = (topic as TopicWithLink).link;

  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);

  const [view, setView] = useState({ x: 60, y: 60, zoom: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const nodes = topic.nodes;
  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes]
  );

  const patchTopic = useCallback(
    (fn: (t: Topic) => Topic) =>
      setTopics((current) => current.map((t) => (t.id === topic.id ? fn(t) : t))),
    [setTopics, topic.id]
  );

  const updateNode = useCallback(
    (id: string, changes: Partial<Node>) =>
      patchTopic((t) => ({
        ...t,
        nodes: t.nodes.map((n) => (n.id === id ? { ...n, ...changes } : n)),
      })),
    [patchTopic]
  );

  const deleteNode = (id: string) => {
    patchTopic((t) => ({
      ...t,
      nodes: t.nodes.filter((n) => n.id !== id),
      connections: t.connections.filter((c) => c.from !== id && c.to !== id),
    }));

    if (selectedId === id) setSelectedId(null);
    if (connectingFrom === id) setConnectingFrom(null);
  };

  const createConnection = (from: string, to: string) => {
    setConnectingFrom(null);
    if (from === to) return;

    patchTopic((t) =>
      t.connections.some((c) => c.from === from && c.to === to)
        ? t
        : { ...t, connections: [...t.connections, { from, to }] }
    );
  };

  const deleteEdge = (key: string) => {
    const [from, to] = key.split(">");
    patchTopic((t) => ({
      ...t,
      connections: t.connections.filter((c) => !(c.from === from && c.to === to)),
    }));
    setSelectedEdge(null);
  };

  const viewportCenter = () => {
    const el = viewportRef.current;
    const v = viewRef.current;
    if (!el) return { x: 100, y: 100 };

    return {
      x: (el.clientWidth / 2 - v.x) / v.zoom,
      y: (el.clientHeight / 2 - v.y) / v.zoom,
    };
  };

  const createCode = (initial = "") => {
    const center = viewportCenter();
    const shift = (nodes.length % 5) * 28;

    const node: Node = {
      id: `code-${Date.now()}`,
      title: "",
      description: "",
      type: "code",
      x: Math.round(center.x - CODE_W / 2 + shift),
      y: Math.round(center.y - CODE_H / 2 + shift),
      width: CODE_W,
      height: CODE_H,
      language: AUTO_LANGUAGE,
      code: initial,
    };

    patchTopic((t) => ({ ...t, nodes: [...t.nodes, node] }));
    setSelectedId(node.id);
  };

  const createNote = () => {
    const center = viewportCenter();
    const shift = (nodes.length % 5) * 28;

    const node: Node = {
      id: `note-${Date.now()}`,
      title: "",
      description: "",
      type: "note",
      x: Math.round(center.x - NOTE_W / 2 + shift),
      y: Math.round(center.y - NOTE_H / 2 + shift),
      width: NOTE_W,
      height: NOTE_H,
    };

    patchTopic((t) => ({ ...t, nodes: [...t.nodes, node] }));
    setSelectedId(node.id);
  };

  const copyCode = async (node: Node) => {
    try {
      await navigator.clipboard.writeText(node.code || "");
      setCopiedId(node.id);
      setTimeout(() => setCopiedId(null), 1400);
    } catch {
      // ignore
    }
  };

  const fitView = useCallback((list: Node[], maxZoom = 1) => {
    const el = viewportRef.current;
    if (!el || list.length === 0) {
      setView({ x: 60, y: 60, zoom: 1 });
      return;
    }

    const minX = Math.min(...list.map((n) => n.x));
    const minY = Math.min(...list.map((n) => n.y));
    const maxX = Math.max(...list.map((n) => n.x + sizeOf(n).w));
    const maxY = Math.max(...list.map((n) => n.y + sizeOf(n).h));

    const pad = 70;
    const zoom = clamp(
      Math.min(
        (el.clientWidth - pad * 2) / (maxX - minX),
        (el.clientHeight - pad * 2) / (maxY - minY),
        maxZoom
      ),
      0.25,
      maxZoom
    );

    setView({
      zoom,
      x: (el.clientWidth - (maxX - minX) * zoom) / 2 - minX * zoom,
      y: (el.clientHeight - (maxY - minY) * zoom) / 2 - minY * zoom,
    });
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => fitView(topic.nodes));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic.id]);

  const zoomBy = (factor: number) => {
    const el = viewportRef.current;
    if (!el) return;

    const v = viewRef.current;
    const px = el.clientWidth / 2;
    const py = el.clientHeight / 2;
    const zoom = clamp(v.zoom * factor, 0.25, 3);
    const wx = (px - v.x) / v.zoom;
    const wy = (py - v.y) / v.zoom;

    setView({ zoom, x: px - wx * zoom, y: py - wy * zoom });
  };

  const autoLayout = () => {
    if (nodes.length === 0) return;

    const layer: Record<string, number> = {};
    nodes.forEach((n) => (layer[n.id] = 0));

    for (let i = 0; i < nodes.length; i++) {
      let changed = false;
      topic.connections.forEach((c) => {
        if (
          layer[c.from] !== undefined &&
          layer[c.to] !== undefined &&
          layer[c.from] < nodes.length &&
          layer[c.to] < layer[c.from] + 1
        ) {
          layer[c.to] = layer[c.from] + 1;
          changed = true;
        }
      });
      if (!changed) break;
    }

    const columns: Node[][] = [];
    nodes.forEach((n) => {
      (columns[layer[n.id]] ||= []).push(n);
    });

    const placed = new Map<string, { x: number; y: number }>();
    let x = 60;

    columns.forEach((column) => {
      if (!column) return;
      let y = 60;
      column.forEach((n) => {
        placed.set(n.id, { x, y });
        y += sizeOf(n).h + 50;
      });
      x += Math.max(...column.map((n) => sizeOf(n).w)) + 130;
    });

    const next = nodes.map((n) => ({ ...n, ...(placed.get(n.id) ?? {}) }));
    patchTopic((t) => ({ ...t, nodes: next }));
    fitView(next);
  };

  useEffect(() => {
    const move = (e: MouseEvent) => {
      const d = drag.current;
      if (!d) return;

      const z = viewRef.current.zoom;

      if (d.kind === "pan") {
        setView((v) => ({
          ...v,
          x: d.vx + e.clientX - d.sx,
          y: d.vy + e.clientY - d.sy,
        }));
      } else if (d.kind === "node") {
        updateNode(d.id, {
          x: Math.round(d.nx + (e.clientX - d.sx) / z),
          y: Math.round(d.ny + (e.clientY - d.sy) / z),
        });
      } else {
        updateNode(d.id, {
          width: Math.max(d.minW, Math.round(d.w + (e.clientX - d.sx) / z)),
          height: Math.max(d.minH, Math.round(d.h + (e.clientY - d.sy) / z)),
        });
      }
    };

    const up = () => {
      drag.current = null;
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [updateNode]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const wheel = (e: WheelEvent) => {
      /* dentro de um editor com rolagem própria, o scroll continua rolando o código */
      const editor = (e.target as HTMLElement).closest("textarea") as HTMLTextAreaElement | null;

      if (editor && editor.scrollHeight > editor.clientHeight + 1) return;

      e.preventDefault();
      const v = viewRef.current;

      if (e.shiftKey) {
        /* Shift + roda: move o quadro */
        setView({ ...v, x: v.x - e.deltaY - e.deltaX, y: v.y });

        return;
      }

      /* roda do mouse: zoom, mantendo o ponto sob o cursor */
      /* um "clique" da roda vale no máximo ~100; trackpads mandam valores pequenos */
      const raw = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      const delta = clamp(raw, -100, 100);
      const speed = (zoomSpeedRef.current ?? 50) / 100;
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const zoom = clamp(v.zoom * Math.exp(-delta * 0.0012 * speed), 0.25, 3);
      const wx = (px - v.x) / v.zoom;
      const wy = (py - v.y) / v.zoom;

      setView({ zoom, x: px - wx * zoom, y: py - wy * zoom });
    };

    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);

  useEffect(() => {
    const isTyping = (target: EventTarget | null) =>
      !!(target as HTMLElement | null)?.closest(
        "input, textarea, select, [contenteditable='true']"
      );

    const paste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return;
      const text = e.clipboardData?.getData("text/plain") ?? "";

      if (text.split("\n").length >= 2 && detectLanguage(text)) {
        e.preventDefault();
        createCode(text);
      }
    };

    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setConnectingFrom(null);
        setSelectedEdge(null);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedEdge && !isTyping(e.target)) {
        deleteEdge(selectedEdge);
      }
    };

    window.addEventListener("paste", paste);
    window.addEventListener("keydown", key);

    return () => {
      window.removeEventListener("paste", paste);
      window.removeEventListener("keydown", key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEdge, nodes.length, topic.id]);

  const startNodeDrag = (e: React.MouseEvent, node: Node) => {
    if ((e.target as HTMLElement).closest("input, select, button, textarea")) return;
    e.stopPropagation();

    setSelectedId(node.id);
    setSelectedEdge(null);

    drag.current = {
      kind: "node",
      id: node.id,
      sx: e.clientX,
      sy: e.clientY,
      nx: node.x,
      ny: node.y,
    };
  };

  const startResize = (e: React.MouseEvent, node: Node) => {
    e.stopPropagation();
    e.preventDefault();

    const { w, h } = sizeOf(node);

    drag.current = {
      kind: "resize",
      id: node.id,
      sx: e.clientX,
      sy: e.clientY,
      w,
      h,
      minW: node.type === "code" ? 340 : 200,
      minH: node.type === "code" ? 240 : 110,
    };
  };

  const borderClass = dark ? "border-zinc-800" : "border-zinc-200";
  const textMuted = "text-zinc-400";
  const btnClass = `flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors ${
    dark
      ? "border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
  }`;

  const edgeColor = dark ? "#52525b" : "#a1a1aa";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Cabeçalho do Fluxograma */}
      <header
        className={`flex h-12 shrink-0 items-center justify-between gap-3 border-b px-4 ${borderClass} ${
          dark ? "bg-zinc-950" : "bg-white"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Code2 size={16} className={`shrink-0 ${dark ? "text-zinc-300" : "text-zinc-700"}`} />

          <input
            value={topic.name}
            onChange={(e) =>
              patchTopic((t) => ({ ...t, name: e.target.value }))
            }
            className={`w-56 min-w-0 bg-transparent text-sm font-semibold outline-none ${
              dark ? "text-zinc-100" : "text-zinc-900"
            }`}
          />

          <span className={`hidden text-xs md:block ${textMuted}`}>
            {nodes.filter((n) => n.type === "code").length} arquivos ·{" "}
            {topic.connections.length} ligações
          </span>

          {topicLink && (
            <a
              href={normalizeUrl(topicLink)}
              target="_blank"
              rel="noopener noreferrer"
              className={`hidden items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] sm:flex ${borderClass} ${textMuted} hover:text-zinc-200`}
            >
              <ExternalLink size={11} />
              {linkLabel(topicLink)}
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => createCode("")} className={btnClass}>
            <Plus size={13} />
            Código
          </button>

          <button onClick={createNote} className={btnClass}>
            <StickyNote size={13} />
            Nota
          </button>

          <button onClick={autoLayout} className={btnClass} title="Organizar em colunas">
            <LayoutTemplate size={13} />
            <span className="hidden lg:inline">Organizar</span>
          </button>

          <div className={`flex h-7 items-center rounded-md border ${borderClass}`}>
            <button
              onClick={() => zoomBy(1 / 1.15)}
              className={`flex h-full w-7 items-center justify-center ${textMuted} hover:text-zinc-100`}
            >
              <Minus size={13} />
            </button>

            <span className={`w-9 text-center text-[11px] ${textMuted}`}>
              {Math.round(view.zoom * 100)}%
            </span>

            <button
              onClick={() => zoomBy(1.15)}
              className={`flex h-full w-7 items-center justify-center ${textMuted} hover:text-zinc-100`}
            >
              <Plus size={13} />
            </button>
          </div>

          <button onClick={() => fitView(nodes, 1.6)} className={btnClass} title="Centralizar e ajustar à tela (o maior possível)" aria-label="Centralizar e ajustar à tela">
            <Maximize2 size={13} />
          </button>
        </div>
      </header>

      {/* Canvas / Área do Fluxograma */}
      <div
        ref={viewportRef}
        onMouseDown={(e) => {
          setSelectedId(null);
          setSelectedEdge(null);
          if (connectingFrom) setConnectingFrom(null);

          drag.current = {
            kind: "pan",
            sx: e.clientX,
            sy: e.clientY,
            vx: viewRef.current.x,
            vy: viewRef.current.y,
          };
        }}
        className="relative min-h-0 flex-1 cursor-grab overflow-hidden active:cursor-grabbing"
        style={{
          backgroundColor: dark ? "#09090b" : "#f4f4f5",
          backgroundImage: `radial-gradient(circle, ${
            dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"
          } 1px, transparent 1px)`,
          backgroundSize: `${24 * view.zoom}px ${24 * view.zoom}px`,
          backgroundPosition: `${view.x}px ${view.y}px`,
        }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
          }}
        >
          {/* Conexões (Setas SVG) */}
          <svg
            className="pointer-events-none absolute left-0 top-0 overflow-visible"
            width={1}
            height={1}
          >
            <defs>
              <marker
                id="cf-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto"
              >
                <path d="M0 0 L10 5 L0 10 z" fill={edgeColor} />
              </marker>

              <marker
                id="cf-arrow-sel"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto"
              >
                <path d="M0 0 L10 5 L0 10 z" fill={accent} />
              </marker>
            </defs>

            {topic.connections.map((connection) => {
              const from = nodeById.get(connection.from);
              const to = nodeById.get(connection.to);

              if (!from || !to) return null;

              const key = `${connection.from}>${connection.to}`;
              const selected = selectedEdge === key;
              const { d, mx, my } = edgePath(from, to);

              return (
                <g key={key}>
                  <path
                    d={d}
                    fill="none"
                    stroke={selected ? accent : edgeColor}
                    strokeWidth={selected ? 2.5 : 1.8}
                    markerEnd={`url(#${selected ? "cf-arrow-sel" : "cf-arrow"})`}
                  />

                  <path
                    d={d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={16}
                    style={{ pointerEvents: "stroke", cursor: "pointer" }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setSelectedEdge(key);
                      setSelectedId(null);
                    }}
                  />

                  {selected && (
                    <g
                      transform={`translate(${mx}, ${my})`}
                      style={{ pointerEvents: "all", cursor: "pointer" }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        deleteEdge(key);
                      }}
                    >
                      <circle r={11} fill={dark ? "#18181b" : "#ffffff"} stroke={dark ? "#52525b" : "#d4d4d8"} strokeWidth={1.5} />
                      <path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" />
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Renderização dos Blocos */}
          {nodes.map((node) => {
            const { w, h } = sizeOf(node);
            const selected = selectedId === node.id;
            const isSource = connectingFrom === node.id;
            const isTarget = !!connectingFrom && !isSource;

            const ring = isSource
              ? "ring-2 ring-[var(--accent)]"
              : isTarget
                ? "ring-1 ring-[var(--accent)]"
                : selected
                  ? dark
                    ? "ring-1 ring-zinc-500"
                    : "ring-1 ring-zinc-400"
                  : "";

            return (
              <div
                key={node.id}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (connectingFrom && connectingFrom !== node.id) {
                    createConnection(connectingFrom, node.id);
                    return;
                  }
                  setSelectedId(node.id);
                  setSelectedEdge(null);
                }}
                className={`absolute rounded-xl border shadow-sm ${ring} ${
                  isTarget ? "cursor-pointer" : "cursor-default"
                } ${
                  node.type === "code"
                    ? dark
                      ? "border-zinc-800 bg-zinc-950"
                      : "border-zinc-200 bg-white"
                    : dark
                      ? "border-zinc-800 bg-zinc-900/90"
                      : "border-zinc-200 bg-zinc-50"
                }`}
                style={{ left: node.x, top: node.y, width: w, height: h }}
              >
                {node.type === "code" ? (
                  <CodeBlock
                    node={node}
                    isDark={dark}
                    copied={copiedId === node.id}
                    isSource={isSource}
                    onChange={(changes) => updateNode(node.id, changes)}
                    onCopy={() => copyCode(node)}
                    onDelete={() => deleteNode(node.id)}
                    onConnect={() =>
                      setConnectingFrom((current) =>
                        current === node.id ? null : node.id
                      )
                    }
                    onHeaderMouseDown={(e) => startNodeDrag(e, node)}
                  />
                ) : (
                  <div className="flex h-full flex-col overflow-hidden rounded-xl">
                    <div
                      onMouseDown={(e) => startNodeDrag(e, node)}
                      className={`flex h-8 shrink-0 cursor-grab items-center justify-between border-b px-3 active:cursor-grabbing ${borderClass}`}
                    >
                      <StickyNote size={12} className={textMuted} />

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            setConnectingFrom((current) =>
                              current === node.id ? null : node.id
                            )
                          }
                          className={`rounded p-1 transition-colors ${
                            isSource
                              ? dark ? "bg-zinc-800 text-zinc-100" : "bg-zinc-200 text-zinc-900"
                              : textMuted + " hover:text-zinc-200"
                          }`}
                          title="Ligar a outro bloco"
                        >
                          <Link2 size={12} />
                        </button>

                        <button
                          onClick={() => deleteNode(node.id)}
                          className={`rounded p-1 ${textMuted} hover:text-red-500`}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>

                    <input
                      value={node.title ?? ""}
                      onChange={(e) => updateNode(node.id, { title: e.target.value })}
                      placeholder="Título da nota"
                      className={`bg-transparent px-3 pt-2 text-xs font-semibold outline-none ${
                        dark ? "text-zinc-100 placeholder:text-zinc-600" : "text-zinc-900 placeholder:text-zinc-400"
                      }`}
                    />

                    <textarea
                      value={node.description ?? ""}
                      onChange={(e) =>
                        updateNode(node.id, { description: e.target.value })
                      }
                      placeholder="Escreva uma anotação, ideia ou lembrete..."
                      className={`min-h-0 flex-1 resize-none bg-transparent px-3 py-2 text-[11px] leading-relaxed outline-none ${
                        dark
                          ? "text-zinc-300 placeholder:text-zinc-600"
                          : "text-zinc-700 placeholder:text-zinc-400"
                      }`}
                    />
                  </div>
                )}

                {/* Alça de redimensionar canto inferior direito */}
                <div
                  onMouseDown={(e) => startResize(e, node)}
                  className="absolute -bottom-1 -right-1 h-4 w-4 cursor-se-resize"
                >
                  <span
                    className={`absolute bottom-1.5 right-1.5 h-2 w-2 border-b-2 border-r-2 ${
                      dark ? "border-zinc-700" : "border-zinc-300"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Aviso de Ligação Ativa */}
        {connectingFrom && (
          <div className={`pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-md border px-4 py-2 text-xs shadow-sm ${
            dark ? "border-zinc-700 bg-zinc-900 text-zinc-200" : "border-zinc-300 bg-white text-zinc-800"
          }`}>
            Clique no bloco de destino · Esc cancela
          </div>
        )}

        {/* Estado Vazio */}
        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="max-w-sm text-center">
              <Code2 size={28} className={`mx-auto mb-4 ${textMuted}`} />

              <p className={`text-sm font-semibold ${dark ? "text-zinc-100" : "text-zinc-900"}`}>
                Cole um código para começar
              </p>

              <p className={`mt-2 text-xs leading-relaxed ${textMuted}`}>
                Aperte Ctrl+V com um código copiado, ou clique em “Código”. Cada arquivo vira um
                bloco; ligue um ao outro com o ícone de corrente.
              </p>
            </div>
          </div>
        )}

        {/* Rodapé de Dicas de Atalho */}
        <div className={`pointer-events-none absolute bottom-3 right-4 text-xs ${textMuted}`}>
          Roda do mouse: zoom · arraste o fundo: mover · Shift + roda: lateral
        </div>
      </div>
    </div>
  );
}