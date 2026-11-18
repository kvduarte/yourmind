"use client";

import React, { useMemo, useState } from "react";
import {
  Plus, Search, CheckCircle2, StickyNote, FileText, Calendar,
  Folder as FolderIcon, FolderPlus, Pencil, Trash2, ArrowUpRight,
} from "lucide-react";

import { Task, Theme, Topic } from "@/types";
import { normalizeDate, toKey } from "@/lib/dates";
import { DEFAULT_ACCENT, withAlpha } from "@/lib/theme";
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
  settings?: AppSettings & { accentColor?: string };
  onOpenTaskModal: (date?: string, mode?: "note" | "reminder") => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onSaveEditedTask: (task: Task) => void;
  onNavigate: (target: string) => void;
}

const DEFAULT_COLOR = DEFAULT_ACCENT;

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
  const accentColor = settings?.accentColor || DEFAULT_COLOR;
  const todayKey = toKey(new Date());

  const [tab, setTab] = useState<"all" | "reminders" | "notes" | "completed">("all");
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
      list: reminders
        .filter(({ key }) => key && key < todayKey)
        .sort((a, b) => a.key.localeCompare(b.key)),
    },
    { label: "Para Hoje", danger: false, list: reminders.filter(({ key }) => key === todayKey) },
    {
      label: "Próximas",
      danger: false,
      list: reminders
        .filter(({ key }) => key && key > todayKey)
        .sort((a, b) => a.key.localeCompare(b.key)),
    },
    { label: "Anotações Gerais", danger: false, list: pureNotes },
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
  const visibleNotes = notebook.notes
    .filter((n) => activeFolder === "all" || n.folderId === activeFolder)
    .filter(
      (n) => !term || n.title.toLowerCase().includes(term) || n.content.toLowerCase().includes(term)
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const countInFolder = (id: string) => notebook.notes.filter((n) => n.folderId === id).length;

  const openNewNote = () => {
    setEditingNote(null);
    setEditorOpen(true);
    setTab("notes");
  };

  const openNote = (note: Note) => {
    setEditingNote(note);
    setEditorOpen(true);
  };

  const handleNewFolder = () => setDialog({ kind: "newFolder" });
  const handleRenameFolder = (id: string, name: string) => setDialog({ kind: "renameFolder", id, name });
  const handleDeleteFolder = (id: string) => {
    const folder = notebook.folders.find((f) => f.id === id);
    setDialog({ kind: "deleteFolder", id, name: folder?.name ?? "" });
  };

  const previewOf = (n: Note) => n.content.replace(/\n+/g, " ").slice(0, 140);
  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <div className="thin-scroll h-full overflow-y-auto select-none">
      <div className="mx-auto max-w-6xl space-y-6 p-6 sm:p-10">
        
        {/* BANNER EDITORIAL DE TOPO */}
        <section
          className={`relative overflow-hidden rounded-[2rem] border p-6 sm:p-8 shadow-xl transition-all ${
            dark
              ? "border-white/10 bg-zinc-950/90 text-zinc-100 backdrop-blur-2xl"
              : "border-zinc-200/80 bg-white/90 text-zinc-900 shadow-zinc-200/50 backdrop-blur-2xl"
          }`}
        >
          <div
            className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full opacity-25 blur-[120px]"
            style={{ background: accentColor }}
          />
          <div
            className="pointer-events-none absolute right-0 bottom-0 h-64 w-64 rounded-full opacity-15 blur-[100px]"
            style={{ background: accentColor }}
          />

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-xs font-bold tracking-wide backdrop-blur-md shadow-xs"
                style={{
                  backgroundColor: withAlpha(accentColor, 0.15),
                  color: accentColor,
                }}
              >
                <StickyNote size={14} />
                <span>Gestão de Conteúdo & Ideias</span>
              </div>

              <h1 className={`text-3xl sm:text-4xl font-black tracking-tight ${titleColor}`}>
                Anotações & Lembretes
              </h1>
              <p className={`text-xs sm:text-sm font-medium ${subtitleColor} max-w-xl`}>
                Guarde ideias, registros livres e organize seus prazos importantes em um ecossistema fluido e integrado.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => onOpenTaskModal(undefined, "reminder")}
                className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-black shadow-sm transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ${
                  dark
                    ? "border-white/15 bg-zinc-900/90 text-zinc-200 hover:border-white/30"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                }`}
              >
                <Calendar size={15} />
                <span>Novo Lembrete</span>
              </button>

              <button
                onClick={openNewNote}
                className="flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                style={{ background: accentColor }}
              >
                <Plus size={16} strokeWidth={2.8} />
                <span>Nova Nota</span>
              </button>
            </div>
          </div>
        </section>

        {/* CONTROLES DE ABAS E BUSCA */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className={`inline-flex flex-wrap items-center gap-1.5 rounded-2xl border p-1.5 shadow-sm ${dark ? "bg-zinc-900/60 border-white/10" : "bg-zinc-100 border-zinc-200/80"}`}>
            {(
              [
                ["all", `Todos (${pending.length})`, <StickyNote key="a" size={13} />],
                ["reminders", `Lembretes (${reminders.length})`, <Calendar key="r" size={13} />],
                ["notes", `Notas (${pureNotes.length + notebook.notes.length})`, <FileText key="n" size={13} />],
                ["completed", `Concluídos (${completed.length})`, <CheckCircle2 key="c" size={13} />],
              ] as const
            ).map(([id, label, icon]) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? "text-white shadow-sm scale-[1.02]"
                      : dark
                      ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-white/80"
                  }`}
                  style={active ? { backgroundColor: accentColor } : undefined}
                >
                  {icon}
                  {label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-80">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
              <Search size={15} />
            </span>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar anotações e lembretes..."
              className={`w-full rounded-2xl border px-4 py-3 pl-11 text-xs font-medium outline-none transition-all ${
                dark
                  ? "border-white/10 bg-zinc-900/60 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 shadow-inner"
                  : "border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 shadow-sm"
              }`}
            />
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL EXIBIDO */}
        {tab === "completed" ? (
          completed.length === 0 ? (
            <div className={`flex flex-col items-center rounded-[2rem] border py-16 text-center ${panel} shadow-xl`}>
              <CheckCircle2 size={32} className="mb-3 text-zinc-500 opacity-60" />
              <p className={`text-sm font-bold ${titleColor}`}>Nenhum item concluído</p>
              <p className={`mt-1 text-xs ${subtitleColor}`}>Itens finalizados aparecerão aqui.</p>
            </div>
          ) : (
            <section className={`rounded-[2rem] border p-5 ${panel} shadow-xl`}>
              {completed.map(({ task, key }) => (
                <TaskRow key={task.id} task={task} dateKey={key} {...rowProps} />
              ))}
            </section>
          )
        ) : tab === "notes" ? (
          <>
            {/* Bloco de notas com pastas */}
            <div className="grid gap-6 md:grid-cols-[240px_1fr]">
              {/* Pastas */}
              <aside className={`h-fit rounded-[2rem] border p-4 ${panel} shadow-xl space-y-1`}>
                <div className="mb-3 flex items-center justify-between px-2 pt-1">
                  <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Pastas</span>
                  <button
                    onClick={handleNewFolder}
                    title="Nova pasta"
                    className={`rounded-xl p-1.5 transition cursor-pointer ${dark ? "text-zinc-300 hover:bg-white/10" : "text-zinc-600 hover:bg-zinc-100"}`}
                  >
                    <FolderPlus size={16} />
                  </button>
                </div>

                {[{ id: "all", name: "Todas as notas" }, ...notebook.folders].map((f) => {
                  const active = activeFolder === f.id;
                  const count = f.id === "all" ? notebook.notes.length : countInFolder(f.id);
                  const custom = f.id !== "all" && f.id !== DEFAULT_FOLDER_ID;
                  return (
                    <div
                      key={f.id}
                      className={`group flex items-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                        active
                          ? "text-white shadow-sm scale-[1.01]"
                          : dark ? "text-zinc-300 hover:bg-white/5 hover:text-white" : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                      }`}
                      style={active ? { backgroundColor: accentColor } : undefined}
                    >
                      <button onClick={() => setActiveFolder(f.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left cursor-pointer">
                        <FolderIcon size={15} />
                        <span className="truncate">{f.name}</span>
                      </button>
                      {custom && (
                        <span className="hidden items-center gap-1 group-hover:flex">
                          <button onClick={() => handleRenameFolder(f.id, f.name)} title="Renomear" className="p-1 hover:opacity-85"><Pencil size={12} /></button>
                          <button onClick={() => handleDeleteFolder(f.id)} title="Excluir" className="p-1 hover:opacity-85 text-red-400"><Trash2 size={12} /></button>
                        </span>
                      )}
                      <span className={`rounded-lg px-2 py-0.5 text-[10px] font-extrabold ${active ? "bg-white/20 text-white" : dark ? "bg-white/5 text-zinc-400" : "bg-zinc-200/70 text-zinc-600"}`}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </aside>

              {/* Notas da pasta */}
              <section>
                {visibleNotes.length === 0 ? (
                  <div className={`flex flex-col items-center rounded-[2rem] border py-20 text-center ${panel} shadow-xl`}>
                    <FileText size={36} className="mb-3 text-zinc-500 opacity-60" />
                    <p className={`text-sm font-bold ${titleColor}`}>
                      {term ? "Nenhuma nota encontrada" : "Nenhuma nota nesta pasta"}
                    </p>
                    <p className={`mt-1 text-xs ${subtitleColor}`}>Crie um registro livre para ideias e rascunhos.</p>
                    <button
                      onClick={openNewNote}
                      className="mt-5 flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                      style={{ background: accentColor }}
                    >
                      <Plus size={15} />
                      Criar nota
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {visibleNotes.map((n) => {
                      const folder = notebook.folders.find((f) => f.id === n.folderId);
                      return (
                        <button
                          key={n.id}
                          onClick={() => openNote(n)}
                          className={`group flex h-48 flex-col justify-between rounded-[2rem] border p-5 text-left transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer ${panel}`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`truncate text-sm font-black ${titleColor}`}>{n.title || "Sem título"}</p>
                              <ArrowUpRight size={15} className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </div>
                            <p className={`line-clamp-3 text-xs leading-relaxed ${subtitleColor}`}>
                              {previewOf(n) || "Nota vazia"}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-between pt-3 border-t border-zinc-500/10 text-[10px] font-bold text-zinc-400">
                            <span className="flex items-center gap-1.5">
                              <FolderIcon size={12} />
                              {folder?.name ?? "Geral"}
                            </span>
                            <span>{formatDate(n.updatedAt)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            {/* Notas sem data que já existiam */}
            {pureNotes.length > 0 && (
              <section className={`rounded-[2rem] border p-5 ${panel} shadow-xl mt-6`}>
                <h2 className="mb-3 px-3 pt-1 text-[11px] font-black uppercase tracking-widest text-zinc-400">
                  Anotações Gerais
                </h2>
                {pureNotes.map(({ task, key }) => (
                  <TaskRow key={task.id} task={task} dateKey={key} {...rowProps} />
                ))}
              </section>
            )}
          </>
        ) : tab === "reminders" ? (
          reminders.length === 0 ? (
            <div className={`flex flex-col items-center rounded-[2rem] border py-20 text-center ${panel} shadow-xl`}>
              <Calendar size={36} className="mb-3 text-zinc-500 opacity-60" />
              <p className={`text-sm font-bold ${titleColor}`}>Nenhum lembrete agendado</p>
              <p className={`mt-1 text-xs ${subtitleColor}`}>Adicione prazos para gerenciar suas entregas.</p>
              <button
                onClick={() => onOpenTaskModal(undefined, "reminder")}
                className="mt-5 flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                style={{ background: accentColor }}
              >
                <Plus size={15} />
                Criar lembrete
              </button>
            </div>
          ) : (
            <section className={`rounded-[2rem] border p-5 ${panel} shadow-xl`}>
              {reminders.map(({ task, key }) => (
                <TaskRow key={task.id} task={task} dateKey={key} {...rowProps} />
              ))}
            </section>
          )
        ) : (
          groups.length === 0 ? (
            <div className={`flex flex-col items-center rounded-[2rem] border py-24 text-center ${panel} shadow-xl`}>
              <CheckCircle2 size={40} className="mb-3 text-emerald-400" />
              <p className={`text-sm font-bold ${titleColor}`}>
                {search ? "Nenhum resultado encontrado" : "Tudo limpo por aqui!"}
              </p>
              <p className={`mt-1 text-xs ${subtitleColor}`}>
                {search ? "Tente buscar por outro termo." : "Crie uma anotação ou lembrete para começar."}
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.label} className={`rounded-[2rem] border p-5 ${panel} shadow-xl mb-6`}>
                <h2
                  className={`mb-3 flex items-center justify-between px-3 pt-1 text-[11px] font-black uppercase tracking-widest ${
                    group.danger ? "text-red-400" : "text-zinc-400"
                  }`}
                >
                  <span>{group.label}</span>
                  <span className={`rounded-lg px-2 py-0.5 text-[10px] font-extrabold ${dark ? "bg-white/10 text-zinc-300" : "bg-zinc-200 text-zinc-700"}`}>
                    {group.list.length}
                  </span>
                </h2>

                <div className="space-y-1.5">
                  {group.list.map(({ task, key }) => (
                    <TaskRow key={task.id} task={task} dateKey={key} {...rowProps} />
                  ))}
                </div>
              </section>
            ))
          )
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
          defaultFolderId={activeFolder === "all" ? DEFAULT_FOLDER_ID : activeFolder}
          dark={dark}
          accentColor={accentColor}
          onSave={notebook.saveNote}
          onDelete={notebook.deleteNote}
          onClose={() => setEditorOpen(false)}
        />
      )}

      {/* Pop-ups de pasta */}
      {dialog?.kind === "newFolder" && (
        <ConfirmModal
          dark={dark}
          accentColor={accentColor}
          title="Nova pasta"
          input={{ label: "Nome da pasta", placeholder: "Ex.: Faculdade, Ideias..." }}
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
          accentColor={accentColor}
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
          accentColor={accentColor}
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