"use client";

import React, { useState } from "react";
import { usePersonalData } from "@/lib/personal";
import { getUi } from "@/lib/ui";
import { CheckSquare, Plus, Target, Flame, Inbox, Trash2, Check, Dumbbell, BookOpen, Edit2 } from "lucide-react";

export function PersonalOrganizationView({ dark = true }: { dark?: boolean }) {
  const ui = getUi(dark);
  const {
    inbox,
    goals,
    habits,
    addInbox,
    toggleInbox,
    deleteInbox,
    addGoal,
    deleteGoal,
    addHabit,
    toggleHabitDate,
    deleteHabit,
  } = usePersonalData();

  const [newInboxTitle, setNewInboxTitle] = useState("");
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newHabitName, setNewHabitName] = useState("");

  const todayStr = new Date().toISOString().split("T")[0];

  // Adicionar prompts prontos à caixa de entrada rápido
  const addQuickPrompt = (type: "workout" | "study") => {
    if (type === "workout") {
      addInbox("🏋️ Treino: Supino Reto | 30kg | 4x10 | Horário: 18h");
    } else {
      addInbox("📚 Estudos: Computação Gráfica | Revisar algoritmos | 1h30");
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-6 p-6 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-extrabold flex items-center gap-2 ${ui.title}`}>
            <CheckSquare size={22} className="text-[var(--accent)]" />
            Organização & Hábitos
          </h1>
          <p className={`text-xs ${ui.subtitle}`}>
            Esvazie a mente na caixa de entrada, acompanhe hábitos e ajuste o progresso das suas metas.
          </p>
        </div>

        {/* Atalhos Rápidos para Prompts Prontos */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => addQuickPrompt("workout")}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
          >
            <Dumbbell size={14} /> + Prompt Treino
          </button>
          <button
            onClick={() => addQuickPrompt("study")}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20"
          >
            <BookOpen size={14} /> + Prompt Estudos
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* INBOX / CAIXA DE ENTRADA */}
        <div className={`flex flex-col rounded-2xl border p-4 shadow-sm ${ui.panel}`}>
          <div className="flex items-center gap-2 pb-3 border-b border-white/5 mb-3">
            <Inbox size={16} className="text-[var(--accent)]" />
            <h2 className={`text-sm font-bold ${ui.title}`}>Caixa de Entrada (Inbox)</h2>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newInboxTitle.trim()) return;
              addInbox(newInboxTitle);
              setNewInboxTitle("");
            }}
            className="flex gap-2 mb-3"
          >
            <input
              type="text"
              placeholder="Jogar pensamento rápido..."
              value={newInboxTitle}
              onChange={(e) => setNewInboxTitle(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2 text-xs outline-none ${ui.field}`}
            />
            <button type="submit" className={ui.btnPrimarySm}>
              <Plus size={14} />
            </button>
          </form>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[380px]">
            {inbox.map((item) => (
              <div
                key={item.id}
                className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 transition-colors hover:border-white/15"
              >
                <div
                  onClick={() => toggleInbox(item.id)}
                  className="flex cursor-pointer items-center gap-2.5 overflow-hidden"
                >
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      item.completed
                        ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                        : "border-zinc-600"
                    }`}
                  >
                    {item.completed && <Check size={10} />}
                  </div>
                  <span
                    className={`text-xs truncate ${
                      item.completed ? "line-through text-zinc-500" : ui.title
                    }`}
                  >
                    {item.title}
                  </span>
                </div>
                <button
                  onClick={() => deleteInbox(item.id)}
                  className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {inbox.length === 0 && (
              <p className="text-center text-[11px] text-zinc-500 py-6">Inbox limpa por enquanto!</p>
            )}
          </div>
        </div>

        {/* HÁBITOS DIÁRIOS */}
        <div className={`flex flex-col rounded-2xl border p-4 shadow-sm ${ui.panel}`}>
          <div className="flex items-center gap-2 pb-3 border-b border-white/5 mb-3">
            <Flame size={16} className="text-amber-400" />
            <h2 className={`text-sm font-bold ${ui.title}`}>Hábitos Diários</h2>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newHabitName.trim()) return;
              addHabit(newHabitName);
              setNewHabitName("");
            }}
            className="flex gap-2 mb-3"
          >
            <input
              type="text"
              placeholder="Novo hábito (ex: Ler 10 páginas)..."
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2 text-xs outline-none ${ui.field}`}
            />
            <button type="submit" className={ui.btnPrimarySm}>
              <Plus size={14} />
            </button>
          </form>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[380px]">
            {habits.map((h) => {
              const doneToday = h.completedDates.includes(todayStr);
              return (
                <div
                  key={h.id}
                  className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-white/15"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <button
                      onClick={() => toggleHabitDate(h.id, todayStr)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all ${
                        doneToday
                          ? "bg-amber-500 border-amber-500 text-black shadow-sm"
                          : "border-zinc-600 hover:border-zinc-400"
                      }`}
                    >
                      {doneToday && <Check size={12} strokeWidth={3} />}
                    </button>
                    <span className={`text-xs font-semibold truncate ${ui.title}`}>{h.name}</span>
                  </div>
                  <button
                    onClick={() => deleteHabit(h.id)}
                    className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
            {habits.length === 0 && (
              <p className="text-center text-[11px] text-zinc-500 py-6">Nenhum hábito cadastrado.</p>
            )}
          </div>
        </div>

        {/* METAS COM PROGRESSO AJUSTÁVEL */}
        <div className={`flex flex-col rounded-2xl border p-4 shadow-sm ${ui.panel}`}>
          <div className="flex items-center gap-2 pb-3 border-b border-white/5 mb-3">
            <Target size={16} className="text-emerald-400" />
            <h2 className={`text-sm font-bold ${ui.title}`}>Metas e Objetivos</h2>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newGoalTitle.trim()) return;
              addGoal(newGoalTitle);
              setNewGoalTitle("");
            }}
            className="flex gap-2 mb-3"
          >
            <input
              type="text"
              placeholder="Nova meta pessoal..."
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2 text-xs outline-none ${ui.field}`}
            />
            <button type="submit" className={ui.btnPrimarySm}>
              <Plus size={14} />
            </button>
          </form>

          <div className="flex flex-col gap-3 overflow-y-auto max-h-[380px]">
            {goals.map((g) => (
              <div
                key={g.id}
                className="group flex flex-col gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-colors hover:border-white/15"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold truncate ${ui.title}`}>{g.title}</span>
                  <button
                    onClick={() => deleteGoal(g.id)}
                    className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Barra de Progresso e Slider Interativo */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Progresso</span>
                    <span className="font-mono font-bold text-emerald-400">{g.progress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={g.progress}
                    onChange={(e) => {
                      g.progress = Number(e.target.value);
                      // Força atualização no localStorage
                      window.dispatchEvent(new Event("storage"));
                    }}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                  />
                </div>
              </div>
            ))}
            {goals.length === 0 && (
              <p className="text-center text-[11px] text-zinc-500 py-6">Nenhuma meta definida.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}