"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Crosshair,
  Download,
  Flame,
  GitFork,
  History,
  Image as ImageIcon,
  Info,
  Layers,
  LayoutTemplate,
  Link2,
  ListChecks,
  Maximize2,
  Palette,
  Pencil,
  Plus,
  Scaling,
  Search,
  Sparkles,
  StickyNote,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Connection, Node, NodeStatus, Topic } from "@/types";
import { DEFAULT_ACCENT, useAccent, withAlpha } from "@/lib/theme";
import { useSettings } from "@/lib/settings";
import { AUTO_LANGUAGE, detectLanguage } from "@/lib/code/highlight";
import {
  NODE_COLORS,
  NODE_STATUSES,
  buildTemplate,
  checklistStats,
  cloneNodes,
  connKey,
  connectionGeometry,
  connectionLook,
  dashFor,
  describeNodeChanges,
  formatShortDay,
  getCategory,
  getPriority,
  getStatus,
  isOverdue,
  makeVersion,
  nodeLabel,
  nodeRect,
  nodeSearchText,
  nowIso,
  pushVersion,
  uid,
} from "@/lib/flow";
import { downloadBlob, exportJson, exportMarkdown, exportPng, slugify } from "@/lib/flowExport";

import CodeNode from "../code/codenode";
import FlowConnectionPanel from "./FlowConnectionPanel";
import { FlowHelpModal, FlowTemplatesModal, FlowVersionsModal } from "./FlowDialogs";
import FlowMinimap from "./FlowMinimap";
import FlowNodeEditor, { type Tab } from "./FlowNodeEditor";
import CodeFullscreenModal from "../code/CodeFullscreenModal";

interface FlowchartProps {
  topic: Topic;
  setTopics: React.Dispatch<React.SetStateAction<Topic[]>>;
  theme: "dark" | "light";
  /** abre a janela de editar nome, pasta, prazo e link */
  onEditTopic?: () => void;
  /** cria uma cópia do fluxograma inteiro */
  onDuplicateTopic?: () => void;
}

type Drag =
  | { kind: "pan"; sx: number; sy: number; vx: number; vy: number }
  | { kind: "move"; sx: number; sy: number; origins: { id: string; x: number; y: number }[]; pushed: boolean }
  | { kind: "resize"; id: string; sx: number; sy: number; w: number; h: number; pushed: boolean }
  | { kind: "marquee"; sx: number; sy: number; cx: number; cy: number; base: string[] };

interface Snapshot {
  nodes: Node[];
  connections: Connection[];
}

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
const HELP_KEY = "yourmind_flow_help_seen";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const HandIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.4L3.4 16a2 2 0 0 1 3.2-2.4L8 15" />
  </svg>
);

const CursorIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
  </svg>
);

/** Lê a imagem; se for pesada, reduz para caber melhor no armazenamento do navegador. */
function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Não consegui ler a imagem."));

    reader.onload = () => {
      const src = String(reader.result);

      if (file.size < 600_000) {
        resolve(src);

        return;
      }

      const img = new Image();

      img.onload = () => {
        const ratio = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement("canvas");

        canvas.width = Math.round(img.naturalWidth * ratio);
        canvas.height = Math.round(img.naturalHeight * ratio);

        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(src);

          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };

      img.onerror = () => resolve(src);
      img.src = src;
    };

    reader.readAsDataURL(file);
  });
}

