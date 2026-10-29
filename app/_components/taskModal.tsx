"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  X,
  CalendarDays,
  GitFork,
  ImagePlus,
  StickyNote,
  Trash2,
  Link2,
} from "lucide-react";

import { Task, Theme, Topic } from "@/types";
import { normalizeImageUrl, normalizeUrl } from "@/lib/link";
import { PRIMARY_BTN, useAccent } from "@/lib/theme";

interface TaskModalProps {
  topics: Topic[];
  onClose: () => void;
  /** Modo criar */
  onCreateTask?: (task: Task) => void;
  theme: Theme;
  defaultDate?: string;
  /** "note" = anotação livre (sem data); "reminder" = lembrete com data */
  mode?: "note" | "reminder";
  /** Modo editar: passe a anotação existente + onSave */
  task?: Task;
  onSave?: (task: Task) => void;
  onDelete?: () => void;
}

/** Aceita "YYYY-MM-DD" (ou ISO) e ignora formatos antigos. */
function safeDate(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : "";
}

/** Data local no formato YYYY-MM-DD (sem o erro de fuso do toISOString). */
function toKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function addDays(days: number) {
  const date = new Date();

  date.setDate(date.getDate() + days);

  return toKey(date);
}

export default function TaskModal({
  topics,
  onClose,
  onCreateTask,
  theme,
  defaultDate,
  mode = "reminder",
  task,
  onSave,
  onDelete,
}: TaskModalProps) {
  const dark = theme === "dark";
  const accent = useAccent();
  const editing = !!task;

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [topicId, setTopicId] = useState(
    task ? (task.topicId ?? "") : mode === "note" ? "" : topics[0]?.id || ""
  );
  const [dueDate, setDueDate] = useState(
    task
      ? safeDate(task.dueDate)
      : mode === "note"
        ? ""
        : defaultDate || toKey(new Date())
  );
  const [imageUrl, setImageUrl] = useState(task?.image || task?.imageUrl || "");
  const [link, setLink] = useState(task?.link ?? "");
  const [linkInput, setLinkInput] = useState("");
  const [imageError, setImageError] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const canSubmit = title.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;

    if (editing && task) {
      onSave?.({
        ...task,
        title: title.trim(),
        description: description.trim(),
        topicId,
        dueDate,
        image: imageUrl,
        imageUrl,
        link: normalizeUrl(link) || undefined,
      });

      onClose();

      return;
    }

    onCreateTask?.({
      id: `task-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      topicId,
      createdAt: toKey(new Date()),
      dueDate,
      imageUrl,
      link: normalizeUrl(link) || undefined,
      completed: false,
    });

    onClose();
  };

  // ESC fecha | CTRL+ENTER salva
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();

      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        submit();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setImageError(false);
      setImageUrl(String(reader.result));
    };

    reader.readAsDataURL(file);
  };

  const applyLink = () => {
    const url = normalizeImageUrl(linkInput);

    if (!url) return;

    setImageError(false);
    setImageUrl(url);
    setLinkInput("");
  };

  // Ctrl+V com uma imagem copiada também funciona
  const handlePaste = (e: React.ClipboardEvent) => {
    const file = Array.from(e.clipboardData.files).find((f) =>
      f.type.startsWith("image/")
    );

    if (!file) return;

    e.preventDefault();

    const reader = new FileReader();

    reader.onload = () => {
      setImageError(false);
      setImageUrl(String(reader.result));
    };

    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageUrl("");
    setImageError(false);
  };

  const ui = {
    card: dark
      ? "border-white/10 bg-zinc-900"
      : "border-zinc-200 bg-white",
    title: dark ? "text-zinc-100" : "text-zinc-900",
    muted: dark ? "text-zinc-500" : "text-zinc-500",
    divider: dark ? "border-white/10" : "border-zinc-200/60",
    hover: dark ? "hover:bg-white/[0.06]" : "hover:bg-zinc-100",
    field: dark
      ? "border-white/10 bg-white/[0.03] text-zinc-100 placeholder:text-zinc-500 focus:border-white/25"
      : "border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400",
    primary: PRIMARY_BTN,
  };

  const quickDates = [
    { label: "Hoje", value: addDays(0) },
    { label: "Amanhã", value: addDays(1) },
    { label: "Em 1 semana", value: addDays(7) },
    { label: "Sem data", value: "" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onPaste={handlePaste}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${ui.card}`}
      >
        {/* Cabeçalho */}
        <div
          className={`flex items-center justify-between border-b px-7 py-5 ${ui.divider}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                dark ? "bg-white/[0.06]" : "bg-zinc-100"
              }`}
            >
              <StickyNote size={18} className={ui.muted} />
            </div>

            <div>
              <h2 className={`text-base font-semibold ${ui.title}`}>
                {editing ? "Editar anotação" : mode === "note" ? "Nova nota" : "Novo lembrete"}
              </h2>

              <p className={`text-xs ${ui.muted}`}>
                {editing
                  ? "Ajuste título, data, link e o que mais precisar."
                  : mode === "note"
                    ? "Ideias e registros livres, sem data."
                    : "Provas, entregas e prazos com data."}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`rounded-xl p-2 transition-colors ${ui.muted} ${ui.hover}`}
            title="Fechar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo */}
        <div className="thin-scroll grid flex-1 grid-cols-1 gap-8 overflow-y-auto px-7 py-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          {/* Coluna principal */}
          <div className="space-y-5">
            <div>
              <label className={`mb-2 block text-xs font-medium ${ui.muted}`}>
                Título
              </label>

              <input
                autoFocus
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Prova de Algoritmos"
                className={`w-full rounded-xl border px-4 py-3 text-base font-medium outline-none transition-colors ${ui.field}`}
              />
            </div>

            <div>
              <label className={`mb-2 block text-xs font-medium ${ui.muted}`}>
                Descrição
              </label>

              <textarea
                rows={9}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes, conteúdo que cai, links, o que falta fazer..."
                className={`w-full resize-none rounded-xl border px-4 py-3 text-sm leading-relaxed outline-none transition-colors ${ui.field}`}
              />
            </div>
          </div>

          {/* Coluna lateral */}
          <div className="space-y-5">
            <div>
              <label className={`mb-2 block text-xs font-medium ${ui.muted}`}>
                {mode === "note" && !editing ? "Data (opcional)" : "Data limite"}
              </label>

              <div className="relative">
                <CalendarDays
                  size={15}
                  className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${ui.muted}`}
                />

                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={`w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none transition-colors ${ui.field}`}
                />
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {quickDates.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setDueDate(item.value)}
                    style={dueDate === item.value ? { backgroundColor: accent } : undefined}
                    className={`rounded-lg border px-3 py-1 text-[11px] font-medium transition-colors ${
                      dueDate === item.value
                        ? "border-transparent text-white"
                        : `${ui.divider} ${ui.muted} ${ui.hover}`
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={`mb-2 block text-xs font-medium ${ui.muted}`}>
                Fluxograma
              </label>

              <div className="relative">
                <GitFork
                  size={15}
                  className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${ui.muted}`}
                />

                <select
                  value={topicId}
                  onChange={(e) => setTopicId(e.target.value)}
                  className={`w-full appearance-none rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none transition-colors ${ui.field}`}
                >
                  <option value="">Nenhum</option>

                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={`mb-2 block text-xs font-medium ${ui.muted}`}>
                Link <span className="opacity-60">(vídeo, site, doc...)</span>
              </label>

              <div className="relative">
                <Link2
                  size={15}
                  className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${ui.muted}`}
                />

                <input
                  type="text"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="youtube.com/watch?v=..."
                  className={`w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none transition-colors ${ui.field}`}
                />
              </div>
            </div>

            <div>
              <label className={`mb-2 block text-xs font-medium ${ui.muted}`}>
                Imagem <span className="opacity-60">(opcional)</span>
              </label>

              {imageUrl ? (
                <div className="group relative overflow-hidden rounded-xl border border-white/[0.08]">
                  {imageError ? (
                    <div className="flex h-36 items-center justify-center px-4 text-center text-xs text-red-400">
                      Não carregou. Clique com o botão direito na imagem, escolha “Copiar endereço da imagem” e cole aqui (ou use Ctrl+V ou Enviar).
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt="Pré-visualização"
                      referrerPolicy="no-referrer"
                      onError={() => setImageError(true)}
                      className="h-36 w-full object-cover"
                    />
                  )}

                  <button
                    type="button"
                    onClick={removeImage}
                    className={`absolute right-2 top-2 flex items-center gap-1 rounded-xl bg-black/70 px-2 py-1 text-[11px] text-white transition-opacity ${
                      imageError ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <Trash2 size={12} />
                    Remover
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className={`flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-xs transition-colors ${ui.divider} ${ui.muted} ${ui.hover}`}
                >
                  <ImagePlus size={20} />
                  Enviar uma imagem
                </button>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
              />

              {!imageUrl && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="url"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        applyLink();
                      }
                    }}
                    placeholder="ou cole o link da imagem (Enter)"
                    className={`min-w-0 flex-1 rounded-xl border px-3 py-2 text-xs outline-none transition-colors ${ui.field}`}
                  />

                  <button
                    type="button"
                    onClick={applyLink}
                    disabled={!linkInput.trim()}
                    className={`rounded-xl px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${ui.primary}`}
                  >
                    Usar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div
          className={`flex items-center justify-between border-t px-7 py-4 ${ui.divider}`}
        >
          {editing && onDelete ? (
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
            >
              <Trash2 size={14} />
              Excluir
            </button>
          ) : (
            <p className={`hidden text-[11px] sm:block ${ui.muted}`}>
              Esc para fechar · Ctrl + Enter para {editing ? "salvar" : "criar"}
            </p>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl px-4 py-2.5 text-sm transition-colors ${ui.muted} ${ui.hover}`}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className={`rounded-xl px-6 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${ui.primary}`}
            >
              {editing ? "Salvar alterações" : "Criar anotação"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}