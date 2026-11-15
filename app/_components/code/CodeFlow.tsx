"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  ExternalLink,
  FolderPlus,
  LayoutTemplate,
  Link2,
  Maximize2,
  Plus,
  Search,
  StickyNote,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Connection, Node, Theme, Topic } from "@/types";
import { detectLanguage, AUTO_LANGUAGE } from "@/lib/code/highlight";
import { linkLabel, normalizeUrl } from "@/lib/link";
import { FOLDER_KINDS, FileTypeIcon, FolderTypeIcon, fileTypeOf, folderKindOf } from "@/lib/fileIcons";
import { cloneNodes, connectionGeometry, uid } from "@/lib/flow";

import { useAccent } from "@/lib/theme";
import { useSettings } from "@/lib/settings";

import CodeBlock from "./CodeBlock";
import CodeFullscreenModal from "./CodeFullscreenModal";

interface CodeFlowProps {
  topic: Topic;
  setTopics: React.Dispatch<React.SetStateAction<Topic[]>>;
  theme: Theme;
}

type TopicWithLink = Topic & { link?: string };

const CODE_W = 520;
const CODE_H = 410;
const NOTE_W = 260;
const NOTE_H = 150;
const FOLDER_W = 320;
const FOLDER_H = 260;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const sizeOf = (node: Node) => ({
  w: node.width ?? (node.type === "code" ? CODE_W : node.type === "folder" ? FOLDER_W : NOTE_W),
  h: node.height ?? (node.type === "code" ? CODE_H : node.type === "folder" ? FOLDER_H : NOTE_H),
});

const rectOf = (node: Node) => ({ x: node.x, y: node.y, ...sizeOf(node) });

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

type Drag =
  | { kind: "pan"; sx: number; sy: number; vx: number; vy: number }
  | { kind: "move"; sx: number; sy: number; origins: { id: string; x: number; y: number }[]; pushed: boolean }
  | { kind: "resize"; id: string; sx: number; sy: number; w: number; h: number; minW: number; minH: number; pushed: boolean }
  | { kind: "marquee"; sx: number; sy: number; cx: number; cy: number; base: string[] };

interface Snapshot {
  nodes: Node[];
  connections: Connection[];
}

/** cor da linha e do ícone de cada bloco */
function colorOfNode(node: Node): string {
  if (node.type === "folder") return folderKindOf(node.title, node.folderKind).color;
  if (node.type === "code") {
    const manual = node.language && node.language !== AUTO_LANGUAGE ? node.language : undefined;

    return fileTypeOf(node.title, manual).color;
  }

  return "#eab308";
}

