"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  Folder as FolderIcon,
  FolderPlus,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { Theme } from "@/types";
import { PlanFolder, PlanProject, PlanningStore, projectColor, summarizeProject } from "@/lib/planning";
import { folderHex } from "@/lib/nav";
import { useAccent, withAlpha } from "@/lib/theme";
import { getUi } from "@/lib/ui";

import { useConfirm } from "../modals/ConfirmDialog";
import PageHeader from "../shared/PageHeader";
import { ProgressBar } from "../planning/PlanningParts";

interface PlanningListProps {
  theme: Theme;
  store: PlanningStore;
  onOpen: (id: string) => void;
  onCreateProject: (folderId: string | null) => void;
  onEditProject: (project: PlanProject) => void;
  onCreateFolder: () => void;
  onEditFolder: (folder: PlanFolder) => void;
}

/** "all" = todos, "none" = sem pasta, ou o id de uma pasta */
type FolderFilter = string;

export default function PlanningList({
  theme,
  store,
  onOpen,
  onCreateProject,
  onEditProject,
  onCreateFolder,
  onEditFolder,
}: PlanningListProps) {
  const dark = theme === "dark";
  const ui = getUi(dark);
  const accent = useAccent();
  const confirm = useConfirm();

  const [filter, setFilter] = useState<FolderFilter>("all");

  const cardBase = dark
    ? "bg-zinc-900/40 border-white/[0.08] hover:bg-zinc-900/80 hover:border-white/[0.15]"
    : "bg-white border-zinc-200/80 hover:bg-zinc-50/80 hover:border-zinc-300";

  const borderClass = dark ? "border-white/[0.08]" : "border-zinc-200/80";

  const summaries = useMemo(
    () => new Map(store.projects.map((project) => [project.id, summarizeProject(store.items, project.id)])),
    [store.projects, store.items]
  );

  const withoutFolder = store.projects.filter((p) => !p.folderId).length;

  const visible = store.projects.filter((project) => {
    if (filter === "all") return true;
    if (filter === "none") return !project.folderId;

    return project.folderId === filter;
  });

  const activeFolder = store.folders.find((folder) => folder.id === filter);
  const label = filter === "all" ? "Todos" : filter === "none" ? "Sem pasta" : activeFolder?.name ?? "Todos";

  /* se a pasta filtrada deixou de existir, volta para "todos" */
  const safeFilter = filter !== "all" && filter !== "none" && !activeFolder ? "all" : filter;

  const handleDeleteFolder = async (folder: PlanFolder) => {
    const count = store.projects.filter((p) => p.folderId === folder.id).length;

    const ok = await confirm({
      title: "Excluir pasta?",
      description: count
        ? `A pasta "${folder.name}" será excluída e os ${count} planejamento(s) dela ficam sem pasta. Nenhum planejamento é apagado.`
        : `A pasta "${folder.name}" será excluída.`,
      confirmLabel: "Excluir pasta",
    });

    if (ok) {
      store.deleteFolder(folder.id);

      if (filter === folder.id) setFilter("all");
    }
  };

  const handleDeleteProject = async (project: PlanProject) => {
    const total = store.items.filter((item) => item.projectId === project.id).length;

    const ok = await confirm({
      title: "Excluir planejamento?",
      description: total
        ? `"${project.name}" e as ${total} atividades dele serão excluídos. Essa ação não pode ser desfeita.`
        : `"${project.name}" será excluído.`,
      confirmLabel: "Excluir",
    });

    if (ok) store.deleteProject(project.id);
  };

  const tile = (active: boolean) =>
    `flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all duration-200 ${
      active ? "shadow-sm" : cardBase
    }`;

  const tileStyle = (active: boolean) =>
    active ? { borderColor: accent, backgroundColor: withAlpha(accent, 0.03) } : undefined;

  const newProjectFolder = safeFilter === "all" || safeFilter === "none" ? null : safeFilter;

  return (
    <div className="thin-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-8 p-6 sm:p-10">
        <PageHeader
          theme={theme}
          badge="Evolução do projeto"
          badgeIcon={<ListChecks size={14} />}
          title="Planejamento"
          description="Organize em pastas o que você quer desenvolver e acompanhe o que já foi feito."
          actions={
            <button type="button" onClick={() => onCreateProject(newProjectFolder)} className={ui.btnPrimary}>
              <Plus size={16} />
              Novo planejamento
            </button>
          }
        />

        {/* 1. PASTAS */}
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">1. Pastas</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button type="button" onClick={() => setFilter("all")} className={tile(safeFilter === "all")} style={tileStyle(safeFilter === "all")}>
              <FolderTileIcon active={safeFilter === "all"} accent={accent} dark={dark} />

              <div className="min-w-0 flex-1">
                <span className={`block truncate text-xs font-semibold ${ui.title}`}>Todos os planejamentos</span>
                <span className={`text-[11px] ${ui.subtitle}`}>
                  {store.projects.length} {store.projects.length === 1 ? "planejamento" : "planejamentos"}
                </span>
              </div>
            </button>

            {store.folders.length > 0 && withoutFolder > 0 && (
              <button type="button" onClick={() => setFilter("none")} className={tile(safeFilter === "none")} style={tileStyle(safeFilter === "none")}>
                <FolderTileIcon active={safeFilter === "none"} accent={accent} dark={dark} />

                <div className="min-w-0 flex-1">
                  <span className={`block truncate text-xs font-semibold ${ui.title}`}>Sem pasta</span>
                  <span className={`text-[11px] ${ui.subtitle}`}>
                    {withoutFolder} {withoutFolder === 1 ? "planejamento" : "planejamentos"}
                  </span>
                </div>
              </button>
            )}

            {store.folders.map((folder) => {
              const active = safeFilter === folder.id;
              const hex = folderHex(folder.color);
              const count = store.projects.filter((p) => p.folderId === folder.id).length;

              return (
                <div key={folder.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => setFilter(folder.id)}
                    className={tile(active)}
                    style={tileStyle(active)}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm"
                      style={{ backgroundColor: withAlpha(hex, 0.16), color: hex }}
                    >
                      <FolderIcon size={16} />
                    </div>

                    <div className="min-w-0 flex-1 pr-14">
                      <span className={`block truncate text-xs font-semibold ${ui.title}`}>{folder.name}</span>
                      <span className={`text-[11px] ${ui.subtitle}`}>
                        {count} {count === 1 ? "planejamento" : "planejamentos"}
                      </span>
                    </div>
                  </button>

                  <div className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-1 opacity-0 transition-all group-hover:flex group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => onEditFolder(folder)}
                      title="Editar pasta"
                      aria-label="Editar pasta"
                      className={`rounded-lg border p-1.5 backdrop-blur-md transition-colors ${
                        dark
                          ? "border-white/[0.08] bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800"
                          : "border-zinc-200 bg-white/90 text-zinc-600 shadow-sm hover:bg-zinc-100"
                      }`}
                    >
                      <Pencil size={12} />
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDeleteFolder(folder)}
                      title="Excluir pasta"
                      aria-label="Excluir pasta"
                      className={`rounded-lg border p-1.5 backdrop-blur-md transition-colors ${
                        dark
                          ? "border-white/[0.08] bg-zinc-900/90 text-red-400 hover:bg-red-500/20"
                          : "border-zinc-200 bg-white/90 text-red-600 shadow-sm hover:bg-red-50"
                      }`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={onCreateFolder}
              className={`flex h-full min-h-[52px] items-center justify-center gap-2 rounded-xl border border-dashed text-xs font-medium transition-all ${borderClass} ${
                dark
                  ? "text-zinc-400 hover:border-zinc-500 hover:bg-white/[0.02] hover:text-zinc-200"
                  : "text-zinc-500 hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <FolderPlus size={15} />
              Nova pasta
            </button>
          </div>
        </section>

        {/* 2. PLANEJAMENTOS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">2. Planejamentos</h2>
            <span className={`text-xs ${ui.subtitle}`}>
              • {label} ({visible.length})
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((project) => {
              const summary = summaries.get(project.id) ?? { total: 0, done: 0, percent: 0 };
              const folder = store.folders.find((f) => f.id === project.folderId);
              /* o cartão segue a cor do planejamento; a pasta mantém a cor dela só no ícone pequeno */
              const color = projectColor(project, accent, store.projects);
              const folderColor = folder ? folderHex(folder.color) : undefined;

              return (
                <div
                  key={project.id}
                  onClick={() => onOpen(project.id)}
                  className={`group relative cursor-pointer rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 ${ui.panel} ${ui.panelHover}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform group-hover:scale-110"
                      style={{ backgroundColor: withAlpha(color, 0.12), color }}
                    >
                      <ListChecks size={20} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-bold ${ui.title}`}>{project.name}</p>

                      <span className={`flex items-center gap-1.5 truncate text-xs font-semibold ${ui.subtitle}`}>
                        <FolderIcon size={11} style={{ color: folderColor }} />
                        {folder ? folder.name : "Sem pasta"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className={`text-[11px] font-medium ${ui.subtitle}`}>
                        {summary.total
                          ? `${summary.done} de ${summary.total} concluídas`
                          : "Nenhuma atividade ainda"}
                      </span>

                      <span className={`text-[11px] font-bold ${ui.title}`}>{summary.percent}%</span>
                    </div>

                    <ProgressBar percent={summary.percent} color={color} dark={dark} />
                  </div>

                  <div className={`mt-5 flex items-center justify-between border-t pt-4 ${ui.divider}`}>
                    <span
                      className="flex items-center gap-1 text-xs font-bold transition-colors group-hover:underline"
                      style={{ color: accent }}
                    >
                      Abrir planejamento
                      <ArrowRight size={13} />
                    </span>

                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditProject(project);
                        }}
                        title="Editar planejamento"
                        aria-label="Editar planejamento"
                        className={ui.iconBtn}
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDeleteProject(project);
                        }}
                        title="Excluir planejamento"
                        aria-label="Excluir planejamento"
                        className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => onCreateProject(newProjectFolder)}
              className={`group flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-300 hover:scale-[0.99] ${
                dark
                  ? "border-white/10 bg-white/[0.01] hover:border-white/30 hover:bg-white/[0.03]"
                  : "border-zinc-300 bg-zinc-50/50 hover:border-zinc-400 hover:bg-zinc-100/50"
              }`}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-transform group-hover:scale-110"
                style={{ backgroundColor: withAlpha(accent, 0.1), color: accent }}
              >
                <Plus size={22} />
              </div>

              <div>
                <span className={`block text-sm font-bold ${ui.title}`}>Novo planejamento</span>
                <span className={`mt-0.5 block text-xs font-medium ${ui.subtitle}`}>
                  {store.projects.length === 0
                    ? "Comece com uma lista em branco"
                    : activeFolder
                      ? `Será criado na pasta ${activeFolder.name}`
                      : "Crie uma nova lista em branco"}
                </span>
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function FolderTileIcon({ active, accent, dark }: { active: boolean; accent: string; dark: boolean }) {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm transition-colors"
      style={{
        backgroundColor: active ? accent : dark ? "rgba(255, 255, 255, 0.05)" : "#f4f4f5",
        color: active ? "#ffffff" : dark ? "#a1a1aa" : "#52525b",
      }}
    >
      <FolderIcon size={16} />
    </div>
  );
}