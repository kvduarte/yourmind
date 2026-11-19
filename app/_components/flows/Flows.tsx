"use client";

import React, { useState, useMemo } from "react";
import {
  GitFork,
  Code2,
  Folder as FolderIcon,
  Plus,
  Pencil,
  Trash2,
  CalendarDays,
  Copy,
  Link2,
  FolderPlus,
  Terminal,
  Network,
  Search,
  LayoutGrid,
  List,
  ArrowUpDown,
  ArrowUpRight,
  Layers,
  X,
} from "lucide-react";

import { Folder, Theme, Topic } from "@/types";
import { FlowKind, folderHex } from "@/lib/nav";
import {
  CURATED_PALETTES,
  DEFAULT_ACCENT,
  buildAccentGradient,
  isLightHex,
  withAlpha,
} from "@/lib/theme";
import { getUi } from "@/lib/ui";
import { linkLabel } from "@/lib/link";
import { AppSettings } from "@/lib/settings";

interface FlowsProps {
  theme: Theme;
  settings?: AppSettings & {
    accentColor?: string;
    colorStyle?: "solid" | "gradient" | "preset";
    colorPreset?: string;
    bgImageUrl?: string;
  };
  flowKind: FlowKind;
  onFlowKind: (kind: FlowKind) => void;
  folders: Folder[];
  topics: Topic[];
  activeFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: () => void;
  onEditFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
  onOpenTopic: (id: string) => void;
  onCreateTopic: () => void;
  onDeleteTopic: (topic: Topic) => void;
  onEditTopic: (topic: Topic) => void;
  onDuplicateTopic: (topic: Topic) => void;
}

const KINDS: {
  id: FlowKind;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    id: "general",
    label: "Fluxograma Lógico",
    shortLabel: "Normal",
    description: "Mapas mentais, processos e nós de conexão visual.",
    icon: Network,
  },
  {
    id: "code",
    label: "Arquitetura & Código",
    shortLabel: "Programação",
    description: "Estrutura de arquivos, módulos e blocos técnicos.",
    icon: Terminal,
  },
];

type SortOption = "recent" | "alpha" | "dueDate";

