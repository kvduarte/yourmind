"use client";

import React, { useState } from "react";
import { ListChecks, Plus, Trash2 } from "lucide-react";

import { Theme } from "@/types";
import {
  PLAN_PRIORITIES,
  PLAN_STATUSES,
  PlanChecklistItem,
  PlanItem,
  PlanItemPatch,
  PlanPriority,
  PlanStatus,
  formatDateTime,
  uid,
} from "@/lib/planning";
import { getUi } from "@/lib/ui";

import ModalShell from "../modals/ModalShell";
import { ColorSwatches } from "./PlanningParts";

interface PlanningItemModalProps {
  theme: Theme;
  /** sempre a versão mais atual do item (o histórico atualiza ao vivo) */
  item: PlanItem;
  onClose: () => void;
  onSave: (patch: PlanItemPatch) => void;
  onAddNote: (text: string) => void;
}

const LABEL = "mb-1.5 block text-[10px] font-bold uppercase tracking-wider";

const KIND_DOT: Record<PlanItem["history"][number]["kind"], string> = {
  created: "#6366f1",
  edited: "#71717a",
  status: "#3b82f6",
  priority: "#f97316",
  dates: "#a855f7",
  checklist: "#14b8a6",
  subitem: "#71717a",
  completed: "#10b981",
  reopened: "#f59e0b",
  archived: "#a1a1aa",
  moved: "#71717a",
  note: "#eab308",
};

export default function PlanningItemModal({
  theme,
  item,
  onClose,
  onSave,
  onAddNote,
}: PlanningItemModalProps) {
  const dark = theme === "dark";
  const ui = getUi(dark);

  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [status, setStatus] = useState<PlanStatus>(item.status);
  const [priority, setPriority] = useState<PlanPriority>(item.priority);
  const [color, setColor] = useState(item.color);
  const [startDate, setStartDate] = useState(item.startDate);
  const [dueDate, setDueDate] = useState(item.dueDate);
  const [checklist, setChecklist] = useState<PlanChecklistItem[]>(item.checklist);

  const [newCheck, setNewCheck] = useState("");
  const [newNote, setNewNote] = useState("");

  const fieldBase = `w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none transition-colors ${ui.field}`;

  const addCheck = () => {
    const text = newCheck.trim();

    if (!text) return;

    setChecklist((current) => [...current, { id: uid(), text, done: false }]);
    setNewCheck("");
  };

  const addNote = () => {
    if (!newNote.trim()) return;

    onAddNote(newNote);
    setNewNote("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    onSave({
      title: title.trim() || item.title,
      description,
      status,
      priority,
      color,
      startDate,
      dueDate,
      checklist,
    });

    onClose();
  };

  const done = checklist.filter((entry) => entry.done).length;
  const history = [...item.history].reverse();

  return (
    <ModalShell
      theme={theme}
      title="Atividade"
      description="Edite os detalhes. Cada alteração fica registrada no histórico."
      icon={<ListChecks size={16} />}
      size="lg"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <button type="button" onClick={onClose} className={ui.btnGhost}>
            Cancelar
          </button>
          <button type="submit" disabled={!title.trim()} className={ui.btnPrimaryMd}>
            Salvar
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className={`${LABEL} ${ui.subtitle}`}>Título</label>

          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nome da funcionalidade ou atividade"
            className={fieldBase}
          />
        </div>

        <div>
          <label className={`${LABEL} ${ui.subtitle}`}>
            Descrição <span className="font-medium normal-case opacity-60">(aparece abaixo do título na lista)</span>
          </label>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="O que precisa ser feito? Links, arquivos modificados, detalhes..."
            className={`${fieldBase} resize-none`}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={`${LABEL} ${ui.subtitle}`}>Status</label>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PlanStatus)}
              className={fieldBase}
            >
              {PLAN_STATUSES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`${LABEL} ${ui.subtitle}`}>Prioridade</label>

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as PlanPriority)}
              className={fieldBase}
            >
              {PLAN_PRIORITIES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={`${LABEL} ${ui.subtitle}`}>Cor da bolinha</label>

          <ColorSwatches value={color} onChange={setColor} dark={dark} size={22} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={`${LABEL} ${ui.subtitle}`}>Início</label>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={fieldBase}
            />
          </div>

          <div>
            <label className={`${LABEL} ${ui.subtitle}`}>Prazo</label>

            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={fieldBase}
            />
          </div>

          <div>
            <label className={`${LABEL} ${ui.subtitle}`}>Conclusão</label>

            <div className={`${fieldBase} flex items-center ${ui.subtitle}`}>
              {status === "done" && item.completedAt
                ? formatDateTime(item.completedAt)
                : "Automática ao concluir"}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className={`${LABEL} ${ui.subtitle} mb-0`}>Checklist</label>

            {checklist.length > 0 && (
              <span className={`text-[11px] font-semibold ${ui.subtitle}`}>
                {done}/{checklist.length}
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            {checklist.map((entry) => (
              <div key={entry.id} className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={entry.done}
                  onChange={() =>
                    setChecklist((current) =>
                      current.map((row) => (row.id === entry.id ? { ...row, done: !row.done } : row))
                    )
                  }
                  aria-label="Concluído"
                  className="h-4 w-4 shrink-0 cursor-pointer"
                  style={{ accentColor: "var(--accent)" }}
                />

                <input
                  value={entry.text}
                  onChange={(e) =>
                    setChecklist((current) =>
                      current.map((row) => (row.id === entry.id ? { ...row, text: e.target.value } : row))
                    )
                  }
                  className={`min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-xs outline-none ${
                    entry.done ? "text-zinc-500 line-through" : ui.title
                  } ${dark ? "focus:border-white/15" : "focus:border-zinc-300"}`}
                />

                <button
                  type="button"
                  onClick={() => setChecklist((current) => current.filter((row) => row.id !== entry.id))}
                  aria-label="Remover item"
                  className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-2 flex gap-2">
            <input
              value={newCheck}
              onChange={(e) => setNewCheck(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCheck();
                }
              }}
              placeholder="Adicionar item ao checklist (Enter)"
              className={fieldBase}
            />

            <button type="button" onClick={addCheck} aria-label="Adicionar item" className={ui.btnGhost}>
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div>
          <label className={`${LABEL} ${ui.subtitle}`}>Histórico</label>

          <div className="mb-3 flex gap-2">
            <input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addNote();
                }
              }}
              placeholder="Registrar o que foi feito (Enter)"
              className={fieldBase}
            />

            <button type="button" onClick={addNote} disabled={!newNote.trim()} className={ui.btnGhost}>
              Registrar
            </button>
          </div>

          <ol className={`space-y-3 border-l pl-4 ${ui.divider}`}>
            {history.map((entry) => (
              <li key={entry.id} className="relative">
                <span
                  className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2"
                  style={{
                    backgroundColor: KIND_DOT[entry.kind],
                    borderColor: dark ? "#18181b" : "#ffffff",
                  }}
                />

                <p className={`text-xs font-medium leading-relaxed ${ui.text}`}>
                  {entry.manual && (
                    <span className="mr-1.5 rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">
                      Observação
                    </span>
                  )}
                  {entry.text}
                </p>

                <span className={`text-[10px] font-medium ${ui.subtitle}`}>{formatDateTime(entry.at)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </ModalShell>
  );
}