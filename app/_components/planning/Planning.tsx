"use client";

import React, { useState, useMemo } from "react";
import {
  ListChecks,
  Calendar as CalendarIcon,
  GitFork,
  Pencil,
  Folder as FolderIcon,
  FolderPlus,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Target,
  Plus,
  Search,
  Layers,
  X,
  Compass,
  Flag,
} from "lucide-react";

import { Theme } from "@/types";
import { PlanFolder, PlanProject, usePlanning } from "@/lib/planning";
import { useSettings } from "@/lib/settings";
import { folderHex } from "@/lib/nav";
import {
  CURATED_PALETTES,
  DEFAULT_ACCENT,
  buildAccentGradient,
  isLightHex,
  withAlpha,
} from "@/lib/theme";
import { getUi, textScaleStyle } from "@/lib/ui";

import BackBar from "../shared/BackBar";
import { useConfirm } from "../modals/ConfirmDialog";
import FolderModal from "../modals/FolderModal";
import PlanningDetail from "./PlanningDetail";
import PlanningProjectModal from "./PlanningProjectModal";

interface PlanningProps {
  theme: Theme;
  onNavigate?: (target: string) => void;
}

type FolderModalState =
  | { mode: "create" }
  | { mode: "edit"; folder: PlanFolder }
  | null;

type ProjectModalState =
  | { mode: "create"; folderId: string | null }
  | { mode: "edit"; project: PlanProject }
  | null;

type StatusFilter = "all" | "active" | "completed";

