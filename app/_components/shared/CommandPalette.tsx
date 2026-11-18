"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  StickyNote,
  Calendar,
  Folder,
  GitFork,
  Workflow,
  Target,
  Users,
  Plus,
  Command,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Theme } from "@/types";
import { getUi } from "@/lib/ui";
import { withAlpha } from "@/lib/theme";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  accentColor: string;
  onNavigate: (target: string) => void;
  onOpenNewTask: () => void;
  onOpenNewNote: () => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  theme,
  accentColor,
  onNavigate,
  onOpenNewTask,
  onOpenNewNote,
}: CommandPaletteProps) {
  const dark = theme === "dark";
  const ui = getUi(dark);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Fecha com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Ações e navegações disponíveis na paleta
  const allActions = useMemo(
    () => [
      {
        id: "new-task",
        label: "Novo Agendamento / Lembrete",
        category: "Ações Rápidas",
        icon: Calendar,
        action: () => {
          onOpenNewTask();
          onClose();
        },
      },
      {
        id: "new-note",
        label: "Criar Nova Nota no Bloco",
        category: "Ações Rápidas",
        icon: StickyNote,
        action: () => {
          onOpenNewNote();
          onClose();
        },
      },
      {
        id: "nav-calendar",
        label: "Ir para Agenda & Ecossistema",
        category: "Navegação",
        icon: Calendar,
        action: () => {
          onNavigate("calendar");
          onClose();
        },
      },
      {
        id: "nav-notes",
        label: "Ir para Anotações & Lembretes",
        category: "Navegação",
        icon: StickyNote,
        action: () => {
          onNavigate("notes");
          onClose();
        },
      },
      {
        id: "nav-planning",
        label: "Ir para Metas & Planejamento",
        category: "Navegação",
        icon: Target,
        action: () => {
          onNavigate("planning");
          onClose();
        },
      },
      {
        id: "nav-clients",
        label: "Ir para Pessoas & Clientes",
        category: "Navegação",
        icon: Users,
        action: () => {
          onNavigate("clients");
          onClose();
        },
      },
    ],
    [onNavigate, onOpenNewTask, onOpenNewNote, onClose]
  );

  const filteredActions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return allActions;
    return allActions.filter((item) =>
      item.label.toLowerCase().includes(term)
    );
  }, [query, allActions]);

  // Resetar índice ao filtrar
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Navegação por teclado (Setas e Enter)
  useEffect(() => {
    const handleNavigation = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredActions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredActions.length - 1
        );
      } else if (e.key === "Enter" && filteredActions[selectedIndex]) {
        e.preventDefault();
        filteredActions[selectedIndex].action();
      }
    };

    window.addEventListener("keydown", handleNavigation);
    return () => window.removeEventListener("keydown", handleNavigation);
  }, [isOpen, filteredActions, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 animate-in fade-in duration-200">
      {/* Backdrop com blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Caixa da Paleta */}
      <div
        className={`relative z-10 w-full max-w-xl rounded-4xl border shadow-2xl overflow-hidden transition-all ${
          dark
            ? "border-white/15 bg-zinc-950/95 text-zinc-100 backdrop-blur-2xl"
            : "border-zinc-200 bg-white/95 text-zinc-900 shadow-zinc-300/50 backdrop-blur-2xl"
        }`}
      >
        {/* Barra de Busca */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-500/15">
          <Search size={18} className="text-zinc-400 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite um comando ou busque no Your Mind..."
            className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-zinc-500"
          />
          <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 text-[10px] font-extrabold text-zinc-400 shrink-0">
            ESC
          </span>
        </div>

        {/* Lista de Resultados */}
        <div className="max-h-80 overflow-y-auto p-3 space-y-1 thin-scroll">
          {filteredActions.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-400 font-medium">
              Nenhum comando encontrado para &quot;{query}&quot;
            </div>
          ) : (
            filteredActions.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "shadow-sm scale-[1.01]"
                      : dark
                      ? "text-zinc-300 hover:bg-white/5"
                      : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                  style={
                    isSelected
                      ? {
                          backgroundColor: withAlpha(accentColor, 0.16),
                          color: accentColor,
                        }
                      : undefined
                  }
                >
                  <span className="flex items-center gap-3">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-xl shadow-xs"
                      style={
                        isSelected
                          ? { backgroundColor: accentColor, color: "#fff" }
                          : { backgroundColor: withAlpha(accentColor, 0.1), color: accentColor }
                      }
                    >
                      <Icon size={15} />
                    </span>
                    <span>{item.label}</span>
                  </span>

                  <span className="text-[10px] font-extrabold opacity-60 uppercase tracking-widest">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Rodapé informativo */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-500/10 text-[10px] font-bold text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Sparkles size={12} style={{ color: accentColor }} />
            Dica: Navegue com as setas ↑↓ e selecione com Enter
          </span>
          <span>Your Mind OS</span>
        </div>
      </div>
    </div>
  );
}