export default function Flowchart({ topic, setTopics, theme, onEditTopic, onDuplicateTopic }: FlowchartProps) {
  const isDark = theme === "dark";
  const accent = useAccent();
  const { flowZoomSpeed } = useSettings();

  const zoomSpeedRef = useRef(flowZoomSpeed);
  zoomSpeedRef.current = flowZoomSpeed;

  const topicRef = useRef(topic);
  topicRef.current = topic;

  const nodes = topic.nodes;
  const connections = topic.connections;

  /* Durante o arrasto os blocos e as linhas são movidos direto na tela (sem re-renderizar o React).
     As novas posições só são gravadas no fluxograma ao soltar o mouse. */
  const liveRef = useRef<Record<string, Partial<Node>>>({});
  const liveFrame = useRef<number | null>(null);
  const nodeEls = useRef(new Map<string, HTMLElement>());

  const previewLive = () => {
    liveFrame.current = null;

    const changes: Record<string, Partial<Node>> = liveRef.current;
    const world = worldRef.current;
    const t = topicRef.current;

    Object.entries(changes).forEach(([id, c]) => {
      const el = nodeEls.current.get(id);

      if (!el) return;

      if (c.x !== undefined) el.style.left = `${c.x}px`;
      if (c.y !== undefined) el.style.top = `${c.y}px`;
      if (c.width !== undefined) el.style.width = `${c.width}px`;
      if (c.height !== undefined) el.style.height = `${c.height}px`;
    });

    if (!world) return;

    const byId = new Map(t.nodes.map((n) => [n.id, changes[n.id] ? { ...n, ...changes[n.id] } : n]));

    t.connections.forEach((conn) => {
      if (!changes[conn.from] && !changes[conn.to]) return;

      const a = byId.get(conn.from);
      const b = byId.get(conn.to);

      if (!a || !b) return;

      const g = connectionGeometry(nodeRect(a), nodeRect(b), connectionLook(conn).shape);
      const group = world.querySelector(`[data-edge="${CSS.escape(connKey(conn))}"]`);

      if (!group) return;

      group.querySelectorAll("path[data-geo]").forEach((path) => path.setAttribute("d", g.d));
      group.querySelector("[data-label]")?.setAttribute("transform", `translate(${g.mx}, ${g.my})`);
    });
  };

  const scheduleLive = () => {
    if (liveFrame.current === null) liveFrame.current = requestAnimationFrame(previewLive);
  };

  const renderNodes = nodes;

  const nodeById = useMemo(() => new Map(renderNodes.map((n) => [n.id, n])), [renderNodes]);

  /* ---------- tela ---------- */
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 80, y: 80, zoom: 1 });
  const viewRef = useRef(view);
  const viewTimer = useRef<number | null>(null);
  const [tool, setTool] = useState<"hand" | "select">("hand");

  /** Muda o enquadramento direto na tela (sem re-renderizar os blocos) e avisa o React logo depois. */
  const applyView = useCallback((v: { x: number; y: number; zoom: number }, immediate = false) => {
    viewRef.current = v;

    if (worldRef.current) {
      worldRef.current.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.zoom})`;
    }

    if (viewportRef.current) {
      viewportRef.current.style.backgroundSize = `${24 * v.zoom}px ${24 * v.zoom}px`;
      viewportRef.current.style.backgroundPosition = `${v.x}px ${v.y}px`;
    }

    if (immediate) {
      if (viewTimer.current !== null) {
        clearTimeout(viewTimer.current);
        viewTimer.current = null;
      }

      setView(v);

      return;
    }

    /* só avisa o React depois que o movimento parar: durante o zoom/arrasto nada é redesenhado */
    if (viewTimer.current !== null) clearTimeout(viewTimer.current);

    viewTimer.current = window.setTimeout(() => {
      viewTimer.current = null;
      setView(viewRef.current);
    }, 180);
  }, []);

  useEffect(
    () => () => {
      if (viewTimer.current !== null) clearTimeout(viewTimer.current);
      if (liveFrame.current !== null) cancelAnimationFrame(liveFrame.current);
    },
    []
  );
  const [vpSize, setVpSize] = useState({ w: 0, h: 0 });
  const [showMinimap, setShowMinimap] = useState(true);

  /* ---------- seleção e ferramentas ---------- */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedRef = useRef<string[]>([]);
  selectedRef.current = selectedIds;
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
  const setSelectedId = (id: string | null) => setSelectedIds(id ? [id] : []);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<{ from: string } | null>(null);
  const [popover, setPopover] = useState<{ id: string; kind: "status" | "color" } | null>(null);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  /* ---------- janelas ---------- */
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState<Tab>("general");
  const [codeModalId, setCodeModalId] = useState<string | null>(null);

  const openEditor = (id: string, tab: Tab = "general") => {
    setEditorTab(tab);
    setEditingNodeId(id);
  };
  const [showTemplates, setShowTemplates] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const modalOpen = !!editingNodeId || !!codeModalId || showTemplates || showVersions || showHelp;

  /* ---------- busca ---------- */
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<NodeStatus | "all">("all");
  const [matchIndex, setMatchIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  /* ---------- aviso e salvamento ---------- */
  const [toast, setToast] = useState<{ text: string; undo?: boolean } | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const drag = useRef<Drag | null>(null);

  /* =========================================================
     EDIÇÃO + DESFAZER / REFAZER
  ========================================================= */

  const patchTopic = useCallback(
    (fn: (t: Topic) => Topic) =>
      setTopics((current) => current.map((t) => (t.id === topic.id ? fn(t) : t))),
    [setTopics, topic.id]
  );

  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const lastPush = useRef({ key: "", at: 0 });
  const [, setHistoryTick] = useState(0);

  /** Guarda o estado atual para o Ctrl+Z. Com `key`, digitações seguidas viram um passo só. */
  const pushHistory = useCallback((key?: string) => {
    const now = Date.now();

    if (key && lastPush.current.key === key && now - lastPush.current.at < 1500) {
      lastPush.current.at = now;

      return;
    }

    lastPush.current = { key: key ?? "", at: now };

    past.current.push({ nodes: topicRef.current.nodes, connections: topicRef.current.connections });

    if (past.current.length > 80) past.current.shift();

    future.current = [];
    setHistoryTick((t) => t + 1);
  }, []);

  const showToast = (text: string, undo = false) => setToast({ text, undo });

  const undo = () => {
    const previous = past.current.pop();

    if (!previous) return;

    future.current.push({ nodes: topicRef.current.nodes, connections: topicRef.current.connections });
    lastPush.current = { key: "", at: 0 };
    patchTopic((t) => ({ ...t, nodes: previous.nodes, connections: previous.connections }));
    setSelectedId(null);
    setSelectedEdge(null);
    setHistoryTick((t) => t + 1);
  };

  const redo = () => {
    const next = future.current.pop();

    if (!next) return;

    past.current.push({ nodes: topicRef.current.nodes, connections: topicRef.current.connections });
    lastPush.current = { key: "", at: 0 };
    patchTopic((t) => ({ ...t, nodes: next.nodes, connections: next.connections }));
    setSelectedId(null);
    setSelectedEdge(null);
    setHistoryTick((t) => t + 1);
  };

  const updateNode = useCallback(
    (id: string, changes: Partial<Node>) =>
      patchTopic((t) => ({
        ...t,
        nodes: t.nodes.map((n) => (n.id === id ? { ...n, ...changes } : n)),
      })),
    [patchTopic]
  );

  /** Edição que também entra no histórico do bloco (status, cor, janela de edição...). */
  const applyEdit = (id: string, changes: Partial<Node>) => {
    const before = topicRef.current.nodes.find((n) => n.id === id);

    if (!before) return;

    const after = { ...before, ...changes };
    const entries = describeNodeChanges(before, after);

    pushHistory();
    updateNode(id, { ...changes, history: [...(before.history ?? []), ...entries].slice(-100) });
  };

  /** Edição de texto direto no bloco (sem poluir o histórico do bloco). */
  const typeInNode = (id: string, changes: Partial<Node>, field: string) => {
    pushHistory(`type-${id}-${field}`);
    updateNode(id, changes);
  };

  const updateConnection = (key: string, changes: Partial<Connection>) => {
    pushHistory(`conn-${key}`);

    patchTopic((t) => ({
      ...t,
      connections: t.connections.map((c) => (connKey(c) === key ? { ...c, ...changes } : c)),
    }));
  };

  const deleteConnection = (key: string) => {
    pushHistory();
    patchTopic((t) => ({ ...t, connections: t.connections.filter((c) => connKey(c) !== key) }));
    setSelectedEdge(null);
  };

  const reverseConnection = (key: string) => {
    pushHistory();

    patchTopic((t) => ({
      ...t,
      connections: t.connections.map((c) =>
        connKey(c) === key ? { ...c, id: c.id ?? uid("conn"), from: c.to, to: c.from } : c
      ),
    }));

    setSelectedEdge(null);
  };

  const deleteNode = (id: string) => {
    const node = topicRef.current.nodes.find((n) => n.id === id);

    if (!node || node.type === "main") {
      if (node) showToast("O bloco principal não pode ser excluído.");

      return;
    }

    pushHistory();

    patchTopic((t) => ({
      ...t,
      nodes: t.nodes.filter((n) => n.id !== id),
      connections: t.connections.filter((c) => c.from !== id && c.to !== id),
    }));

    if (selectedId === id) setSelectedId(null);
    if (connecting?.from === id) setConnecting(null);

    showToast("Bloco excluído.", true);
  };

  const deleteNodes = (ids: string[]) => {
    const removable = new Set(topicRef.current.nodes.filter((n) => ids.includes(n.id) && n.type !== "main").map((n) => n.id));

    if (removable.size === 0) {
      showToast("O bloco principal não pode ser excluído.");

      return;
    }

    pushHistory();

    patchTopic((t) => ({
      ...t,
      nodes: t.nodes.filter((n) => !removable.has(n.id)),
      connections: t.connections.filter((c) => !removable.has(c.from) && !removable.has(c.to)),
    }));

    setSelectedIds([]);
    showToast(`${removable.size} blocos excluídos.`, true);
  };

  const duplicateSelection = () => {
    const ids = selectedRef.current;
    const source = topicRef.current.nodes.filter((n) => ids.includes(n.id));

    if (source.length === 0) return;

    const copy = cloneNodes(source, topicRef.current.connections, { x: 40, y: 40 }, { demoteMain: true });

    pushHistory();
    patchTopic((t) => ({ ...t, nodes: [...t.nodes, ...copy.nodes], connections: [...t.connections, ...copy.connections] }));
    setSelectedIds(copy.nodes.map((n) => n.id));
    showToast(source.length > 1 ? `${source.length} blocos duplicados.` : "Bloco duplicado.");
  };

  const toggleChecklistItem = (id: string, itemId: string) => {
    const node = topicRef.current.nodes.find((n) => n.id === id);

    if (!node) return;

    applyEdit(id, {
      checklist: (node.checklist ?? []).map((item) => (item.id === itemId ? { ...item, completed: !item.completed } : item)),
    });
  };

  const duplicateNode = (id: string) => {
    const node = topicRef.current.nodes.find((n) => n.id === id);

    if (!node) return;

    const copy = cloneNodes([node], [], { x: 40, y: 40 }, { demoteMain: true });

    pushHistory();
    patchTopic((t) => ({ ...t, nodes: [...t.nodes, ...copy.nodes] }));
    setSelectedId(copy.nodes[0].id);
    showToast("Bloco duplicado.");
  };

  /* =========================================================
     NAVEGAÇÃO (zoom, mover, ajustar)
  ========================================================= */

  const viewportCenter = () => {
    const el = viewportRef.current;
    const v = viewRef.current;

    if (!el) return { x: 200, y: 200 };

    return { x: (el.clientWidth / 2 - v.x) / v.zoom, y: (el.clientHeight / 2 - v.y) / v.zoom };
  };

  const fitView = useCallback((list: Node[], maxZoom = 1.2) => {
    const el = viewportRef.current;

    if (!el || list.length === 0) {
      applyView({ x: 80, y: 80, zoom: 1 }, true);

      return;
    }

    const rects = list.map(nodeRect);
    const minX = Math.min(...rects.map((r) => r.x));
    const minY = Math.min(...rects.map((r) => r.y));
    const maxX = Math.max(...rects.map((r) => r.x + r.w));
    const maxY = Math.max(...rects.map((r) => r.y + r.h));
    const pad = 80;

    const zoom = clamp(
      Math.min(
        (el.clientWidth - pad * 2) / Math.max(1, maxX - minX),
        (el.clientHeight - pad * 2) / Math.max(1, maxY - minY),
        maxZoom
      ),
      MIN_ZOOM,
      maxZoom
    );

    applyView(
      {
        zoom,
        x: (el.clientWidth - (maxX - minX) * zoom) / 2 - minX * zoom,
        y: (el.clientHeight - (maxY - minY) * zoom) / 2 - minY * zoom,
      },
      true
    );
  }, [applyView]);

  const centerOnPoint = useCallback((wx: number, wy: number, zoom?: number) => {
    const el = viewportRef.current;

    if (!el) return;

    const z = zoom ?? viewRef.current.zoom;

    applyView({ zoom: z, x: el.clientWidth / 2 - wx * z, y: el.clientHeight / 2 - wy * z }, true);
  }, [applyView]);

  const zoomBy = (factor: number) => {
    const el = viewportRef.current;

    if (!el) return;

    const v = viewRef.current;
    const px = el.clientWidth / 2;
    const py = el.clientHeight / 2;
    const zoom = clamp(v.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    const wx = (px - v.x) / v.zoom;
    const wy = (py - v.y) / v.zoom;

    applyView({ zoom, x: px - wx * zoom, y: py - wy * zoom }, true);
  };

  const focusNode = (id: string) => {
    const node = topicRef.current.nodes.find((n) => n.id === id);

    if (!node) return;

    const r = nodeRect(node);

    setSelectedId(id);
    centerOnPoint(r.x + r.w / 2, r.y + r.h / 2, Math.max(viewRef.current.zoom, 0.8));
  };

  /* ajusta ao abrir */
  useEffect(() => {
    const frame = requestAnimationFrame(() => fitView(topicRef.current.nodes));

    return () => cancelAnimationFrame(frame);
  }, [topic.id, fitView]);

  /* tamanho da área (para o minimapa) */
  useEffect(() => {
    const el = viewportRef.current;

    if (!el) return;

    const measure = () => setVpSize({ w: el.clientWidth, h: el.clientHeight });

    measure();

    const observer = new ResizeObserver(measure);

    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  /* roda do mouse: zoom no cursor; Shift + roda: move para o lado */
  useEffect(() => {
    const el = viewportRef.current;

    if (!el) return;

    const wheel = (e: WheelEvent) => {
      const scrollable = (e.target as HTMLElement).closest("textarea, select") as HTMLElement | null;

      if (scrollable && scrollable.scrollHeight > scrollable.clientHeight + 1) return;

      e.preventDefault();

      const v = viewRef.current;

      if (e.shiftKey) {
        applyView({ ...v, x: v.x - e.deltaY - e.deltaX });

        return;
      }

      const raw = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      const delta = clamp(raw, -100, 100);
      const speed = (zoomSpeedRef.current ?? 50) / 100;
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const zoom = clamp(v.zoom * Math.exp(-delta * 0.0012 * speed), MIN_ZOOM, MAX_ZOOM);
      const wx = (px - v.x) / v.zoom;
      const wy = (py - v.y) / v.zoom;

      applyView({ zoom, x: px - wx * zoom, y: py - wy * zoom });
    };

    el.addEventListener("wheel", wheel, { passive: false });

    return () => el.removeEventListener("wheel", wheel);
  }, [applyView]);

  /* arrastar: mover o quadro, mover blocos (um ou vários), redimensionar e caixa de seleção */
  useEffect(() => {
    const move = (e: MouseEvent) => {
      const d = drag.current;

      if (!d) return;

      const z = viewRef.current.zoom;

      if (d.kind === "pan") {
        applyView({ ...viewRef.current, x: d.vx + e.clientX - d.sx, y: d.vy + e.clientY - d.sy });

        return;
      }

      if (d.kind === "marquee") {
        d.cx = e.clientX;
        d.cy = e.clientY;

        const box = marqueeRef.current;
        const rect = viewportRef.current?.getBoundingClientRect();

        if (box && rect) {
          box.style.display = "block";
          box.style.left = `${Math.min(d.sx, d.cx) - rect.left}px`;
          box.style.top = `${Math.min(d.sy, d.cy) - rect.top}px`;
          box.style.width = `${Math.abs(d.cx - d.sx)}px`;
          box.style.height = `${Math.abs(d.cy - d.sy)}px`;
        }

        return;
      }

      if (!d.pushed) {
        if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) <= 3) return;

        d.pushed = true;
      }

      if (d.kind === "move") {
        const next: Record<string, Partial<Node>> = {};

        d.origins.forEach((o) => {
          next[o.id] = {
            x: Math.round(o.x + (e.clientX - d.sx) / z),
            y: Math.round(o.y + (e.clientY - d.sy) / z),
          };
        });

        liveRef.current = next;
      } else {
        liveRef.current = {
          [d.id]: {
            width: Math.max(160, Math.round(d.w + (e.clientX - d.sx) / z)),
            height: Math.max(100, Math.round(d.h + (e.clientY - d.sy) / z)),
          },
        };
      }

      scheduleLive();
    };

    const up = () => {
      const d = drag.current;

      drag.current = null;

      if (!d) return;

      if (d.kind === "pan") {
        applyView(viewRef.current, true);

        return;
      }

      if (d.kind === "marquee") {
        if (marqueeRef.current) marqueeRef.current.style.display = "none";

        const el = viewportRef.current;

        if (!el || Math.abs(d.cx - d.sx) + Math.abs(d.cy - d.sy) < 4) return;

        const rect = el.getBoundingClientRect();
        const v = viewRef.current;
        const x1 = (Math.min(d.sx, d.cx) - rect.left - v.x) / v.zoom;
        const x2 = (Math.max(d.sx, d.cx) - rect.left - v.x) / v.zoom;
        const y1 = (Math.min(d.sy, d.cy) - rect.top - v.y) / v.zoom;
        const y2 = (Math.max(d.sy, d.cy) - rect.top - v.y) / v.zoom;

        const hits = topicRef.current.nodes
          .filter((n) => {
            const r = nodeRect(n);

            return r.x < x2 && r.x + r.w > x1 && r.y < y2 && r.y + r.h > y1;
          })
          .map((n) => n.id);

        setSelectedIds(Array.from(new Set([...d.base, ...hits])));

        return;
      }

      const changes = liveRef.current;

      if (liveFrame.current !== null) {
        cancelAnimationFrame(liveFrame.current);
        liveFrame.current = null;
      }

      liveRef.current = {};

      if (Object.keys(changes).length === 0) return;

      pushHistory();
      patchTopic((t) => ({ ...t, nodes: t.nodes.map((n) => (changes[n.id] ? { ...n, ...changes[n.id] } : n)) }));
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyView, patchTopic, pushHistory]);

  /* =========================================================
     CRIAR BLOCOS
  ========================================================= */

  const spawnPoint = (w: number, h: number) => {
    const c = viewportCenter();
    const jitter = () => (Math.random() - 0.5) * 60;

    return { x: Math.round(c.x - w / 2 + jitter()), y: Math.round(c.y - h / 2 + jitter()) };
  };

  const addBlock = (type: "topic" | "note" | "code", initialCode = "") => {
    const size =
      type === "code"
        ? { w: 460, h: 300 }
        : type === "note"
          ? { w: 320, h: 230 }
          : { w: 320, h: 250 };

    const p = spawnPoint(size.w, size.h);

    const node: Node = {
      id: uid(type === "code" ? "code" : "node"),
      title: "",
      description: "",
      type,
      x: p.x,
      y: p.y,
      width: size.w,
      height: size.h,
      history: [{ id: uid("h"), at: nowIso(), text: "Bloco criado." }],
      ...(type === "topic" ? { color: DEFAULT_ACCENT, status: "todo" as const } : {}),
      ...(type === "code" ? { language: AUTO_LANGUAGE, code: initialCode } : {}),
    };

    pushHistory();
    patchTopic((t) => ({ ...t, nodes: [...t.nodes, node] }));
    setSelectedId(node.id);
    setSelectedEdge(null);
  };

  const addImage = async (file: File, wx?: number, wy?: number) => {
    if (!file.type.startsWith("image/")) return;

    try {
      const imageUrl = await readImage(file);
      const p = wx !== undefined && wy !== undefined ? { x: wx, y: wy } : spawnPoint(320, 240);

      const node: Node = {
        id: uid("image"),
        title: "",
        description: "",
        type: "image",
        x: Math.round(p.x),
        y: Math.round(p.y),
        width: 320,
        height: 240,
        imageUrl,
        imageDescription: "",
        history: [{ id: uid("h"), at: nowIso(), text: "Imagem adicionada." }],
      };

      pushHistory();
      patchTopic((t) => ({ ...t, nodes: [...t.nodes, node] }));
      setSelectedId(node.id);
    } catch {
      showToast("Não consegui adicionar essa imagem.");
    }
  };

  /* =========================================================
     CONEXÕES
  ========================================================= */

  const createConnection = (from: string, to: string) => {
    setConnecting(null);

    if (from === to) return;

    if (topicRef.current.connections.some((c) => c.from === from && c.to === to)) {
      showToast("Esses dois blocos já estão ligados nesse sentido.");

      return;
    }

    const connection: Connection = {
      id: uid("conn"),
      from,
      to,
    };

    pushHistory();
    patchTopic((t) => ({ ...t, connections: [...t.connections, connection] }));
    setSelectedEdge(connKey(connection));
    setSelectedId(null);
  };

  /* =========================================================
     MODELOS, VERSÕES, ORGANIZAR, EXPORTAR
  ========================================================= */

  const insertTemplate = (templateId: string) => {
    const c = viewportCenter();
    const built = buildTemplate(templateId, { x: c.x - 300, y: c.y - 150 }, topicRef.current.name);
    const all = [...topicRef.current.nodes, ...built.nodes];

    pushHistory();

    patchTopic((t) => ({
      ...t,
      versions: t.nodes.length
        ? pushVersion(t.versions, makeVersion(t, "Antes de aplicar um modelo", true))
        : t.versions,
      nodes: [...t.nodes, ...built.nodes],
      connections: [...t.connections, ...built.connections],
    }));

    setTimeout(() => fitView(all), 60);
    showToast("Modelo adicionado. Edite os blocos do seu jeito.", true);
  };

  const saveVersion = (name: string, auto = false) =>
    patchTopic((t) => ({ ...t, versions: pushVersion(t.versions, makeVersion(t, name, auto)) }));

  const restoreVersion = (id: string) => {
    const version = topicRef.current.versions?.find((v) => v.id === id);

    if (!version) return;

    pushHistory();

    patchTopic((t) => ({
      ...t,
      versions: pushVersion(t.versions, makeVersion(t, "Antes de restaurar uma versão", true)),
      nodes: version.nodes,
      connections: version.connections,
    }));

    setSelectedId(null);
    setSelectedEdge(null);
    setTimeout(() => fitView(version.nodes), 60);
    showToast("Versão restaurada. Use Ctrl+Z para voltar.", true);
  };

  const deleteVersion = (id: string) =>
    patchTopic((t) => ({ ...t, versions: (t.versions ?? []).filter((v) => v.id !== id) }));

  /* versão automática a cada 5 minutos, se algo mudou */
  const lastSignature = useRef("");

  useEffect(() => {
    lastSignature.current = JSON.stringify([topicRef.current.nodes, topicRef.current.connections]);

    const timer = setInterval(() => {
      const t = topicRef.current;
      const signature = JSON.stringify([t.nodes, t.connections]);

      if (signature === lastSignature.current || t.nodes.length === 0) return;

      lastSignature.current = signature;
      patchTopic((current) => ({
        ...current,
        versions: pushVersion(current.versions, makeVersion(current, "Salva automaticamente", true)),
      }));
    }, 5 * 60 * 1000);

    return () => clearInterval(timer);
  }, [patchTopic]);

  const autoLayout = () => {
    const list = topicRef.current.nodes;

    if (list.length === 0) return;

    const layer: Record<string, number> = {};

    list.forEach((n) => (layer[n.id] = 0));

    for (let i = 0; i < list.length; i++) {
      let changed = false;

      topicRef.current.connections.forEach((c) => {
        if (layer[c.from] !== undefined && layer[c.to] !== undefined && layer[c.from] < list.length && layer[c.to] < layer[c.from] + 1) {
          layer[c.to] = layer[c.from] + 1;
          changed = true;
        }
      });

      if (!changed) break;
    }

    const columns: Node[][] = [];

    list.forEach((n) => (columns[layer[n.id]] ||= []).push(n));

    const placed = new Map<string, { x: number; y: number }>();
    let x = 60;

    columns.forEach((column) => {
      if (!column) return;

      let y = 60;

      [...column]
        .sort((a, b) => a.y - b.y)
        .forEach((n) => {
          placed.set(n.id, { x, y });
          y += nodeRect(n).h + 60;
        });

      x += Math.max(...column.map((n) => nodeRect(n).w)) + 140;
    });

    const next = list.map((n) => ({ ...n, ...(placed.get(n.id) ?? {}) }));

    pushHistory();
    patchTopic((t) => ({ ...t, nodes: next }));
    fitView(next);
    showToast("Blocos organizados em colunas.", true);
  };

  const runExport = async (kind: "png" | "json" | "md") => {
    setExportOpen(false);

    const t = topicRef.current;
    const base = slugify(t.name);

    try {
      if (kind === "png") downloadBlob(await exportPng(t), `${base}.png`);
      if (kind === "json") downloadBlob(exportJson(t), `${base}.json`);
      if (kind === "md") downloadBlob(exportMarkdown(t), `${base}.md`);

      showToast("Arquivo exportado.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Não foi possível exportar.");
    }
  };

  /* =========================================================
     BUSCA
  ========================================================= */

  const q = query.trim().toLowerCase();
  const searchActive = searchOpen && (q !== "" || statusFilter !== "all");

  const matches = useMemo(() => {
    if (!searchActive) return [] as string[];

    return nodes
      .filter(
        (n) =>
          (statusFilter === "all" || (n.status ?? "todo") === statusFilter) &&
          (!q || nodeSearchText(n).includes(q))
      )
      .map((n) => n.id);
  }, [nodes, searchActive, q, statusFilter]);

  const matchSet = useMemo(() => new Set(matches), [matches]);

  const goToMatch = (index: number) => {
    if (matches.length === 0) return;

    const next = (index + matches.length) % matches.length;

    setMatchIndex(next);
    focusNode(matches[next]);
  };

  /* =========================================================
     TECLADO, COLAR E ARRASTAR IMAGENS
  ========================================================= */

  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});

  keyRef.current = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    const typing = !!target?.closest("input, textarea, select, [contenteditable='true']");
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    if (modalOpen) return;

    if (mod && key === "f") {
      e.preventDefault();
      setSearchOpen(true);
      requestAnimationFrame(() => searchRef.current?.focus());

      return;
    }

    if (e.key === "Escape") {
      setConnecting(null);
      setSelectedEdge(null);
      setPopover(null);
      setExportOpen(false);

      return;
    }

    if (typing) return;

    if (mod && key === "z") {
      e.preventDefault();

      if (e.shiftKey) redo();
      else undo();

      return;
    }

    if (mod && key === "y") {
      e.preventDefault();
      redo();

      return;
    }

    if (mod && key === "a") {
      e.preventDefault();
      setSelectedIds(topicRef.current.nodes.map((n) => n.id));

      return;
    }

    if (mod && key === "d" && selectedRef.current.length > 0) {
      e.preventDefault();
      duplicateSelection();

      return;
    }

    if (e.key === "Delete" || e.key === "Backspace") {
      if (selectedEdge) deleteConnection(selectedEdge);
      else if (selectedRef.current.length > 1) deleteNodes(selectedRef.current);
      else if (selectedId) deleteNode(selectedId);

      return;
    }

    if (mod || e.altKey) return;

    if (e.key === "+" || e.key === "=") zoomBy(1.2);
    else if (e.key === "-") zoomBy(1 / 1.2);
    else if (e.key === "0") applyView({ ...viewRef.current, zoom: 1 }, true);
    else if (key === "f") fitView(topicRef.current.nodes);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => keyRef.current(e);

    window.addEventListener("keydown", handler);

    return () => window.removeEventListener("keydown", handler);
  }, []);

  const pasteRef = useRef<(e: ClipboardEvent) => void>(() => {});

  pasteRef.current = (e: ClipboardEvent) => {
    if (modalOpen) return;

    const typing = (e.target as HTMLElement | null)?.closest("input, textarea, [contenteditable='true']");
    const items = e.clipboardData?.items;

    if (!items) return;

    const image = Array.from(items).find((item) => item.type.startsWith("image/"));

    if (image) {
      const file = image.getAsFile();

      if (file) {
        e.preventDefault();
        void addImage(file);
      }

      return;
    }

    const text = e.clipboardData?.getData("text/plain") ?? "";

    if (!typing && text.split("\n").length >= 2 && detectLanguage(text)) {
      e.preventDefault();
      addBlock("code", text);
    }
  };

  useEffect(() => {
    const handler = (e: ClipboardEvent) => pasteRef.current(e);

    window.addEventListener("paste", handler);

    return () => window.removeEventListener("paste", handler);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    const el = viewportRef.current;

    if (!el) return;

    const rect = el.getBoundingClientRect();
    const v = viewRef.current;
    const wx = (e.clientX - rect.left - v.x) / v.zoom;
    const wy = (e.clientY - rect.top - v.y) / v.zoom;

    Array.from(e.dataTransfer.files).forEach((file, i) => void addImage(file, wx + i * 30, wy + i * 30));
  };

  /* =========================================================
     AVISOS E INDICADOR DE SALVAMENTO
  ========================================================= */

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => setToast(null), 4500);

    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const timer = setTimeout(() => setSavedAt(new Date()), 400);

    return () => clearTimeout(timer);
  }, [topic.nodes, topic.connections, topic.name]);

  /* primeira visita: abre a ajuda */
  useEffect(() => {
    try {
      if (!localStorage.getItem(HELP_KEY)) {
        setShowHelp(true);
        localStorage.setItem(HELP_KEY, "1");
      }
    } catch {
      /* ignora */
    }
  }, []);

  /* =========================================================
     VISUAL
  ========================================================= */

  const button = `flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
    isDark
      ? "border-white/[0.07] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07] hover:text-white"
      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
  }`;

  const divider = <span className={`mx-1 h-5 w-px ${isDark ? "bg-white/[0.08]" : "bg-zinc-200"}`} />;

  const edgeLabelColor = isDark ? "#18181b" : "#ffffff";

  const markerColors = useMemo(() => {
    const set = new Set<string>();

    connections.forEach((c) => set.add(connectionLook(c).color));

    return Array.from(set);
  }, [connections]);

  const selectedConnection = selectedEdge ? connections.find((c) => connKey(c) === selectedEdge) : undefined;
  const editingNode = editingNodeId ? nodeById.get(editingNodeId) : undefined;

  const toolbarBtn = (active = false) =>
    `rounded-md p-1.5 transition-colors ${
      active
        ? "bg-[var(--accent)] text-white"
        : isDark
          ? "text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
    }`;

  return (
    <div
      className={`z-10 flex h-full min-w-0 flex-1 flex-col overflow-hidden ${
        isDark ? "bg-zinc-950 text-zinc-100" : "bg-zinc-50 text-zinc-900"
      }`}
    >
      {/* ================= BARRA ÚNICA ================= */}
      <div
        className={`thin-scroll flex shrink-0 items-center gap-1.5 overflow-x-auto border-b px-4 py-2 ${
          isDark ? "border-white/10 bg-zinc-950" : "border-zinc-200/80 bg-zinc-50"
        }`}
      >
        <button
          onClick={() => addBlock("topic")}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-xs font-medium text-white shadow-sm transition-all hover:-translate-y-px hover:brightness-110"
          title="Adicionar um bloco de tópico"
        >
          <Plus size={14} />
          Tópico
        </button>

        <button onClick={() => addBlock("note")} className={`${button} shrink-0`} title="Adicionar anotação">
          <StickyNote size={13} />
          <span className="hidden 2xl:inline">Anotação</span>
        </button>

        <button onClick={() => addBlock("code")} className={`${button} shrink-0`} title="Adicionar bloco de código">
          <Code2 size={13} />
          <span className="hidden 2xl:inline">Código</span>
        </button>

        <label className={`${button} shrink-0 cursor-pointer`} title="Adicionar imagem (também dá para colar ou arrastar)">
          <ImageIcon size={13} />
          <span className="hidden 2xl:inline">Imagem</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];

              e.target.value = "";

              if (file) void addImage(file);
            }}
          />
        </label>

        {divider}

        <button
          onClick={() => setTool("hand")}
          className={`${button} shrink-0 ${tool === "hand" ? "!border-[var(--accent)] !text-[var(--accent)]" : ""}`}
          title="Mover o quadro: arraste o fundo"
          aria-label="Ferramenta mover"
        >
          <HandIcon />
        </button>

        <button
          onClick={() => setTool("select")}
          className={`${button} shrink-0 ${tool === "select" ? "!border-[var(--accent)] !text-[var(--accent)]" : ""}`}
          title="Selecionar vários blocos: arraste no fundo para desenhar uma caixa (ou segure Shift)"
          aria-label="Ferramenta selecionar"
        >
          <CursorIcon />
        </button>

        {divider}

        <button onClick={undo} disabled={past.current.length === 0} className={`${button} shrink-0`} title="Desfazer (Ctrl+Z)" aria-label="Desfazer">
          <Undo2 size={13} />
        </button>

        <button onClick={redo} disabled={future.current.length === 0} className={`${button} shrink-0`} title="Refazer (Ctrl+Y)" aria-label="Refazer">
          <Undo2 size={13} className="-scale-x-100" />
        </button>

        {divider}

        <div
          className={`flex h-8 shrink-0 items-center overflow-hidden rounded-lg border ${
            isDark ? "border-white/[0.07] bg-white/[0.03]" : "border-zinc-200 bg-white"
          }`}
        >
          <button onClick={() => zoomBy(1 / 1.2)} title="Diminuir zoom (-)" className={`h-full w-8 ${toolbarBtn()}`} aria-label="Diminuir zoom">
            <ZoomOut size={14} className="mx-auto" />
          </button>

          <button
            onClick={() => applyView({ ...viewRef.current, zoom: 1 }, true)}
            title="Voltar a 100% (0)"
            className={`h-full min-w-[48px] border-x px-1 text-xs font-medium ${
              isDark ? "border-white/[0.07] text-zinc-300 hover:bg-white/[0.06]" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {Math.round(view.zoom * 100)}%
          </button>

          <button onClick={() => zoomBy(1.2)} title="Aumentar zoom (+)" className={`h-full w-8 ${toolbarBtn()}`} aria-label="Aumentar zoom">
            <ZoomIn size={14} className="mx-auto" />
          </button>
        </div>

        <button onClick={() => fitView(nodes, 1.6)} className={`${button} shrink-0`} title="Ajustar tudo à tela (F)" aria-label="Ajustar à tela">
          <Maximize2 size={13} />
        </button>

        <button
          onClick={() => {
            const r = selectedId ? nodeById.get(selectedId) : undefined;

            if (r) focusNode(r.id);
            else if (nodes.length) {
              const rects = nodes.map(nodeRect);

              centerOnPoint(
                (Math.min(...rects.map((x) => x.x)) + Math.max(...rects.map((x) => x.x + x.w))) / 2,
                (Math.min(...rects.map((x) => x.y)) + Math.max(...rects.map((x) => x.y + x.h))) / 2
              );
            }
          }}
          className={`${button} shrink-0`}
          title="Centralizar no bloco selecionado (ou no desenho)"
          aria-label="Centralizar"
        >
          <Crosshair size={13} />
        </button>

        <button
          onClick={() => setShowMinimap((v) => !v)}
          className={`${button} shrink-0 ${showMinimap ? "!border-[var(--accent)] !text-[var(--accent)]" : ""}`}
          title="Mostrar ou esconder o minimapa"
          aria-label="Minimapa"
        >
          <Layers size={13} />
        </button>

        <button onClick={autoLayout} disabled={nodes.length === 0} className={`${button} shrink-0`} title="Organizar os blocos em colunas" aria-label="Organizar">
          <LayoutTemplate size={13} />
        </button>

        <button
          onClick={() => {
            setSearchOpen((open) => !open);
            requestAnimationFrame(() => searchRef.current?.focus());
          }}
          className={`${button} shrink-0 ${searchOpen ? "!border-[var(--accent)] !text-[var(--accent)]" : ""}`}
          title="Buscar nos blocos (Ctrl+F)"
          aria-label="Buscar"
        >
          <Search size={13} />
        </button>

        <span className="min-w-4 flex-1" />

        <span className="hidden shrink-0 whitespace-nowrap text-[10px] font-medium text-zinc-500 2xl:block">
          {nodes.length} blocos · {connections.length} conexões · {savedAt ? `salvo ${savedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "salvando..."}
        </span>

        {onEditTopic && (
          <button onClick={onEditTopic} className={`${button} shrink-0`} title="Editar nome, pasta, prazo e link" aria-label="Editar fluxograma">
            <Pencil size={13} />
          </button>
        )}

        {onDuplicateTopic && (
          <button onClick={onDuplicateTopic} className={`${button} shrink-0`} title="Duplicar este fluxograma" aria-label="Duplicar fluxograma">
            <Copy size={13} />
          </button>
        )}

        <button onClick={() => setShowTemplates(true)} className={`${button} shrink-0`} title="Modelos prontos" aria-label="Modelos">
          <Sparkles size={13} />
        </button>

        <button onClick={() => setShowVersions(true)} className={`${button} shrink-0`} title="Histórico de versões" aria-label="Versões">
          <History size={13} />
        </button>

        <button onClick={() => setExportOpen((v) => !v)} className={`${button} shrink-0`} title="Exportar" aria-label="Exportar">
          <Download size={13} />
          <ChevronDown size={11} />
        </button>

        <button onClick={() => setShowHelp(true)} className={`${button} shrink-0`} title="Como usar" aria-label="Como usar">
          <Info size={13} />
        </button>
      </div>

      {/* ================= ÁREA DO FLUXOGRAMA ================= */}
      <div
        ref={viewportRef}
        tabIndex={0}
        onMouseDown={(e) => {
          if (e.button !== 0 && e.button !== 1) return;

          const additive = e.shiftKey;
          const marquee = e.button === 0 && (tool === "select" || additive);

          if (!additive) setSelectedIds([]);

          setSelectedEdge(null);
          setPopover(null);
          setExportOpen(false);

          if (connecting) setConnecting(null);

          drag.current = marquee
            ? { kind: "marquee", sx: e.clientX, sy: e.clientY, cx: e.clientX, cy: e.clientY, base: additive ? selectedRef.current : [] }
            : { kind: "pan", sx: e.clientX, sy: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y };
        }}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`relative min-h-0 flex-1 overflow-hidden outline-none ${tool === "select" ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
        style={{
          backgroundColor: isDark ? "#09090b" : "#fafafa",
          backgroundImage: `radial-gradient(circle, ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.1)"} 1px, transparent 1px)`,
          backgroundSize: `${24 * viewRef.current.zoom}px ${24 * viewRef.current.zoom}px`,
          backgroundPosition: `${viewRef.current.x}px ${viewRef.current.y}px`,
        }}
      >
        <div
          ref={worldRef}
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${viewRef.current.x}px, ${viewRef.current.y}px) scale(${viewRef.current.zoom})` }}
        >
          {/* ---------- conexões ---------- */}
          <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={1} height={1}>
            <defs>
              {markerColors.map((color) => (
                <marker
                  key={color}
                  id={`fa-${color.replace(/[^a-z0-9]/gi, "")}`}
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="4"
                  markerHeight="4"
                  orient="auto-start-reverse"
                >
                  <path d="M0 0 L10 5 L0 10 z" fill={color} />
                </marker>
              ))}
            </defs>

            {connections.map((connection) => {
              const from = nodeById.get(connection.from);
              const to = nodeById.get(connection.to);

              if (!from || !to) return null;

              const key = connKey(connection);
              const look = connectionLook(connection);
              const g = connectionGeometry(nodeRect(from), nodeRect(to), look.shape);
              const selected = selectedEdge === key;
              const marker = `url(#fa-${look.color.replace(/[^a-z0-9]/gi, "")})`;
              const labelWidth = look.label.length * 6.8 + 20;

              return (
                <g key={key} data-edge={key}>
                  {selected && (
                    <path data-geo d={g.d} fill="none" stroke={accent} strokeOpacity={0.3} strokeWidth={look.width + 8} strokeLinecap="round" />
                  )}

                  <path
                    data-geo
                    d={g.d}
                    fill="none"
                    stroke={look.color}
                    strokeWidth={look.width}
                    strokeDasharray={dashFor(look.style, look.width)}
                    strokeLinecap={look.style === "dotted" ? "round" : "butt"}
                    markerEnd={look.arrow === "end" || look.arrow === "both" ? marker : undefined}
                    markerStart={look.arrow === "start" || look.arrow === "both" ? marker : undefined}
                  />

                  <path
                    data-geo
                    d={g.d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={18}
                    style={{ pointerEvents: "stroke", cursor: "pointer" }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setSelectedEdge(key);
                      setSelectedId(null);
                      setPopover(null);
                    }}
                  />

                  {look.label && (
                    <g
                      data-label
                      transform={`translate(${g.mx}, ${g.my})`}
                      style={{ pointerEvents: "all", cursor: "pointer" }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedEdge(key);
                        setSelectedId(null);
                      }}
                    >
                      <rect
                        x={-labelWidth / 2}
                        y={-11}
                        width={labelWidth}
                        height={22}
                        rx={11}
                        fill={edgeLabelColor}
                        stroke={look.color}
                        strokeWidth={1.5}
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={12}
                        fontWeight={700}
                        fill={look.color}
                        style={{ userSelect: "none" }}
                      >
                        {look.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* ---------- blocos ---------- */}
          {renderNodes.map((node) => {
            const { w, h } = nodeRect(node);
            const isMain = node.type === "main";
            const isTopic = node.type === "topic";
            const isNote = node.type === "note";
            const isImage = node.type === "image";
            const isCode = node.type === "code";
            const isText = !isImage && !isCode;

            const selected = selectedIds.includes(node.id);
            const isSource = connecting?.from === node.id;
            const isTarget = !!connecting && !isSource;
            const dimmed = searchActive && !matchSet.has(node.id);
            const matched = searchActive && matchSet.has(node.id);

            const nodeColor = node.color ?? DEFAULT_ACCENT;
            const status = getStatus(node.status);
            const priority = getPriority(node.priority);
            const category = getCategory(node.category);
            const stats = checklistStats(node);
            const overdue = isOverdue(node);
            const cancelled = node.status === "cancelled";
            const statusOpen = popover?.id === node.id && popover.kind === "status";
            const colorOpen = popover?.id === node.id && popover.kind === "color";

            const shadow = isSource
              ? `0 0 0 3px ${accent}`
              : matched
                ? "0 0 0 3px #f59e0b"
                : selected
                  ? `0 0 0 2px ${accent}`
                  : undefined;

            return (
              <div
                key={node.id}
                ref={(el) => {
                  if (el) nodeEls.current.set(node.id, el);
                  else nodeEls.current.delete(node.id);
                }}
                data-node
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setPopover(null);
                  setExportOpen(false);

                  if (connecting) return;

                  const additive = e.shiftKey || e.ctrlKey || e.metaKey;

                  if (additive) {
                    setSelectedIds((prev) => (prev.includes(node.id) ? prev.filter((x) => x !== node.id) : [...prev, node.id]));
                    setSelectedEdge(null);

                    return;
                  }

                  const group = selectedRef.current.includes(node.id) ? selectedRef.current : [node.id];

                  if (!selectedRef.current.includes(node.id)) setSelectedIds([node.id]);

                  setSelectedEdge(null);

                  if ((e.target as HTMLElement).closest("input, textarea, button, select, a, .resize-handle, .no-drag")) return;
                  if (e.button !== 0) return;

                  drag.current = {
                    kind: "move",
                    sx: e.clientX,
                    sy: e.clientY,
                    pushed: false,
                    origins: topicRef.current.nodes.filter((n) => group.includes(n.id)).map((n) => ({ id: n.id, x: n.x, y: n.y })),
                  };
                }}
                onDoubleClick={(e) => {
                  const target = e.target as HTMLElement;

                  if (isCode) {
                    if (!target.closest("button, select, input")) setCodeModalId(node.id);

                    return;
                  }

                  if (target.closest("input, textarea, button, select, a")) return;

                  if (isImage) setEditingImageId(node.id);
                  else openEditor(node.id);
                }}
                className={`group absolute flex cursor-move select-none flex-col overflow-visible transition-opacity ${
                  isImage ? "rounded-2xl" : "rounded-2xl border"
                } ${dimmed ? "opacity-25" : cancelled ? "opacity-60" : ""} ${
                  isImage ? "" : "shadow-md"
                } ${
                  isDark
                    ? isCode
                      ? "border-white/10 bg-zinc-900"
                      : "border-white/[0.08] bg-zinc-900/95"
                    : isCode
                      ? "border-zinc-200 bg-zinc-950"
                      : "border-zinc-200 bg-white"
                }`}
                style={{
                  left: node.x,
                  top: node.y,
                  width: w,
                  height: h,
                  boxShadow: shadow,
                  borderColor: isImage
                    ? undefined
                    : node.status === "problem"
                      ? "#ef4444"
                      : isMain
                        ? nodeColor
                        : undefined,
                  backgroundColor: isMain ? withAlpha(nodeColor, isDark ? 0.1 : 0.06) : undefined,
                }}
              >
                {/* alvo da ligação */}
                {isTarget && (
                  <div
                    className="absolute inset-0 z-40 cursor-pointer rounded-2xl ring-2 ring-[var(--accent)] hover:bg-[var(--accent)]/10"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      if (connecting) createConnection(connecting.from, node.id);
                    }}
                  />
                )}

                {/* barra de ferramentas do bloco */}
                <div
                  className={`no-drag absolute -top-9 right-0 z-30 flex items-center gap-0.5 rounded-xl border px-1 py-0.5 shadow-lg transition-opacity ${
                    selected || popover?.id === node.id ? "opacity-100" : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
                  } ${isDark ? "border-white/10 bg-zinc-900" : "border-zinc-200 bg-white"}`}
                >
                  {!isCode && (
                    <button onClick={() => (isImage ? setEditingImageId(node.id) : openEditor(node.id))} className={toolbarBtn()} title="Editar bloco">
                      <Pencil size={13} />
                    </button>
                  )}

                  {isCode && (
                    <button onClick={() => openEditor(node.id)} className={toolbarBtn()} title="Detalhes: status, prazo, comentários">
                      <Pencil size={13} />
                    </button>
                  )}

                  {isText && !isNote && (
                    <button
                      onClick={() => setPopover(colorOpen ? null : { id: node.id, kind: "color" })}
                      className={toolbarBtn(colorOpen)}
                      title="Cor do bloco"
                    >
                      <Palette size={13} />
                    </button>
                  )}

                  <button
                    onClick={() => setConnecting(isSource ? null : { from: node.id })}
                    className={toolbarBtn(isSource)}
                    title="Ligar a outro bloco"
                  >
                    <ArrowRight size={13} />
                  </button>

                  <button onClick={() => duplicateNode(node.id)} className={toolbarBtn()} title="Duplicar bloco (Ctrl+D)">
                    <Copy size={13} />
                  </button>

                  {!isMain && (
                    <button
                      onClick={() => deleteNode(node.id)}
                      className={`${toolbarBtn()} hover:!bg-red-500/10 hover:!text-red-400`}
                      title="Excluir bloco (Delete)"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* seletor de cor */}
                {colorOpen && (
                  <div
                    className={`no-drag absolute right-0 top-[-5.5rem] z-50 grid grid-cols-6 gap-2 rounded-xl border p-2.5 shadow-2xl ${
                      isDark ? "border-white/10 bg-zinc-900" : "border-zinc-200 bg-white"
                    }`}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {NODE_COLORS.map((color) => (
                      <button
                        key={color}
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          applyEdit(node.id, { color });
                          setPopover(null);
                        }}
                        className="h-5 w-5 rounded-full border border-white/20 transition-transform hover:scale-110"
                        aria-label={`Cor ${color}`}
                      />
                    ))}
                  </div>
                )}

                {statusOpen && (
                  <div
                    className={`no-drag absolute bottom-[7.2rem] left-3 z-50 w-44 rounded-xl border p-1.5 shadow-2xl ${
                      isDark ? "border-white/10 bg-zinc-900" : "border-zinc-200 bg-white"
                    }`}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {NODE_STATUSES.map((s2) => (
                      <button
                        key={s2.id}
                        onClick={() => {
                          applyEdit(node.id, { status: s2.id });
                          setPopover(null);
                        }}
                        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold ${
                          isDark ? "hover:bg-white/[0.06]" : "hover:bg-zinc-100"
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s2.color }} />
                        <span className="flex-1">{s2.label}</span>
                        {(node.status ?? "todo") === s2.id && <span className="text-[9px] text-zinc-500">atual</span>}
                      </button>
                    ))}
                  </div>
                )}

                {/* conteúdo por tipo */}
                {isImage ? (
                  <div className="relative flex h-full min-h-[100px] w-full flex-col overflow-visible rounded-2xl">
                    {node.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={node.imageUrl}
                        alt={node.imageDescription || "Imagem"}
                        draggable={false}
                        className="pointer-events-none h-full w-full rounded-2xl object-contain"
                      />
                    ) : (
                      <div className={`flex flex-1 flex-col items-center justify-center rounded-2xl ${isDark ? "bg-zinc-900 text-zinc-600" : "bg-zinc-100 text-zinc-400"}`}>
                        <ImageIcon size={28} />
                        <span className="mt-2 text-xs">Sem imagem</span>
                      </div>
                    )}

                    {editingImageId === node.id && (
                      <div
                        className={`no-drag absolute bottom-2 left-2 right-2 z-30 rounded-xl border p-2.5 shadow-xl ${
                          isDark ? "border-white/10 bg-zinc-900/90 backdrop-blur-md" : "border-zinc-200 bg-white/95"
                        }`}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <textarea
                          autoFocus
                          value={node.imageDescription || ""}
                          onChange={(e) => typeInNode(node.id, { imageDescription: e.target.value }, "cap")}
                          onBlur={() => setEditingImageId(null)}
                          placeholder="Adicione uma legenda..."
                          rows={2}
                          className={`w-full resize-none bg-transparent text-center text-xs outline-none ${
                            isDark ? "text-zinc-200 placeholder:text-zinc-600" : "text-zinc-700 placeholder:text-zinc-400"
                          }`}
                        />
                      </div>
                    )}

                    {node.imageDescription && editingImageId !== node.id && (
                      <div className={`absolute bottom-2 left-2 right-2 rounded-lg px-2.5 py-1.5 text-xs backdrop-blur-md ${isDark ? "bg-black/70 text-zinc-300" : "bg-white/85 text-zinc-600"}`}>
                        {node.imageDescription}
                      </div>
                    )}
                  </div>
                ) : isCode ? (
                  <CodeNode
                    node={node}
                    isDark={isDark}
                    copied={copiedCodeId === node.id}
                    onChange={(changes) => typeInNode(node.id, changes, "code")}
                    onExpand={() => setCodeModalId(node.id)}
                    onCopy={async () => {
                      try {
                        await navigator.clipboard.writeText(node.code || "");
                        setCopiedCodeId(node.id);
                        setTimeout(() => setCopiedCodeId(null), 1500);
                      } catch {
                        /* ignora */
                      }
                    }}
                    onDelete={(e) => {
                      e.stopPropagation();
                      deleteNode(node.id);
                    }}
                  />
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
                    {/* título */}
                    <div className="relative flex shrink-0 flex-col items-center px-3.5 pb-1 pt-3.5">
                      {category && (
                        <span
                          className="mb-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                          style={{ backgroundColor: withAlpha(category.color, 0.16), color: category.color }}
                        >
                          {category.label}
                        </span>
                      )}

                      <div className="relative w-full">
                        {isTopic && (
                          <span
                            className="pointer-events-none absolute left-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ring-4 ring-black/5"
                            style={{ backgroundColor: nodeColor }}
                          />
                        )}

                        <input
                          type="text"
                          value={node.title}
                          placeholder={isMain ? "Título principal" : isNote ? "Título da anotação" : "Título do tópico"}
                          onChange={(e) => typeInNode(node.id, { title: e.target.value }, "title")}
                          className={`w-full bg-transparent text-center outline-none ${
                            isMain ? "text-lg font-bold" : "text-base font-semibold"
                          } ${cancelled ? "line-through" : ""} ${isDark ? "text-zinc-100 placeholder:text-zinc-600" : "text-zinc-900 placeholder:text-zinc-400"}`}
                        />
                      </div>
                    </div>

                    {/* descrição */}
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3.5 pb-1.5 pt-0.5">
                      <textarea
                        value={node.description || ""}
                        onChange={(e) => typeInNode(node.id, { description: e.target.value }, "desc")}
                        placeholder="Adicione uma descrição..."
                        rows={2}
                        className={`thin-scroll min-h-0 w-full flex-1 resize-none overflow-auto bg-transparent text-center text-sm leading-relaxed outline-none ${
                          isDark ? "text-zinc-400 placeholder:text-zinc-700" : "text-zinc-600 placeholder:text-zinc-400"
                        }`}
                      />
                    </div>

                    {/* checklist visível no bloco */}
                    {stats.total > 0 && (
                      <div
                        className={`no-drag mx-3 mb-2 shrink-0 rounded-lg border px-2.5 py-2 ${
                          isDark ? "border-white/10 bg-white/[0.03]" : "border-zinc-200 bg-zinc-50"
                        }`}
                      >
                        <div className="mb-1.5 flex items-center gap-2">
                          <div className={`h-1.5 flex-1 overflow-hidden rounded-full ${isDark ? "bg-white/10" : "bg-zinc-200"}`}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.round((stats.done / stats.total) * 100)}%`,
                                backgroundColor: stats.done === stats.total ? "#10b981" : accent,
                              }}
                            />
                          </div>

                          <span className={`text-[10px] font-bold ${stats.done === stats.total ? "text-emerald-500" : isDark ? "text-zinc-300" : "text-zinc-600"}`}>
                            {Math.round((stats.done / stats.total) * 100)}%
                          </span>
                        </div>

                        {(node.checklist ?? []).slice(0, 4).map((item) => (
                          <label
                            key={item.id}
                            className={`flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 ${isDark ? "hover:bg-white/5" : "hover:bg-zinc-100"}`}
                          >
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => toggleChecklistItem(node.id, item.id)}
                              className="h-3.5 w-3.5 shrink-0 cursor-pointer"
                              style={{ accentColor: "var(--accent)" }}
                            />
                            <span
                              className={`truncate text-[11px] ${
                                item.completed ? "text-zinc-500 line-through" : isDark ? "text-zinc-200" : "text-zinc-700"
                              }`}
                            >
                              {item.text}
                            </span>
                          </label>
                        ))}

                        {stats.total > 4 && (
                          <button
                            onClick={() => openEditor(node.id, "checklist")}
                            className="mt-0.5 px-1 text-[10px] font-semibold text-[var(--accent)] hover:underline"
                          >
                            + {stats.total - 4} {stats.total - 4 === 1 ? "item" : "itens"}
                          </button>
                        )}
                      </div>
                    )}

                    {/* status, prioridade e prazo */}
                    {(!isNote || !!priority || !!node.dueDate) && (
                      <div className="no-drag flex shrink-0 flex-wrap items-center gap-1.5 px-3.5 pb-2">
                        {!isNote && (
                          <button
                            onClick={() => setPopover(statusOpen ? null : { id: node.id, kind: "status" })}
                            title="Mudar o status"
                            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition-transform hover:scale-105"
                            style={{ backgroundColor: withAlpha(status.color, 0.16), color: status.color }}
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.color }} />
                            {status.label}
                          </button>
                        )}

                        {priority && (
                          <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: withAlpha(priority.color, 0.16), color: priority.color }}>
                            <Flame size={10} />
                            {priority.label}
                          </span>
                        )}

                        {node.dueDate && (
                          <span
                            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              overdue ? "bg-red-500/15 text-red-400" : isDark ? "bg-white/[0.07] text-zinc-300" : "bg-zinc-100 text-zinc-600"
                            }`}
                            title={overdue ? "Prazo vencido" : "Prazo"}
                          >
                            <CalendarDays size={10} />
                            {formatShortDay(node.dueDate)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* atalhos: só aparecem quando já existe algo em cada parte */}
                    {(stats.total > 0 || !!node.comments?.length || !!node.attachments?.length) && (
                      <div className={`no-drag flex shrink-0 gap-1.5 border-t px-2.5 py-2 ${isDark ? "border-white/10" : "border-zinc-200"}`}>
                        {(
                          [
                            { tab: "checklist" as const, label: "Checklist", icon: <ListChecks size={13} />, count: stats.total, text: `${stats.done}/${stats.total}` },
                            { tab: "comments" as const, label: "Comentários", icon: <StickyNote size={13} />, count: node.comments?.length ?? 0, text: String(node.comments?.length ?? 0) },
                            { tab: "attachments" as const, label: "Anexos", icon: <Link2 size={13} />, count: node.attachments?.length ?? 0, text: String(node.attachments?.length ?? 0) },
                          ]
                        )
                          .filter((item) => item.count > 0)
                          .map((item) => (
                            <button
                              key={item.tab}
                              onClick={() => openEditor(node.id, item.tab)}
                              title={`Abrir ${item.label.toLowerCase()}`}
                              className="flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--accent)]/35 bg-[var(--accent)]/10 px-2 text-[11px] font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/20"
                            >
                              {item.icon}
                              <span className="truncate">{item.label}</span>
                              <span className="rounded-full bg-[var(--accent)]/20 px-1.5 text-[10px] font-bold leading-4">{item.text}</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* botão de ligar na lateral */}
                {!isTarget && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConnecting(isSource ? null : { from: node.id });
                    }}
                    className={`no-drag absolute -right-3 top-1/2 z-30 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border shadow-lg transition-all hover:scale-110 hover:bg-[var(--accent)] hover:text-white ${
                      isSource ? "scale-110 border-[var(--accent)] bg-[var(--accent)] text-white opacity-100" : "opacity-0 group-hover:opacity-100"
                    } ${isDark ? "border-zinc-700 bg-zinc-900 text-zinc-400" : "border-zinc-300 bg-white text-zinc-500"}`}
                    title="Ligar a outro bloco"
                  >
                    <ArrowRight size={12} />
                  </button>
                )}

                {/* redimensionar */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setSelectedId(node.id);

                    const size = nodeRect(node);

                    drag.current = { kind: "resize", id: node.id, sx: e.clientX, sy: e.clientY, w: size.w, h: size.h, pushed: false };
                  }}
                  className={`resize-handle absolute -bottom-2 -right-2 z-30 flex h-5 w-5 cursor-se-resize items-center justify-center rounded-md border opacity-0 shadow-md transition-all hover:scale-110 group-hover:opacity-100 ${
                    isDark ? "border-zinc-700 bg-zinc-900 text-zinc-500" : "border-zinc-300 bg-white text-zinc-400"
                  }`}
                  title="Redimensionar"
                >
                  <Scaling size={10} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ---------- menu de exportar ---------- */}
        {exportOpen && (
          <>
            <div className="fixed inset-0 z-40" onMouseDown={(e) => { e.stopPropagation(); setExportOpen(false); }} />

            <div
              onMouseDown={(e) => e.stopPropagation()}
              className={`absolute right-4 top-3 z-50 w-60 rounded-xl border p-1.5 shadow-2xl ${
                isDark ? "border-white/10 bg-zinc-900" : "border-zinc-200 bg-white"
              }`}
            >
              {(
                [
                  ["png", "Imagem PNG", "Para colar em slides e documentos"],
                  ["md", "Texto Markdown", "Lista de blocos e conexões"],
                  ["json", "Arquivo JSON", "Cópia completa dos dados"],
                ] as const
              ).map(([kind, label, hint]) => (
                <button
                  key={kind}
                  onClick={() => void runExport(kind)}
                  className={`block w-full rounded-lg px-3 py-2 text-left ${isDark ? "hover:bg-white/[0.06]" : "hover:bg-zinc-100"}`}
                >
                  <span className="block text-xs font-semibold">{label}</span>
                  <span className="block text-[10px] text-zinc-500">{hint}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ---------- busca ---------- */}
        {searchOpen && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className={`absolute left-4 top-3 z-40 flex h-9 items-center gap-1.5 rounded-xl border px-2.5 shadow-xl backdrop-blur-md ${
              isDark ? "border-white/10 bg-zinc-900/95" : "border-zinc-200 bg-white/95"
            }`}
          >
            <Search size={13} className="text-zinc-500" />

            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setMatchIndex(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") goToMatch(matchIndex + (e.shiftKey ? -1 : 1));
                if (e.key === "Escape") {
                  setSearchOpen(false);
                  setQuery("");
                  setStatusFilter("all");
                }
              }}
              placeholder="Título, texto, código, comentário..."
              className="w-52 bg-transparent text-xs outline-none placeholder:text-zinc-500"
            />

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as NodeStatus | "all");
                setMatchIndex(0);
              }}
              aria-label="Filtrar por status"
              className="bg-transparent text-[11px] outline-none"
            >
              <option value="all">Todos os status</option>
              {NODE_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            {searchActive && (
              <span className="whitespace-nowrap text-[10px] font-semibold text-zinc-500">
                {matches.length === 0 ? "0 resultados" : `${Math.min(matchIndex + 1, matches.length)}/${matches.length}`}
              </span>
            )}

            <button onClick={() => goToMatch(matchIndex - 1)} disabled={matches.length === 0} className={toolbarBtn()} aria-label="Resultado anterior">
              <ChevronUp size={12} />
            </button>

            <button onClick={() => goToMatch(matchIndex + 1)} disabled={matches.length === 0} className={toolbarBtn()} aria-label="Próximo resultado">
              <ChevronDown size={12} />
            </button>

            <button
              onClick={() => {
                setSearchOpen(false);
                setQuery("");
                setStatusFilter("all");
              }}
              className={toolbarBtn()}
              aria-label="Fechar busca"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* ---------- caixa de seleção ---------- */}
        <div
          ref={marqueeRef}
          className="pointer-events-none absolute z-30 hidden rounded border border-[var(--accent)] bg-[var(--accent)]/10"
        />

        {selectedIds.length > 1 && !connecting && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className={`absolute left-1/2 top-4 z-40 flex -translate-x-1/2 items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-xl ${
              isDark ? "border-white/10 bg-zinc-900 text-zinc-100" : "border-zinc-200 bg-white text-zinc-800"
            }`}
          >
            <span className="mr-2">{selectedIds.length} blocos selecionados</span>

            <button onClick={duplicateSelection} className={`flex items-center gap-1 rounded-lg px-2 py-1 ${isDark ? "hover:bg-white/10" : "hover:bg-zinc-100"}`}>
              <Copy size={12} />
              Duplicar
            </button>

            <button onClick={() => deleteNodes(selectedIds)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-red-400 hover:bg-red-500/10">
              <X size={12} />
              Excluir
            </button>

            <button onClick={() => setSelectedIds([])} className={`rounded-lg px-2 py-1 ${isDark ? "hover:bg-white/10" : "hover:bg-zinc-100"}`}>
              Limpar
            </button>
          </div>
        )}

        {/* ---------- avisos sobre a tela ---------- */}
        {connecting && (
          <div
            className={`pointer-events-none absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-xl border px-4 py-2 text-xs font-semibold shadow-lg ${
              isDark ? "border-zinc-700 bg-zinc-900 text-zinc-100" : "border-zinc-300 bg-white text-zinc-800"
            }`}
          >
            Clique no bloco de destino · Esc cancela
          </div>
        )}

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="max-w-sm text-center" onMouseDown={(e) => e.stopPropagation()}>
              <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border ${isDark ? "border-white/[0.07] bg-white/[0.03]" : "border-zinc-200 bg-white"}`}>
                <GitFork size={19} className={isDark ? "text-zinc-600" : "text-zinc-400"} />
              </div>

              <p className={`text-sm font-semibold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Seu fluxograma começa aqui</p>
              <p className="mt-1.5 text-xs text-zinc-500">Adicione um tópico, cole uma imagem ou comece por um modelo pronto.</p>

              <div className="mt-4 flex justify-center gap-2">
                <button onClick={() => addBlock("topic")} className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-xs font-medium text-white hover:brightness-110">
                  <Plus size={14} />
                  Tópico
                </button>

                <button onClick={() => setShowTemplates(true)} className={button}>
                  <Sparkles size={13} />
                  Ver modelos
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedConnection && selectedEdge && (
          <FlowConnectionPanel
            key={selectedEdge}
            connection={selectedConnection}
            fromTitle={nodeById.get(selectedConnection.from) ? nodeLabel(nodeById.get(selectedConnection.from) as Node) : "?"}
            toTitle={nodeById.get(selectedConnection.to) ? nodeLabel(nodeById.get(selectedConnection.to) as Node) : "?"}
            dark={isDark}
            onChange={(changes) => updateConnection(selectedEdge, changes)}
            onReverse={() => reverseConnection(selectedEdge)}
            onDelete={() => deleteConnection(selectedEdge)}
            onClose={() => setSelectedEdge(null)}
          />
        )}

        {showMinimap && nodes.length > 0 && (
          <FlowMinimap nodes={renderNodes} view={view} size={vpSize} dark={isDark} accent={accent} onJump={(x, y) => centerOnPoint(x, y)} />
        )}

        {toast && (
          <div
            className={`absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-2xl ${
              isDark ? "border-white/10 bg-zinc-900 text-zinc-100" : "border-zinc-200 bg-white text-zinc-800"
            }`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {toast.text}

            {toast.undo && (
              <button
                onClick={() => {
                  undo();
                  setToast(null);
                }}
                className="rounded-lg px-2 py-1 text-[var(--accent)] hover:bg-[var(--accent)]/10"
              >
                Desfazer
              </button>
            )}
          </div>
        )}

        <div className="pointer-events-none absolute bottom-3 left-4 text-[11px] text-zinc-500">
          Roda do mouse: zoom · arraste o fundo: mover · duplo clique no bloco: editar · Ctrl+Z desfaz
        </div>
      </div>

      {/* ================= JANELAS ================= */}
      {editingNode && (
        <FlowNodeEditor
          key={`${editingNode.id}-${editorTab}`}
          initialTab={editorTab}
          node={editingNode}
          theme={theme}
          onSave={(updated) => {
            pushHistory();
            updateNode(updated.id, updated);
          }}
          onDelete={editingNode.type === "main" ? undefined : () => deleteNode(editingNode.id)}
          onDuplicate={() => duplicateNode(editingNode.id)}
          onClose={() => setEditingNodeId(null)}
        />
      )}

      {codeModalId && nodeById.get(codeModalId) && (
        <CodeFullscreenModal
          node={nodeById.get(codeModalId) as Node}
          onChange={(changes) => typeInNode(codeModalId, changes, "code")}
          onClose={() => setCodeModalId(null)}
        />
      )}

      {showTemplates && <FlowTemplatesModal theme={theme} onPick={insertTemplate} onClose={() => setShowTemplates(false)} />}

      {showVersions && (
        <FlowVersionsModal
          theme={theme}
          versions={topic.versions ?? []}
          onSave={(name) => saveVersion(name)}
          onRestore={(version) => restoreVersion(version.id)}
          onDelete={deleteVersion}
          onClose={() => setShowVersions(false)}
        />
      )}

      {showHelp && <FlowHelpModal theme={theme} onClose={() => setShowHelp(false)} />}
    </div>
  );
}