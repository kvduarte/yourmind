"use client";

import React, { useMemo, useState } from "react";
import {
  Plus,
  Search,
  CheckCircle2,
  StickyNote,
  FileText,
  Calendar,
  Folder as FolderIcon,
  FolderPlus,
  Pencil,
  Trash2,
  ArrowUpRight,
  BookOpen,
  Clock,
  AlertCircle,
  X,
  Layers,
} from "lucide-react";

import { Task, Theme, Topic } from "@/types";
import { normalizeDate, toKey } from "@/lib/dates";
import {
  CURATED_PALETTES,
  DEFAULT_ACCENT,
  buildAccentGradient,
  isLightHex,
  withAlpha,
} from "@/lib/theme";
import { getUi } from "@/lib/ui";
import { AppSettings } from "@/lib/settings";

import TaskRow from "../shared/TaskRow";
import TaskModal from "../modals/taskModal";

import { DEFAULT_FOLDER_ID, Note, useNotebook } from "@/lib/notes";
import NoteEditorModal from "./NoteEditorModal";
import ConfirmModal from "../modals/ConfirmModal";

interface NotesProps {
  tasks: Task[];
  topics: Topic[];
  theme: Theme;
  settings?: AppSettings & {
    accentColor?: string;
    colorStyle?: "solid" | "gradient" | "preset";
    colorPreset?: string;
  };
  onOpenTaskModal: (date?: string, mode?: "note" | "reminder") => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onSaveEditedTask: (task: Task) => void;
  onNavigate: (target: string) => void;
}

