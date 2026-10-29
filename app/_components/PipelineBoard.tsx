"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ExternalLink,
  CalendarDays,
  User,
  Wallet,
  Workflow,
  Link2,
  History,
} from "lucide-react";

import { Theme } from "@/types";
import {
  PALETTE,
  PRIORITIES,
  Pipeline,
  PipelineCard,
  Priority,
  createCard,
  getPriority,
  newId,
} from "@/lib/pipeline";
import { linkLabel, normalizeUrl } from "@/lib/link";
import { DEFAULT_ACCENT, PRIMARY_BTN, useAccent } from "@/lib/theme";
import { useConfirm } from "./ConfirmDialog";

interface PipelineBoardProps {
  pipeline: Pipeline;
  onChange: (pipeline: Pipeline) => void;
  onDelete: () => void;
  theme: Theme;
}

/* =========================================================
   HELPERS
========================================================= */

function todayKey() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${m}-${d}`;
}

function formatDay(key?: string) {
  if (!key) return "";

  const [y, m, d] = key.split("-").map(Number);

  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getUi(dark: boolean) {
  return {
    title: dark ? "text-zinc-100" : "text-zinc-900",
    text: dark ? "text-zinc-300" : "text-zinc-700",
    muted: "text-zinc-500",
    divider: dark ? "border-white/10" : "border-zinc-200/60",
    hover: dark ? "hover:bg-white/[0.06]" : "hover:bg-zinc-100",
    soft: dark ? "bg-white/[0.05]" : "bg-zinc-100",
    field: dark
      ? "border-white/10 bg-white/[0.03] text-zinc-100 placeholder:text-zinc-500 focus:border-white/25"
      : "border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400",
    primary: PRIMARY_BTN,
  };
}

/** Paleta + cor personalizada */
function ColorPicker({
  value,
  onPick,
  allowNone = false,
}: {
  value?: string;
  onPick: (color: string | undefined) => void;
  allowNone?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {allowNone && (
        <button
          type="button"
          onClick={() => onPick(undefined)}
          title="Usar a cor da etapa"
          className={`flex h-6 items-center rounded px-2 text-xs ${
            !value
              ? "bg-white/12 text-white"
              : "text-zinc-500 hover:bg-white/6"
          }`}
        >
          Auto
        </button>
      )}

      {PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onPick(color)}
          className={`h-6 w-6 rounded-full transition-transform ${
            value === color
              ? "scale-110 ring-2 ring-white/80 ring-offset-2 ring-offset-black"
              : "opacity-80 hover:scale-110 hover:opacity-100"
          }`}
          style={{ backgroundColor: color }}
        />
      ))}

      <label
        title="Cor personalizada"
        className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-dashed border-zinc-500"
        style={{
          background:
            "conic-gradient(#ef4444,#f59e0b,#10b981,#3b82f6,#a855f7,#ef4444)",
        }}
      >
        <input
          type="color"
          value={value ?? DEFAULT_ACCENT}
          onChange={(e) => onPick(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}

/* =========================================================
   EDITOR DE CARD (pop-up)
========================================================= */

function CardEditor({
  card,
  pipeline,
  dark,
  onSave,
  onDelete,
  onClose,
}: {
  card: PipelineCard;
  pipeline: Pipeline;
  dark: boolean;
  onSave: (card: PipelineCard) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const ui = getUi(dark);

  const [draft, setDraft] = useState<PipelineCard>(card);

  const set = <K extends keyof PipelineCard>(key: K, value: PipelineCard[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const canSave = draft.title.trim().length > 0;

  const save = () => {
    if (!canSave) return;

    onSave({
      ...draft,
      title: draft.title.trim(),
      who: draft.who?.trim() || undefined,
      value: draft.value?.trim() || undefined,
      description: draft.description?.trim() || undefined,
      dueDate: draft.dueDate || undefined,
      link: normalizeUrl(draft.link) || undefined,
    });

    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();

      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        save();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  });

  const stageColor =
    pipeline.stages.find((s) => s.id === draft.stageId)?.color ?? "#71717a";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${
          dark ? "border-white/10 bg-zinc-900" : "border-zinc-200 bg-white"
        }`}
      >
        <div
          className={`flex items-center justify-between border-b px-6 py-4 ${ui.divider}`}
          style={{ borderTop: `3px solid ${draft.color ?? stageColor}` }}
        >
          <div>
            <p className={`text-xs uppercase tracking-[0.16em] ${ui.muted}`}>
              {pipeline.name}
            </p>

            <h2 className={`mt-1 text-sm font-semibold ${ui.title}`}>Editar card</h2>
          </div>

          <button onClick={onClose} className={`rounded-xl p-2 ${ui.muted} ${ui.hover}`}>
            <X size={17} />
          </button>
        </div>

        <div className="thin-scroll grid flex-1 grid-cols-1 gap-8 overflow-y-auto px-6 py-5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div>
              <label className={`mb-1.5 block text-xs ${ui.muted}`}>Título</label>

              <input
                autoFocus
                value={draft.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Ex: Compradora Maria quer 20 caixas"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium outline-none ${ui.field}`}
              />
            </div>

            <div>
              <label className={`mb-1.5 block text-xs ${ui.muted}`}>Etiqueta</label>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PRIORITIES.map((item) => {
                  const active = draft.priority === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        set("priority", active ? undefined : (item.id as Priority))
                      }
                      className="flex h-9 items-center justify-center gap-2 rounded-xl border text-xs font-medium transition-colors"
                      style={{
                        borderColor: active ? item.color : "transparent",
                        backgroundColor: active ? `${item.color}22` : undefined,
                        color: active ? item.color : undefined,
                        ...(active
                          ? {}
                          : { backgroundColor: dark ? "rgba(255,255,255,0.04)" : "#f4f4f5" }),
                      }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className={active ? "" : ui.text}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`mb-1.5 block text-xs ${ui.muted}`}>Quem</label>

                <input
                  value={draft.who ?? ""}
                  onChange={(e) => set("who", e.target.value)}
                  placeholder="Cliente ou empresa"
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${ui.field}`}
                />
              </div>

              <div>
                <label className={`mb-1.5 block text-xs ${ui.muted}`}>Valor</label>

                <input
                  value={draft.value ?? ""}
                  onChange={(e) => set("value", e.target.value)}
                  placeholder="R$ 0,00"
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${ui.field}`}
                />
              </div>
            </div>

            <div>
              <label className={`mb-1.5 block text-xs ${ui.muted}`}>Descrição</label>

              <textarea
                rows={6}
                value={draft.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
                placeholder="O que combinaram, o que falta, observações..."
                className={`w-full resize-none rounded-xl border px-3.5 py-3 text-sm leading-relaxed outline-none ${ui.field}`}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className={`mb-1.5 block text-xs ${ui.muted}`}>Etapa</label>

              <select
                value={draft.stageId}
                onChange={(e) => set("stageId", e.target.value)}
                className={`w-full appearance-none rounded-xl border px-3 py-2.5 text-sm outline-none ${ui.field}`}
              >
                {pipeline.stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`mb-1.5 block text-xs ${ui.muted}`}>Prazo</label>

              <input
                type="date"
                value={draft.dueDate ?? ""}
                onChange={(e) => set("dueDate", e.target.value)}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${ui.field}`}
              />
            </div>

            <div>
              <label className={`mb-1.5 block text-xs ${ui.muted}`}>Link</label>

              <div className="relative">
                <Link2
                  size={14}
                  className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${ui.muted}`}
                />

                <input
                  value={draft.link ?? ""}
                  onChange={(e) => set("link", e.target.value)}
                  placeholder="site, vídeo, documento..."
                  className={`w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm outline-none ${ui.field}`}
                />
              </div>
            </div>

            <div>
              <label className={`mb-2 block text-xs ${ui.muted}`}>Cor do card</label>

              <ColorPicker value={draft.color} onPick={(c) => set("color", c)} allowNone />
            </div>

            <div>
              <p className={`mb-2 flex items-center gap-1.5 text-xs ${ui.muted}`}>
                <History size={12} />
                Histórico
              </p>

              <ol className={`space-y-2 rounded-xl border p-3 ${ui.divider}`}>
                {card.history.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs">
                    <span
                      className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          pipeline.stages.find((s) => s.id === item.stageId)?.color ??
                          "#71717a",
                      }}
                    />

                    <span className={ui.text}>
                      {index === 0 ? "Criado em" : "Foi para"}{" "}
                      <strong className="font-medium">{item.stageName}</strong>
                      <span className={`block ${ui.muted}`}>{formatDateTime(item.at)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <div className={`flex items-center justify-between border-t px-6 py-3.5 ${ui.divider}`}>
          <button
            type="button"
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
          >
            <Trash2 size={14} />
            Excluir
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl px-4 py-2 text-sm ${ui.muted} ${ui.hover}`}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className={`rounded-xl px-5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-30 ${ui.primary}`}
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   QUADRO
========================================================= */

export default function PipelineBoard({
  pipeline,
  onChange,
  onDelete,
  theme,
}: PipelineBoardProps) {
  const dark = theme === "dark";
  const ui = getUi(dark);
  useAccent(); // define --accent para os botões principais
  const confirm = useConfirm();

  const { stages, cards } = pipeline;
  const lastStageId = stages[stages.length - 1]?.id;
  const today = todayKey();

  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [overCard, setOverCard] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [colorStage, setColorStage] = useState<string | null>(null);
  const [filter, setFilter] = useState<Priority | "all">("all");

  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftWho, setDraftWho] = useState("");

  const editingCard = cards.find((card) => card.id === editingId) ?? null;

  /* ---------- operações ---------- */

  const patch = (changes: Partial<Pipeline>) => onChange({ ...pipeline, ...changes });

  const moveCard = (cardId: string, toStageId: string, beforeId?: string) => {
    const card = cards.find((item) => item.id === cardId);

    if (!card) return;

    const stage = stages.find((item) => item.id === toStageId);
    const changedStage = card.stageId !== toStageId;

    const moved: PipelineCard = {
      ...card,
      stageId: toStageId,
      history: changedStage
        ? [
            ...card.history,
            {
              stageId: toStageId,
              stageName: stage?.name ?? "",
              at: new Date().toISOString(),
            },
          ]
        : card.history,
    };

    const rest = cards.filter((item) => item.id !== cardId);

    let index = rest.length;

    if (beforeId && beforeId !== cardId) {
      const found = rest.findIndex((item) => item.id === beforeId);

      if (found >= 0) index = found;
    }

    rest.splice(index, 0, moved);

    patch({ cards: rest });
  };

  const stepCard = (card: PipelineCard, direction: -1 | 1) => {
    const index = stages.findIndex((stage) => stage.id === card.stageId);
    const target = stages[index + direction];

    if (target) moveCard(card.id, target.id);
  };

  const saveCard = (updated: PipelineCard) => {
    const previous = cards.find((card) => card.id === updated.id);

    if (!previous) return;

    let next = updated;

    if (previous.stageId !== updated.stageId) {
      const stage = stages.find((item) => item.id === updated.stageId);

      next = {
        ...updated,
        history: [
          ...previous.history,
          {
            stageId: updated.stageId,
            stageName: stage?.name ?? "",
            at: new Date().toISOString(),
          },
        ],
      };
    }

    patch({ cards: cards.map((card) => (card.id === next.id ? next : card)) });
  };

  const deleteCard = (id: string) => patch({ cards: cards.filter((card) => card.id !== id) });

  const submitNewCard = (stageId: string) => {
    const title = draftTitle.trim();
    const stage = stages.find((item) => item.id === stageId);

    if (!title || !stage) return;

    patch({ cards: [...cards, createCard(stage, title, draftWho.trim())] });

    setDraftTitle("");
    setDraftWho("");
    setAddingIn(null);
  };

  const updateStage = (id: string, changes: Partial<(typeof stages)[number]>) =>
    patch({
      stages: stages.map((stage) => (stage.id === id ? { ...stage, ...changes } : stage)),
    });

  const moveStage = (id: string, direction: -1 | 1) => {
    const index = stages.findIndex((stage) => stage.id === id);
    const target = index + direction;

    if (target < 0 || target >= stages.length) return;

    const next = [...stages];

    [next[index], next[target]] = [next[target], next[index]];

    patch({ stages: next });
  };

  const deleteStage = async (id: string) => {
    if (stages.length <= 1) {
      await confirm({
        title: "Não dá para excluir esta etapa",
        description: "O processo precisa ter pelo menos uma etapa.",
        hideCancel: true,
      });

      return;
    }

    const count = cards.filter((card) => card.stageId === id).length;

    if (count > 0) {
      const ok = await confirm({
        title: "Excluir esta etapa?",
        description: `Ela tem ${count} card(s), que também serão excluídos.`,
        confirmLabel: "Excluir etapa",
      });

      if (!ok) return;
    }

    patch({
      stages: stages.filter((stage) => stage.id !== id),
      cards: cards.filter((card) => card.stageId !== id),
    });
  };

  const addStage = () =>
    patch({
      stages: [
        ...stages,
        {
          id: newId("stage"),
          name: `Etapa ${stages.length + 1}`,
          color: PALETTE[(stages.length * 3 + 1) % PALETTE.length],
        },
      ],
    });

  const handleDeletePipeline = async () => {
    const ok = await confirm({
      title: `Excluir o processo "${pipeline.name}"?`,
      description:
        cards.length > 0
          ? `Os ${cards.length} card(s) dele também serão excluídos.`
          : "Essa ação não pode ser desfeita.",
      confirmLabel: "Excluir processo",
    });

    if (ok) onDelete();
  };

  const doneCount = cards.filter((card) => card.stageId === lastStageId).length;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Cabeçalho */}
      <header
        className={`flex h-12 shrink-0 items-center justify-between gap-4 border-b px-5 ${ui.divider} ${
          dark ? "bg-zinc-950" : "bg-white"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Workflow size={15} className={ui.muted} />

          <input
            value={pipeline.name}
            onChange={(e) => patch({ name: e.target.value })}
            className={`w-56 min-w-0 truncate bg-transparent text-sm font-semibold outline-none ${ui.title}`}
          />

          <span className={`hidden text-xs md:block ${ui.muted}`}>
            {cards.length - doneCount} em andamento · {doneCount} concluídos
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filtro por etiqueta */}
          <div className="hidden items-center gap-1 lg:flex">
            <button
              onClick={() => setFilter("all")}
              className={`h-7 rounded px-2.5 text-xs font-medium ${
                filter === "all" ? `${ui.soft} ${ui.title}` : `${ui.muted} ${ui.hover}`
              }`}
            >
              Todos
            </button>

            {PRIORITIES.map((item) => (
              <button
                key={item.id}
                onClick={() => setFilter(filter === item.id ? "all" : item.id)}
                className={`flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium ${
                  filter === item.id ? ui.soft : ui.hover
                }`}
                style={{ color: filter === item.id ? item.color : undefined }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className={filter === item.id ? "" : ui.muted}>{item.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={addStage}
            className={`flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium ${ui.divider} ${ui.text} ${ui.hover}`}
          >
            <Plus size={13} />
            Etapa
          </button>

          <button
            onClick={handleDeletePipeline}
            title="Excluir processo"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </header>

      {/* Colunas */}
      <div className="thin-scroll min-h-0 flex-1 overflow-x-auto overflow-y-hidden p-5">
        <div className="flex h-full items-start gap-4">
          {stages.map((stage, stageIndex) => {
            const stageCards = cards.filter(
              (card) =>
                card.stageId === stage.id && (filter === "all" || card.priority === filter)
            );

            const isOver = overStage === stage.id && dragId !== null;

            return (
              <section
                key={stage.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverStage(stage.id);
                }}
                onDragLeave={() => setOverStage(null)}
                onDrop={(e) => {
                  e.preventDefault();

                  const id = e.dataTransfer.getData("text/plain") || dragId;

                  if (id) moveCard(id, stage.id);

                  setDragId(null);
                  setOverStage(null);
                  setOverCard(null);
                }}
                className={`flex max-h-full w-75 shrink-0 flex-col rounded-lg border transition-colors ${ui.divider}`}
                style={{
                  backgroundColor: isOver
                    ? `${stage.color}26`
                    : dark
                      ? `${stage.color}0f`
                      : `${stage.color}12`,
                  borderTop: `3px solid ${stage.color}`,
                }}
              >
                {/* Cabeçalho da etapa */}
                <div className="group/stage relative flex items-center gap-2 px-3 py-3">
                  <button
                    onClick={() => setColorStage(colorStage === stage.id ? null : stage.id)}
                    title="Mudar a cor da etapa"
                    className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white/10 transition-transform hover:scale-125"
                    style={{ backgroundColor: stage.color }}
                  />

                  <input
                    value={stage.name}
                    onChange={(e) => updateStage(stage.id, { name: e.target.value })}
                    className={`min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none ${ui.title}`}
                  />

                  <span
                    className="rounded px-1.5 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: `${stage.color}30`, color: stage.color }}
                  >
                    {stageCards.length}
                  </span>

                  <div className="flex items-center opacity-0 transition-opacity group-hover/stage:opacity-100">
                    <button
                      onClick={() => moveStage(stage.id, -1)}
                      disabled={stageIndex === 0}
                      title="Mover etapa para a esquerda"
                      className={`rounded p-1 disabled:opacity-20 ${ui.muted} ${ui.hover}`}
                    >
                      <ChevronLeft size={13} />
                    </button>

                    <button
                      onClick={() => moveStage(stage.id, 1)}
                      disabled={stageIndex === stages.length - 1}
                      title="Mover etapa para a direita"
                      className={`rounded p-1 disabled:opacity-20 ${ui.muted} ${ui.hover}`}
                    >
                      <ChevronRight size={13} />
                    </button>

                    <button
                      onClick={() => deleteStage(stage.id)}
                      title="Excluir etapa"
                      className={`rounded p-1 ${ui.muted} hover:bg-red-500/10 hover:text-red-400`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {colorStage === stage.id && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setColorStage(null)} />

                      <div
                        className={`absolute left-2 top-full z-40 mt-1 rounded-lg border p-3 shadow-2xl ${
                          dark ? "border-white/12 bg-zinc-900" : "border-zinc-200 bg-white"
                        }`}
                      >
                        <ColorPicker
                          value={stage.color}
                          onPick={(color) => color && updateStage(stage.id, { color })}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Cards */}
                <div className="thin-scroll min-h-10 flex-1 space-y-2 overflow-y-auto px-3 pb-2">
                  {stageCards.map((card) => {
                    const priority = getPriority(card.priority);
                    const accent = card.color ?? stage.color;
                    const overdue =
                      card.dueDate && card.dueDate < today && card.stageId !== lastStageId;

                    return (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", card.id);
                          e.dataTransfer.effectAllowed = "move";
                          setDragId(card.id);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setOverStage(null);
                          setOverCard(null);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOverStage(stage.id);
                          setOverCard(card.id);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();

                          const id = e.dataTransfer.getData("text/plain") || dragId;

                          if (id) moveCard(id, stage.id, card.id);

                          setDragId(null);
                          setOverStage(null);
                          setOverCard(null);
                        }}
                        onClick={() => setEditingId(card.id)}
                        className={`group/card cursor-pointer rounded-xl border p-3 transition-colors ${
                          dark
                            ? "border-white/8 bg-zinc-900 hover:border-white/25"
                            : "border-zinc-200 bg-white hover:border-zinc-400"
                        } ${dragId === card.id ? "opacity-40" : ""} ${
                          overCard === card.id && dragId && dragId !== card.id
                            ? "border-t-2! border-t-emerald-400!"
                            : ""
                        }`}
                        style={{ borderLeft: `4px solid ${accent}` }}
                      >
                        {priority && (
                          <span
                            className="mb-2 inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-semibold"
                            style={{
                              backgroundColor: `${priority.color}22`,
                              color: priority.color,
                            }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: priority.color }}
                            />
                            {priority.label}
                          </span>
                        )}

                        <p className={`text-sm font-medium leading-snug ${ui.title}`}>
                          {card.title}
                        </p>

                        {card.description && (
                          <p className={`mt-1.5 line-clamp-2 text-xs leading-relaxed ${ui.muted}`}>
                            {card.description}
                          </p>
                        )}

                        {card.who && (
                          <p className={`mt-2 flex items-center gap-1.5 text-xs ${ui.muted}`}>
                            <User size={11} />
                            <span className="truncate">{card.who}</span>
                          </p>
                        )}

                        {(card.value || card.dueDate || card.link) && (
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            {card.value && (
                              <span
                                className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${ui.soft} ${ui.text}`}
                              >
                                <Wallet size={10} />
                                {card.value}
                              </span>
                            )}

                            {card.dueDate && (
                              <span
                                className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${
                                  overdue ? "bg-red-500/15 text-red-400" : `${ui.soft} ${ui.text}`
                                }`}
                              >
                                <CalendarDays size={10} />
                                {formatDay(card.dueDate)}
                              </span>
                            )}

                            {card.link && (
                              <a
                                href={normalizeUrl(card.link)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${ui.soft} ${ui.text} hover:underline`}
                              >
                                <ExternalLink size={10} />
                                {linkLabel(card.link)}
                              </a>
                            )}
                          </div>
                        )}

                        <div className="mt-2 flex items-center justify-between opacity-0 transition-opacity group-hover/card:opacity-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              stepCard(card, -1);
                            }}
                            disabled={stageIndex === 0}
                            title="Voltar etapa"
                            className={`rounded p-1 disabled:opacity-20 ${ui.muted} ${ui.hover}`}
                          >
                            <ChevronLeft size={14} />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              stepCard(card, 1);
                            }}
                            disabled={stageIndex === stages.length - 1}
                            title="Avançar etapa"
                            className={`flex items-center gap-1 rounded px-1.5 py-1 text-xs disabled:opacity-20 ${ui.muted} ${ui.hover}`}
                          >
                            {stages[stageIndex + 1]?.name ?? ""}
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Adicionar card */}
                <div className="px-3 pb-3">
                  {addingIn === stage.id ? (
                    <div className="space-y-2">
                      <input
                        autoFocus
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitNewCard(stage.id);
                          if (e.key === "Escape") setAddingIn(null);
                        }}
                        placeholder="Título do card"
                        className={`w-full rounded-xl border px-3 py-2 text-xs outline-none ${ui.field}`}
                      />

                      <input
                        value={draftWho}
                        onChange={(e) => setDraftWho(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitNewCard(stage.id);
                          if (e.key === "Escape") setAddingIn(null);
                        }}
                        placeholder="Quem (opcional)"
                        className={`w-full rounded-xl border px-3 py-2 text-xs outline-none ${ui.field}`}
                      />

                      <div className="flex gap-2">
                        <button
                          onClick={() => submitNewCard(stage.id)}
                          disabled={!draftTitle.trim()}
                          className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-30 ${ui.primary}`}
                        >
                          Adicionar
                        </button>

                        <button
                          onClick={() => setAddingIn(null)}
                          className={`rounded-xl px-3 py-2 text-xs ${ui.muted} ${ui.hover}`}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setAddingIn(stage.id);
                        setDraftTitle("");
                        setDraftWho("");
                      }}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs ${ui.muted} ${ui.hover}`}
                    >
                      <Plus size={13} />
                      Adicionar card
                    </button>
                  )}
                </div>
              </section>
            );
          })}

          <button
            onClick={addStage}
            className={`flex h-14 w-75 shrink-0 items-center justify-center gap-2 rounded-lg border border-dashed text-xs ${ui.divider} ${ui.muted} ${ui.hover}`}
          >
            <Plus size={14} />
            Nova etapa
          </button>
        </div>
      </div>

      {editingCard && (
        <CardEditor
          key={editingCard.id}
          card={editingCard}
          pipeline={pipeline}
          dark={dark}
          onSave={saveCard}
          onDelete={() => deleteCard(editingCard.id)}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}