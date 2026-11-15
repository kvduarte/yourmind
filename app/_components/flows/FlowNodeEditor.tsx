"use client";

import React, { useRef, useState } from "react";
import {
  CalendarDays,
  Copy,
  History,
  Link2,
  ListChecks,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  Upload,
} from "lucide-react";

import { Node, NodeAttachment, NodePriority, NodeStatus, Theme } from "@/types";
import {
  MAX_ATTACHMENT_BYTES,
  NODE_CATEGORIES,
  NODE_COLORS,
  NODE_PRIORITIES,
  NODE_STATUSES,
  describeNodeChanges,
  formatBytes,
  formatDateTime,
  nodeLabel,
  nowIso,
  uid,
} from "@/lib/flow";
import { normalizeUrl } from "@/lib/link";
import { getUi } from "@/lib/ui";

import ModalShell from "../modals/ModalShell";

interface FlowNodeEditorProps {
  node: Node;
  theme: Theme;
  onSave: (node: Node) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onClose: () => void;
  /** aba que abre primeiro */
  initialTab?: Tab;
}

export type Tab = "general" | "checklist" | "comments" | "attachments" | "history";

const LABEL = "mb-1.5 block text-[10px] font-bold uppercase tracking-wider";

export default function FlowNodeEditor({
  node,
  theme,
  onSave,
  onDelete,
  onDuplicate,
  onClose,
  initialTab = "general",
}: FlowNodeEditorProps) {
  const dark = theme === "dark";
  const ui = getUi(dark);

  const [draft, setDraft] = useState<Node>(node);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [newCheck, setNewCheck] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newNote, setNewNote] = useState("");
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [fileError, setFileError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Node>(key: K, value: Node[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const isImage = node.type === "image";
  const textKey = isImage ? "imageDescription" : "description";
  const hasStatus = node.type !== "image";

  const checklist = draft.checklist ?? [];
  const comments = draft.comments ?? [];
  const attachments = draft.attachments ?? [];
  const history = [...(draft.history ?? [])].reverse();
  const done = checklist.filter((i) => i.completed).length;
  const percent = checklist.length ? Math.round((done / checklist.length) * 100) : 0;

  const fieldBase = `w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none transition-colors ${ui.field}`;

  const dateOrderWrong = !!draft.startDate && !!draft.dueDate && draft.dueDate < draft.startDate;

  const addCheck = () => {
    const text = newCheck.trim();

    if (!text) return;

    set("checklist", [...checklist, { id: uid("ck"), text, completed: false }]);
    setNewCheck("");
  };

  const addComment = () => {
    const text = newComment.trim();

    if (!text) return;

    set("comments", [...comments, { id: uid("cm"), text, at: nowIso() }]);
    setNewComment("");
  };

  const addNote = () => {
    const text = newNote.trim();

    if (!text) return;

    set("history", [...(draft.history ?? []), { id: uid("h"), at: nowIso(), text, manual: true }]);
    setNewNote("");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    e.target.value = "";

    if (!file) return;

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setFileError(
        `Arquivo grande demais (${formatBytes(file.size)}). O limite é ${formatBytes(
          MAX_ATTACHMENT_BYTES
        )}, pois os dados são salvos localmente no navegador. Utilize um link externo para arquivos maiores.`
      );

      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const item: NodeAttachment = {
        id: uid("at"),
        name: file.name,
        kind: "file",
        url: String(reader.result),
        size: file.size,
        mime: file.type,
        at: nowIso(),
      };

      setFileError("");
      setDraft((current) => ({ ...current, attachments: [...(current.attachments ?? []), item] }));
    };

    reader.onerror = () => setFileError("Não foi possível ler este arquivo.");
    reader.readAsDataURL(file);
  };

  const addLink = () => {
    const url = normalizeUrl(linkUrl);

    if (!url) {
      setFileError("Insira um link válido (ex.: https://...).");

      return;
    }

    const item: NodeAttachment = {
      id: uid("at"),
      name: linkName.trim() || url.replace(/^https?:\/\//, ""),
      kind: "link",
      url,
      at: nowIso(),
    };

    setFileError("");
    set("attachments", [...attachments, item]);
    setLinkName("");
    setLinkUrl("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    const clean: Node = { ...draft, title: draft.title.trim() };
    const entries = describeNodeChanges(node, clean);

    onSave({ ...clean, history: [...(clean.history ?? []), ...entries].slice(-100) });
    onClose();
  };

  const enterToRun = (action: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      action();
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "general", label: "Geral", icon: <Pencil size={13} /> },
    { id: "checklist", label: "Checklist", icon: <ListChecks size={13} />, count: checklist.length },
    { id: "comments", label: "Comentários", icon: <StickyNote size={13} />, count: comments.length },
    { id: "attachments", label: "Anexos", icon: <Link2 size={13} />, count: attachments.length },
    { id: "history", label: "Histórico", icon: <History size={13} />, count: history.length },
  ];

  return (
    <ModalShell
      theme={theme}
      title={`Editar bloco · ${nodeLabel(draft)}`}
      description="Personalize os metadados, subtarefas e acompanhe a trilha de auditoria deste nó."
      icon={<Pencil size={16} />}
      size="xl"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <div className="mr-auto flex gap-2">
            {onDuplicate && (
              <button
                type="button"
                onClick={() => {
                  onDuplicate();
                  onClose();
                }}
                className={`${ui.btnGhost} inline-flex items-center gap-1.5`}
              >
                <Copy size={13} />
                Duplicar
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className={ui.btnDanger}
              >
                <Trash2 size={14} />
                Excluir
              </button>
            )}
          </div>

          <button type="button" onClick={onClose} className={ui.btnGhost}>
            Cancelar
          </button>

          <button type="submit" className={ui.btnPrimaryMd}>
            Salvar alterações
          </button>
        </>
      }
    >
      {/* ABAS REFINADAS */}
      <div className={`mb-6 flex flex-wrap gap-1.5 border-b pb-3.5 ${ui.divider}`}>
        {tabs.map((item) => {
          const active = tab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all shadow-2xs ${
                active ? "text-white shadow-xs" : `${ui.subtitle} ${ui.hover}`
              }`}
              style={active ? { backgroundColor: "var(--accent)" } : undefined}
            >
              {item.icon}
              {item.label}
              {item.count ? (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    active ? "bg-white/25 text-white" : dark ? "bg-white/10 text-zinc-300" : "bg-zinc-200 text-zinc-700"
                  }`}
                >
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* GERAL */}
      {tab === "general" && (
        <div className="space-y-5">
          <div>
            <label className={`${LABEL} ${ui.subtitle}`}>Título do Bloco</label>
            <input
              autoFocus
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Ex: Arquitetura de microsserviços"
              className={`${fieldBase} text-sm font-semibold`}
            />
          </div>

          <div>
            <label className={`${LABEL} ${ui.subtitle}`}>{isImage ? "Legenda" : "Descrição Detalhada"}</label>
            <textarea
              rows={4}
              value={draft[textKey] ?? ""}
              onChange={(e) => set(textKey, e.target.value)}
              placeholder="Descreva o escopo, objetivos ou notas técnicas..."
              className={`${fieldBase} resize-none leading-relaxed`}
            />
          </div>

          {hasStatus && (
            <div>
              <label className={`${LABEL} ${ui.subtitle}`}>Status Operacional</label>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {NODE_STATUSES.map((item) => {
                  const active = (draft.status ?? "todo") === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => set("status", item.id as NodeStatus)}
                      title={item.hint}
                      className="flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold transition-all hover:scale-[1.01]"
                      style={{
                        borderColor: active ? item.color : dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                        backgroundColor: active ? `${item.color}22` : dark ? "rgba(255,255,255,0.02)" : "#fafafa",
                        color: active ? item.color : undefined,
                      }}
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full shadow-xs" style={{ backgroundColor: item.color }} />
                      <span className={active ? "font-bold" : ui.text}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className={`${LABEL} ${ui.subtitle}`}>Nível de Prioridade</label>
              <div className="flex flex-wrap gap-2">
                {NODE_PRIORITIES.map((item) => {
                  const active = draft.priority === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => set("priority", active ? undefined : (item.id as NodePriority))}
                      className="flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all"
                      style={{
                        borderColor: active ? item.color : dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                        backgroundColor: active ? `${item.color}22` : dark ? "rgba(255,255,255,0.02)" : "#fafafa",
                        color: active ? item.color : undefined,
                      }}
                    >
                      <span className="h-2 w-2 rounded-full shadow-xs" style={{ backgroundColor: item.color }} />
                      <span className={active ? "font-bold" : ui.text}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className={`mt-1.5 text-[10px] ${ui.subtitle}`}>Clique novamente para remover a prioridade.</p>
            </div>

            <div>
              <label className={`${LABEL} ${ui.subtitle}`}>Categoria de Contexto</label>
              <div className="flex flex-wrap gap-2">
                {NODE_CATEGORIES.map((item) => {
                  const active = draft.category === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => set("category", active ? undefined : item.id)}
                      className="rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition-all"
                      style={{
                        borderColor: active ? item.color : dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                        backgroundColor: active ? `${item.color}22` : dark ? "rgba(255,255,255,0.02)" : "#fafafa",
                        color: active ? item.color : undefined,
                      }}
                    >
                      <span className={active ? "font-bold" : ui.text}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <label className={`${LABEL} ${ui.subtitle}`}>Paleta Visual do Nó</label>
            <div className="flex flex-wrap gap-2.5">
              {NODE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => set("color", color)}
                  aria-label={`Cor ${color}`}
                  aria-pressed={draft.color === color}
                  className={`h-7 w-7 rounded-full transition-all shadow-xs ${
                    draft.color === color
                      ? `scale-110 ring-2 ring-offset-2 ${
                          dark ? "ring-white/80 ring-offset-zinc-900" : "ring-zinc-900/80 ring-offset-white"
                        }`
                      : "opacity-85 hover:opacity-100 hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
            <div>
              <label className={`${LABEL} ${ui.subtitle}`}>Início Previsto</label>
              <div className="relative">
                <CalendarDays size={14} className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${ui.muted}`} />
                <input
                  type="date"
                  value={draft.startDate ?? ""}
                  onChange={(e) => set("startDate", e.target.value || undefined)}
                  className={`${fieldBase} pl-10`}
                />
              </div>
            </div>

            <div>
              <label className={`${LABEL} ${ui.subtitle}`}>Prazo de Conclusão</label>
              <div className="relative">
                <CalendarDays size={14} className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${ui.muted}`} />
                <input
                  type="date"
                  value={draft.dueDate ?? ""}
                  onChange={(e) => set("dueDate", e.target.value || undefined)}
                  className={`${fieldBase} pl-10`}
                />
              </div>
            </div>
          </div>

          {dateOrderWrong && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs font-medium text-amber-500">
              Aviso: A data limite está anterior à data de início estipulada.
            </p>
          )}
        </div>
      )}

      {/* CHECKLIST */}
      {tab === "checklist" && (
        <div className="space-y-4">
          <p className={`text-xs ${ui.subtitle}`}>
            Divida esta etapa em micro-tarefas acionáveis para visualização direta no fluxograma.
          </p>

          {checklist.length > 0 && (
            <div className="space-y-1.5 bg-zinc-500/5 p-3.5 rounded-xl border border-white/5">
              <div className={`flex justify-between text-[11px] font-bold ${ui.subtitle}`}>
                <span>Progresso concluído</span>
                <span>{done} de {checklist.length} ({percent}%)</span>
              </div>
              <div className={`h-2 overflow-hidden rounded-full ${dark ? "bg-white/10" : "bg-zinc-200"}`}>
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${percent}%`, backgroundColor: "var(--accent)" }} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            {checklist.map((item) => (
              <div key={item.id} className={`flex items-center gap-3 p-2 rounded-xl border transition-colors ${dark ? "border-white/5 bg-white/[0.02]" : "border-zinc-200/60 bg-white"}`}>
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() =>
                    set(
                      "checklist",
                      checklist.map((row) => (row.id === item.id ? { ...row, completed: !row.completed } : row))
                    )
                  }
                  aria-label="Concluído"
                  className="h-4 w-4 shrink-0 cursor-pointer rounded"
                  style={{ accentColor: "var(--accent)" }}
                />

                <input
                  value={item.text}
                  onChange={(e) =>
                    set(
                      "checklist",
                      checklist.map((row) => (row.id === item.id ? { ...row, text: e.target.value } : row))
                    )
                  }
                  onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                  className={`min-w-0 flex-1 bg-transparent px-1 py-1 text-xs font-medium outline-none ${
                    item.completed ? "text-zinc-500 line-through" : ui.title
                  }`}
                />

                <button
                  type="button"
                  onClick={() => set("checklist", checklist.filter((row) => row.id !== item.id))}
                  aria-label="Remover item"
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2.5 pt-2">
            <input
              value={newCheck}
              onChange={(e) => setNewCheck(e.target.value)}
              onKeyDown={enterToRun(addCheck)}
              placeholder="Adicionar novo passo (Pressione Enter)"
              className={fieldBase}
            />
            <button type="button" onClick={addCheck} aria-label="Adicionar passo" className={ui.btnPrimaryMd}>
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}

      {/* COMENTÁRIOS */}
      {tab === "comments" && (
        <div className="space-y-4">
          <p className={`text-xs ${ui.subtitle}`}>
            Deixe apontamentos, links e feedback contextual sobre o andamento deste bloco.
          </p>

          <div className="space-y-2">
            <textarea
              rows={2.5}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  addComment();
                }
              }}
              placeholder="Escreva um comentário... (Ctrl + Enter para enviar)"
              className={`${fieldBase} resize-none`}
            />
            <div className="flex justify-end">
              <button type="button" onClick={addComment} disabled={!newComment.trim()} className={ui.btnPrimaryMd}>
                Publicar Comentário
              </button>
            </div>
          </div>

          {comments.length === 0 ? (
            <p className={`rounded-2xl border border-dashed px-4 py-10 text-center text-xs ${ui.divider} ${ui.subtitle}`}>
              Nenhum comentário registrado até o momento.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {[...comments].reverse().map((comment) => (
                <li key={comment.id} className={`group rounded-xl border p-3.5 transition-colors ${ui.divider} ${dark ? "bg-white/[0.02]" : "bg-white"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className={`whitespace-pre-wrap text-xs leading-relaxed ${ui.text}`}>{comment.text}</p>
                    <button
                      type="button"
                      onClick={() => set("comments", comments.filter((c) => c.id !== comment.id))}
                      aria-label="Excluir comentário"
                      className="rounded-lg p-1 text-zinc-400 opacity-0 hover:text-red-400 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <span className={`mt-2 block text-[10px] font-medium ${ui.subtitle}`}>{formatDateTime(comment.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ANEXOS */}
      {tab === "attachments" && (
        <div className="space-y-4">
          <p className={`text-xs ${ui.subtitle}`}>
            Vincule arquivos locais (até {formatBytes(MAX_ATTACHMENT_BYTES)}) ou referências web.
          </p>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`${ui.btnGhost} inline-flex items-center gap-2`}
            >
              <Upload size={14} />
              Enviar Arquivo
            </button>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_1.4fr_auto]">
            <input
              value={linkName}
              onChange={(e) => setLinkName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              placeholder="Nome do link (opcional)"
              className={fieldBase}
            />
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={enterToRun(addLink)}
              placeholder="URL (ex: https://github.com/...)"
              className={fieldBase}
            />
            <button type="button" onClick={addLink} disabled={!linkUrl.trim()} className={ui.btnPrimaryMd}>
              Vincular Link
            </button>
          </div>

          {fileError && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-400 font-medium">{fileError}</p>
          )}

          {attachments.length === 0 ? (
            <p className={`rounded-2xl border border-dashed px-4 py-10 text-center text-xs ${ui.divider} ${ui.subtitle}`}>
              Nenhum anexo ou link vinculado.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {attachments.map((item) => (
                <li key={item.id} className={`flex items-center gap-3 rounded-xl border p-3.5 transition-colors ${ui.divider} ${dark ? "bg-white/[0.02]" : "bg-white"}`}>
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-2xs"
                    style={{ backgroundColor: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}
                  >
                    {item.kind === "link" ? <Link2 size={16} /> : <Upload size={16} />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={item.kind === "file" ? item.name : undefined}
                      className={`block truncate text-xs font-semibold hover:underline ${ui.title}`}
                    >
                      {item.name}
                    </a>
                    <span className={`text-[10px] font-medium ${ui.subtitle}`}>
                      {item.kind === "link" ? "Link Externo" : formatBytes(item.size)} · {formatDateTime(item.at)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => set("attachments", attachments.filter((a) => a.id !== item.id))}
                    aria-label="Remover anexo"
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* HISTÓRICO */}
      {tab === "history" && (
        <div className="space-y-4">
          <p className={`text-xs ${ui.subtitle}`}>
            Registro automático de alterações e notas manuais inseridas ao longo do ciclo de vida deste nó.
          </p>

          <div className="flex gap-2.5">
            <input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={enterToRun(addNote)}
              placeholder="Adicionar nota de log manual... (Enter)"
              className={fieldBase}
            />
            <button type="button" onClick={addNote} disabled={!newNote.trim()} className={ui.btnGhost}>
              Registrar Nota
            </button>
          </div>

          <ol className={`space-y-3.5 border-l-2 pl-4 ml-2 ${ui.divider}`}>
            {history.length === 0 && <li className={`text-xs ${ui.subtitle}`}>Nenhum evento registrado ainda.</li>}

            {history.map((entry) => (
              <li key={entry.id} className="relative">
                <span
                  className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 shadow-2xs"
                  style={{
                    backgroundColor: entry.manual ? "#eab308" : "var(--accent)",
                    borderColor: dark ? "#18181b" : "#ffffff",
                  }}
                />
                <p className={`text-xs font-medium leading-relaxed ${ui.text}`}>
                  {entry.manual && (
                    <span className="mr-2 rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">
                      Nota Manual
                    </span>
                  )}
                  {entry.text}
                </p>
                <span className={`text-[10px] font-medium ${ui.subtitle}`}>{formatDateTime(entry.at)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </ModalShell>
  );
}