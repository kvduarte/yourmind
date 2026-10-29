"use client";

import React from "react";
import {
  GitFork,
  Code2,
  Folder as FolderIcon,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  CalendarDays,
  Link2,
  FolderPlus,
  ChevronRight,
} from "lucide-react";

import { Folder, Theme, Topic } from "@/types";
import { FlowKind } from "@/lib/nav";
import { DEFAULT_ACCENT, withAlpha } from "@/lib/theme";
import { getUi } from "@/lib/ui";
import PageHeader from "./PageHeader";
import { linkLabel } from "@/lib/link";
import { AppSettings } from "@/lib/settings";

interface FlowsProps {
  theme: Theme;
  settings?: AppSettings & { accentColor?: string; bgImageUrl?: string };
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
}

const DEFAULT_COLOR = DEFAULT_ACCENT;

const KINDS: {
  id: FlowKind;
  title: string;
  text: string;
  icon: React.ElementType;
}[] = [
  {
    id: "general",
    title: "Normal",
    text: "Planejamento, ideias e estudos estruturados com tópicos.",
    icon: GitFork,
  },
  {
    id: "code",
    title: "Programação",
    text: "Arquitetura de arquivos, blocos executáveis e ligações de código.",
    icon: Code2,
  },
];

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
}: FlowsProps) {
  const dark = theme === "dark";
  const accentColor = settings?.accentColor || DEFAULT_COLOR;

  const borderClass = dark ? "border-white/[0.08]" : "border-zinc-200/80";

  const ui = getUi(dark);
  const panel = ui.panel;
  const titleColor = ui.title;
  const subtitleColor = ui.subtitle;

  const cardBase = dark
    ? "bg-zinc-900/40 border-white/[0.08] hover:bg-zinc-900/80 hover:border-white/[0.15]"
    : "bg-white border-zinc-200/80 hover:bg-zinc-50/80 hover:border-zinc-300";

  const kindTopics = topics.filter((topic) => (topic.kind ?? "general") === flowKind);
  const visible = kindTopics.filter(
    (topic) => !activeFolderId || topic.folderId === activeFolderId
  );
  const activeFolder = folders.find((folder) => folder.id === activeFolderId);

  return (
    <div className="thin-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-8 p-6 sm:p-10">
        
        <PageHeader
          theme={theme}
          badge="Fluxos & projetos"
          title="Fluxogramas"
          description="Gerencie seus diagramas, ideias e estruturas de código de forma organizada."
          actions={
            <>
    {/* Passos indicativos dinâmicos com a cor de destaque */}
    <div className={`inline-flex items-center gap-2 rounded-2xl border p-1.5 text-xs font-medium ${ui.panel} ${ui.text}`}>
      <span className="flex items-center gap-1.5 px-2 py-1">
        <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: accentColor }}>1</span>
        <span>Tipo</span>
      </span>
      <ChevronRight size={12} className="text-zinc-500" />
      <span className="flex items-center gap-1.5 px-2 py-1">
        <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: accentColor }}>2</span>
        <span>Pasta</span>
      </span>
      <ChevronRight size={12} className="text-zinc-500" />
      <span className="flex items-center gap-1.5 px-2 py-1">
        <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: accentColor }}>3</span>
        <span>Projeto</span>
      </span>
    </div>
            </>
          }
        />

        {/* 1. TIPO DE FLUXOGRAMA */}
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            1. Selecione o Tipo
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {KINDS.map((item) => {
              const Icon = item.icon;
              const active = flowKind === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onFlowKind(item.id)}
                  className={`group relative flex items-start gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ${
                    active ? "shadow-sm" : cardBase
                  }`}
                  style={{
                    borderColor: active ? accentColor : undefined,
                    backgroundColor: active ? withAlpha(accentColor, 0.03) : undefined,
                  }}
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200 shadow-sm"
                    style={{
                      backgroundColor: active ? accentColor : dark ? "rgba(255, 255, 255, 0.05)" : "#f4f4f5",
                      color: active ? "#ffffff" : dark ? "#d4d4d8" : "#3f3f46",
                    }}
                  >
                    <Icon size={20} />
                  </div>

                  <div className="min-w-0 flex-1 pr-6">
                    <span className={`block text-sm font-semibold ${titleColor}`}>
                      {item.title}
                    </span>
                    <span className={`mt-1 block text-xs leading-relaxed ${subtitleColor}`}>
                      {item.text}
                    </span>
                  </div>

                  {active && (
                    <div className="absolute right-4 top-4">
                      <CheckCircle2 size={18} style={{ color: accentColor }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. PASTAS */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              2. Filtre por Pasta
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Todas as Pastas */}
            <button
              onClick={() => onSelectFolder(null)}
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all duration-200 ${
                !activeFolderId ? "shadow-sm" : cardBase
              }`}
              style={{
                borderColor: !activeFolderId ? accentColor : undefined,
                backgroundColor: !activeFolderId ? withAlpha(accentColor, 0.03) : undefined,
              }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors shadow-sm"
                style={{
                  backgroundColor: !activeFolderId ? accentColor : dark ? "rgba(255, 255, 255, 0.05)" : "#f4f4f5",
                  color: !activeFolderId ? "#ffffff" : dark ? "#a1a1aa" : "#52525b",
                }}
              >
                <FolderIcon size={16} />
              </div>

              <div className="min-w-0 flex-1">
                <span className={`block truncate text-xs font-semibold ${titleColor}`}>
                  Todas as pastas
                </span>
                <span className={`text-[11px] ${subtitleColor}`}>
                  {kindTopics.length} {kindTopics.length === 1 ? "item" : "itens"}
                </span>
              </div>
            </button>

            {/* Pastas Existentes */}
            {folders.map((folder) => {
              const active = activeFolderId === folder.id;
              const count = kindTopics.filter((t) => t.folderId === folder.id).length;

              return (
                <div key={folder.id} className="group relative">
                  <button
                    onClick={() => onSelectFolder(folder.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all duration-200 ${
                      active ? "shadow-sm" : cardBase
                    }`}
                    style={{
                      borderColor: active ? accentColor : undefined,
                      backgroundColor: active ? withAlpha(accentColor, 0.03) : undefined,
                    }}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors shadow-sm"
                      style={{
                        backgroundColor: active ? accentColor : dark ? "rgba(255, 255, 255, 0.05)" : "#f4f4f5",
                        color: active ? "#ffffff" : dark ? "#a1a1aa" : "#52525b",
                      }}
                    >
                      <FolderIcon size={16} />
                    </div>

                    <div className="min-w-0 flex-1 pr-12">
                      <span className={`block truncate text-xs font-semibold ${titleColor}`}>
                        {folder.name}
                      </span>
                      <span className={`text-[11px] ${subtitleColor}`}>
                        {count} {count === 1 ? "item" : "itens"}
                      </span>
                    </div>
                  </button>

                  {/* Ações da Pasta */}
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden items-center gap-1 opacity-0 transition-all group-hover:opacity-100 group-hover:flex">
                    <button
                      onClick={() => onEditFolder(folder)}
                      title="Editar pasta"
                      className={`rounded-lg p-1.5 backdrop-blur-md transition-colors ${
                        dark
                          ? "bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800 border border-white/[0.08]"
                          : "bg-white/90 text-zinc-600 hover:bg-zinc-100 shadow-sm border border-zinc-200"
                      }`}
                    >
                      <Pencil size={12} />
                    </button>

                    <button
                      onClick={() => onDeleteFolder(folder)}
                      title="Excluir pasta"
                      className={`rounded-lg p-1.5 backdrop-blur-md transition-colors ${
                        dark
                          ? "bg-zinc-900/90 text-red-400 hover:bg-red-500/20 border border-white/[0.08]"
                          : "bg-white/90 text-red-600 hover:bg-red-50 shadow-sm border border-zinc-200"
                      }`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Criar Pasta */}
            <button
              onClick={onCreateFolder}
              className={`flex h-full min-h-[52px] items-center justify-center gap-2 rounded-xl border border-dashed text-xs font-medium transition-all ${borderClass} ${
                dark
                  ? "text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 hover:bg-white/[0.02]"
                  : "text-zinc-500 hover:border-zinc-400 hover:text-zinc-900 hover:bg-zinc-50"
              }`}
            >
              <FolderPlus size={15} />
              Nova pasta
            </button>
          </div>
        </section>

        {/* 3. LISTA DE FLUXOGRAMAS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                3. Projetos
              </h2>
              <span className={`text-xs ${subtitleColor}`}>
                • {activeFolder ? activeFolder.name : "Todos"} ({visible.length})
              </span>
            </div>

            <button
              onClick={onCreateTopic}
              className={ui.btnPrimaryMd}
            >
              <Plus size={15} />
              Novo Fluxograma
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((topic) => {
              const folder = folders.find((f) => f.id === topic.folderId);
              const codeCount = topic.nodes.filter((n) => n.type === "code").length;

              return (
                <div
                  key={topic.id}
                  onClick={() => onOpenTopic(topic.id)}
                  className={`group relative cursor-pointer rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${cardBase}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl border ${borderClass} ${
                          dark ? "bg-white/[0.03] text-zinc-200" : "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        {flowKind === "code" ? <Code2 size={18} /> : <GitFork size={18} />}
                      </div>
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-semibold ${titleColor}`}>
                          {topic.name}
                        </p>
                        {folder && (
                          <span className="text-[11px] font-medium text-zinc-500">
                            {folder.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTopic(topic);
                      }}
                      title="Excluir fluxograma"
                      className="opacity-0 transition-opacity group-hover:opacity-100 rounded-lg p-1.5 text-zinc-400 hover:bg-red-500/10 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className={`mt-5 flex flex-wrap items-center gap-2 border-t pt-3.5 text-[11px] text-zinc-400 font-medium ${dark ? "border-white/[0.06]" : "border-zinc-200/60"}`}>
                    <span className={`rounded-md border px-2 py-0.5 ${borderClass} ${dark ? "bg-white/[0.02]" : "bg-zinc-50"}`}>
                      {flowKind === "code"
                        ? `${codeCount} ${codeCount === 1 ? "arquivo" : "arquivos"}`
                        : `${topic.nodes.length} ${topic.nodes.length === 1 ? "bloco" : "blocos"}`}
                    </span>

                    {topic.dueDate && (
                      <span className={`flex items-center gap-1 rounded-md border px-2 py-0.5 ${borderClass} ${dark ? "bg-white/[0.02]" : "bg-zinc-50"}`}>
                        <CalendarDays size={11} />
                        {topic.dueDate.split("-").reverse().join("/")}
                      </span>
                    )}

                    {topic.link && (
                      <span className={`flex items-center gap-1 rounded-md border px-2 py-0.5 ${borderClass} ${dark ? "bg-white/[0.02]" : "bg-zinc-50"}`}>
                        <Link2 size={11} />
                        {linkLabel(topic.link)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Card para Criar Novo Fluxograma rápido */}
            <button
              onClick={onCreateTopic}
              className={`flex min-h-[130px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-5 transition-all duration-200 ${borderClass} ${
                dark
                  ? "text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 hover:bg-white/[0.02]"
                  : "text-zinc-500 hover:border-zinc-400 hover:text-zinc-900 hover:bg-zinc-50"
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-current">
                <Plus size={16} />
              </div>
              <span className="text-xs font-semibold">Criar novo fluxograma</span>
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}