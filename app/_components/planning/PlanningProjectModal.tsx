"use client";

import React, { useState } from "react";
import { Folder as FolderIcon, ListChecks, Trash2 } from "lucide-react";

import { Theme } from "@/types";
import {
  DEFAULT_FIXED_COLOR,
  PLAN_COLOR_MODES,
  PlanColorMode,
  PlanFolder,
  PlanProjectOptions,
} from "@/lib/planning";
import { useAccent, withAlpha } from "@/lib/theme";
import { getUi } from "@/lib/ui";

import ModalShell from "../modals/ModalShell";
import { ColorSwatches } from "./PlanningParts";

interface PlanningProjectModalProps {
  theme: Theme;
  folders: PlanFolder[];
  mode: "create" | "edit";
  initialName?: string;
  initialFolderId?: string | null;
  initialColorMode?: PlanColorMode;
  initialFixedColor?: string;
  onClose: () => void;
  onSave: (name: string, folderId: string | null, options: PlanProjectOptions) => void;
  /** só aparece ao editar */
  onDelete?: () => void;
}

const LABEL = "mb-1.5 block text-[10px] font-bold uppercase tracking-wider";

export default function PlanningProjectModal({
  theme,
  folders,
  mode,
  initialName = "",
  initialFolderId = null,
  initialColorMode = "accent",
  initialFixedColor = DEFAULT_FIXED_COLOR,
  onClose,
  onSave,
  onDelete,
}: PlanningProjectModalProps) {
  const dark = theme === "dark";
  const ui = getUi(dark);
  const accent = useAccent();

  const [colorMode, setColorMode] = useState<PlanColorMode>(initialColorMode);
  const [fixedColor, setFixedColor] = useState(initialFixedColor);
  const [name, setName] = useState(initialName);
  const [folderId, setFolderId] = useState<string>(
    initialFolderId && folders.some((f) => f.id === initialFolderId) ? initialFolderId : ""
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    onSave(name.trim(), folderId || null, { colorMode, fixedColor });
    onClose();
  };

  const fieldBase = `w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors ${ui.field}`;

  return (
    <ModalShell
      theme={theme}
      title={mode === "create" ? "Novo planejamento" : "Editar planejamento"}
      description="Cada planejamento tem as suas próprias atividades."
      icon={<ListChecks size={16} />}
      size="md"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          {onDelete && (
            <button type="button" onClick={onDelete} className={`${ui.btnDanger} mr-auto`}>
              <Trash2 size={14} />
              Excluir
            </button>
          )}

          <button type="button" onClick={onClose} className={ui.btnGhost}>
            Cancelar
          </button>

          <button type="submit" disabled={!name.trim()} className={ui.btnPrimaryMd}>
            {mode === "create" ? "Criar planejamento" : "Salvar"}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className={`${LABEL} ${ui.subtitle}`}>Nome</label>

          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Desenvolvimento do YourMind"
            className={fieldBase}
          />
        </div>

        <div>
          <label className={`${LABEL} ${ui.subtitle}`}>Pasta</label>

          <div className="relative">
            <FolderIcon
              size={14}
              className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${ui.muted}`}
            />

            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className={`${fieldBase} appearance-none pl-9 text-xs`}
            >
              <option value="">Sem pasta</option>

              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={`${LABEL} ${ui.subtitle}`}>Cores dos tópicos</label>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PLAN_COLOR_MODES.map((option) => {
              const selected = colorMode === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setColorMode(option.id)}
                  aria-pressed={selected}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    selected ? (dark ? "bg-white/[0.06]" : "bg-zinc-50") : `${ui.divider} ${ui.hover}`
                  }`}
                  style={
                    selected
                      ? { borderColor: accent, boxShadow: `0 0 0 3px ${withAlpha(accent, 0.12)}` }
                      : undefined
                  }
                >
                  <span className={`block text-xs font-bold ${ui.title}`}>{option.label}</span>
                  <span className={`mt-1 block text-[10px] leading-snug ${ui.subtitle}`}>{option.text}</span>
                </button>
              );
            })}
          </div>

          {colorMode === "fixed" && (
            <div className="mt-3">
              <ColorSwatches
                value={fixedColor}
                onChange={(color) => setFixedColor(color || DEFAULT_FIXED_COLOR)}
                dark={dark}
                size={22}
                allowAuto={false}
              />
            </div>
          )}

          <p className={`mt-2 text-[11px] leading-relaxed ${ui.subtitle}`}>
            Em qualquer modo você ainda pode trocar a cor de um tópico específico depois.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}