/** Fluxograma visual de código, com pastas, explorador e ícones por tipo de arquivo. */
export default function CodeFlow({ topic, setTopics, theme }: CodeFlowProps) {
  const dark = theme === "dark";
  const accent = useAccent();
  const { flowZoomSpeed } = useSettings();
  const zoomSpeedRef = useRef(flowZoomSpeed);
  zoomSpeedRef.current = flowZoomSpeed;
  const topicLink = (topic as TopicWithLink).link;

  const topicRef = useRef(topic);
  topicRef.current = topic;

  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const drag = useRef<Drag | null>(null);

  /* ---------- enquadramento (mexe direto na tela, sem re-renderizar tudo) ---------- */
  const [view, setView] = useState({ x: 60, y: 60, zoom: 1 });
  const viewRef = useRef(view);
  const viewTimer = useRef<number | null>(null);

  const applyView = useCallback((v: { x: number; y: number; zoom: number }, immediate = false) => {
    viewRef.current = v;

    if (worldRef.current) worldRef.current.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.zoom})`;

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

    /* só avisa o React depois que o movimento parar */
    if (viewTimer.current !== null) clearTimeout(viewTimer.current);

    viewTimer.current = window.setTimeout(() => {
      viewTimer.current = null;
      setView(viewRef.current);
    }, 180);
  }, []);

  /* ---------- seleção e ferramentas ---------- */
  const [tool, setTool] = useState<"hand" | "select">("hand");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedRef = useRef<string[]>([]);
  selectedRef.current = selectedIds;
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [codeModalId, setCodeModalId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; undo?: boolean } | null>(null);

  /* ---------- explorador e busca ---------- */
  const [showExplorer, setShowExplorer] = useState(true);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<string[]>([]);

  /* Durante o arrasto os blocos e as linhas se movem direto na tela (sem re-renderizar o React);
     as novas posições só são gravadas ao soltar o mouse. */
  const liveRef = useRef<Record<string, Partial<Node>>>({});
  const liveFrame = useRef<number | null>(null);
  const nodeEls = useRef(new Map<string, HTMLElement>());

  const nodes = topic.nodes;
  const renderNodes = nodes;

  const nodeById = useMemo(() => new Map(renderNodes.map((n) => [n.id, n])), [renderNodes]);

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

      const g = connectionGeometry(rectOf(a), rectOf(b), "curved");
      const group = world.querySelector(`[data-edge="${CSS.escape(conn.id ?? `${conn.from}>${conn.to}`)}"]`);

      if (!group) return;

      group.querySelectorAll("path[data-geo]").forEach((path) => path.setAttribute("d", g.d));
      group.querySelector("[data-label]")?.setAttribute("transform", `translate(${g.mx}, ${g.my})`);
    });
  };

  const scheduleLive = () => {
    if (liveFrame.current === null) liveFrame.current = requestAnimationFrame(previewLive);
  };

  useEffect(
    () => () => {
      if (viewTimer.current !== null) clearTimeout(viewTimer.current);
      if (liveFrame.current !== null) cancelAnimationFrame(liveFrame.current);
    },
    []
  );

  /* =========================================================
     ESTRUTURA DE PASTAS
  ========================================================= */

  const childMap = useMemo(() => {
    const map = new Map<string, Node[]>();
    const ids = new Set(nodes.map((n) => n.id));

    nodes.forEach((n) => {
      if (n.type === "note") return;

      const key = n.parentId && ids.has(n.parentId) ? n.parentId : "";
      const list = map.get(key) ?? [];

      list.push(n);
      map.set(key, list);
    });

    const nameOf = (n: Node) => (n.title || "").toLowerCase();

    map.forEach((list) =>
      list.sort((a, b) => {
        if ((a.type === "folder") !== (b.type === "folder")) return a.type === "folder" ? -1 : 1;

        return nameOf(a).localeCompare(nameOf(b));
      })
    );

    return map;
  }, [nodes]);

  const descendantsOf = useCallback(
    (id: string): string[] => {
      const out: string[] = [];
      const stack = [id];

      while (stack.length) {
        const current = stack.pop() as string;

        for (const child of childMap.get(current) ?? []) {
          out.push(child.id);
          stack.push(child.id);
        }
      }

      return out;
    },
    [childMap]
  );

  const pathOf = (node: Node) => {
    const parts: string[] = [];
    let current = node.parentId ? nodeById.get(node.parentId) : undefined;
    let guard = 0;

    while (current && guard++ < 20) {
      parts.unshift(current.title || "pasta");
      current = current.parentId ? nodeById.get(current.parentId) : undefined;
    }

    return parts.join("/");
  };

  const folderOptionsFor = (node: Node) => {
    const blocked = new Set([node.id, ...(node.type === "folder" ? descendantsOf(node.id) : [])]);

    return nodes
      .filter((n) => n.type === "folder" && !blocked.has(n.id))
      .map((n) => ({ id: n.id, label: [pathOf(n), n.title || "pasta"].filter(Boolean).join("/") }))
      .sort((a, b) => a.label.localeCompare(b.label));
  };

  /* =========================================================
     EDIÇÃO
  ========================================================= */

  const patchTopic = useCallback(
    (fn: (t: Topic) => Topic) => setTopics((current) => current.map((t) => (t.id === topic.id ? fn(t) : t))),
    [setTopics, topic.id]
  );

  /* ---------- desfazer / refazer (Ctrl+Z, Ctrl+Y) ---------- */
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

  const undo = () => {
    const previous = past.current.pop();

    if (!previous) return;

    future.current.push({ nodes: topicRef.current.nodes, connections: topicRef.current.connections });
    lastPush.current = { key: "", at: 0 };
    patchTopic((t) => ({ ...t, nodes: previous.nodes, connections: previous.connections }));
    setSelectedIds([]);
    setSelectedEdge(null);
    setHistoryTick((t) => t + 1);
  };

  const redo = () => {
    const next = future.current.pop();

    if (!next) return;

    past.current.push({ nodes: topicRef.current.nodes, connections: topicRef.current.connections });
    lastPush.current = { key: "", at: 0 };
    patchTopic((t) => ({ ...t, nodes: next.nodes, connections: next.connections }));
    setSelectedIds([]);
    setSelectedEdge(null);
    setHistoryTick((t) => t + 1);
  };

  const showToast = (text: string, undoable = false) => setToast({ text, undo: undoable });

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => setToast(null), 4500);

    return () => clearTimeout(timer);
  }, [toast]);

  const updateNode = useCallback(
    (id: string, changes: Partial<Node>) =>
      patchTopic((t) => ({ ...t, nodes: t.nodes.map((n) => (n.id === id ? { ...n, ...changes } : n)) })),
    [patchTopic]
  );

  /** Edição com desfazer: digitações seguidas no mesmo campo viram um passo só. */
  const editNode = (id: string, changes: Partial<Node>) => {
    pushHistory(`edit-${id}-${Object.keys(changes).join(",")}`);
    updateNode(id, changes);
  };

  const deleteNodes = (ids: string[]) => {
    const remove = new Set(ids);

    pushHistory();

    patchTopic((t) => ({
      ...t,
      /* arquivos de uma pasta apagada voltam para a raiz */
      nodes: t.nodes
        .filter((n) => !remove.has(n.id))
        .map((n) => (n.parentId && remove.has(n.parentId) ? { ...n, parentId: undefined } : n)),
      connections: t.connections.filter((c) => !remove.has(c.from) && !remove.has(c.to)),
    }));

    setSelectedIds((current) => current.filter((id) => !remove.has(id)));
    if (connectingFrom && remove.has(connectingFrom)) setConnectingFrom(null);

    showToast(remove.size > 1 ? `${remove.size} blocos excluídos.` : "Bloco excluído.", true);
  };

  const duplicateSelection = () => {
    const source = topicRef.current.nodes.filter((n) => selectedRef.current.includes(n.id));

    if (source.length === 0) return;

    const copy = cloneNodes(source, topicRef.current.connections, { x: 40, y: 40 });

    /* se a pasta também foi copiada, a cópia dos arquivos fica dentro da pasta copiada */
    const nodesCopy = copy.nodes.map((n) => ({
      ...n,
      parentId: n.parentId ? copy.idMap.get(n.parentId) ?? n.parentId : undefined,
    }));

    pushHistory();
    patchTopic((t) => ({ ...t, nodes: [...t.nodes, ...nodesCopy], connections: [...t.connections, ...copy.connections] }));
    setSelectedIds(nodesCopy.map((n) => n.id));
    showToast(nodesCopy.length > 1 ? `${nodesCopy.length} blocos duplicados.` : "Bloco duplicado.");
  };

  const createConnection = (from: string, to: string) => {
    setConnectingFrom(null);

    if (from === to) return;

    if (topicRef.current.connections.some((c) => c.from === from && c.to === to)) {
      showToast("Esses dois blocos já estão ligados nesse sentido.");

      return;
    }

    pushHistory();
    patchTopic((t) => ({ ...t, connections: [...t.connections, { id: uid("conn"), from, to }] }));
  };

  const deleteEdge = (key: string) => {
    pushHistory();
    patchTopic((t) => ({
      ...t,
      connections: t.connections.filter((c) => (c.id ?? `${c.from}>${c.to}`) !== key),
    }));
    setSelectedEdge(null);
  };

  const viewportCenter = () => {
    const el = viewportRef.current;
    const v = viewRef.current;

    if (!el) return { x: 100, y: 100 };

    return { x: (el.clientWidth / 2 - v.x) / v.zoom, y: (el.clientHeight / 2 - v.y) / v.zoom };
  };

  /** pasta escolhida no momento (se for só uma): novos arquivos nascem dentro dela */
  const currentFolderId = () => {
    if (selectedRef.current.length !== 1) return undefined;

    const picked = topicRef.current.nodes.find((n) => n.id === selectedRef.current[0]);

    if (!picked) return undefined;

    return picked.type === "folder" ? picked.id : picked.parentId;
  };

  const createCode = (initial = "") => {
    const center = viewportCenter();
    const shift = (nodes.length % 5) * 28;

    const node: Node = {
      id: uid("code"),
      title: "",
      description: "",
      type: "code",
      x: Math.round(center.x - CODE_W / 2 + shift),
      y: Math.round(center.y - CODE_H / 2 + shift),
      width: CODE_W,
      height: CODE_H,
      language: AUTO_LANGUAGE,
      code: initial,
      parentId: currentFolderId(),
    };

    pushHistory();
    patchTopic((t) => ({ ...t, nodes: [...t.nodes, node] }));
    setSelectedIds([node.id]);
  };

  const createFolder = () => {
    const center = viewportCenter();
    const shift = (nodes.length % 5) * 28;

    const node: Node = {
      id: uid("folder"),
      title: "",
      description: "",
      type: "folder",
      x: Math.round(center.x - FOLDER_W / 2 + shift),
      y: Math.round(center.y - FOLDER_H / 2 + shift),
      width: FOLDER_W,
      height: FOLDER_H,
      parentId: currentFolderId(),
    };

    pushHistory();
    patchTopic((t) => ({ ...t, nodes: [...t.nodes, node] }));
    setSelectedIds([node.id]);
  };

  const createNote = () => {
    const center = viewportCenter();
    const shift = (nodes.length % 5) * 28;

    const node: Node = {
      id: uid("note"),
      title: "",
      description: "",
      type: "note",
      x: Math.round(center.x - NOTE_W / 2 + shift),
      y: Math.round(center.y - NOTE_H / 2 + shift),
      width: NOTE_W,
      height: NOTE_H,
    };

    pushHistory();
    patchTopic((t) => ({ ...t, nodes: [...t.nodes, node] }));
    setSelectedIds([node.id]);
  };

  const copyCode = async (node: Node) => {
    try {
      await navigator.clipboard.writeText(node.code || "");
      setCopiedId(node.id);
      setTimeout(() => setCopiedId(null), 1400);
    } catch {
      /* ignora */
    }
  };

  /* =========================================================
     NAVEGAÇÃO
  ========================================================= */

  const fitView = useCallback(
    (list: Node[], maxZoom = 1) => {
      const el = viewportRef.current;

      if (!el || list.length === 0) {
        applyView({ x: 60, y: 60, zoom: 1 }, true);

        return;
      }

      const rects = list.map(rectOf);
      const minX = Math.min(...rects.map((r) => r.x));
      const minY = Math.min(...rects.map((r) => r.y));
      const maxX = Math.max(...rects.map((r) => r.x + r.w));
      const maxY = Math.max(...rects.map((r) => r.y + r.h));
      const pad = 70;

      const zoom = clamp(
        Math.min((el.clientWidth - pad * 2) / (maxX - minX), (el.clientHeight - pad * 2) / (maxY - minY), maxZoom),
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
    },
    [applyView]
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => fitView(topicRef.current.nodes));

    return () => cancelAnimationFrame(frame);
  }, [topic.id, fitView]);

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
    const el = viewportRef.current;

    if (!node || !el) return;

    const r = rectOf(node);
    const zoom = Math.max(viewRef.current.zoom, 0.7);

    setSelectedIds([id]);
    applyView({ zoom, x: el.clientWidth / 2 - (r.x + r.w / 2) * zoom, y: el.clientHeight / 2 - (r.y + r.h / 2) * zoom }, true);
  };

  const autoLayout = () => {
    const list = topicRef.current.nodes;

    if (list.length === 0) return;

    const placed = new Map<string, { x: number; y: number }>();
    const hasFolders = list.some((n) => n.type === "folder");

    if (hasFolders) {
      /* estilo explorador: pastas à esquerda, o conteúdo ao lado */
      let y = 60;
      const COL = 640;

      const place = (node: Node, depth: number) => {
        const kids = childMap.get(node.id) ?? [];
        const x = 60 + depth * COL;
        const height = sizeOf(node).h;

        if (kids.length === 0) {
          placed.set(node.id, { x, y });
          y += height + 50;

          return;
        }

        const startY = y;

        kids.forEach((kid) => place(kid, depth + 1));
        placed.set(node.id, { x, y: startY });
        y = Math.max(y, startY + height + 50);
      };

      (childMap.get("") ?? []).forEach((root) => place(root, 0));

      let noteY = 60;

      list
        .filter((n) => n.type === "note")
        .forEach((n) => {
          placed.set(n.id, { x: 60 + 3 * COL, y: noteY });
          noteY += sizeOf(n).h + 40;
        });
    } else {
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
    }

    const next = list.map((n) => ({ ...n, ...(placed.get(n.id) ?? {}) }));

    pushHistory();
    patchTopic((t) => ({ ...t, nodes: next }));
    fitView(next);
    showToast("Blocos organizados.", true);
  };

  /* roda do mouse */
  useEffect(() => {
    const el = viewportRef.current;

    if (!el) return;

    const wheel = (e: WheelEvent) => {
      const editor = (e.target as HTMLElement).closest("textarea, select") as HTMLElement | null;

      if (editor && editor.scrollHeight > editor.clientHeight + 1) return;
      if ((e.target as HTMLElement).closest(".thin-scroll-area")) return;

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

  /* arrastar: mover quadro, blocos, redimensionar, caixa de seleção */
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
          next[o.id] = { x: Math.round(o.x + (e.clientX - d.sx) / z), y: Math.round(o.y + (e.clientY - d.sy) / z) };
        });

        liveRef.current = next;
      } else {
        liveRef.current = {
          [d.id]: {
            width: Math.max(d.minW, Math.round(d.w + (e.clientX - d.sx) / z)),
            height: Math.max(d.minH, Math.round(d.h + (e.clientY - d.sy) / z)),
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
            const r = rectOf(n);

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

  /* teclado e colar */
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});

  keyRef.current = (e: KeyboardEvent) => {
    const typing = !!(e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable='true']");
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    if (codeModalId) return;

    if (mod && key === "f") {
      e.preventDefault();
      setShowExplorer(true);
      requestAnimationFrame(() => searchRef.current?.focus());

      return;
    }

    if (e.key === "Escape") {
      setConnectingFrom(null);
      setSelectedEdge(null);

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

    if (mod && key === "d" && selectedRef.current.length) {
      e.preventDefault();
      duplicateSelection();

      return;
    }

    if (e.key === "Delete" || e.key === "Backspace") {
      if (selectedEdge) deleteEdge(selectedEdge);
      else if (selectedRef.current.length) deleteNodes(selectedRef.current);

      return;
    }

    if (mod || e.altKey) return;

    if (e.key === "+" || e.key === "=") zoomBy(1.2);
    else if (e.key === "-") zoomBy(1 / 1.2);
    else if (e.key === "0") applyView({ ...viewRef.current, zoom: 1 }, true);
    else if (key === "f") fitView(topicRef.current.nodes, 1.4);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => keyRef.current(e);

    window.addEventListener("keydown", handler);

    return () => window.removeEventListener("keydown", handler);
  }, []);

  const pasteRef = useRef<(e: ClipboardEvent) => void>(() => {});

  pasteRef.current = (e: ClipboardEvent) => {
    if ((e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable='true']")) return;

    const text = e.clipboardData?.getData("text/plain") ?? "";

    if (text.split("\n").length >= 2 && detectLanguage(text)) {
      e.preventDefault();
      createCode(text);
    }
  };

  useEffect(() => {
    const handler = (e: ClipboardEvent) => pasteRef.current(e);

    window.addEventListener("paste", handler);

    return () => window.removeEventListener("paste", handler);
  }, []);

  /* =========================================================
     BUSCA
  ========================================================= */

  const q = query.trim().toLowerCase();

  const { matchSet, visibleSet, snippets } = useMemo(() => {
    const matches = new Set<string>();
    const snippet = new Map<string, string>();

    if (q) {
      nodes.forEach((n) => {
        const name = (n.title ?? "").toLowerCase();
        const desc = (n.description ?? "").toLowerCase();
        const code = (n.code ?? "").toLowerCase();

        if (name.includes(q) || desc.includes(q) || code.includes(q)) {
          matches.add(n.id);

          if (n.type === "code" && code.includes(q) && !name.includes(q)) {
            const lines = (n.code ?? "").split("\n");
            const index = lines.findIndex((l) => l.toLowerCase().includes(q));

            snippet.set(n.id, `L${index + 1}: ${lines[index].trim().slice(0, 48)}`);
          }
        }
      });
    }

    const visible = new Set(matches);
    const byId = new Map(nodes.map((n) => [n.id, n]));

    matches.forEach((id) => {
      let parent = byId.get(id)?.parentId;
      let guard = 0;

      while (parent && guard++ < 20) {
        visible.add(parent);
        parent = byId.get(parent)?.parentId;
      }
    });

    return { matchSet: matches, visibleSet: visible, snippets: snippet };
  }, [nodes, q]);

  /* =========================================================
     VISUAL
  ========================================================= */

  const border = dark ? "border-zinc-800" : "border-zinc-200";
  const muted = "text-zinc-400";

  const button = `flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
    dark
      ? "border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
  }`;

  const activeBtn = "!border-[var(--accent)] !text-[var(--accent)]";
  const divider = <span className={`mx-1 h-5 w-px shrink-0 ${dark ? "bg-zinc-800" : "bg-zinc-200"}`} />;

  const edges = useMemo(
    () =>
      topic.connections
        .map((connection) => {
          const from = nodeById.get(connection.from);
          const to = nodeById.get(connection.to);

          if (!from || !to) return null;

          const color = connection.color ?? colorOfNode(from);

          return {
            key: connection.id ?? `${connection.from}>${connection.to}`,
            color,
            geometry: connectionGeometry(rectOf(from), rectOf(to), "curved"),
          };
        })
        .filter((edge): edge is NonNullable<typeof edge> => edge !== null),
    [topic.connections, nodeById]
  );

  const markerColors = useMemo(() => Array.from(new Set(edges.map((e) => e.color))), [edges]);
  const codeCount = nodes.filter((n) => n.type === "code").length;
  const folderCount = nodes.filter((n) => n.type === "folder").length;
  const codeNode = codeModalId ? nodeById.get(codeModalId) : undefined;

  /* ---------- explorador ---------- */
  const renderTree = (parentKey: string, depth: number): React.ReactNode =>
    (childMap.get(parentKey) ?? [])
      .filter((n) => !q || visibleSet.has(n.id))
      .map((n) => {
        const isFolder = n.type === "folder";
        const kids = childMap.get(n.id) ?? [];
        const open = q ? true : !collapsed.includes(n.id);
        const selected = selectedIds.includes(n.id);
        const name = n.title || (isFolder ? "pasta sem nome" : "arquivo sem nome");

        return (
          <div key={n.id}>
            <div
              onClick={() => focusNode(n.id)}
              style={{ paddingLeft: 8 + depth * 14 }}
              className={`group flex cursor-pointer items-center gap-1.5 rounded-md py-1 pr-2 ${
                selected ? "bg-[var(--accent)]/15" : dark ? "hover:bg-white/[0.06]" : "hover:bg-zinc-100"
              }`}
            >
              {isFolder ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCollapsed((c) => (c.includes(n.id) ? c.filter((x) => x !== n.id) : [...c, n.id]));
                  }}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center ${muted}`}
                  aria-label={open ? "Recolher pasta" : "Expandir pasta"}
                >
                  {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
              ) : (
                <span className="h-4 w-4 shrink-0" />
              )}

              {isFolder ? <FolderTypeIcon name={n.title} kind={n.folderKind} size={15} /> : <FileTypeIcon name={n.title} language={n.language !== AUTO_LANGUAGE ? n.language : undefined} size={15} />}

              <span className={`min-w-0 flex-1 truncate text-xs ${matchSet.has(n.id) ? "font-bold text-[var(--accent)]" : dark ? "text-zinc-200" : "text-zinc-800"}`}>{name}</span>

              {isFolder && <span className={`text-[10px] ${muted}`}>{kids.length}</span>}
            </div>

            {snippets.get(n.id) && (
              <p style={{ paddingLeft: 8 + depth * 14 + 38 }} className={`truncate pr-2 font-mono text-[10px] ${muted}`}>
                {snippets.get(n.id)}
              </p>
            )}

            {isFolder && open && renderTree(n.id, depth + 1)}
          </div>
        );
      });

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ================= BARRA ÚNICA ================= */}
      <div
        className={`thin-scroll flex shrink-0 items-center gap-1.5 overflow-x-auto border-b px-4 py-2 ${border} ${dark ? "bg-zinc-950" : "bg-white"}`}
      >
        <button onClick={() => createCode("")} className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-xs font-medium text-white shadow-sm hover:brightness-110" title="Adicionar um arquivo de código (dentro da pasta selecionada)">
          <Plus size={14} />
          Código
        </button>

        <button onClick={createFolder} className={button} title="Criar uma pasta para agrupar arquivos">
          <FolderPlus size={13} />
          <span className="hidden 2xl:inline">Pasta</span>
        </button>

        <button onClick={createNote} className={button} title="Adicionar anotação">
          <StickyNote size={13} />
          <span className="hidden 2xl:inline">Nota</span>
        </button>

        {divider}

        <button onClick={() => setTool("hand")} className={`${button} ${tool === "hand" ? activeBtn : ""}`} title="Mover o quadro: arraste o fundo" aria-label="Ferramenta mover">
          <HandIcon />
        </button>

        <button onClick={() => setTool("select")} className={`${button} ${tool === "select" ? activeBtn : ""}`} title="Selecionar vários blocos: arraste no fundo para desenhar uma caixa (ou segure Shift)" aria-label="Ferramenta selecionar">
          <CursorIcon />
        </button>

        {divider}

        <button onClick={undo} disabled={past.current.length === 0} className={button} title="Desfazer (Ctrl+Z)" aria-label="Desfazer">
          <Undo2 size={13} />
        </button>

        <button onClick={redo} disabled={future.current.length === 0} className={button} title="Refazer (Ctrl+Y)" aria-label="Refazer">
          <Undo2 size={13} className="-scale-x-100" />
        </button>

        {divider}

        <div className={`flex h-8 shrink-0 items-center rounded-lg border ${border}`}>
          <button onClick={() => zoomBy(1 / 1.15)} className={`flex h-full w-8 items-center justify-center ${muted} hover:text-zinc-100`} aria-label="Diminuir zoom" title="Diminuir zoom (-)">
            <ZoomOut size={13} />
          </button>

          <button onClick={() => applyView({ ...viewRef.current, zoom: 1 }, true)} className={`w-11 text-center text-[11px] ${muted}`} title="Voltar a 100% (0)">
            {Math.round(view.zoom * 100)}%
          </button>

          <button onClick={() => zoomBy(1.15)} className={`flex h-full w-8 items-center justify-center ${muted} hover:text-zinc-100`} aria-label="Aumentar zoom" title="Aumentar zoom (+)">
            <ZoomIn size={13} />
          </button>
        </div>

        <button onClick={() => fitView(nodes, 1.6)} className={button} title="Centralizar e ajustar à tela (F)" aria-label="Ajustar à tela">
          <Maximize2 size={13} />
        </button>

        <button onClick={autoLayout} disabled={nodes.length === 0} className={button} title="Organizar como um explorador de arquivos" aria-label="Organizar">
          <LayoutTemplate size={13} />
          <span className="hidden 2xl:inline">Organizar</span>
        </button>

        <button
          onClick={() => {
            setShowExplorer(true);
            requestAnimationFrame(() => searchRef.current?.focus());
          }}
          className={button}
          title="Pesquisar arquivos e códigos (Ctrl+F)"
          aria-label="Pesquisar"
        >
          <Search size={13} />
          <span className="hidden 2xl:inline">Pesquisar</span>
        </button>

        <button onClick={() => setShowExplorer((v) => !v)} className={`${button} ${showExplorer ? activeBtn : ""}`} title="Mostrar ou esconder o explorador de pastas">
          <span>Explorador</span>
        </button>

        <span className="min-w-4 flex-1" />

        <span className={`hidden shrink-0 whitespace-nowrap text-[11px] 2xl:block ${muted}`}>
          {codeCount} arquivos · {folderCount} pastas · {topic.connections.length} ligações
        </span>

        {topicLink && (
          <a href={normalizeUrl(topicLink)} target="_blank" rel="noopener noreferrer" className={`hidden shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] sm:flex ${border} ${muted} hover:text-zinc-200`}>
            <ExternalLink size={11} />
            {linkLabel(topicLink)}
          </a>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* ================= EXPLORADOR ================= */}
        {showExplorer && (
          <aside className={`flex w-64 shrink-0 flex-col border-r ${border} ${dark ? "bg-zinc-950" : "bg-white"}`}>
            <div className="p-2.5">
              <div className={`flex h-8 items-center gap-2 rounded-lg border px-2.5 ${dark ? "border-white/10 bg-white/[0.03]" : "border-zinc-200 bg-zinc-50"}`}>
                <Search size={12} className={muted} />

                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setQuery("");

                    if (e.key === "Enter") {
                      const first = nodes.find((n) => matchSet.has(n.id));

                      if (first) focusNode(first.id);
                    }
                  }}
                  placeholder="Nome ou trecho de código"
                  className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-zinc-500"
                />

                {query && (
                  <button onClick={() => setQuery("")} className={muted} aria-label="Limpar pesquisa">
                    <X size={12} />
                  </button>
                )}
              </div>

              <p className={`mt-1.5 px-0.5 text-[10px] ${muted}`}>
                {q ? (matchSet.size === 0 ? "Nada encontrado" : `${matchSet.size} resultado(s) · Enter vai ao primeiro`) : "Clique para ir até o bloco"}
              </p>
            </div>

            <div className="thin-scroll thin-scroll-area min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
              {nodes.filter((n) => n.type !== "note").length === 0 ? (
                <p className={`px-3 py-6 text-center text-[11px] leading-relaxed ${muted}`}>
                  Crie uma pasta e arquivos. Eles aparecem aqui, organizados como no VS Code.
                </p>
              ) : (
                renderTree("", 0)
              )}
            </div>
          </aside>
        )}

        {/* ================= ÁREA DO FLUXOGRAMA ================= */}
        <div
          ref={viewportRef}
          onMouseDown={(e) => {
            if (e.button !== 0 && e.button !== 1) return;

            const additive = e.shiftKey;
            const marquee = e.button === 0 && (tool === "select" || additive);

            if (!additive) setSelectedIds([]);

            setSelectedEdge(null);

            if (connectingFrom) setConnectingFrom(null);

            drag.current = marquee
              ? { kind: "marquee", sx: e.clientX, sy: e.clientY, cx: e.clientX, cy: e.clientY, base: additive ? selectedRef.current : [] }
              : { kind: "pan", sx: e.clientX, sy: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y };
          }}
          className={`relative min-h-0 min-w-0 flex-1 overflow-hidden ${tool === "select" ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
          style={{
            backgroundColor: dark ? "#09090b" : "#f4f4f5",
            backgroundImage: `radial-gradient(circle, ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"} 1px, transparent 1px)`,
            backgroundSize: `${24 * viewRef.current.zoom}px ${24 * viewRef.current.zoom}px`,
            backgroundPosition: `${viewRef.current.x}px ${viewRef.current.y}px`,
          }}
        >
          <div
            ref={worldRef}
            className="absolute left-0 top-0 origin-top-left"
            style={{ transform: `translate(${viewRef.current.x}px, ${viewRef.current.y}px) scale(${viewRef.current.zoom})` }}
          >
            {/* ligações: a cor segue o tipo do arquivo de origem */}
            <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={1} height={1}>
              <defs>
                {markerColors.map((color) => (
                  <marker key={color} id={`cf-${color.replace(/[^a-z0-9]/gi, "")}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                    <path d="M0 0 L10 5 L0 10 z" fill={color} />
                  </marker>
                ))}
              </defs>

              {edges.map(({ key, color, geometry }) => {
                const selected = selectedEdge === key;

                return (
                  <g key={key} data-edge={key}>
                    {selected && <path data-geo d={geometry.d} fill="none" stroke={color} strokeOpacity={0.3} strokeWidth={9} strokeLinecap="round" />}

                    <path data-geo d={geometry.d} fill="none" stroke={color} strokeWidth={selected ? 2.8 : 2} markerEnd={`url(#cf-${color.replace(/[^a-z0-9]/gi, "")})`} />

                    <path
                      data-geo
                      d={geometry.d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={16}
                      style={{ pointerEvents: "stroke", cursor: "pointer" }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedEdge(key);
                        setSelectedIds([]);
                      }}
                    />

                    {selected && (
                      <g
                        data-label
                        transform={`translate(${geometry.mx}, ${geometry.my})`}
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

            {/* blocos */}
            {renderNodes.map((node) => {
              const { w, h } = sizeOf(node);
              const selected = selectedIds.includes(node.id);
              const isSource = connectingFrom === node.id;
              const isTarget = !!connectingFrom && !isSource;
              const dimmed = !!q && !matchSet.has(node.id);
              const matched = !!q && matchSet.has(node.id);
              const isFolder = node.type === "folder";
              const isCode = node.type === "code";
              const color = colorOfNode(node);

              return (
                <div
                  key={node.id}
                  ref={(el) => {
                    if (el) nodeEls.current.set(node.id, el);
                    else nodeEls.current.delete(node.id);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();

                    if (connectingFrom) return;

                    const additive = e.shiftKey || e.ctrlKey || e.metaKey;

                    if (additive) {
                      setSelectedIds((prev) => (prev.includes(node.id) ? prev.filter((x) => x !== node.id) : [...prev, node.id]));
                      setSelectedEdge(null);

                      return;
                    }

                    let group = selectedRef.current.includes(node.id) ? selectedRef.current : [node.id];

                    /* mover uma pasta leva o que está dentro dela (segure Alt para mover só a pasta) */
                    if (isFolder && !e.altKey) group = Array.from(new Set([...group, ...descendantsOf(node.id)]));

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
                  className={`group absolute rounded-xl border shadow-sm transition-opacity ${dimmed ? "opacity-25" : ""} ${isTarget ? "cursor-pointer" : "cursor-default"} ${
                    isCode ? (dark ? "border-zinc-800 bg-zinc-950" : "border-zinc-200 bg-white") : dark ? "border-zinc-800 bg-zinc-900/90" : "border-zinc-200 bg-zinc-50"
                  }`}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: w,
                    height: h,
                    borderColor: isFolder ? color : undefined,
                    boxShadow: isSource ? `0 0 0 3px ${accent}` : matched ? "0 0 0 3px #f59e0b" : selected ? `0 0 0 2px ${accent}` : undefined,
                  }}
                >
                  {isTarget && (
                    <div
                      className="absolute inset-0 z-40 cursor-pointer rounded-xl ring-2 ring-[var(--accent)] hover:bg-[var(--accent)]/10"
                      onMouseDown={(e) => {
                        e.stopPropagation();

                        if (connectingFrom) createConnection(connectingFrom, node.id);
                      }}
                    />
                  )}

                  {isCode ? (
                    <CodeBlock
                      node={node}
                      isDark={dark}
                      copied={copiedId === node.id}
                      isSource={isSource}
                      onChange={(changes) => editNode(node.id, changes)}
                      onCopy={() => copyCode(node)}
                      onDelete={() => deleteNodes([node.id])}
                      onConnect={() => setConnectingFrom((current) => (current === node.id ? null : node.id))}
                      onHeaderMouseDown={() => {}}
                      onExpand={() => setCodeModalId(node.id)}
                      folderOptions={folderOptionsFor(node)}
                      onMoveToFolder={(folderId) => editNode(node.id, { parentId: folderId || undefined })}
                    />
                  ) : isFolder ? (
                    <FolderCard
                      node={node}
                      dark={dark}
                      color={color}
                      isSource={isSource}
                      path={pathOf(node)}
                      kids={childMap.get(node.id) ?? []}
                      folderOptions={folderOptionsFor(node)}
                      onChange={(changes) => editNode(node.id, changes)}
                      onConnect={() => setConnectingFrom((current) => (current === node.id ? null : node.id))}
                      onDelete={() => deleteNodes([node.id])}
                      onOpenChild={focusNode}
                    />
                  ) : (
                    <div className="flex h-full flex-col overflow-hidden rounded-xl">
                      <div className={`flex h-8 shrink-0 items-center justify-between border-b px-3 ${border}`}>
                        <StickyNote size={12} className={muted} />

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setConnectingFrom((current) => (current === node.id ? null : node.id))}
                            className={`rounded p-1 transition-colors ${isSource ? (dark ? "bg-zinc-800 text-zinc-100" : "bg-zinc-200 text-zinc-900") : `${muted} hover:text-zinc-200`}`}
                            title="Ligar a outro bloco"
                          >
                            <Link2 size={12} />
                          </button>

                          <button onClick={() => deleteNodes([node.id])} className={`rounded p-1 ${muted} hover:text-red-500`}>
                            <X size={12} />
                          </button>
                        </div>
                      </div>

                      <input
                        value={node.title ?? ""}
                        onChange={(e) => editNode(node.id, { title: e.target.value })}
                        placeholder="Título da nota"
                        className={`bg-transparent px-3 pt-2 text-xs font-semibold outline-none ${dark ? "text-zinc-100 placeholder:text-zinc-600" : "text-zinc-900 placeholder:text-zinc-400"}`}
                      />

                      <textarea
                        value={node.description ?? ""}
                        onChange={(e) => editNode(node.id, { description: e.target.value })}
                        placeholder="Escreva uma anotação, ideia ou lembrete..."
                        className={`thin-scroll min-h-0 flex-1 resize-none bg-transparent px-3 py-2 text-[11px] leading-relaxed outline-none ${dark ? "text-zinc-300 placeholder:text-zinc-600" : "text-zinc-700 placeholder:text-zinc-400"}`}
                      />
                    </div>
                  )}

                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();

                      const size = sizeOf(node);

                      drag.current = {
                        kind: "resize",
                        id: node.id,
                        sx: e.clientX,
                        sy: e.clientY,
                        w: size.w,
                        h: size.h,
                        minW: isCode ? 340 : isFolder ? 240 : 200,
                        minH: isCode ? 280 : isFolder ? 180 : 110,
                        pushed: false,
                      };
                    }}
                    className="resize-handle absolute -bottom-1 -right-1 h-4 w-4 cursor-se-resize"
                  >
                    <span className={`absolute bottom-1.5 right-1.5 h-2 w-2 border-b-2 border-r-2 ${dark ? "border-zinc-700" : "border-zinc-300"}`} />
                  </div>
                </div>
              );
            })}
          </div>

          <div ref={marqueeRef} className="pointer-events-none absolute z-30 hidden rounded border border-[var(--accent)] bg-[var(--accent)]/10" />

          {selectedIds.length > 1 && !connectingFrom && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              className={`absolute left-1/2 top-4 z-40 flex -translate-x-1/2 items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-xl ${
                dark ? "border-white/10 bg-zinc-900 text-zinc-100" : "border-zinc-200 bg-white text-zinc-800"
              }`}
            >
              <span className="mr-2">{selectedIds.length} blocos selecionados</span>

              <button onClick={duplicateSelection} className={`flex items-center gap-1 rounded-lg px-2 py-1 ${dark ? "hover:bg-white/10" : "hover:bg-zinc-100"}`}>
                <Copy size={12} />
                Duplicar
              </button>

              <button onClick={() => deleteNodes(selectedIds)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-red-400 hover:bg-red-500/10">
                <X size={12} />
                Excluir
              </button>

              <button onClick={() => setSelectedIds([])} className={`rounded-lg px-2 py-1 ${dark ? "hover:bg-white/10" : "hover:bg-zinc-100"}`}>
                Limpar
              </button>
            </div>
          )}

          {connectingFrom && (
            <div className={`pointer-events-none absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-md border px-4 py-2 text-xs shadow-sm ${dark ? "border-zinc-700 bg-zinc-900 text-zinc-200" : "border-zinc-300 bg-white text-zinc-800"}`}>
              Clique no bloco de destino · Esc cancela
            </div>
          )}

          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="max-w-sm text-center">
                <Code2 size={28} className={`mx-auto mb-4 ${muted}`} />

                <p className={`text-sm font-semibold ${dark ? "text-zinc-100" : "text-zinc-900"}`}>Cole um código para começar</p>

                <p className={`mt-2 text-xs leading-relaxed ${muted}`}>
                  Aperte Ctrl+V com um código copiado, ou clique em “Código”. Crie pastas para organizar os arquivos como no seu projeto e ligue os blocos com o ícone de corrente.
                </p>
              </div>
            </div>
          )}

          {toast && (
            <div
              className={`absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-2xl ${
                dark ? "border-white/10 bg-zinc-900 text-zinc-100" : "border-zinc-200 bg-white text-zinc-800"
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

          <div className={`pointer-events-none absolute bottom-3 right-4 text-xs ${muted}`}>
            Roda: zoom · fundo: mover · Shift + arrastar: selecionar · 2 cliques no código: tela cheia
          </div>
        </div>
      </div>

      {codeNode && (
        <CodeFullscreenModal
          node={codeNode}
          path={pathOf(codeNode)}
          onChange={(changes) => editNode(codeNode.id, changes)}
          onClose={() => setCodeModalId(null)}
        />
      )}
    </div>
  );
}

/* =========================================================
   BLOCO DE PASTA
========================================================= */

function FolderCard({
  node,
  dark,
  color,
  isSource,
  path,
  kids,
  folderOptions,
  onChange,
  onConnect,
  onDelete,
  onOpenChild,
}: {
  node: Node;
  dark: boolean;
  color: string;
  isSource: boolean;
  path: string;
  kids: Node[];
  folderOptions: { id: string; label: string }[];
  onChange: (changes: Partial<Node>) => void;
  onConnect: () => void;
  onDelete: () => void;
  onOpenChild: (id: string) => void;
}) {
  const kind = folderKindOf(node.title, node.folderKind);
  const files = kids.filter((k) => k.type === "code").length;
  const folders = kids.filter((k) => k.type === "folder").length;
  const muted = "text-zinc-400";
  const line = dark ? "border-zinc-800" : "border-zinc-200";

  const select = `min-w-0 flex-1 cursor-pointer bg-transparent text-[11px] outline-none ${dark ? "text-zinc-300" : "text-zinc-700"}`;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl">
      <div
        className={`flex h-10 shrink-0 cursor-grab items-center gap-2 border-b px-3 active:cursor-grabbing ${line}`}
        style={{ backgroundColor: `${color}14` }}
      >
        <FolderTypeIcon name={node.title} kind={node.folderKind} size={18} />

        <input
          value={node.title ?? ""}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="nome-da-pasta"
          spellCheck={false}
          className={`min-w-0 flex-1 bg-transparent text-sm font-bold outline-none ${dark ? "text-zinc-100 placeholder:text-zinc-600" : "text-zinc-900 placeholder:text-zinc-400"}`}
        />

        <button
          onClick={onConnect}
          title="Ligar a outro bloco"
          className={`rounded p-1 transition-colors ${isSource ? (dark ? "bg-zinc-800 text-zinc-100" : "bg-zinc-200 text-zinc-900") : `${muted} hover:text-zinc-200`}`}
        >
          <Link2 size={13} />
        </button>

        <button onClick={onDelete} title="Excluir pasta (os arquivos voltam para a raiz)" className={`rounded p-1 ${muted} hover:text-red-500`}>
          <X size={13} />
        </button>
      </div>

      <div className={`flex h-7 shrink-0 items-center gap-2 border-b px-3 ${line}`}>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className={`text-[10px] ${muted}`}>Tipo</span>

        <select value={node.folderKind ?? ""} onChange={(e) => onChange({ folderKind: e.target.value || undefined })} className={select} title="Que tipo de pasta é esta">
          <option value="">Automático · {kind.label}</option>

          {FOLDER_KINDS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className={`flex h-7 shrink-0 items-center gap-2 border-b px-3 ${line}`}>
        <span className={`text-[10px] ${muted}`}>Dentro de</span>

        <select value={node.parentId ?? ""} onChange={(e) => onChange({ parentId: e.target.value || undefined })} className={select} title="Esta pasta está dentro de qual outra?">
          <option value="">Raiz do projeto</option>

          {folderOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="thin-scroll thin-scroll-area min-h-0 flex-1 overflow-y-auto p-1.5" onMouseDown={(e) => e.stopPropagation()}>
        {kids.length === 0 ? (
          <p className={`px-2 py-4 text-center text-[11px] leading-relaxed ${muted}`}>
            Pasta vazia. No bloco de um arquivo, escolha esta pasta em “Pasta”.
          </p>
        ) : (
          kids.map((kid) => (
            <button
              key={kid.id}
              onClick={() => onOpenChild(kid.id)}
              title="Ir até este bloco"
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left ${dark ? "hover:bg-white/[0.07]" : "hover:bg-zinc-100"}`}
            >
              {kid.type === "folder" ? (
                <FolderTypeIcon name={kid.title} kind={kid.folderKind} size={14} />
              ) : (
                <FileTypeIcon name={kid.title} language={kid.language !== AUTO_LANGUAGE ? kid.language : undefined} size={14} />
              )}

              <span className={`min-w-0 flex-1 truncate text-xs ${dark ? "text-zinc-200" : "text-zinc-800"}`}>
                {kid.title || (kid.type === "folder" ? "pasta sem nome" : "arquivo sem nome")}
              </span>
            </button>
          ))
        )}
      </div>

      <div className={`flex h-6 shrink-0 items-center justify-between border-t px-3 text-[10px] ${line} ${muted}`}>
        <span>
          {files} {files === 1 ? "arquivo" : "arquivos"}
          {folders > 0 && ` · ${folders} ${folders === 1 ? "pasta" : "pastas"}`}
        </span>

        <span className="truncate pl-2">{path ? `em ${path}` : kind.hint}</span>
      </div>
    </div>
  );
}