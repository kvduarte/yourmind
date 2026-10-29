"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  X, Heading1, Heading2, List, ListOrdered, CheckSquare, Trash2, Save, Folder as FolderIcon,
} from "lucide-react";

import { Folder, Note } from "@/lib/notes";
import { DEFAULT_ACCENT } from "@/lib/theme";
import ConfirmModal from "./ConfirmModal";

interface Props {
  note: Note | null; // null = nota nova
  folders: Folder[];
  defaultFolderId: string;
  dark: boolean;
  accentColor?: string;
  onSave: (data: Partial<Note> & { folderId: string }) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const SIZES: Record<Note["fontSize"], { label: string; cls: string }> = {
  sm: { label: "P", cls: "text-sm leading-6" },
  md: { label: "M", cls: "text-base leading-7" },
  lg: { label: "G", cls: "text-lg leading-8" },
  xl: { label: "GG", cls: "text-2xl leading-10" },
};

export default function NoteEditorModal({
  note, folders, defaultFolderId, dark, accentColor = DEFAULT_ACCENT, onSave, onDelete, onClose,
}: Props) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [folderId, setFolderId] = useState(note?.folderId ?? defaultFolderId);
  const [fontSize, setFontSize] = useState<Note["fontSize"]>(note?.fontSize ?? "md");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const save = () => {
    if (!title.trim() && !content.trim()) return onClose();
    onSave({ id: note?.id, title: title.trim(), content, folderId, fontSize });
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirmDelete) onClose();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Insere prefixo no início das linhas selecionadas
  const applyPrefix = (prefix: string | ((i: number) => string)) => {
    const el = areaRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const lineStart = content.lastIndexOf("\n", s - 1) + 1;
    const nextBreak = content.indexOf("\n", e);
    const lineEnd = nextBreak === -1 ? content.length : nextBreak;
    const block = content.slice(lineStart, lineEnd);
    const updated = block
      .split("\n")
      .map((line, i) => (typeof prefix === "function" ? prefix(i) : prefix) + line)
      .join("\n");
    const next = content.slice(0, lineStart) + updated + content.slice(lineEnd);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(lineStart, lineStart + updated.length);
    });
  };

  // Enter continua a lista automaticamente (•, 1., ☐)
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    const el = e.currentTarget;
    const pos = el.selectionStart;
    const lineStart = content.lastIndexOf("\n", pos - 1) + 1;
    const line = content.slice(lineStart, pos);

    const m = line.match(/^(\s*)(• |☐ |☑ |(\d+)\. )/);
    if (!m) return;

    e.preventDefault();
    const [, indent, marker, num] = m;

    // Linha só com o marcador: sai da lista
    if (line.trim() === marker.trim()) {
      const next = content.slice(0, lineStart) + content.slice(pos);
      setContent(next);
      requestAnimationFrame(() => el.setSelectionRange(lineStart, lineStart));
      return;
    }

    const nextMarker = num ? `${Number(num) + 1}. ` : marker === "☑ " ? "☐ " : marker;
    const insert = "\n" + indent + nextMarker;
    const next = content.slice(0, pos) + insert + content.slice(pos);
    setContent(next);
    requestAnimationFrame(() => el.setSelectionRange(pos + insert.length, pos + insert.length));
  };

  const toolBtn = `inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
    dark ? "text-zinc-300 hover:bg-white/8" : "text-zinc-600 hover:bg-zinc-200/70"
  }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border shadow-2xl ${
          dark ? "border-white/10 bg-zinc-950 text-zinc-100" : "border-zinc-200 bg-white text-zinc-900"
        }`}
      >
        {/* Topo */}
        <div className={`flex items-center justify-between gap-3 border-b px-5 py-3 ${dark ? "border-white/8" : "border-zinc-200"}`}>
          <div className="flex items-center gap-2">
            <FolderIcon size={15} className="text-zinc-400" />
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold outline-none ${
                dark ? "border-white/10 bg-zinc-900 text-zinc-200" : "border-zinc-200 bg-white text-zinc-800"
              }`}
            >
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {note && onDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-red-400 hover:bg-red-500/10"
              >
                <Trash2 size={15} /> Excluir
              </button>
            )}
            <button
              onClick={save}
              className="inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-semibold text-white"
              style={{ backgroundColor: accentColor }}
            >
              <Save size={15} /> Salvar
            </button>
            <button onClick={onClose} className={toolBtn} aria-label="Fechar">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Barra de formatação */}
        <div className={`flex flex-wrap items-center gap-1 border-b px-4 py-2 ${dark ? "border-white/8 bg-zinc-900/40" : "border-zinc-200 bg-zinc-50"}`}>
          <button className={toolBtn} title="Título grande" onClick={() => applyPrefix("# ")}><Heading1 size={17} /></button>
          <button className={toolBtn} title="Subtítulo" onClick={() => applyPrefix("## ")}><Heading2 size={17} /></button>
          <span className={`mx-1 h-5 w-px ${dark ? "bg-white/10" : "bg-zinc-300"}`} />
          <button className={toolBtn} title="Marcadores" onClick={() => applyPrefix("• ")}><List size={17} /></button>
          <button className={toolBtn} title="Lista numerada" onClick={() => applyPrefix((i) => `${i + 1}. `)}><ListOrdered size={17} /></button>
          <button className={toolBtn} title="Checklist" onClick={() => applyPrefix("☐ ")}><CheckSquare size={17} /></button>

          <div className="ml-auto flex items-center gap-1">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Letra</span>
            {(Object.keys(SIZES) as Note["fontSize"][]).map((k) => (
              <button
                key={k}
                onClick={() => setFontSize(k)}
                className={`h-8 min-w-8 rounded-lg px-2 text-xs font-bold transition-colors ${
                  fontSize === k
                    ? "text-white"
                    : dark ? "text-zinc-400 hover:bg-white/8" : "text-zinc-600 hover:bg-zinc-200/70"
                }`}
                style={fontSize === k ? { backgroundColor: accentColor } : undefined}
              >
                {SIZES[k].label}
              </button>
            ))}
          </div>
        </div>

        {/* Escrita */}
        <div className="thin-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6 sm:px-12">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título"
            className={`mb-4 w-full bg-transparent text-3xl font-bold outline-none sm:text-4xl ${
              dark ? "placeholder:text-zinc-700" : "placeholder:text-zinc-300"
            }`}
          />
          <textarea
            ref={areaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Comece a escrever..."
            className={`min-h-[50vh] w-full flex-1 resize-none bg-transparent outline-none ${SIZES[fontSize].cls} ${
              dark ? "placeholder:text-zinc-700" : "placeholder:text-zinc-300"
            }`}
          />
        </div>
      </div>

      {/* Pop-up de confirmação de exclusão */}
      {confirmDelete && note && onDelete && (
        <ConfirmModal
          danger
          dark={dark}
          accentColor={accentColor}
          title="Excluir nota?"
          message={`A nota "${note.title || "Sem título"}" será excluída permanentemente. Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            onDelete(note.id);
            setConfirmDelete(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}