export default function Flows({
  theme,
  settings,
  flowKind,
  onFlowKind,
  folders,
  topics,
  activeFolderId,
  onSelectFolder,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  onOpenTopic,
  onCreateTopic,
  onDeleteTopic,
  onEditTopic,
  onDuplicateTopic,
}: FlowsProps) {
  const dark = theme === "dark";
  const defaultBaseColor = dark ? "#f4f4f5" : "#18181b";
  const accentColor = settings?.accentColor || defaultBaseColor || DEFAULT_ACCENT;
  const colorStyle = settings?.colorStyle || "solid";
  const colorPreset = settings?.colorPreset || "matcha-espresso";

  const activePalette =
    CURATED_PALETTES.find((p) => p.id === colorPreset) || CURATED_PALETTES[0];

  const primaryColor =
    colorStyle === "preset" ? activePalette.colors[0] : accentColor;

  const primaryFill =
    colorStyle === "gradient"
      ? buildAccentGradient(primaryColor)
      : colorStyle === "preset"
      ? activePalette.gradient
      : primaryColor;

  const isLightBtn = isLightHex(primaryColor);

  const ui = getUi(dark);
  const titleColor = ui.title;
  const subtitleColor = ui.subtitle;

  // Estados locais de produtividade (Busca, Visualização e Ordenação)
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  const getResolvedFolderColor = (color?: string) => {
    if (!color) return primaryColor;
    if (color.startsWith("#")) return color;
    return folderHex(color);
  };

  // Métricas gerais por tipo
  const stats = useMemo(() => {
    const generalCount = topics.filter(
      (t) => (t.kind ?? "general") === "general"
    ).length;
    const codeCount = topics.filter((t) => t.kind === "code").length;
    const totalNodes = topics.reduce(
      (acc, t) => acc + (t.nodes?.length || 0),
      0
    );
    return { generalCount, codeCount, totalNodes };
  }, [topics]);

  const kindTopics = useMemo(
    () => topics.filter((topic) => (topic.kind ?? "general") === flowKind),
    [topics, flowKind]
  );

  const visibleTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = kindTopics.filter((topic) => {
      const matchesFolder =
        !activeFolderId || topic.folderId === activeFolderId;
      if (!matchesFolder) return false;

      if (!q) return true;
      const folderName =
        folders.find((f) => f.id === topic.folderId)?.name.toLowerCase() || "";
      return (
        topic.name.toLowerCase().includes(q) || folderName.includes(q)
      );
    });

    if (sortBy === "alpha") {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sortBy === "dueDate") {
      return [...filtered].sort((a, b) =>
        (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31")
      );
    }
    return [...filtered].reverse();
  }, [kindTopics, activeFolderId, searchQuery, folders, sortBy]);

  const activeFolder = folders.find((f) => f.id === activeFolderId);
  const currentKindMeta = KINDS.find((k) => k.id === flowKind) || KINDS[0];

  return (
    <div className="thin-scroll h-full overflow-y-auto select-none">
      <div className="mx-auto max-w-6xl space-y-6 p-6 sm:p-10 relative">
        {/* BRILHO ATMOSFÉRICO */}
        <div
          className="pointer-events-none absolute -left-24 -top-16 h-80 w-80 rounded-full opacity-20 blur-[120px] z-0"
          style={{ background: primaryFill }}
        />

        {/* 1. CABEÇALHO EXECUTIVO COM TOPOLOGIA SVG SUTIL */}
        <header
          className={`relative overflow-hidden rounded-[2rem] border p-6 sm:p-8 shadow-xl transition-all z-10 ${
            dark
              ? "border-white/10 bg-zinc-950/90 text-zinc-100 backdrop-blur-2xl"
              : "border-zinc-200/80 bg-white/95 text-zinc-900 shadow-zinc-200/50 backdrop-blur-2xl"
          }`}
        >
          {/* Malha topológica decorativa à direita */}
          <svg
            aria-hidden="true"
            viewBox="0 0 320 140"
            className="pointer-events-none absolute right-0 top-0 h-full w-80 opacity-[0.14] hidden md:block"
          >
            <path
              d="M30 35 H115 V70 H205 V35 H290 M115 70 V105 H240"
              fill="none"
              stroke={primaryColor}
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <rect
              x="14"
              y="23"
              width="32"
              height="24"
              rx="6"
              fill="none"
              stroke={primaryColor}
              strokeWidth="1.5"
            />
            <rect
              x="99"
              y="58"
              width="32"
              height="24"
              rx="6"
              fill={primaryColor}
            />
            <rect
              x="189"
              y="23"
              width="32"
              height="24"
              rx="6"
              fill="none"
              stroke={primaryColor}
              strokeWidth="1.5"
            />
            <rect
              x="224"
              y="93"
              width="32"
              height="24"
              rx="6"
              fill="none"
              stroke={primaryColor}
              strokeWidth="1.5"
            />
          </svg>

          <div
            className="pointer-events-none absolute -right-12 -top-12 h-60 w-60 rounded-full opacity-20 blur-[90px]"
            style={{ background: primaryFill }}
          />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2.5 max-w-xl">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-xs font-bold tracking-wide backdrop-blur-md"
                  style={{
                    backgroundColor: withAlpha(primaryColor, 0.15),
                    color: primaryColor,
                  }}
                >
                  <Network size={13} />
                  <span>Workspace Visual</span>
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                    dark
                      ? "border-white/10 bg-white/[0.04] text-zinc-400"
                      : "border-zinc-200 bg-zinc-100/80 text-zinc-600"
                  }`}
                >
                  <Layers size={12} style={{ color: primaryColor }} />
                  <span>
                    {topics.length}{" "}
                    {topics.length === 1 ? "projeto" : "projetos"} •{" "}
                    {stats.totalNodes} nós
                  </span>
                </span>
              </div>

              <h1
                className={`text-3xl sm:text-4xl font-black tracking-tight ${titleColor}`}
              >
                Fluxogramas
              </h1>

              <p className={`text-xs sm:text-sm font-medium ${subtitleColor}`}>
                {currentKindMeta.description}
              </p>
            </div>

            {/* Ações Principais do Header */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={onCreateFolder}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                  dark
                    ? "border-white/15 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08]"
                    : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <FolderPlus size={15} style={{ color: primaryColor }} />
                <span>Nova Pasta</span>
              </button>

              <button
                onClick={onCreateTopic}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black shadow-lg transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ${
                  isLightBtn ? "text-zinc-950" : "text-white"
                }`}
                style={{ background: primaryFill }}
              >
                <Plus size={16} strokeWidth={2.8} />
                <span>
                  {flowKind === "code" ? "Novo Projeto" : "Novo Fluxograma"}
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* 2. BARRA DE COMANDO: SELETOR DE MODO + BUSCA + ORDENAÇÃO + VIEW */}
        <section
          className={`relative z-10 flex flex-col gap-3 rounded-[1.6rem] border p-3.5 sm:p-4 shadow-md ${
            dark
              ? "border-white/10 bg-zinc-950/80 backdrop-blur-xl"
              : "border-zinc-200/80 bg-white/90 backdrop-blur-xl"
          }`}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Segmented Control de Tipo (Normal vs Programação) */}
            <div
              className={`grid grid-cols-2 sm:inline-flex rounded-xl border p-1 ${
                dark
                  ? "border-white/10 bg-zinc-900/90"
                  : "border-zinc-200 bg-zinc-100/80"
              }`}
            >
              {KINDS.map((kind) => {
                const Icon = kind.icon;
                const active = flowKind === kind.id;
                const count =
                  kind.id === "general" ? stats.generalCount : stats.codeCount;

                return (
                  <button
                    key={kind.id}
                    onClick={() => onFlowKind(kind.id)}
                    className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${
                      active
                        ? isLightBtn
                          ? "text-zinc-950 shadow-sm"
                          : "text-white shadow-sm"
                        : dark
                        ? "text-zinc-400 hover:text-zinc-100"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                    style={active ? { background: primaryFill } : undefined}
                  >
                    <Icon size={14} />
                    <span>{kind.label}</span>
                    <span
                      className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                        active
                          ? isLightBtn
                            ? "bg-black/15 text-zinc-950"
                            : "bg-white/20 text-white"
                          : dark
                          ? "bg-white/10 text-zinc-400"
                          : "bg-zinc-200 text-zinc-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Busca, Ordenação e Alternador Grid/Lista */}
            <div className="flex flex-wrap items-center gap-2 flex-1 lg:justify-end">
              {/* Campo de Busca */}
              <div
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs flex-1 sm:flex-initial sm:w-64 transition-colors ${
                  dark
                    ? "border-white/10 bg-zinc-900/70 focus-within:border-white/25"
                    : "border-zinc-200 bg-zinc-50 focus-within:border-zinc-400"
                }`}
              >
                <Search size={14} className="text-zinc-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar projeto ou pasta..."
                  className={`w-full bg-transparent outline-none font-medium ${titleColor}`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Ordenação */}
              <div
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold ${
                  dark
                    ? "border-white/10 bg-zinc-900/70 text-zinc-300"
                    : "border-zinc-200 bg-zinc-50 text-zinc-700"
                }`}
              >
                <ArrowUpDown size={13} style={{ color: primaryColor }} />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  aria-label="Ordenar projetos"
                  className="bg-transparent outline-none cursor-pointer text-xs font-bold"
                >
                  <option
                    value="recent"
                    className={dark ? "bg-zinc-900" : "bg-white"}
                  >
                    Mais recentes
                  </option>
                  <option
                    value="alpha"
                    className={dark ? "bg-zinc-900" : "bg-white"}
                  >
                    Ordem A–Z
                  </option>
                  <option
                    value="dueDate"
                    className={dark ? "bg-zinc-900" : "bg-white"}
                  >
                    Prazo
                  </option>
                </select>
              </div>

              {/* Alternador Grid / Lista */}
              <div
                className={`flex items-center rounded-xl border p-1 ${
                  dark
                    ? "border-white/10 bg-zinc-900/70"
                    : "border-zinc-200 bg-zinc-50"
                }`}
              >
                <button
                  onClick={() => setViewMode("grid")}
                  title="Visualização em grade"
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition cursor-pointer ${
                    viewMode === "grid"
                      ? isLightBtn
                        ? "text-zinc-950 shadow-xs"
                        : "text-white shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                  style={
                    viewMode === "grid" ? { background: primaryFill } : undefined
                  }
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  title="Visualização em lista"
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition cursor-pointer ${
                    viewMode === "list"
                      ? isLightBtn
                        ? "text-zinc-950 shadow-xs"
                        : "text-white shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                  style={
                    viewMode === "list" ? { background: primaryFill } : undefined
                  }
                >
                  <List size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Barra de Pastas em Pílulas Interativas */}
          <div className="flex items-center gap-2 overflow-x-auto thin-scroll pt-2 border-t border-zinc-500/10 pb-0.5">
            <button
              onClick={() => onSelectFolder(null)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                !activeFolderId
                  ? "shadow-xs"
                  : dark
                  ? "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-zinc-100"
                  : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
              }`}
              style={
                !activeFolderId
                  ? {
                      borderColor: primaryColor,
                      backgroundColor: withAlpha(primaryColor, 0.14),
                      color: primaryColor,
                    }
                  : undefined
              }
            >
              <FolderIcon size={13} />
              <span>Todas as pastas</span>
              <span className="rounded-md bg-black/10 dark:bg-white/10 px-1.5 py-0.2 text-[10px] font-extrabold">
                {kindTopics.length}
              </span>
            </button>

            {folders.map((folder) => {
              const active = activeFolderId === folder.id;
              const count = kindTopics.filter(
                (t) => t.folderId === folder.id
              ).length;
              const fColor = getResolvedFolderColor(folder.color);

              return (
                <div
                  key={folder.id}
                  className={`group inline-flex items-center rounded-xl border transition-all shrink-0 ${
                    active
                      ? "shadow-xs"
                      : dark
                      ? "border-white/10 bg-white/[0.02] hover:border-white/20"
                      : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"
                  }`}
                  style={
                    active
                      ? {
                          borderColor: fColor,
                          backgroundColor: withAlpha(fColor, 0.15),
                        }
                      : undefined
                  }
                >
                  <button
                    onClick={() => onSelectFolder(folder.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold cursor-pointer ${
                      active
                        ? ""
                        : dark
                        ? "text-zinc-300 hover:text-white"
                        : "text-zinc-700 hover:text-zinc-950"
                    }`}
                    style={active ? { color: fColor } : undefined}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: fColor }}
                    />
                    <span className="max-w-[140px] truncate">{folder.name}</span>
                    <span className="rounded-md bg-black/10 dark:bg-white/10 px-1.5 py-0.2 text-[10px] font-extrabold opacity-80">
                      {count}
                    </span>
                  </button>

                  {/* Controles rápidos da pasta no hover */}
                  <div className="hidden group-hover:flex items-center pr-2 gap-0.5">
                    <button
                      onClick={() => onEditFolder(folder)}
                      title="Renomear ou alterar cor"
                      className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-zinc-100 cursor-pointer"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => onDeleteFolder(folder)}
                      title="Excluir pasta"
                      className="rounded-lg p-1 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}

            <button
              onClick={onCreateFolder}
              title="Criar nova pasta"
              className={`inline-flex items-center gap-1.5 rounded-xl border border-dashed px-3 py-2 text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                dark
                  ? "border-white/15 text-zinc-400 hover:border-white/30 hover:text-zinc-200"
                  : "border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:text-zinc-900"
              }`}
            >
              <Plus size={13} />
              <span>Pasta</span>
            </button>
          </div>
        </section>

        {/* 3. ÁREA DE PROJETOS */}
        <section className="space-y-4 relative z-10">
          {/* Sub-cabeçalho contextual */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
              <span className="uppercase tracking-wider text-[11px]">
                {activeFolder ? activeFolder.name : "Todos os projetos"}
              </span>
              <span>•</span>
              <span>
                {visibleTopics.length}{" "}
                {visibleTopics.length === 1 ? "encontrado" : "encontrados"}
              </span>
            </div>

            {(activeFolderId || searchQuery) && (
              <button
                onClick={() => {
                  onSelectFolder(null);
                  setSearchQuery("");
                }}
                className="text-xs font-bold hover:underline cursor-pointer"
                style={{ color: primaryColor }}
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* ESTADO VAZIO */}
          {visibleTopics.length === 0 ? (
            <div
              className={`flex flex-col items-center justify-center rounded-[2rem] border border-dashed p-12 text-center ${
                dark
                  ? "border-white/15 bg-zinc-950/50"
                  : "border-zinc-300 bg-white/70"
              }`}
            >
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm"
                style={{
                  backgroundColor: withAlpha(primaryColor, 0.15),
                  color: primaryColor,
                }}
              >
                {flowKind === "code" ? (
                  <Code2 size={26} />
                ) : (
                  <GitFork size={26} />
                )}
              </div>

              <h3 className={`text-base font-black ${titleColor}`}>
                {searchQuery
                  ? "Nenhum resultado para sua busca"
                  : `Nenhum ${
                      flowKind === "code" ? "projeto de código" : "fluxograma"
                    } aqui ainda`}
              </h3>

              <p className="mt-1 max-w-md text-xs text-zinc-400 leading-relaxed">
                {searchQuery
                  ? "Tente buscar por outro termo ou limpe os filtros ativos."
                  : "Crie seu primeiro quadro para conectar ideias, mapear fluxos ou estruturar código."}
              </p>

              <button
                onClick={onCreateTopic}
                className={`mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black shadow-md transition-transform hover:scale-[1.02] cursor-pointer ${
                  isLightBtn ? "text-zinc-950" : "text-white"
                }`}
                style={{ background: primaryFill }}
              >
                <Plus size={15} strokeWidth={2.8} />
                <span>
                  {flowKind === "code"
                    ? "Criar primeiro projeto"
                    : "Criar primeiro fluxograma"}
                </span>
              </button>
            </div>
          ) : viewMode === "grid" ? (
            /* VISUALIZAÇÃO EM GRADE (CARDS EXECUTIVOS) */
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleTopics.map((topic) => {
                const folder = folders.find((f) => f.id === topic.folderId);
                const folderColor = folder
                  ? getResolvedFolderColor(folder.color)
                  : primaryColor;
                const nodesCount = topic.nodes?.length || 0;
                const edgesCount =
                  (topic as Topic & { edges?: unknown[] }).edges?.length || 0;
                const codeCount =
                  topic.nodes?.filter((n) => n.type === "code").length || 0;

                return (
                  <div
                    key={topic.id}
                    onClick={() => onOpenTopic(topic.id)}
                    className={`group relative overflow-hidden cursor-pointer rounded-[1.8rem] border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between min-h-[176px] ${
                      dark
                        ? "border-white/10 bg-zinc-950/90 hover:border-white/25"
                        : "border-zinc-200/90 bg-white hover:border-zinc-300 shadow-md shadow-zinc-200/40"
                    }`}
                  >
                    {/* Glow sutil no hover */}
                    <div
                      className="pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-20"
                      style={{ background: primaryFill }}
                    />

                    {/* Mini diagrama decorativo no canto superior direito */}
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 80 40"
                      className="pointer-events-none absolute right-4 top-4 h-8 w-16 opacity-[0.12] group-hover:opacity-[0.22] transition-opacity"
                    >
                      {flowKind === "code" ? (
                        <>
                          <rect
                            x="6"
                            y="6"
                            width="28"
                            height="6"
                            rx="3"
                            fill={primaryColor}
                          />
                          <rect
                            x="14"
                            y="17"
                            width="44"
                            height="6"
                            rx="3"
                            fill={primaryColor}
                          />
                          <rect
                            x="14"
                            y="28"
                            width="32"
                            height="6"
                            rx="3"
                            fill={primaryColor}
                          />
                        </>
                      ) : (
                        <>
                          <path
                            d="M18 20 H42 M42 20 L58 10 M42 20 L58 30"
                            stroke={primaryColor}
                            strokeWidth="2"
                            fill="none"
                          />
                          <circle cx="14" cy="20" r="5" fill={primaryColor} />
                          <circle cx="62" cy="10" r="4" fill={primaryColor} />
                          <circle cx="62" cy="30" r="4" fill={primaryColor} />
                        </>
                      )}
                    </svg>

                    {/* Topo: Ícone + Título + Ações rápidas */}
                    <div className="relative z-10 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-xs transition-transform duration-300 group-hover:scale-105"
                          style={{
                            backgroundColor: withAlpha(
                              primaryColor,
                              dark ? 0.16 : 0.12
                            ),
                            color: primaryColor,
                          }}
                        >
                          {flowKind === "code" ? (
                            <Code2 size={20} />
                          ) : (
                            <GitFork size={20} />
                          )}
                        </div>

                        <div className="min-w-0 pt-0.5">
                          <h3
                            className={`truncate text-base font-extrabold tracking-tight ${titleColor}`}
                          >
                            {topic.name}
                          </h3>

                          {folder ? (
                            <span
                              className="mt-1 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold"
                              style={{
                                backgroundColor: withAlpha(folderColor, 0.14),
                                color: folderColor,
                              }}
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: folderColor }}
                              />
                              <span className="truncate max-w-[130px]">
                                {folder.name}
                              </span>
                            </span>
                          ) : (
                            <span className="mt-1 block text-[11px] font-medium text-zinc-400">
                              Sem pasta
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Toolbar flutuante de ações no hover */}
                      <div
                        className={`flex items-center gap-0.5 rounded-xl border p-1 opacity-0 transition-all duration-200 group-hover:opacity-100 shrink-0 backdrop-blur-md ${
                          dark
                            ? "border-white/10 bg-zinc-900/95"
                            : "border-zinc-200 bg-white/95 shadow-sm"
                        }`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTopic(topic);
                          }}
                          title="Editar"
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-500/15 hover:text-zinc-100 cursor-pointer"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateTopic(topic);
                          }}
                          title="Duplicar"
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-500/15 hover:text-zinc-100 cursor-pointer"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTopic(topic);
                          }}
                          title="Excluir"
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Rodapé: Métricas, Prazo, Link e Seta de abertura */}
                    <div
                      className={`relative z-10 mt-5 flex items-center justify-between gap-2 border-t pt-3.5 text-[11px] font-semibold ${
                        dark ? "border-white/10" : "border-zinc-100"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span
                          className="rounded-lg px-2.5 py-1 font-bold"
                          style={{
                            backgroundColor: withAlpha(primaryColor, 0.12),
                            color: primaryColor,
                          }}
                        >
                          {flowKind === "code"
                            ? `${codeCount} ${
                                codeCount === 1 ? "arquivo" : "arquivos"
                              }`
                            : `${nodesCount} ${
                                nodesCount === 1 ? "bloco" : "blocos"
                              }${edgesCount > 0 ? ` • ${edgesCount} conexões` : ""}`}
                        </span>

                        {topic.dueDate && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 ${
                              dark
                                ? "border-white/10 bg-white/[0.03] text-zinc-300"
                                : "border-zinc-200 bg-zinc-50 text-zinc-600"
                            }`}
                          >
                            <CalendarDays size={11} />
                            {topic.dueDate.split("-").reverse().join("/")}
                          </span>
                        )}

                        {topic.link && (
                          <a
                            href={topic.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 transition-colors ${
                              dark
                                ? "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/25"
                                : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300"
                            }`}
                          >
                            <Link2 size={11} />
                            <span className="truncate max-w-[90px]">
                              {linkLabel(topic.link)}
                            </span>
                          </a>
                        )}
                      </div>

                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        style={{ color: primaryColor }}
                      >
                        <ArrowUpRight size={15} />
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Card de Ação Rápida para Novo Projeto */}
              <button
                onClick={onCreateTopic}
                className={`group flex min-h-[176px] flex-col items-center justify-center gap-3 rounded-[1.8rem] border border-dashed p-5 transition-all duration-300 cursor-pointer ${
                  dark
                    ? "border-white/15 text-zinc-400 hover:border-white/30 hover:text-zinc-100 hover:bg-white/[0.02]"
                    : "border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:text-zinc-900 hover:bg-zinc-50/80"
                }`}
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-dashed transition-transform group-hover:scale-110"
                  style={{
                    borderColor: primaryColor,
                    backgroundColor: withAlpha(primaryColor, 0.08),
                    color: primaryColor,
                  }}
                >
                  <Plus size={20} />
                </div>
                <span className="text-xs font-extrabold">
                  {flowKind === "code"
                    ? "Criar novo projeto"
                    : "Criar novo fluxograma"}
                </span>
              </button>
            </div>
          ) : (
            /* VISUALIZAÇÃO EM LISTA COMPACTA E EXECUTIVA */
            <div className="space-y-2.5">
              {visibleTopics.map((topic) => {
                const folder = folders.find((f) => f.id === topic.folderId);
                const folderColor = folder
                  ? getResolvedFolderColor(folder.color)
                  : primaryColor;
                const nodesCount = topic.nodes?.length || 0;
                const codeCount =
                  topic.nodes?.filter((n) => n.type === "code").length || 0;

                return (
                  <div
                    key={topic.id}
                    onClick={() => onOpenTopic(topic.id)}
                    className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${
                      dark
                        ? "border-white/10 bg-zinc-950/85 hover:border-white/25 hover:bg-white/[0.03]"
                        : "border-zinc-200 bg-white hover:border-zinc-300 shadow-xs"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: withAlpha(primaryColor, 0.14),
                          color: primaryColor,
                        }}
                      >
                        {flowKind === "code" ? (
                          <Code2 size={18} />
                        ) : (
                          <GitFork size={18} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className={`truncate text-sm font-extrabold ${titleColor}`}>
                          {topic.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-zinc-400">
                          {folder && (
                            <span
                              className="inline-flex items-center gap-1 font-bold"
                              style={{ color: folderColor }}
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: folderColor }}
                              />
                              {folder.name}
                            </span>
                          )}
                          <span>•</span>
                          <span>
                            {flowKind === "code"
                              ? `${codeCount} ${
                                  codeCount === 1 ? "arquivo" : "arquivos"
                                }`
                              : `${nodesCount} ${
                                  nodesCount === 1 ? "bloco" : "blocos"
                                }`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                      {topic.dueDate && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
                            dark
                              ? "border-white/10 bg-white/[0.03] text-zinc-300"
                              : "border-zinc-200 bg-zinc-50 text-zinc-600"
                          }`}
                        >
                          <CalendarDays size={11} />
                          {topic.dueDate.split("-").reverse().join("/")}
                        </span>
                      )}

                      {topic.link && (
                        <a
                          href={topic.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
                            dark
                              ? "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/25"
                              : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300"
                          }`}
                        >
                          <Link2 size={11} />
                          {linkLabel(topic.link)}
                        </a>
                      )}

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTopic(topic);
                          }}
                          title="Editar"
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-500/15 hover:text-zinc-100 cursor-pointer"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateTopic(topic);
                          }}
                          title="Duplicar"
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-500/15 hover:text-zinc-100 cursor-pointer"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTopic(topic);
                          }}
                          title="Excluir"
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <ArrowUpRight size={15} style={{ color: primaryColor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}