export default function Planning({ theme, onNavigate }: PlanningProps) {
  const store = usePlanning();
  const confirm = useConfirm();
  const settings = useSettings() as ReturnType<typeof useSettings> & {
    accentColor?: string;
    colorStyle?: "solid" | "gradient" | "preset";
    colorPreset?: string;
  };

  const dark = theme === "dark";
  const defaultBaseColor = dark ? "#f4f4f5" : "#18181b";
  const accentColor =
    settings?.accentColor || defaultBaseColor || DEFAULT_ACCENT;
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
  const activeBtnText = isLightBtn ? "text-zinc-950" : "text-white";

  const ui = getUi(dark);
  const titleColor = ui.title;
  const subtitleColor = ui.subtitle;
  const listScale = textScaleStyle(settings.textScalePlanning ?? 100);

  const [openId, setOpenId] = useState<string | null>(null);
  const [folderModal, setFolderModal] = useState<FolderModalState>(null);
  const [projectModal, setProjectModal] = useState<ProjectModalState>(null);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const projects = store?.projects ?? [];
  const folders = store?.folders ?? [];

  const getResolvedFolderColor = (color?: string) => {
    if (!color) return primaryColor;
    return color.startsWith("#") ? color : folderHex(color);
  };

  const getProjectStats = (project: PlanProject) => {
    const p = project as PlanProject & {
      items?: Array<{ title?: string; text?: string; done?: boolean; completed?: boolean }>;
      activities?: Array<{ title?: string; text?: string; done?: boolean; completed?: boolean }>;
      tasks?: Array<{ title?: string; text?: string; done?: boolean; completed?: boolean }>;
    };

    const list = p.items || p.activities || p.tasks || [];
    const total = list.length;
    const done = list.filter((i) => Boolean(i.done || i.completed)).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    const isCompleted = total > 0 && done === total;
    const nextSteps = list
      .filter((i) => !(i.done || i.completed))
      .slice(0, 2)
      .map((i) => i.title || i.text || "Atividade sem título");

    return { total, done, percent, isCompleted, nextSteps };
  };

  const globalMetrics = useMemo(() => {
    let totalItems = 0;
    let doneItems = 0;

    for (const proj of projects) {
      const stats = getProjectStats(proj);
      totalItems += stats.total;
      doneItems += stats.done;
    }

    const executionRate =
      totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

    return {
      totalProjects: projects.length,
      executionRate,
    };
  }, [projects]);

  const visibleProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return projects.filter((project) => {
      if (selectedFolderId && project.folderId !== selectedFolderId) {
        return false;
      }

      const stats = getProjectStats(project);
      if (statusFilter === "active" && stats.isCompleted) return false;
      if (statusFilter === "completed" && !stats.isCompleted) return false;

      if (!q) return true;
      const folderName =
        folders.find((f) => f.id === project.folderId)?.name.toLowerCase() || "";
      return project.name.toLowerCase().includes(q) || folderName.includes(q);
    });
  }, [projects, folders, selectedFolderId, searchQuery, statusFilter]);

  const openProject = projects.find((project) => project.id === openId);
  const openFolder = openProject
    ? folders.find((folder) => folder.id === openProject.folderId)
    : undefined;

  const projectProgress = useMemo(() => {
    if (!openProject) return { total: 0, done: 0, percent: 0 };
    return getProjectStats(openProject);
  }, [openProject]);

  if (!store || !store.loaded) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-6 sm:p-10 animate-pulse">
        <div
          className={`h-40 rounded-[2rem] border ${
            dark ? "border-white/10 bg-zinc-950/60" : "border-zinc-200 bg-zinc-100/70"
          }`}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-44 rounded-[1.8rem] border ${
                dark ? "border-white/10 bg-zinc-950/40" : "border-zinc-200 bg-zinc-100/50"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  const handleDeleteProject = async (project: PlanProject) => {
    const ok = await confirm({
      title: "Excluir planejamento?",
      description: `"${project.name}" e todas as atividades dele serão excluídos. Essa ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
    });

    if (!ok) return;

    store.deleteProject(project.id);
    setProjectModal(null);
    setOpenId(null);
  };

  const activeFolder = folders.find((f) => f.id === selectedFolderId);
  const resolvedOpenFolderColor = getResolvedFolderColor(openFolder?.color);

  return (
    <>
      {openProject ? (
        <div className="flex h-full flex-col">
          <BackBar
            theme={theme}
            backLabel="Planejamentos"
            onBack={() => setOpenId(null)}
            title={openProject.name}
            badge={openFolder ? openFolder.name : "Sem pasta"}
            icon={<ListChecks />}
          />

          {/* Faixa contextual com progresso e conexões */}
          <div
            className={`border-b px-4 py-2.5 sm:px-8 backdrop-blur-md ${
              dark
                ? "border-white/10 bg-zinc-950/75"
                : "border-zinc-200/80 bg-white/85"
            }`}
          >
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold"
                  style={{
                    backgroundColor: withAlpha(resolvedOpenFolderColor, 0.15),
                    color: resolvedOpenFolderColor,
                  }}
                >
                  <FolderIcon size={12} />
                  <span>{openFolder ? openFolder.name : "Geral"}</span>
                </span>

                {projectProgress.total > 0 && (
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-1.5 w-24 sm:w-32 overflow-hidden rounded-full ${
                        dark ? "bg-white/10" : "bg-zinc-200"
                      }`}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${projectProgress.percent}%`,
                          background: primaryFill,
                        }}
                      />
                    </div>
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-extrabold"
                      style={{ color: primaryColor }}
                    >
                      <CheckCircle2 size={12} />
                      {projectProgress.done}/{projectProgress.total} (
                      {projectProgress.percent}%)
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {onNavigate && (
                  <>
                    <button
                      onClick={() => onNavigate("calendar")}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                        dark
                          ? "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:text-white"
                          : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:text-zinc-900"
                      }`}
                    >
                      <CalendarIcon size={12} style={{ color: primaryColor }} />
                      <span className="hidden sm:inline">Agenda</span>
                      <ArrowUpRight size={11} className="opacity-60" />
                    </button>

                    <button
                      onClick={() => onNavigate("flows")}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                        dark
                          ? "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:text-white"
                          : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:text-zinc-900"
                      }`}
                    >
                      <GitFork size={12} style={{ color: primaryColor }} />
                      <span className="hidden sm:inline">Fluxos</span>
                      <ArrowUpRight size={11} className="opacity-60" />
                    </button>
                  </>
                )}

                <button
                  onClick={() =>
                    setProjectModal({ mode: "edit", project: openProject })
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold transition hover:opacity-85 cursor-pointer"
                  style={{
                    backgroundColor: withAlpha(primaryColor, 0.14),
                    color: primaryColor,
                  }}
                >
                  <Pencil size={12} />
                  <span>Configurar</span>
                </button>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1">
            <PlanningDetail
              key={openProject.id}
              theme={theme}
              store={store}
              project={openProject}
              onEditProject={() =>
                setProjectModal({ mode: "edit", project: openProject })
              }
            />
          </div>
        </div>
      ) : (
        <div
          className="thin-scroll h-full overflow-y-auto select-none"
          style={listScale}
        >
          <div className="mx-auto max-w-6xl space-y-6 p-6 sm:p-10 relative">
            {/* CABEÇALHO ESTRATÉGICO */}
            <header
              className={`relative overflow-hidden rounded-[2rem] border p-6 sm:p-8 shadow-xl transition-all ${
                dark
                  ? "border-white/10 bg-zinc-950/90 text-zinc-100 backdrop-blur-2xl"
                  : "border-zinc-200/80 bg-white/95 text-zinc-900 shadow-zinc-200/50 backdrop-blur-2xl"
              }`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 300 140"
                className="pointer-events-none absolute right-2 top-0 h-full w-72 opacity-[0.14] hidden md:block"
              >
                <path
                  d="M24 98 C 80 98, 95 44, 150 44 C 205 44, 215 84, 276 34"
                  fill="none"
                  stroke={primaryColor}
                  strokeWidth="2"
                  strokeDasharray="5 5"
                />
                <circle cx="24" cy="98" r="6" fill={primaryColor} />
                <circle
                  cx="150"
                  cy="44"
                  r="7"
                  fill="none"
                  stroke={primaryColor}
                  strokeWidth="2.5"
                />
                <circle cx="276" cy="34" r="7" fill={primaryColor} />
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
                      <Compass size={13} />
                      <span>Metas & Roteiros</span>
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
                        {globalMetrics.totalProjects}{" "}
                        {globalMetrics.totalProjects === 1 ? "plano" : "planos"} •{" "}
                        {globalMetrics.executionRate}% concluído
                      </span>
                    </span>
                  </div>

                  <h1
                    className={`text-3xl sm:text-4xl font-black tracking-tight ${titleColor}`}
                  >
                    Planejamento
                  </h1>

                  <p className={`text-xs sm:text-sm font-medium ${subtitleColor}`}>
                    Estruture objetivos de médio e longo prazo, divida grandes
                    metas em marcos acionáveis e acompanhe sua evolução.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => setFolderModal({ mode: "create" })}
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
                    onClick={() =>
                      setProjectModal({
                        mode: "create",
                        folderId: selectedFolderId,
                      })
                    }
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black shadow-lg transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ${activeBtnText}`}
                    style={{ background: primaryFill }}
                  >
                    <Plus size={16} strokeWidth={2.8} />
                    <span>Novo Planejamento</span>
                  </button>
                </div>
              </div>
            </header>

            {/* BARRA DE FILTROS E PASTAS */}
            <section
              className={`space-y-3 rounded-[1.6rem] border p-3.5 sm:p-4 shadow-md ${
                dark
                  ? "border-white/10 bg-zinc-950/80 backdrop-blur-xl"
                  : "border-zinc-200/80 bg-white/90 backdrop-blur-xl"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div
                  className={`inline-flex rounded-xl border p-1 ${
                    dark
                      ? "border-white/10 bg-zinc-900/90"
                      : "border-zinc-200 bg-zinc-100/80"
                  }`}
                >
                  {(
                    [
                      ["all", "Todos"],
                      ["active", "Em andamento"],
                      ["completed", "Concluídos"],
                    ] as const
                  ).map(([id, label]) => {
                    const active = statusFilter === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setStatusFilter(id)}
                        className={`rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                          active
                            ? `${activeBtnText} shadow-xs`
                            : dark
                            ? "text-zinc-400 hover:text-zinc-100"
                            : "text-zinc-600 hover:text-zinc-900"
                        }`}
                        style={active ? { background: primaryFill } : undefined}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div
                  className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs w-full sm:w-72 transition-colors ${
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
                    placeholder="Buscar planejamento..."
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
              </div>

              <div className="flex items-center gap-2 overflow-x-auto thin-scroll pt-2 border-t border-zinc-500/10 pb-0.5">
                <button
                  onClick={() => setSelectedFolderId(null)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    !selectedFolderId
                      ? "shadow-xs"
                      : dark
                      ? "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-zinc-100"
                      : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                  }`}
                  style={
                    !selectedFolderId
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
                    {projects.length}
                  </span>
                </button>

                {folders.map((folder) => {
                  const active = selectedFolderId === folder.id;
                  const count = projects.filter(
                    (p) => p.folderId === folder.id
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
                        onClick={() => setSelectedFolderId(folder.id)}
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
                        <span className="max-w-[140px] truncate">
                          {folder.name}
                        </span>
                        <span className="rounded-md bg-black/10 dark:bg-white/10 px-1.5 py-0.2 text-[10px] font-extrabold opacity-80">
                          {count}
                        </span>
                      </button>

                      <button
                        onClick={() =>
                          setFolderModal({ mode: "edit", folder })
                        }
                        title="Editar pasta"
                        className="hidden group-hover:flex items-center pr-2.5 pl-1 text-zinc-400 hover:text-zinc-100 cursor-pointer"
                      >
                        <Pencil size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* GRADE DE PLANEJAMENTOS */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                  <span className="uppercase tracking-wider text-[11px]">
                    {activeFolder ? activeFolder.name : "Todos os planejamentos"}
                  </span>
                  <span>•</span>
                  <span>
                    {visibleProjects.length}{" "}
                    {visibleProjects.length === 1 ? "encontrado" : "encontrados"}
                  </span>
                </div>

                {(selectedFolderId || searchQuery || statusFilter !== "all") && (
                  <button
                    onClick={() => {
                      setSelectedFolderId(null);
                      setSearchQuery("");
                      setStatusFilter("all");
                    }}
                    className="text-xs font-bold hover:underline cursor-pointer"
                    style={{ color: primaryColor }}
                  >
                    Limpar filtros
                  </button>
                )}
              </div>

              {visibleProjects.length === 0 ? (
                <div
                  className={`flex flex-col items-center justify-center rounded-[2rem] border border-dashed p-14 text-center ${
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
                    <Target size={26} />
                  </div>

                  <h3 className={`text-base font-black ${titleColor}`}>
                    {searchQuery || statusFilter !== "all"
                      ? "Nenhum planejamento encontrado"
                      : "Comece seu primeiro planejamento"}
                  </h3>

                  <p className="mt-1 max-w-md text-xs text-zinc-400 leading-relaxed">
                    {searchQuery || statusFilter !== "all"
                      ? "Ajuste os filtros ou limpe a busca para visualizar seus planos."
                      : "Organize metas semestrais, estudos de disciplinas ou projetos pessoais em etapas claras."}
                  </p>

                  <button
                    onClick={() =>
                      setProjectModal({
                        mode: "create",
                        folderId: selectedFolderId,
                      })
                    }
                    className={`mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black shadow-md transition-transform hover:scale-[1.02] cursor-pointer ${activeBtnText}`}
                    style={{ background: primaryFill }}
                  >
                    <Plus size={15} strokeWidth={2.8} />
                    <span>Criar planejamento</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {visibleProjects.map((project) => {
                    const folder = folders.find(
                      (f) => f.id === project.folderId
                    );
                    const folderColor = folder
                      ? getResolvedFolderColor(folder.color)
                      : primaryColor;

                    const cardAccent =
                      project.colorMode === "fixed" && project.fixedColor
                        ? project.fixedColor
                        : folderColor;

                    const stats = getProjectStats(project);

                    return (
                      <div
                        key={project.id}
                        onClick={() => setOpenId(project.id)}
                        className={`group relative overflow-hidden cursor-pointer rounded-[1.8rem] border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between ${
                          dark
                            ? "border-white/10 bg-zinc-950/90 hover:border-white/25"
                            : "border-zinc-200/90 bg-white hover:border-zinc-300 shadow-md shadow-zinc-200/40"
                        }`}
                      >
                        <div
                          className="pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-20"
                          style={{ background: cardAccent }}
                        />

                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3.5 min-w-0">
                              <div
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-xs transition-transform duration-300 group-hover:scale-105"
                                style={{
                                  backgroundColor: withAlpha(
                                    cardAccent,
                                    dark ? 0.16 : 0.12
                                  ),
                                  color: cardAccent,
                                }}
                              >
                                <Target size={20} />
                              </div>

                              <div className="min-w-0 pt-0.5">
                                <h3
                                  className={`truncate text-base font-extrabold tracking-tight ${titleColor}`}
                                >
                                  {project.name}
                                </h3>

                                <div className="mt-1 flex items-center gap-1.5">
                                  {folder ? (
                                    <span
                                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold"
                                      style={{
                                        backgroundColor: withAlpha(
                                          folderColor,
                                          0.14
                                        ),
                                        color: folderColor,
                                      }}
                                    >
                                      <span
                                        className="h-1.5 w-1.5 rounded-full"
                                        style={{ backgroundColor: folderColor }}
                                      />
                                      <span className="truncate max-w-[120px]">
                                        {folder.name}
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-medium text-zinc-400">
                                      Sem pasta
                                    </span>
                                  )}

                                  {stats.isCompleted && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald-400">
                                      <CheckCircle2 size={10} />
                                      Concluído
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setProjectModal({ mode: "edit", project });
                              }}
                              title="Configurar planejamento"
                              className={`rounded-xl p-2 text-zinc-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0 ${
                                dark
                                  ? "hover:bg-white/10 hover:text-white"
                                  : "hover:bg-zinc-100 hover:text-zinc-900"
                              }`}
                            >
                              <Pencil size={13} />
                            </button>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="text-zinc-400">
                                {stats.total === 0
                                  ? "Nenhuma etapa criada"
                                  : `${stats.done} de ${stats.total} concluídas`}
                              </span>
                              <span style={{ color: cardAccent }}>
                                {stats.percent}%
                              </span>
                            </div>

                            <div
                              className={`h-2 w-full overflow-hidden rounded-full ${
                                dark ? "bg-white/[0.06]" : "bg-zinc-100"
                              }`}
                            >
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${stats.percent}%`,
                                  backgroundColor: cardAccent,
                                }}
                              />
                            </div>
                          </div>

                          {stats.nextSteps.length > 0 && (
                            <div
                              className={`rounded-xl border p-3 space-y-1.5 ${
                                dark
                                  ? "border-white/[0.06] bg-white/[0.02]"
                                  : "border-zinc-200/70 bg-zinc-50/70"
                              }`}
                            >
                              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                                <Flag size={10} style={{ color: cardAccent }} />
                                Próximos passos
                              </span>
                              {stats.nextSteps.map((step, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 text-xs text-zinc-400"
                                >
                                  <Circle
                                    size={11}
                                    className="shrink-0 opacity-60"
                                  />
                                  <span className="truncate font-medium">
                                    {step}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div
                          className={`mt-5 flex items-center justify-between pt-3.5 border-t ${
                            dark ? "border-white/10" : "border-zinc-100"
                          }`}
                        >
                          <span
                            className="text-xs font-extrabold group-hover:underline"
                            style={{ color: cardAccent }}
                          >
                            Abrir roteiro
                          </span>

                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-lg transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                            style={{ color: cardAccent }}
                          >
                            <ArrowUpRight size={15} />
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    onClick={() =>
                      setProjectModal({
                        mode: "create",
                        folderId: selectedFolderId,
                      })
                    }
                    className={`group flex min-h-[230px] flex-col items-center justify-center gap-3 rounded-[1.8rem] border border-dashed p-6 text-center transition-all duration-300 cursor-pointer ${
                      dark
                        ? "border-white/15 bg-white/[0.01] text-zinc-400 hover:border-white/30 hover:text-zinc-100 hover:bg-white/[0.03]"
                        : "border-zinc-300 bg-zinc-50/50 text-zinc-500 hover:border-zinc-400 hover:text-zinc-900 hover:bg-zinc-100/60"
                    }`}
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed transition-transform group-hover:scale-110"
                      style={{
                        borderColor: primaryColor,
                        backgroundColor: withAlpha(primaryColor, 0.08),
                        color: primaryColor,
                      }}
                    >
                      <Plus size={22} />
                    </div>
                    <div>
                      <span
                        className={`block text-sm font-extrabold ${titleColor}`}
                      >
                        Novo Planejamento
                      </span>
                      <span
                        className={`mt-0.5 block text-xs font-medium ${subtitleColor}`}
                      >
                        Defina metas e acompanhe marcos
                      </span>
                    </div>
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {folderModal && (
        <div style={listScale}>
          <FolderModal
            theme={theme}
            mode={folderModal.mode}
            initialName={
              folderModal.mode === "edit" ? folderModal.folder.name : ""
            }
            initialColor={
              folderModal.mode === "edit" ? folderModal.folder.color : "blue"
            }
            description="Pastas organizam os planejamentos por assunto."
            onClose={() => setFolderModal(null)}
            onSave={(name, color) => {
              if (folderModal.mode === "edit")
                store.updateFolder(folderModal.folder.id, name, color);
              else store.addFolder(name, color);
            }}
          />
        </div>
      )}

      {projectModal && (
        <div style={listScale}>
          <PlanningProjectModal
            theme={theme}
            folders={store.folders}
            mode={projectModal.mode}
            initialName={
              projectModal.mode === "edit" ? projectModal.project.name : ""
            }
            initialFolderId={
              projectModal.mode === "edit"
                ? projectModal.project.folderId
                : projectModal.folderId
            }
            initialColorMode={
              projectModal.mode === "edit"
                ? projectModal.project.colorMode
                : undefined
            }
            initialFixedColor={
              projectModal.mode === "edit"
                ? projectModal.project.fixedColor
                : undefined
            }
            onClose={() => setProjectModal(null)}
            onSave={(name, folderId, options) => {
              if (projectModal.mode === "edit") {
                store.updateProject(
                  projectModal.project.id,
                  name,
                  folderId,
                  options
                );
                return;
              }

              setOpenId(store.addProject(name, folderId, options));
            }}
            onDelete={
              projectModal.mode === "edit"
                ? () => void handleDeleteProject(projectModal.project)
                : undefined
            }
          />
        </div>
      )}
    </>
  );
}