export default function Notes({
  tasks,
  topics,
  theme,
  settings,
  onOpenTaskModal,
  onToggleTask,
  onDeleteTask,
  onSaveEditedTask,
  onNavigate,
}: NotesProps) {
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
  const activeBtnText = isLightBtn ? "text-zinc-950" : "text-white";

  const todayKey = toKey(new Date());

  const [tab, setTab] = useState<"all" | "notes" | "reminders" | "completed">("all");
  const [search, setSearch] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Bloco de notas (pastas + editor grande)
  const notebook = useNotebook();
  const [activeFolder, setActiveFolder] = useState<string>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // Pop-ups de pasta (criar, renomear, excluir)
  const [dialog, setDialog] = useState<
    | { kind: "newFolder" }
    | { kind: "renameFolder"; id: string; name: string }
    | { kind: "deleteFolder"; id: string; name: string }
    | null
  >(null);

  const term = search.trim().toLowerCase();

  const items = useMemo(
    () =>
      tasks
        .map((task) => ({ task, key: normalizeDate(task.dueDate) }))
        .filter(
          ({ task }) =>
            !term ||
            task.title.toLowerCase().includes(term) ||
            (task.description ?? "").toLowerCase().includes(term)
        ),
    [tasks, term]
  );

  const pending = items.filter(({ task }) => !task.completed);
  const completed = items.filter(({ task }) => task.completed);

  const reminders = pending.filter(({ key }) => Boolean(key));
  const pureNotes = pending.filter(({ key }) => !key);

  const groups = [
    {
      label: "Atrasadas",
      danger: true,
      icon: AlertCircle,
      list: reminders
        .filter(({ key }) => key && key < todayKey)
        .sort((a, b) => a.key.localeCompare(b.key)),
    },
    {
      label: "Para Hoje",
      danger: false,
      icon: Clock,
      list: reminders.filter(({ key }) => key === todayKey),
    },
    {
      label: "Próximas",
      danger: false,
      icon: Calendar,
      list: reminders
        .filter(({ key }) => key && key > todayKey)
        .sort((a, b) => a.key.localeCompare(b.key)),
    },
    {
      label: "Anotações Rápidas",
      danger: false,
      icon: StickyNote,
      list: pureNotes,
    },
  ].filter((group) => group.list.length > 0);

  const ui = getUi(dark);
  const panel = ui.panel;
  const titleColor = ui.title;
  const subtitleColor = ui.subtitle;

  const rowProps = {
    todayKey,
    topics,
    dark,
    onToggle: onToggleTask,
    onEdit: setEditingTask,
    onDelete: onDeleteTask,
    onOpenTopic: onNavigate,
  };

  // Notas do bloco de notas filtradas por pasta + busca
  const visibleNotes = useMemo(
    () =>
      notebook.notes
        .filter((n) => activeFolder === "all" || n.folderId === activeFolder)
        .filter(
          (n) =>
            !term ||
            n.title.toLowerCase().includes(term) ||
            n.content.toLowerCase().includes(term)
        )
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [notebook.notes, activeFolder, term]
  );

  const countInFolder = (id: string) =>
    notebook.notes.filter((n) => n.folderId === id).length;

  const openNewNote = () => {
    setEditingNote(null);
    setEditorOpen(true);
  };

  const openNote = (note: Note) => {
    setEditingNote(note);
    setEditorOpen(true);
  };

  const handleNewFolder = () => setDialog({ kind: "newFolder" });
  const handleRenameFolder = (id: string, name: string) =>
    setDialog({ kind: "renameFolder", id, name });
  const handleDeleteFolder = (id: string) => {
    const folder = notebook.folders.find((f) => f.id === id);
    setDialog({ kind: "deleteFolder", id, name: folder?.name ?? "" });
  };

  const previewOf = (n: Note) =>
    n.content.replace(/[#>*`_-]+/g, "").replace(/\n+/g, " ").trim().slice(0, 150);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  const readingTimeOf = (content: string) => {
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const mins = Math.max(1, Math.ceil(words / 200));
    return `${mins} min`;
  };

  const totalNotesCount = pureNotes.length + notebook.notes.length;
  const totalAllCount = pending.length + notebook.notes.length;

  return (
    <div className="thin-scroll h-full overflow-y-auto select-none">
      <div className="mx-auto max-w-6xl space-y-6 p-6 sm:p-10 relative">
        {/* BRILHO ATMOSFÉRICO */}
        <div
          className="pointer-events-none absolute -left-24 -top-16 h-80 w-80 rounded-full opacity-20 blur-[120px] z-0"
          style={{ background: primaryFill }}
        />

        {/* 1. CABEÇALHO EDITORIAL */}
        <header
          className={`relative overflow-hidden rounded-[2rem] border p-6 sm:p-8 shadow-xl transition-all z-10 ${
            dark
              ? "border-white/10 bg-zinc-950/90 text-zinc-100 backdrop-blur-2xl"
              : "border-zinc-200/80 bg-white/95 text-zinc-900 shadow-zinc-200/50 backdrop-blur-2xl"
          }`}
        >
          {/* Ilustração editorial sutil no fundo */}
          <svg
            aria-hidden="true"
            viewBox="0 0 260 140"
            className="pointer-events-none absolute right-2 top-0 h-full w-64 opacity-[0.12] hidden md:block"
          >
            <rect
              x="40"
              y="18"
              width="92"
              height="104"
              rx="12"
              fill="none"
              stroke={primaryColor}
              strokeWidth="1.5"
            />
            <line
              x1="56"
              y1="40"
              x2="112"
              y2="40"
              stroke={primaryColor}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="56"
              y1="56"
              x2="116"
              y2="56"
              stroke={primaryColor}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="56"
              y1="72"
              x2="96"
              y2="72"
              stroke={primaryColor}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <rect
              x="148"
              y="32"
              width="82"
              height="76"
              rx="12"
              fill={primaryColor}
              fillOpacity="0.35"
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
                  <BookOpen size={13} />
                  <span>Base de Conhecimento</span>
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
                    {totalNotesCount} {totalNotesCount === 1 ? "nota" : "notas"} •{" "}
                    {reminders.length}{" "}
                    {reminders.length === 1 ? "lembrete" : "lembretes"}
                  </span>
                </span>
              </div>

              <h1
                className={`text-3xl sm:text-4xl font-black tracking-tight ${titleColor}`}
              >
                Anotações & Lembretes
              </h1>

              <p className={`text-xs sm:text-sm font-medium ${subtitleColor}`}>
                Centralize documentos livres, resumos de estudo e prazos
                importantes em pastas organizadas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={() => onOpenTaskModal(undefined, "reminder")}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                  dark
                    ? "border-white/15 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08]"
                    : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <Calendar size={15} style={{ color: primaryColor }} />
                <span>Novo Lembrete</span>
              </button>

              <button
                onClick={openNewNote}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black shadow-lg transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ${activeBtnText}`}
                style={{ background: primaryFill }}
              >
                <Plus size={16} strokeWidth={2.8} />
                <span>Nova Nota</span>
              </button>
            </div>
          </div>
        </header>

        {/* 2. BARRA DE COMANDO: ABAS + BUSCA */}
        <section
          className={`relative z-10 flex flex-col gap-3 rounded-[1.6rem] border p-3.5 sm:p-4 shadow-md lg:flex-row lg:items-center lg:justify-between ${
            dark
              ? "border-white/10 bg-zinc-950/80 backdrop-blur-xl"
              : "border-zinc-200/80 bg-white/90 backdrop-blur-xl"
          }`}
        >
          {/* Segmented Control de Abas */}
          <div
            className={`flex flex-wrap items-center gap-1 rounded-xl border p-1 ${
              dark
                ? "border-white/10 bg-zinc-900/90"
                : "border-zinc-200 bg-zinc-100/80"
            }`}
          >
            {(
              [
                ["all", "Todos", totalAllCount, StickyNote],
                ["notes", "Notas", totalNotesCount, FileText],
                ["reminders", "Lembretes", reminders.length, Calendar],
                ["completed", "Concluídos", completed.length, CheckCircle2],
              ] as const
            ).map(([id, label, count, Icon]) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-extrabold transition-all cursor-pointer ${
                    active
                      ? `${activeBtnText} shadow-sm`
                      : dark
                      ? "text-zinc-400 hover:text-zinc-100"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                  style={active ? { background: primaryFill } : undefined}
                >
                  <Icon size={13} />
                  <span>{label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
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

          {/* Campo de Busca com Limpar */}
          <div
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs w-full lg:w-80 transition-colors ${
              dark
                ? "border-white/10 bg-zinc-900/70 focus-within:border-white/25"
                : "border-zinc-200 bg-zinc-50 focus-within:border-zinc-400"
            }`}
          >
            <Search size={14} className="text-zinc-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar notas, conteúdos ou prazos..."
              className={`w-full bg-transparent outline-none font-medium ${titleColor}`}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                title="Limpar busca"
                className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </section>

        {/* 3. CONTEÚDO PRINCIPAL */}
        {tab === "completed" ? (
          completed.length === 0 ? (
            <div
              className={`flex flex-col items-center rounded-[2rem] border border-dashed py-16 text-center ${
                dark
                  ? "border-white/15 bg-zinc-950/50"
                  : "border-zinc-300 bg-white/70"
              }`}
            >
              <div
                className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{
                  backgroundColor: withAlpha(primaryColor, 0.14),
                  color: primaryColor,
                }}
              >
                <CheckCircle2 size={24} />
              </div>
              <p className={`text-sm font-black ${titleColor}`}>
                Nenhum item concluído
              </p>
              <p className={`mt-1 text-xs ${subtitleColor}`}>
                Lembretes e anotações finalizados aparecerão aqui.
              </p>
            </div>
          ) : (
            <section className={`rounded-[2rem] border p-5 sm:p-6 ${panel} shadow-xl space-y-2`}>
              <div className="flex items-center justify-between px-2 pb-2 border-b border-zinc-500/10">
                <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">
                  Histórico de Concluídos
                </span>
                <span className="text-[11px] font-bold text-zinc-400">
                  {completed.length} {completed.length === 1 ? "item" : "itens"}
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                {completed.map(({ task, key }) => (
                  <TaskRow key={task.id} task={task} dateKey={key} {...rowProps} />
                ))}
              </div>
            </section>
          )
        ) : tab === "notes" ? (
          <>
            {/* Bloco de notas com sidebar de pastas + grade editorial */}
            <div className="grid gap-6 md:grid-cols-[250px_1fr]">
              {/* Sidebar de Pastas */}
              <aside
                className={`h-fit rounded-[2rem] border p-4 ${panel} shadow-xl space-y-1.5`}
              >
                <div className="mb-2 flex items-center justify-between px-2.5 pt-1">
                  <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">
                    Pastas
                  </span>
                  <button
                    onClick={handleNewFolder}
                    title="Criar nova pasta"
                    className={`flex h-7 w-7 items-center justify-center rounded-xl border transition cursor-pointer ${
                      dark
                        ? "border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                    }`}
                  >
                    <FolderPlus size={14} style={{ color: primaryColor }} />
                  </button>
                </div>

                {[{ id: "all", name: "Todas as notas" }, ...notebook.folders].map(
                  (f) => {
                    const active = activeFolder === f.id;
                    const count =
                      f.id === "all"
                        ? notebook.notes.length
                        : countInFolder(f.id);
                    const custom =
                      f.id !== "all" && f.id !== DEFAULT_FOLDER_ID;

                    return (
                      <div
                        key={f.id}
                        className={`group flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                          active
                            ? `${activeBtnText} shadow-sm`
                            : dark
                            ? "text-zinc-300 hover:bg-white/5 hover:text-white"
                            : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                        }`}
                        style={active ? { background: primaryFill } : undefined}
                      >
                        <button
                          onClick={() => setActiveFolder(f.id)}
                          className="flex min-w-0 flex-1 items-center gap-2.5 text-left cursor-pointer"
                        >
                          <FolderIcon size={15} className="shrink-0" />
                          <span className="truncate">{f.name}</span>
                        </button>

                        {custom && (
                          <span className="hidden items-center gap-0.5 group-hover:flex">
                            <button
                              onClick={() => handleRenameFolder(f.id, f.name)}
                              title="Renomear pasta"
                              className="rounded-lg p-1 hover:bg-black/15 cursor-pointer"
                            >
                              <Pencil size={11} />
                            </button>
                            <button
                              onClick={() => handleDeleteFolder(f.id)}
                              title="Excluir pasta"
                              className={`rounded-lg p-1 cursor-pointer ${
                                active
                                  ? "hover:bg-black/15"
                                  : "text-red-400 hover:bg-red-500/15"
                              }`}
                            >
                              <Trash2 size={11} />
                            </button>
                          </span>
                        )}

                        <span
                          className={`rounded-lg px-2 py-0.5 text-[10px] font-extrabold ${
                            active
                              ? isLightBtn
                                ? "bg-black/15 text-zinc-950"
                                : "bg-white/20 text-white"
                              : dark
                              ? "bg-white/5 text-zinc-400"
                              : "bg-zinc-200/70 text-zinc-600"
                          }`}
                        >
                          {count}
                        </span>
                      </div>
                    );
                  }
                )}
              </aside>

              {/* Grade de Notas */}
              <section className="space-y-4">
                {visibleNotes.length === 0 ? (
                  <div
                    className={`flex flex-col items-center rounded-[2rem] border border-dashed py-20 px-6 text-center ${
                      dark
                        ? "border-white/15 bg-zinc-950/50"
                        : "border-zinc-300 bg-white/70"
                    }`}
                  >
                    <div
                      className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                      style={{
                        backgroundColor: withAlpha(primaryColor, 0.15),
                        color: primaryColor,
                      }}
                    >
                      <FileText size={26} />
                    </div>
                    <p className={`text-base font-black ${titleColor}`}>
                      {term
                        ? "Nenhuma nota encontrada"
                        : "Nenhuma nota nesta pasta"}
                    </p>
                    <p className={`mt-1 max-w-sm text-xs ${subtitleColor}`}>
                      {term
                        ? "Tente buscar por outro termo ou selecione 'Todas as notas'."
                        : "Crie um documento livre para estruturar ideias, resumos e rascunhos."}
                    </p>
                    <button
                      onClick={openNewNote}
                      className={`mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black shadow-lg transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ${activeBtnText}`}
                      style={{ background: primaryFill }}
                    >
                      <Plus size={15} strokeWidth={2.8} />
                      <span>Criar primeira nota</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {visibleNotes.map((n) => {
                      const folder = notebook.folders.find(
                        (f) => f.id === n.folderId
                      );
                      return (
                        <button
                          key={n.id}
                          onClick={() => openNote(n)}
                          className={`group relative overflow-hidden flex min-h-[196px] flex-col justify-between rounded-[1.8rem] border p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer ${
                            dark
                              ? "border-white/10 bg-zinc-950/90 hover:border-white/25"
                              : "border-zinc-200/90 bg-white hover:border-zinc-300 shadow-md shadow-zinc-200/40"
                          }`}
                        >
                          {/* Faixa superior sutil com cor do tema */}
                          <div
                            className="absolute inset-x-0 top-0 h-1 opacity-60 group-hover:opacity-100 transition-opacity"
                            style={{ background: primaryFill }}
                          />

                          {/* Glow no hover */}
                          <div
                            className="pointer-events-none absolute -right-10 -bottom-10 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-20"
                            style={{ background: primaryFill }}
                          />

                          <div className="space-y-2 relative z-10">
                            <div className="flex items-start justify-between gap-2">
                              <h3
                                className={`line-clamp-1 text-base font-extrabold tracking-tight ${titleColor}`}
                              >
                                {n.title || "Sem título"}
                              </h3>
                              <span
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
                                style={{ color: primaryColor }}
                              >
                                <ArrowUpRight size={15} />
                              </span>
                            </div>

                            <p
                              className={`line-clamp-3 text-xs leading-relaxed ${subtitleColor}`}
                            >
                              {previewOf(n) || "Nota sem conteúdo textual..."}
                            </p>
                          </div>

                          <div
                            className={`relative z-10 flex items-center justify-between pt-3.5 mt-4 border-t text-[11px] font-semibold ${
                              dark
                                ? "border-white/10 text-zinc-400"
                                : "border-zinc-100 text-zinc-500"
                            }`}
                          >
                            <span
                              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 font-bold"
                              style={{
                                backgroundColor: withAlpha(primaryColor, 0.12),
                                color: primaryColor,
                              }}
                            >
                              <FolderIcon size={11} />
                              <span className="truncate max-w-[110px]">
                                {folder?.name ?? "Geral"}
                              </span>
                            </span>

                            <div className="flex items-center gap-2 shrink-0">
                              <span>{readingTimeOf(n.content)}</span>
                              <span>•</span>
                              <span>{formatDate(n.updatedAt)}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {/* Card rápido para criar nova nota */}
                    <button
                      onClick={openNewNote}
                      className={`group flex min-h-[196px] flex-col items-center justify-center gap-3 rounded-[1.8rem] border border-dashed p-5 transition-all duration-300 cursor-pointer ${
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
                        Criar nova nota
                      </span>
                    </button>
                  </div>
                )}
              </section>
            </div>

            {/* Anotações rápidas sem data que já existiam */}
            {pureNotes.length > 0 && (
              <section
                className={`rounded-[2rem] border p-5 sm:p-6 ${panel} shadow-xl mt-6 space-y-2`}
              >
                <div className="flex items-center justify-between px-2 pb-2 border-b border-zinc-500/10">
                  <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">
                    Anotações Rápidas
                  </span>
                  <span className="text-[11px] font-bold text-zinc-400">
                    {pureNotes.length}
                  </span>
                </div>
                <div className="space-y-1.5 pt-1">
                  {pureNotes.map(({ task, key }) => (
                    <TaskRow key={task.id} task={task} dateKey={key} {...rowProps} />
                  ))}
                </div>
              </section>
            )}
          </>
        ) : tab === "reminders" ? (
          reminders.length === 0 ? (
            <div
              className={`flex flex-col items-center rounded-[2rem] border border-dashed py-20 px-6 text-center ${
                dark
                  ? "border-white/15 bg-zinc-950/50"
                  : "border-zinc-300 bg-white/70"
              }`}
            >
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{
                  backgroundColor: withAlpha(primaryColor, 0.15),
                  color: primaryColor,
                }}
              >
                <Calendar size={26} />
              </div>
              <p className={`text-base font-black ${titleColor}`}>
                Nenhum lembrete agendado
              </p>
              <p className={`mt-1 max-w-sm text-xs ${subtitleColor}`}>
                Adicione prazos e compromissos para acompanhar suas entregas no
                prazo certo.
              </p>
              <button
                onClick={() => onOpenTaskModal(undefined, "reminder")}
                className={`mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black shadow-lg transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ${activeBtnText}`}
                style={{ background: primaryFill }}
              >
                <Plus size={15} strokeWidth={2.8} />
                <span>Criar lembrete</span>
              </button>
            </div>
          ) : (
            <section
              className={`rounded-[2rem] border p-5 sm:p-6 ${panel} shadow-xl space-y-2`}
            >
              <div className="flex items-center justify-between px-2 pb-2 border-b border-zinc-500/10">
                <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">
                  Todos os Lembretes Pendentes
                </span>
                <span className="text-[11px] font-bold text-zinc-400">
                  {reminders.length}
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                {reminders.map(({ task, key }) => (
                  <TaskRow key={task.id} task={task} dateKey={key} {...rowProps} />
                ))}
              </div>
            </section>
          )
        ) : (
          /* ABA TODOS: NOTAS RECENTES DO CADERNO + GRUPOS DE LEMBRETES E ANOTAÇÕES */
          <div className="space-y-6">
            {visibleNotes.length > 0 && (
              <section
                className={`rounded-[2rem] border p-5 sm:p-6 ${panel} shadow-xl space-y-4`}
              >
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <FileText size={15} style={{ color: primaryColor }} />
                    <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">
                      Notas do Caderno
                    </h2>
                    <span
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-extrabold ${
                        dark
                          ? "bg-white/10 text-zinc-300"
                          : "bg-zinc-200 text-zinc-700"
                      }`}
                    >
                      {visibleNotes.length}
                    </span>
                  </div>

                  <button
                    onClick={() => setTab("notes")}
                    className="inline-flex items-center gap-1 text-xs font-bold hover:underline cursor-pointer"
                    style={{ color: primaryColor }}
                  >
                    <span>Gerenciar pastas</span>
                    <ArrowUpRight size={13} />
                  </button>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleNotes.slice(0, 6).map((n) => {
                    const folder = notebook.folders.find(
                      (f) => f.id === n.folderId
                    );
                    return (
                      <button
                        key={n.id}
                        onClick={() => openNote(n)}
                        className={`group flex flex-col justify-between rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 cursor-pointer ${
                          dark
                            ? "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"
                            : "border-zinc-200 bg-zinc-50/70 hover:border-zinc-300 hover:bg-white"
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`truncate text-sm font-extrabold ${titleColor}`}
                            >
                              {n.title || "Sem título"}
                            </p>
                            <ArrowUpRight
                              size={14}
                              className="shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
                              style={{ color: primaryColor }}
                            />
                          </div>
                          <p
                            className={`line-clamp-2 text-xs leading-relaxed ${subtitleColor}`}
                          >
                            {previewOf(n) || "Nota vazia"}
                          </p>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-zinc-500/10 flex items-center justify-between text-[10px] font-bold text-zinc-400">
                          <span className="flex items-center gap-1 truncate">
                            <FolderIcon size={11} style={{ color: primaryColor }} />
                            {folder?.name ?? "Geral"}
                          </span>
                          <span>{formatDate(n.updatedAt)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {groups.length === 0 && visibleNotes.length === 0 ? (
              <div
                className={`flex flex-col items-center rounded-[2rem] border border-dashed py-24 px-6 text-center ${
                  dark
                    ? "border-white/15 bg-zinc-950/50"
                    : "border-zinc-300 bg-white/70"
                }`}
              >
                <div
                  className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: withAlpha(primaryColor, 0.15),
                    color: primaryColor,
                  }}
                >
                  <CheckCircle2 size={28} />
                </div>
                <p className={`text-base font-black ${titleColor}`}>
                  {search ? "Nenhum resultado encontrado" : "Tudo limpo por aqui!"}
                </p>
                <p className={`mt-1 max-w-sm text-xs ${subtitleColor}`}>
                  {search
                    ? "Tente buscar por outro termo."
                    : "Crie uma nota estruturada ou um lembrete para começar."}
                </p>
              </div>
            ) : (
              groups.map((group) => {
                const GroupIcon = group.icon;
                return (
                  <section
                    key={group.label}
                    className={`rounded-[2rem] border p-5 sm:p-6 ${panel} shadow-xl space-y-3`}
                  >
                    <div className="flex items-center justify-between px-2 pb-2 border-b border-zinc-500/10">
                      <h2
                        className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-widest ${
                          group.danger ? "text-red-400" : "text-zinc-400"
                        }`}
                      >
                        <GroupIcon
                          size={14}
                          style={
                            group.danger ? undefined : { color: primaryColor }
                          }
                        />
                        <span>{group.label}</span>
                      </h2>
                      <span
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-extrabold ${
                          group.danger
                            ? "bg-red-500/15 text-red-400"
                            : dark
                            ? "bg-white/10 text-zinc-300"
                            : "bg-zinc-200 text-zinc-700"
                        }`}
                      >
                        {group.list.length}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {group.list.map(({ task, key }) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          dateKey={key}
                          {...rowProps}
                        />
                      ))}
                    </div>
                  </section>
                );
              })
            )}
          </div>
        )}
      </div>

      {editingTask && (
        <TaskModal
          key={editingTask.id}
          task={editingTask}
          topics={topics}
          theme={theme}
          onClose={() => setEditingTask(null)}
          onSave={onSaveEditedTask}
          onDelete={() => onDeleteTask(editingTask.id)}
        />
      )}

      {/* Editor grande de notas */}
      {editorOpen && (
        <NoteEditorModal
          key={editingNote?.id ?? "new"}
          note={editingNote}
          folders={notebook.folders}
          defaultFolderId={
            activeFolder === "all" ? DEFAULT_FOLDER_ID : activeFolder
          }
          dark={dark}
          accentColor={primaryColor}
          onSave={notebook.saveNote}
          onDelete={notebook.deleteNote}
          onClose={() => setEditorOpen(false)}
        />
      )}

      {/* Pop-ups de pasta */}
      {dialog?.kind === "newFolder" && (
        <ConfirmModal
          dark={dark}
          accentColor={primaryColor}
          title="Nova pasta"
          input={{
            label: "Nome da pasta",
            placeholder: "Ex.: Faculdade, Ideias...",
          }}
          confirmLabel="Criar pasta"
          onCancel={() => setDialog(null)}
          onConfirm={(name) => {
            const folder = notebook.addFolder(name ?? "");
            setActiveFolder(folder.id);
            setDialog(null);
          }}
        />
      )}

      {dialog?.kind === "renameFolder" && (
        <ConfirmModal
          dark={dark}
          accentColor={primaryColor}
          title="Renomear pasta"
          input={{ label: "Novo nome", initial: dialog.name }}
          confirmLabel="Salvar"
          onCancel={() => setDialog(null)}
          onConfirm={(name) => {
            if (name) notebook.renameFolder(dialog.id, name);
            setDialog(null);
          }}
        />
      )}

      {dialog?.kind === "deleteFolder" && (
        <ConfirmModal
          danger
          dark={dark}
          accentColor={primaryColor}
          title="Excluir pasta?"
          message={`A pasta "${dialog.name}" será excluída. As notas que estão nela não serão apagadas: vão para a pasta Geral.`}
          confirmLabel="Excluir pasta"
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            notebook.deleteFolder(dialog.id);
            setActiveFolder("all");
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}