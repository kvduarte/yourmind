"use client";

import React, { useMemo, useState } from "react";
import {
  Plus, Search, CheckCircle2, StickyNote, FileText, Calendar,
  Folder as FolderIcon, FolderPlus, Pencil, Trash2,
} from "lucide-react";

import { Task, Theme, Topic } from "@/types";
import { normalizeDate, toKey } from "@/lib/dates";
import { DEFAULT_ACCENT, withAlpha } from "@/lib/theme";
import { getUi } from "@/lib/ui";
import PageHeader from "./PageHeader";

import { AppSettings } from "@/lib/settings";

import TaskRow from "./TaskRow";
import TaskModal from "./taskModal";

import { DEFAULT_FOLDER_ID, Note, useNotebook } from "@/lib/notes";
import NoteEditorModal from "./NoteEditorModal";
import ConfirmModal from "./ConfirmModal";

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
    <div className="thin-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-8 p-6 sm:p-10">
        
        <PageHeader
          theme={theme}
          badge="Gestão de conteúdo"
          title="Anotações & Lembretes"
          description="Guarde ideias, registros livres e organize seus prazos importantes em um só lugar."
          actions={
            <>
              <button onClick={() => onOpenTaskModal(undefined, "reminder")} className={ui.btnSecondary}>
                <Calendar size={16} />
                Novo lembrete
              </button>
              <button onClick={openNewNote} className={ui.btnPrimary}>
                <Plus size={16} />
                Nova nota
              </button>
            </>
          }
        />

        {/* FILTROS E BUSCA */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className={`inline-flex flex-wrap items-center gap-1 rounded-2xl border p-1.5 ${dark ? "bg-zinc-900/60 border-white/8" : "bg-zinc-100 border-zinc-200/80"}`}>
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
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                    active
                      ? "text-white shadow-sm"
                      : dark
                      ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/4"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-white/60"
                  }`}
                  style={active ? { backgroundColor: accentColor } : undefined}
                >
                  {icon}
                  {label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-72">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
              <Search size={15} />
            </span>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar anotações e lembretes..."
              className={`w-full rounded-xl border px-3.5 py-2.5 pl-10 text-xs outline-none transition-all ${
                dark
                  ? "border-white/8 bg-zinc-900/40 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600"
                  : "border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 shadow-sm"
              }`}
            />
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL EXIBIDO */}
        {tab === "completed" ? (
          completed.length === 0 ? (
            <div className={`flex flex-col items-center rounded-2xl border py-16 text-center ${panel}`}>
              <CheckCircle2 size={32} className="mb-3 text-zinc-500 opacity-60" />
              <p className={`text-sm font-semibold ${titleColor}`}>Nenhum item concluído</p>
              <p className={`mt-1 text-xs ${subtitleColor}`}>Itens finalizados aparecerão aqui.</p>
            </div>
          ) : (
            <section className={`rounded-2xl border p-4 ${panel}`}>
              {completed.map(({ task, key }) => (
                <TaskRow key={task.id} task={task} dateKey={key} {...rowProps} />
              ))}
            </section>
          )
        ) : tab === "notes" ? (
          <>
            {/* Bloco de notas com pastas */}
            <div className="grid gap-5 md:grid-cols-[220px_1fr]">
              {/* Pastas */}
              <aside className={`h-fit rounded-2xl border p-3 ${panel}`}>
                <div className="mb-2 flex items-center justify-between px-2 pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Pastas</span>
                  <button
                    onClick={handleNewFolder}
                    title="Nova pasta"
                    className={`rounded-lg p-1.5 ${dark ? "text-zinc-300 hover:bg-white/8" : "text-zinc-600 hover:bg-zinc-100"}`}
                  >
                    <FolderPlus size={15} />
                  </button>
                </div>

                {[{ id: "all", name: "Todas as notas" }, ...notebook.folders].map((f) => {
                  const active = activeFolder === f.id;
                  const count = f.id === "all" ? notebook.notes.length : countInFolder(f.id);
                  const custom = f.id !== "all" && f.id !== DEFAULT_FOLDER_ID;
                  return (
                    <div
                      key={f.id}
                      className={`group flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors ${
                        active
                          ? "text-white"
                          : dark ? "text-zinc-300 hover:bg-white/6" : "text-zinc-700 hover:bg-zinc-100"
                      }`}
                      style={active ? { backgroundColor: accentColor } : undefined}
                    >
                      <button onClick={() => setActiveFolder(f.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        <FolderIcon size={14} />
                        <span className="truncate">{f.name}</span>
                      </button>
                      {custom && (
                        <span className="hidden items-center gap-1 group-hover:flex">
                          <button onClick={() => handleRenameFolder(f.id, f.name)} title="Renomear"><Pencil size={12} /></button>
                          <button onClick={() => handleDeleteFolder(f.id)} title="Excluir"><Trash2 size={12} /></button>
                        </span>
                      )}
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${active ? "bg-white/20" : dark ? "bg-white/6" : "bg-zinc-100"}`}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </aside>

              {/* Notas da pasta */}
              <section>
                {visibleNotes.length === 0 ? (
                  <div className={`flex flex-col items-center rounded-2xl border py-16 text-center ${panel}`}>
                    <FileText size={32} className="mb-3 text-zinc-500 opacity-60" />
                    <p className={`text-sm font-semibold ${titleColor}`}>
                      {term ? "Nenhuma nota encontrada" : "Nenhuma nota nesta pasta"}
                    </p>
                    <p className={`mt-1 text-xs ${subtitleColor}`}>Crie um registro livre para ideias e rascunhos.</p>
                    <button onClick={openNewNote} className={`${ui.btnPrimaryMd} mt-4`}>
                      <Plus size={15} />
                      Criar nota
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {visibleNotes.map((n) => {
                      const folder = notebook.folders.find((f) => f.id === n.folderId);
                      return (
                        <button
                          key={n.id}
                          onClick={() => openNote(n)}
                          className={`flex h-44 flex-col rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 ${panel}`}
                        >
                          <p className={`truncate text-sm font-bold ${titleColor}`}>{n.title || "Sem título"}</p>
                          <p className={`mt-2 line-clamp-4 flex-1 text-xs leading-5 ${subtitleColor}`}>
                            {previewOf(n) || "Nota vazia"}
                          </p>
                          <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
                            <span className="flex items-center gap-1">
                              <FolderIcon size={11} />
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
              <section className={`rounded-2xl border p-4 ${panel}`}>
                <h2 className="mb-2 px-3 pt-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
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
            <div className={`flex flex-col items-center rounded-2xl border py-16 text-center ${panel}`}>
              <Calendar size={32} className="mb-3 text-zinc-500 opacity-60" />
              <p className={`text-sm font-semibold ${titleColor}`}>Nenhum lembrete agendado</p>
              <p className={`mt-1 text-xs ${subtitleColor}`}>Adicione prazos para gerenciar suas entregas.</p>
              <button onClick={() => onOpenTaskModal(undefined, "reminder")} className={`${ui.btnPrimaryMd} mt-4`}>
                <Plus size={15} />
                Criar lembrete
              </button>
            </div>
          ) : (
            <section className={`rounded-2xl border p-4 ${panel}`}>
              {reminders.map(({ task, key }) => (
                <TaskRow key={task.id} task={task} dateKey={key} {...rowProps} />
              ))}
            </section>
          )
        ) : (
          groups.length === 0 ? (
            <div className={`flex flex-col items-center rounded-2xl border py-20 text-center ${panel}`}>
              <CheckCircle2 size={36} className="mb-3 text-emerald-400" />
              <p className={`text-sm font-semibold ${titleColor}`}>
                {search ? "Nenhum resultado encontrado" : "Tudo limpo por aqui!"}
              </p>
              <p className={`mt-1 text-xs ${subtitleColor}`}>
                {search ? "Tente buscar por outro termo." : "Crie uma anotação ou lembrete para começar."}
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.label} className={`rounded-2xl border p-4 ${panel}`}>
                <h2
                  className={`mb-2 flex items-center justify-between px-3 pt-1 text-[11px] font-bold uppercase tracking-wider ${
                    group.danger ? "text-red-400" : "text-zinc-400"
                  }`}
                >
                  <span>{group.label}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${dark ? "bg-white/6" : "bg-zinc-100"}`}>
                    {group.list.length}
                  </span>
                </h2>

                <div className="space-y-1">
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