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
  Copy,
  Link2,
  FolderPlus,
  ChevronRight,
  Terminal,
  Network,
  Workflow,
  Cpu,
} from "lucide-react";

import { Folder, Theme, Topic } from "@/types";
import { FlowKind } from "@/lib/nav";
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
  title: string;
  text: string;
  icon: React.ElementType;
  badge: string;
}[] = [
  {
    id: "general",
    title: "Normal (Fluxograma)",
    text: "Planejamento, ideias e conexões estruturadas em nós lógicos.",
    icon: Network,
    badge: "Nós & Relações",
  },
  {
    id: "code",
    title: "Programação (Código)",
    text: "Arquitetura de arquivos, blocos executáveis e lógica de sistema.",
    icon: Terminal,
    badge: "Arquitetura & Stack",
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

  const isLightPrimary = isLightHex(primaryColor);
  const safeIconColor = isLightPrimary && colorStyle === "solid" ? "#18181b" : "#ffffff";

  const ui = getUi(dark);
  const titleColor = ui.title;
  const subtitleColor = ui.subtitle;

  const kindTopics = topics.filter((topic) => (topic.kind ?? "general") === flowKind);
  const visible = kindTopics.filter(
    (topic) => !activeFolderId || topic.folderId === activeFolderId
  );
  const activeFolder = folders.find((folder) => folder.id === activeFolderId);

  return (
    <div className="thin-scroll h-full overflow-y-auto select-none">
      <div className="mx-auto max-w-6xl space-y-8 p-6 sm:p-10 relative">
        
        {/* BRILHO ATMOSFÉRICO DE FUNDO */}
        <div
          className="absolute -left-20 -top-10 h-80 w-80 rounded-full opacity-15 blur-[120px] pointer-events-none z-0"
          style={{ background: primaryFill }}
        />

        {/* HEADER COM VIBE DE FLUXOGRAMA & NÓS */}
        <div
          className={`relative overflow-hidden rounded-[2rem] border p-6 sm:p-8 transition-all duration-500 shadow-xl z-10 ${
            dark
              ? "border-white/10 bg-zinc-950 text-zinc-100"
              : "border-zinc-200 bg-white text-zinc-900 shadow-zinc-200/50"
          }`}
        >
          {/* Elementos gráficos decorativos simulando nós e conexões no fundo do header */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-3 opacity-20 pointer-events-none">
            <div className={`flex flex-col items-center gap-2 border border-dashed rounded-xl p-3 ${dark ? "border-white/30" : "border-zinc-400"}`}>
              <Workflow size={18} style={{ color: primaryColor }} />
            </div>
            <div className={`w-8 h-0.5 ${dark ? "bg-white/30" : "bg-zinc-400"}`} />
            <div className={`flex flex-col items-center gap-2 border border-dashed rounded-xl p-3 ${dark ? "border-white/30" : "border-zinc-400"}`}>
              <Cpu size={18} style={{ color: primaryColor }} />
            </div>
            <div className={`w-8 h-0.5 ${dark ? "bg-white/30" : "bg-zinc-400"}`} />
            <div className={`flex flex-col items-center gap-2 border rounded-xl p-3 shadow-sm`} style={{ borderColor: primaryColor, backgroundColor: withAlpha(primaryColor, 0.15) }}>
              <Network size={18} style={{ color: primaryColor }} />
            </div>
          </div>

          <div className="absolute inset-0 opacity-[0.04] z-0 pointer-events-none" style={{ background: primaryFill }} />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div
                className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold tracking-wide shadow-xs backdrop-blur-md border border-white/10"
                style={{
                  backgroundColor: withAlpha(primaryColor, 0.15),
                  color: primaryColor,
                }}
              >
                <Network size={13} />
                <span>Arquitetura & Nós de Conexão</span>
              </div>
              <h1 className={`text-3xl sm:text-4xl font-black tracking-tight ${titleColor}`}>
                Fluxogramas
              </h1>
              <p className={`text-xs sm:text-sm font-medium ${subtitleColor} max-w-xl`}>
                Estruture seus diagramas, ideias lógicas e códigos em um ambiente fluido, interligado e organizado.
              </p>
            </div>

            {/* PASSOS INDICATIVOS COM VIBE DE FLUXO */}
            <div className={`flex items-center gap-1.5 rounded-2xl border p-2 text-xs font-medium backdrop-blur-md shrink-0 ${
              dark ? "border-white/10 bg-zinc-900/60" : "border-zinc-200 bg-zinc-50"
            }`}>
              <span className="flex items-center gap-1.5 px-2.5 py-1">
                <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shadow-sm" style={{ background: primaryFill, color: safeIconColor }}>1</span>
                <span className={titleColor}>Tipo</span>
              </span>
              <ChevronRight size={13} className="text-zinc-500" />
              <span className="flex items-center gap-1.5 px-2.5 py-1">
                <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shadow-sm" style={{ background: primaryFill, color: safeIconColor }}>2</span>
                <span className={titleColor}>Pasta</span>
              </span>
              <ChevronRight size={13} className="text-zinc-500" />
              <span className="flex items-center gap-1.5 px-2.5 py-1">
                <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shadow-sm" style={{ background: primaryFill, color: safeIconColor }}>3</span>
                <span className={titleColor}>Projeto</span>
              </span>
            </div>
          </div>
        </div>

        {/* 1. TIPO DE FLUXOGRAMA */}
        <section className="space-y-3 relative z-10">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-1">
            1. Selecione o Tipo de Estrutura
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {KINDS.map((item, idx) => {
              const Icon = item.icon;
              const active = flowKind === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onFlowKind(item.id)}
                  className={`group relative overflow-hidden rounded-[1.8rem] border p-6 text-left transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between shadow-md ${
                    dark
                      ? "border-white/10 bg-zinc-950/80 hover:border-white/20"
                      : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                  style={{
                    borderColor: active ? primaryColor : undefined,
                  }}
                >
                  {/* Linhas decorativas simulando conexões de fluxograma no fundo */}
                  <div className="absolute right-4 top-4 opacity-10 pointer-events-none flex items-center gap-1">
                    {idx === 0 ? (
                      <div className="flex items-center gap-1">
                        <div className="w-6 h-0.5 bg-current" style={{ color: primaryColor }} />
                        <div className="w-3 h-3 rounded-full border border-current" style={{ color: primaryColor }} />
                        <div className="w-6 h-0.5 bg-current" style={{ color: primaryColor }} />
                      </div>
                    ) : (
                      <span className="font-mono text-xs font-bold" style={{ color: primaryColor }}>{`{ }`}</span>
                    )}
                  </div>

                  {active && (
                    <div
                      className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full opacity-25 blur-2xl pointer-events-none"
                      style={{ background: primaryFill }}
                    />
                  )}

                  <div className="flex items-start justify-between z-10">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-transform group-hover:scale-105"
                        style={{
                          background: active ? primaryFill : withAlpha(primaryColor, dark ? 0.15 : 0.1),
                          color: active ? safeIconColor : primaryColor,
                        }}
                      >
                        <Icon size={22} />
                      </div>
                      <div>
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                          style={{
                            backgroundColor: withAlpha(primaryColor, 0.1),
                            color: primaryColor,
                          }}
                        >
                          {item.badge}
                        </span>
                      </div>
                    </div>

                    {active && (
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full shadow-xs"
                        style={{ background: withAlpha(primaryColor, 0.2), color: primaryColor }}
                      >
                        <CheckCircle2 size={16} />
                      </div>
                    )}
                  </div>

                  <div className="z-10 space-y-1 mt-5">
                    <h3 className={`text-base font-extrabold ${titleColor}`}>
                      {item.title}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. PASTAS */}
        <section className="space-y-3 relative z-10">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              2. Filtre por Pasta
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Todas as Pastas */}
            <button
              onClick={() => onSelectFolder(null)}
              className={`group relative overflow-hidden flex items-center gap-3.5 rounded-2xl border p-4 text-left transition-all duration-300 hover:-translate-y-0.5 cursor-pointer shadow-sm ${
                dark
                  ? "border-white/10 bg-zinc-950/80 hover:border-white/20"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
              style={{
                borderColor: !activeFolderId ? primaryColor : undefined,
              }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform group-hover:scale-105"
                style={{
                  background: !activeFolderId ? primaryFill : withAlpha(primaryColor, dark ? 0.15 : 0.1),
                  color: !activeFolderId ? safeIconColor : primaryColor,
                }}
              >
                <FolderIcon size={18} />
              </div>

              <div className="min-w-0 flex-1">
                <span className={`block truncate text-xs font-bold ${titleColor}`}>
                  Todas as pastas
                </span>
                <span className="text-[11px] text-zinc-400">
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
                    className={`flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left transition-all duration-300 hover:-translate-y-0.5 cursor-pointer shadow-sm ${
                      dark
                        ? "border-white/10 bg-zinc-950/80 hover:border-white/20"
                        : "border-zinc-200 bg-white hover:border-zinc-300"
                    }`}
                    style={{
                      borderColor: active ? primaryColor : undefined,
                    }}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform group-hover:scale-105"
                      style={{
                        background: active ? primaryFill : withAlpha(primaryColor, dark ? 0.15 : 0.1),
                        color: active ? safeIconColor : primaryColor,
                      }}
                    >
                      <FolderIcon size={18} />
                    </div>

                    <div className="min-w-0 flex-1 pr-12">
                      <span className={`block truncate text-xs font-bold ${titleColor}`}>
                        {folder.name}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {count} {count === 1 ? "item" : "itens"}
                      </span>
                    </div>
                  </button>

                  {/* Ações da Pasta */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden items-center gap-1 opacity-0 transition-all group-hover:opacity-100 group-hover:flex z-10">
                    <button
                      onClick={() => onEditFolder(folder)}
                      title="Editar pasta"
                      className={`rounded-xl p-1.5 backdrop-blur-md transition-all cursor-pointer ${
                        dark
                          ? "bg-zinc-900/90 text-zinc-300 hover:text-white border border-white/10"
                          : "bg-white/90 text-zinc-600 hover:text-zinc-900 shadow-sm border border-zinc-200"
                      }`}
                    >
                      <Pencil size={13} />
                    </button>

                    <button
                      onClick={() => onDeleteFolder(folder)}
                      title="Excluir pasta"
                      className={`rounded-xl p-1.5 backdrop-blur-md transition-all cursor-pointer ${
                        dark
                          ? "bg-zinc-900/90 text-red-400 hover:bg-red-500/20 border border-white/10"
                          : "bg-white/90 text-red-600 hover:bg-red-50 shadow-sm border border-zinc-200"
                      }`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Criar Pasta */}
            <button
              onClick={onCreateFolder}
              className={`flex h-full min-h-[58px] items-center justify-center gap-2.5 rounded-2xl border border-dashed text-xs font-bold transition-all duration-300 cursor-pointer ${
                dark
                  ? "border-white/15 text-zinc-400 hover:border-white/30 hover:text-zinc-200 hover:bg-white/2"
                  : "border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:text-zinc-900 hover:bg-zinc-50"
              }`}
            >
              <FolderPlus size={16} />
              Nova pasta
            </button>
          </div>
        </section>

        {/* 3. LISTA DE FLUXOGRAMAS / PROJETOS */}
        <section className="space-y-4 relative z-10">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                3. Projetos
              </h2>
              <span className={`text-xs font-medium ${subtitleColor}`}>
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
                  className={`group relative cursor-pointer rounded-[1.8rem] border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between ${
                    dark
                      ? "border-white/10 bg-zinc-950/80 hover:border-white/20"
                      : "border-zinc-200 bg-white hover:border-zinc-300 shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-xs transition-transform group-hover:scale-105"
                        style={{
                          background: withAlpha(primaryColor, dark ? 0.15 : 0.1),
                          color: primaryColor,
                        }}
                      >
                        {flowKind === "code" ? <Code2 size={19} /> : <GitFork size={19} />}
                      </div>
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-extrabold ${titleColor}`}>
                          {topic.name}
                        </p>
                        {folder && (
                          <span className="block truncate text-[11px] font-medium text-zinc-400 mt-0.5">
                            {folder.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTopic(topic);
                        }}
                        title="Editar fluxograma"
                        className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-500/15 hover:text-zinc-100 cursor-pointer"
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateTopic(topic);
                        }}
                        title="Duplicar fluxograma"
                        className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-500/15 hover:text-zinc-100 cursor-pointer"
                      >
                        <Copy size={14} />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTopic(topic);
                        }}
                        title="Excluir fluxograma"
                        className="rounded-xl p-1.5 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className={`mt-5 flex flex-wrap items-center gap-2 border-t pt-3.5 text-[11px] font-medium text-zinc-400 ${
                    dark ? "border-white/10" : "border-zinc-100"
                  }`}>
                    <span
                      className="rounded-xl border px-2.5 py-1 font-semibold"
                      style={{
                        borderColor: withAlpha(primaryColor, 0.25),
                        backgroundColor: withAlpha(primaryColor, 0.08),
                        color: primaryColor,
                      }}
                    >
                      {flowKind === "code"
                        ? `${codeCount} ${codeCount === 1 ? "arquivo" : "arquivos"}`
                        : `${topic.nodes.length} ${topic.nodes.length === 1 ? "bloco" : "blocos"}`}
                    </span>

                    {topic.dueDate && (
                      <span className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 ${
                        dark ? "border-white/10 bg-white/3 text-zinc-300" : "border-zinc-200 bg-zinc-50 text-zinc-600"
                      }`}>
                        <CalendarDays size={12} />
                        {topic.dueDate.split("-").reverse().join("/")}
                      </span>
                    )}

                    {topic.link && (
                      <span className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 ${
                        dark ? "border-white/10 bg-white/3 text-zinc-300" : "border-zinc-200 bg-zinc-50 text-zinc-600"
                      }`}>
                        <Link2 size={12} />
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
              className={`flex min-h-[145px] flex-col items-center justify-center gap-3 rounded-[1.8rem] border border-dashed p-5 transition-all duration-300 cursor-pointer ${
                dark
                  ? "border-white/15 text-zinc-400 hover:border-white/30 hover:text-zinc-200 hover:bg-white/2"
                  : "border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:text-zinc-900 hover:bg-zinc-50"
              }`}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-dashed"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                <Plus size={18} />
              </div>
              <span className="text-xs font-bold">Criar novo fluxograma</span>
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}